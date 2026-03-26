// PA CROP Services — SuiteDash → Neon Sync
// Pulls clients from SuiteDash CRM and creates corresponding records
// in Neon Postgres (organizations, clients, obligations).

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import * as suitedash from '../services/suitedash.js';

// Map SuiteDash entity types to our canonical types
const ENTITY_MAP = {
  'llc': 'domestic_llc', 'LLC': 'domestic_llc', 'domestic llc': 'domestic_llc',
  'corporation': 'domestic_business_corp', 'corp': 'domestic_business_corp', 'Corporation': 'domestic_business_corp',
  'nonprofit': 'domestic_nonprofit_corp', 'Nonprofit': 'domestic_nonprofit_corp',
  'lp': 'domestic_lp', 'LP': 'domestic_lp', 'limited partnership': 'domestic_lp',
  'llp': 'domestic_llp', 'LLP': 'domestic_llp',
  'foreign llc': 'foreign_llc', 'Foreign LLC': 'foreign_llc',
  'foreign corp': 'foreign_business_corp', 'Foreign Corporation': 'foreign_business_corp',
};

// Deadline by entity type
const DEADLINES = {
  domestic_business_corp: '06-30', foreign_business_corp: '06-30',
  domestic_nonprofit_corp: '06-30', foreign_nonprofit_corp: '06-30',
  domestic_llc: '09-30', foreign_llc: '09-30',
  domestic_lp: '12-31', foreign_lp: '12-31',
  domestic_llp: '12-31', foreign_llp: '12-31',
  professional_association: '12-31', business_trust: '12-31',
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'neon_not_connected' });
  if (!suitedash.isConfigured()) return res.status(503).json({ success: false, error: 'suitedash_not_configured' });

  const sql = db.getSql();
  const dryRun = req.query.dry === 'true';
  const fixMode = req.query.fix;

  // Fix mode: create missing obligations for existing clients
  if (fixMode === 'obligations') {
    try {
      const clients = await sql.query(`
        SELECT c.id as client_id, c.email, c.plan_code, o.id as org_id, o.entity_type, o.legal_name
        FROM clients c
        JOIN organizations o ON c.organization_id = o.id
        LEFT JOIN obligations obl ON obl.organization_id = o.id
        WHERE obl.id IS NULL
      `);
      const fixed = [];
      for (const c of clients) {
        const entityType = c.entity_type || 'domestic_llc';
        const deadline = DEADLINES[entityType] || '12-31';
        const year = new Date().getFullYear();
        const dueDate = `${year}-${deadline}`;
        const due = new Date(dueDate);
        const status = due < new Date() ? 'overdue' : 'current';

        const ruleRows = await sql.query(
          'SELECT id, version FROM rules WHERE entity_type = $1 AND jurisdiction = $2 AND is_active = true LIMIT 1',
          [entityType, 'PA']
        );
        const rule = ruleRows[0];
        if (!rule) { fixed.push({ email: c.email, error: 'no rule for ' + entityType }); continue; }

        await sql.query(
          `INSERT INTO obligations (organization_id, obligation_type, jurisdiction, rule_id, rule_version, due_date, fee_usd, obligation_status, escalation_level, filing_method, source_reason, metadata, created_at, updated_at)
           VALUES ($1, 'annual_report', 'PA', $2, $3, $4, 7.00, $5, 'none', $6, 'fix-obligations', $7, now(), now())`,
          [c.org_id, rule.id, rule.version, dueDate, status,
           c.plan_code?.includes('pro') || c.plan_code?.includes('empire') ? 'managed' : 'self',
           JSON.stringify({ year, entity_type: entityType, source: 'fix' })]
        );
        fixed.push({ email: c.email, entity: c.legal_name, due: dueDate, status });
      }
      return res.status(200).json({ success: true, mode: 'fix-obligations', fixed });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
  const results = { synced: 0, skipped: 0, errors: [], created_orgs: [], created_clients: [], created_obligations: [] };

  try {
    // Pull all clients from SuiteDash
    const sdClients = await suitedash.getAllClientsWithCompliance();
    results.suitedash_total = sdClients.length;

    for (const sd of sdClients) {
      try {
        const email = (sd.email || '').toLowerCase().trim();
        if (!email) { results.skipped++; results.errors.push({ email: '(empty)', reason: 'no email' }); continue; }

        // Check if already synced
        const existing = await sql.query('SELECT id FROM clients WHERE email = $1', [email]);
        if (existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Determine entity type
        const rawType = sd.custom_fields?.entity_type || sd.entity_type || 'llc';
        const entityType = ENTITY_MAP[rawType] || ENTITY_MAP[rawType.toLowerCase()] || 'domestic_llc';

        // Determine plan
        const planCode = sd.custom_fields?.plan_code || sd.plan_code || 'compliance_only';

        const entityName = sd.company_name || sd.name || `${sd.first_name || ''} ${sd.last_name || ''}`.trim() || email;
        const dosNumber = sd.custom_fields?.dos_number || sd.dos_number || null;

        if (dryRun) {
          results.created_orgs.push({ name: entityName, type: entityType, dos: dosNumber });
          results.created_clients.push({ email, plan: planCode });
          results.synced++;
          continue;
        }

        // Create organization
        const orgRows = await sql.query(
          `INSERT INTO organizations (legal_name, display_name, entity_type, jurisdiction, dos_number, entity_status, registered_office_address, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, 'PA', $4, 'active', $5, $6, now(), now()) RETURNING id`,
          [
            entityName,
            entityName,
            entityType,
            dosNumber,
            JSON.stringify({ street: '924 W 23rd St', city: 'Erie', state: 'PA', zip: '16502' }),
            JSON.stringify({ suitedash_uid: sd.uid, synced_at: new Date().toISOString() })
          ]
        );
        const orgId = orgRows[0]?.id;
        if (!orgId) { results.errors.push({ email, reason: 'org insert failed' }); continue; }

        // Create client
        const clientRows = await sql.query(
          `INSERT INTO clients (email, owner_name, phone, plan_code, billing_status, organization_id, referral_code, onboarding_status, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', $5, $6, 'complete', $7, now(), now()) RETURNING id`,
          [
            email,
            `${sd.first_name || ''} ${sd.last_name || ''}`.trim() || entityName,
            sd.phone || null,
            planCode,
            orgId,
            'CROP-' + (sd.uid || '').slice(0, 6).toUpperCase(),
            JSON.stringify({ suitedash_uid: sd.uid, first_name: sd.first_name, last_name: sd.last_name })
          ]
        );
        const clientId = clientRows[0]?.id;

        // Create annual report obligation
        const year = new Date().getFullYear();
        const deadline = DEADLINES[entityType] || '12-31';
        const dueDate = `${year}-${deadline}`;
        const now = new Date();
        const due = new Date(dueDate);
        const status = due < now ? 'overdue' : 'current';

        // Look up the rule for this entity type
        const ruleRows = await sql.query(
          'SELECT id, version FROM rules WHERE entity_type = $1 AND jurisdiction = $2 AND is_active = true LIMIT 1',
          [entityType, 'PA']
        );
        const rule = ruleRows[0];
        if (!rule) { results.errors.push({ email, reason: 'No active rule for ' + entityType }); continue; }

        const oblRows = await sql.query(
          `INSERT INTO obligations (organization_id, obligation_type, jurisdiction, rule_id, rule_version, due_date, fee_usd, obligation_status, escalation_level, filing_method, source_reason, metadata, created_at, updated_at)
           VALUES ($1, 'annual_report', 'PA', $2, $3, $4, 7.00, $5, 'none', $6, 'SuiteDash sync', $7, now(), now()) RETURNING id`,
          [
            orgId,
            rule.id,
            rule.version,
            dueDate,
            status,
            planCode.includes('pro') || planCode.includes('empire') ? 'managed' : 'self',
            JSON.stringify({ year, entity_type: entityType, deadline, source: 'sync' })
          ]
        );

        // Audit event
        await sql.query(
          `INSERT INTO audit_events (actor_type, actor_id, event_type, target_type, target_id, after_json, reason, created_at)
           VALUES ('admin', 'sync', 'client.synced_from_suitedash', 'client', $1, $2, 'SuiteDash → Neon sync', now())`,
          [clientId, JSON.stringify({ org_id: orgId, email, entity: entityName, plan: planCode })]
        );

        // Sync neon_org_id back to SuiteDash
        try {
          if (sd.uid) {
            await suitedash.setComplianceFields(sd.uid, { neon_org_id: orgId });
          }
        } catch (e) { /* non-critical */ }

        results.synced++;
        results.created_orgs.push({ id: orgId, name: entityName, type: entityType });
        results.created_clients.push({ id: clientId, email, plan: planCode });
        results.created_obligations.push({ org: orgId, type: 'annual_report', due: dueDate, status });
      } catch (e) {
        results.errors.push({ email: sd.email || '?', reason: e.message?.slice(0, 100) });
      }
    }

    return res.status(200).json({
      success: true,
      dry_run: dryRun,
      ...results
    });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
