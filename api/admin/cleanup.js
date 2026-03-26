// PA CROP Services — Admin Data Cleanup & Seed
// POST /api/admin/cleanup?action=audit|purge|seed
// Purges test/garbage data from Neon Postgres, seeds real Dynasty Empire entities.

import { setCors, isAdminRequest, generateAccessCode } from '../services/auth.js';
import { createLogger } from '../_log.js';

const log = createLogger('admin-cleanup');
import * as db from '../services/db.js';

// Real client data loaded from environment at runtime — no PII in source
// Set SEED_CLIENT_EMAIL, SEED_CLIENT_NAME, SEED_ORG_NAME, SEED_DOS_NUMBER in Vercel env vars
function getRealClients() {
  const email = process.env.SEED_CLIENT_EMAIL;
  if (!email) return [];
  return [{
    org: {
      legal_name: process.env.SEED_ORG_NAME || 'PA Registered Office Services, LLC',
      display_name: process.env.SEED_ORG_DISPLAY || 'PA CROP Services',
      entity_type: 'domestic_llc',
      jurisdiction: 'PA',
      dos_number: process.env.SEED_DOS_NUMBER || '',
      entity_status: 'active'
    },
    client: {
      owner_name: process.env.SEED_CLIENT_NAME || '',
      email,
      phone: process.env.SEED_CLIENT_PHONE || '',
      plan_code: 'business_empire',
      billing_status: 'active',
      onboarding_status: 'completed'
    }
  }];
}

// Known test patterns — emails/names that are clearly garbage
const TEST_PATTERNS = [
  '@example.com',
  '@lead-os.dev',
  'registry-check',
  'live-trafft-booking',
  'postgres-live-check',
  'env-only-check',
  'doccheck@gmail.com',
  'registrycheck',
  'vara.vag.ut',
  'atiqifu.'
];

function isTestRecord(email, name) {
  const e = (email || '').toLowerCase();
  const n = (name || '').toLowerCase();
  return TEST_PATTERNS.some(p => e.includes(p)) ||
    n.includes('leados verifier') ||
    n.includes('registry check') ||
    n.includes('live booking') ||
    n.includes('postgres verification') ||
    n.includes('envonly runtime') ||
    // Random bot names: gibberish mixed-case strings
    (/^[A-Za-z]{15,}/.test(name) && /[A-Z].*[a-z].*[A-Z]/.test(name));
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });

  const action = req.query.action || req.body?.action || 'audit';

  if (!db.isConnected()) {
    return res.status(200).json({ success: false, error: 'neon_not_connected', hint: 'DATABASE_URL env var required' });
  }

  const sql = db.getSql();

  try {
    // ── AUDIT: Show what would be cleaned ────────────────────
    if (action === 'audit') {
      const clients = await sql.query('SELECT id, owner_name, email, plan_code, billing_status FROM clients');
      const orgs = await sql.query('SELECT id, legal_name, entity_type, dos_number FROM organizations');

      const testClients = (clients || []).filter(c => isTestRecord(c.email, c.owner_name));
      const realClients = (clients || []).filter(c => !isTestRecord(c.email, c.owner_name));
      const testOrgs = (orgs || []).filter(o => {
        // Org is test if it has no real client or if its name matches test patterns
        const hasRealClient = realClients.some(c => c.organization_id === o.id);
        return !hasRealClient && !getRealClients().some(r => r.org.dos_number === o.dos_number);
      });

      return res.status(200).json({
        success: true,
        action: 'audit',
        summary: {
          total_clients: (clients || []).length,
          test_clients: testClients.length,
          real_clients: realClients.length,
          total_orgs: (orgs || []).length,
          test_orgs: testOrgs.length
        },
        test_clients: testClients.map(c => ({ id: c.id, name: c.owner_name, email: c.email })),
        real_clients: realClients.map(c => ({ id: c.id, name: c.owner_name, email: c.email })),
        would_seed: getRealClients().map(r => ({ name: r.org.legal_name, email: r.client.email, plan: r.client.plan_code }))
      });
    }

    // ── PURGE: Delete test records ───────────────────────────
    if (action === 'purge') {
      const clients = await sql.query('SELECT id, owner_name, email, organization_id FROM clients');
      const testClients = (clients || []).filter(c => isTestRecord(c.email, c.owner_name));
      const testClientIds = testClients.map(c => c.id);
      const testOrgIds = [...new Set(testClients.map(c => c.organization_id).filter(Boolean))];

      let deleted = { clients: 0, organizations: 0, obligations: 0, notifications: 0, billing_accounts: 0, ai_conversations: 0, audit_events: 0 };

      if (testClientIds.length) {
        // Delete in dependency order
        for (const cid of testClientIds) {
          await sql.query('DELETE FROM billing_accounts WHERE client_id = $1', [cid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
          deleted.billing_accounts++;
          await sql.query('DELETE FROM notifications WHERE client_id = $1', [cid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
          deleted.notifications++;
          await sql.query('DELETE FROM ai_conversations WHERE client_id = $1', [cid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
          deleted.ai_conversations++;
          await sql.query('DELETE FROM referrals WHERE referrer_client_id = $1', [cid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
          await sql.query('DELETE FROM clients WHERE id = $1', [cid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
          deleted.clients++;
        }
      }

      if (testOrgIds.length) {
        for (const oid of testOrgIds) {
          // Check if org still has non-test clients
          const remaining = await sql.query('SELECT COUNT(*) as cnt FROM clients WHERE organization_id = $1', [oid]);
          if (parseInt(remaining?.[0]?.cnt || 0) === 0) {
            await sql.query('DELETE FROM obligations WHERE organization_id = $1', [oid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
            deleted.obligations++;
            await sql.query('DELETE FROM notifications WHERE organization_id = $1', [oid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
            await sql.query('DELETE FROM documents WHERE organization_id = $1', [oid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
            await sql.query('DELETE FROM organizations WHERE id = $1', [oid]).catch(e => log.warn('cleanup_step_failed', { error: e.message }));
            deleted.organizations++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        action: 'purge',
        deleted,
        purged_emails: testClients.map(c => c.email)
      });
    }

    // ── SEED: Insert real clients ────────────────────────────
    if (action === 'seed') {
      const results = [];
      for (const entry of getRealClients()) {
        // Check if org already exists
        let org;
        if (entry.org.dos_number) {
          const existing = await sql.query('SELECT * FROM organizations WHERE dos_number = $1', [entry.org.dos_number]);
          org = existing?.[0];
        }

        if (!org) {
          const created = await db.createOrganization(entry.org);
          org = created;
        }

        // Check if client already exists
        const existingClient = await sql.query('SELECT * FROM clients WHERE email = $1', [entry.client.email]);
        let client = existingClient?.[0];

        if (!client) {
          client = await db.createClientRecord({
            ...entry.client,
            organization_id: org?.id,
            referral_code: 'CROP-' + (entry.org.display_name || 'CLIENT').toUpperCase().replace(/\s+/g, '').slice(0, 8),
            metadata: { access_code: generateAccessCode(), source: 'admin_seed' }
          });
        } else {
          // Client exists — ensure access code is set (may have been cleared by one-time auth)
          const meta = client.metadata || {};
          if (!meta.access_code) {
            await sql.query(
              "UPDATE clients SET metadata = metadata || $1, updated_at = now() WHERE id = $2",
              [JSON.stringify({ access_code: generateAccessCode() }), client.id]
            );
          }
        }

        // Create initial obligation
        if (org?.id) {
          const existingObl = await sql.query('SELECT * FROM obligations WHERE organization_id = $1 AND obligation_type = $2', [org.id, 'annual_report']);
          if (!existingObl?.length) {
            // Look up active rule for this entity type
            const rules = await sql.query(
              'SELECT id, version FROM rules WHERE entity_type = $1 AND jurisdiction = $2 AND is_active = true LIMIT 1',
              [entry.org.entity_type, entry.org.jurisdiction || 'PA']
            );
            const rule = rules?.[0];
            const ruleId = rule?.id || null;
            const ruleVersion = rule?.version || '2026.1';

            if (ruleId) {
              await sql.query(
                `INSERT INTO obligations (organization_id, obligation_type, jurisdiction, rule_id, rule_version, due_date, fee_usd, obligation_status, escalation_level, filing_method, source_reason, metadata, created_at, updated_at)
                 VALUES ($1, 'annual_report', 'PA', $2, $3, $4, 7.00, 'upcoming', 'none', 'managed', 'admin_seed', $5, now(), now())`,
                [org.id, ruleId, ruleVersion, '2026-09-30', JSON.stringify({ enforcement_year: 2027, year: 2026, entity_type: entry.org.entity_type })]
              );
            }
          }
        }

        results.push({
          org_id: org?.id,
          org_name: entry.org.legal_name,
          client_id: client?.id,
          client_email: entry.client.email,
          access_code: 'CROP2026'
        });
      }

      return res.status(200).json({
        success: true,
        action: 'seed',
        seeded: results
      });
    }

    // ── RESET-CODES: Reset access codes for all real clients ──
    if (action === 'reset-codes') {
      const results = [];
      for (const entry of getRealClients()) {
        const existing = await sql.query('SELECT id, metadata FROM clients WHERE email = $1', [entry.client.email]);
        const client = existing?.[0];
        if (client) {
          await sql.query(
            "UPDATE clients SET metadata = metadata || $1, onboarding_status = 'completed', updated_at = now() WHERE id = $2",
            [JSON.stringify({ access_code: generateAccessCode() }), client.id]
          );
          results.push({ email: entry.client.email, status: 'reset' });
        } else {
          results.push({ email: entry.client.email, status: 'not_found' });
        }
      }
      return res.status(200).json({ success: true, action: 'reset-codes', results });
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use: audit, purge, seed, reset-codes' });
  } catch (err) {
    log.error('cleanup_error', {}, err);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
