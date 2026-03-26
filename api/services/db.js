// PA CROP Services — Database Service
// Architecture: Neon Postgres (compliance engine) + SuiteDash (CRM)
//
// Neon owns: organizations, obligations, rules, documents, notifications,
//            ai_conversations, audit_events, workflow_jobs, billing_accounts,
//            referrals, partners
// SuiteDash owns: client contacts, companies, portal access, onboarding,
//                 file sharing, invoicing, email marketing
//
// Both are synced via neon_org_id custom field in SuiteDash and
// suitedash_uid field in Neon organizations table.
//
// Env: DATABASE_URL (Neon connection string)
//      SUITEDASH_PUBLIC_ID, SUITEDASH_SECRET_KEY

import { neon } from '@neondatabase/serverless';
import * as suitedash from './suitedash.js';

// ── Neon Connection ────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL || '';

// Singleton connection — reused across all queries in a request
const _sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export function isConnected() {
  return !!DATABASE_URL && !!_sql;
}

// Export the raw sql function for admin files that need direct queries
export function getSql() {
  return _sql;
}

// Re-export SuiteDash config check
export function isSuiteDashConnected() {
  return suitedash.isConfigured();
}

// ── Generic query helper ───────────────────────────────────

async function query(text, params = []) {
  if (!_sql) return null;
  try {
    return await _sql.query(text, params);
  } catch (err) {
    console.error('DB query error:', err.message, text.slice(0, 80));
    throw err;
  }
}

// ── Organizations ──────────────────────────────────────────

export async function getOrganization(id) {
  const rows = await query('SELECT * FROM organizations WHERE id = $1', [id]);
  return rows?.[0] || null;
}

export async function getOrganizationByDos(dosNumber) {
  const rows = await query('SELECT * FROM organizations WHERE dos_number = $1', [dosNumber]);
  return rows?.[0] || null;
}

export async function createOrganization(org) {
  const rows = await query(
    `INSERT INTO organizations (legal_name, display_name, entity_type, jurisdiction, dos_number, formation_date, entity_status, principal_address, registered_office_address, partner_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [org.legal_name, org.display_name, org.entity_type, org.jurisdiction || 'PA', org.dos_number,
     org.formation_date, org.entity_status || 'pending_verification',
     JSON.stringify(org.principal_address || {}), JSON.stringify(org.registered_office_address || {}),
     org.partner_id, JSON.stringify(org.metadata || {})]
  );
  const created = rows?.[0];

  // Sync to SuiteDash as a Company
  if (created && suitedash.isConfigured()) {
    try {
      const sdResult = await suitedash.createCompany({
        name: org.legal_name,
        role: 'client',
        custom_fields: {
          entity_type: org.entity_type,
          dos_number: org.dos_number || '',
          neon_org_id: created.id,
          compliance_status: 'active'
        }
      });
      if (sdResult.success && sdResult.data?.uid) {
        await query('UPDATE organizations SET metadata = metadata || $1 WHERE id = $2',
          [JSON.stringify({ suitedash_uid: sdResult.data.uid }), created.id]);
      }
    } catch (e) { console.error('SuiteDash company sync failed:', e.message); }
  }

  return created;
}

export async function updateOrganization(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(updates)) {
    if (['legal_name','display_name','entity_type','jurisdiction','dos_number','formation_date',
         'entity_status','partner_id'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(val);
    } else if (['principal_address','registered_office_address','metadata'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(JSON.stringify(val));
    }
  }
  if (!setClauses.length) return await getOrganization(id);
  setClauses.push(`updated_at = now()`);
  values.push(id);
  const rows = await query(`UPDATE organizations SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows?.[0] || null;
}

// ── Clients (Neon + SuiteDash hybrid) ──────────────────────
// Neon stores the client record for compliance engine joins.
// SuiteDash is the CRM master — portal access, onboarding, invoicing.

export async function getClientById(id) {
  const rows = await query('SELECT * FROM clients WHERE id = $1', [id]);
  return rows?.[0] || null;
}

export async function getClientByEmail(email) {
  // Try Neon first
  const rows = await query(
    `SELECT c.*, o.legal_name, o.entity_type, o.jurisdiction, o.dos_number, o.entity_status
     FROM clients c LEFT JOIN organizations o ON c.organization_id = o.id
     WHERE c.email = $1`, [email]);
  if (rows?.[0]) return rows[0];

  // Fall back to SuiteDash
  if (suitedash.isConfigured()) {
    const sdClient = await suitedash.findClientByEmail(email);
    if (sdClient) {
      return {
        id: sdClient.uid,
        email: sdClient.email,
        owner_name: sdClient.name || `${sdClient.first_name || ''} ${sdClient.last_name || ''}`.trim(),
        phone: sdClient.phone,
        plan_code: sdClient.custom_fields?.plan_code || 'compliance_only',
        organization_id: sdClient.custom_fields?.neon_org_id || null,
        billing_status: 'active',
        onboarding_status: sdClient.custom_fields?.onboarding_status || 'not_started',
        metadata: { suitedash_uid: sdClient.uid, source: 'suitedash' }
      };
    }
  }

  return null;
}

export async function createClientRecord(client) {
  const rows = await query(
    `INSERT INTO clients (organization_id, owner_name, email, phone, plan_code, billing_status, onboarding_status, referral_code, referred_by_client_id, communication_prefs, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [client.organization_id, client.owner_name, client.email, client.phone,
     client.plan_code || 'compliance_only', client.billing_status || 'inactive',
     client.onboarding_status || 'not_started', client.referral_code,
     client.referred_by_client_id, JSON.stringify(client.communication_prefs || {}),
     JSON.stringify(client.metadata || {})]
  );
  const created = rows?.[0];

  // Sync to SuiteDash as Contact
  if (created && suitedash.isConfigured()) {
    try {
      const names = (client.owner_name || '').split(' ');
      await suitedash.createContact({
        first_name: names[0] || '',
        last_name: names.slice(1).join(' ') || '',
        email: client.email,
        phone: client.phone || '',
        role: 'client',
        send_welcome_email: true,
        custom_fields: {
          plan_code: client.plan_code,
          neon_org_id: client.organization_id,
          compliance_status: 'active'
        }
      });
    } catch (e) { console.error('SuiteDash contact sync failed:', e.message); }
  }

  return created;
}

export async function updateClient(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(updates)) {
    if (['organization_id','owner_name','email','phone','plan_code','billing_status',
         'onboarding_status','referral_code','referred_by_client_id'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(val);
    } else if (['communication_prefs','metadata'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(JSON.stringify(val));
    }
  }
  if (!setClauses.length) return await getClientById(id);
  setClauses.push(`updated_at = now()`);
  values.push(id);
  const rows = await query(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows?.[0] || null;
}

// ── Rules ──────────────────────────────────────────────────

export async function getActiveRule(jurisdiction, entityType, obligationType) {
  const rows = await query(
    `SELECT * FROM rules WHERE jurisdiction = $1 AND entity_type = $2 AND obligation_type = $3 AND is_active = true`,
    [jurisdiction, entityType, obligationType]);
  return rows?.[0] || null;
}

export async function getAllActiveRules(jurisdiction) {
  const rows = await query(
    'SELECT * FROM rules WHERE jurisdiction = $1 AND is_active = true ORDER BY entity_type',
    [jurisdiction || 'PA']);
  return rows || [];
}

export async function getAllRules() {
  const rows = await query('SELECT * FROM rules ORDER BY jurisdiction, entity_type, effective_date');
  return rows || [];
}

export async function createRule(rule) {
  const rows = await query(
    `INSERT INTO rules (jurisdiction, entity_type, obligation_type, version, effective_date, is_active, authority_source, authority_url, rule_json, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [rule.jurisdiction, rule.entity_type, rule.obligation_type, rule.version,
     rule.effective_date, rule.is_active ?? true, rule.authority_source,
     rule.authority_url, JSON.stringify(rule.rule_json), rule.created_by]);
  return rows?.[0] || null;
}

export async function publishRule(ruleId) {
  const existing = await query('SELECT * FROM rules WHERE id = $1', [ruleId]);
  if (!existing?.[0]) throw new Error('Rule not found');
  const rule = existing[0];
  // Supersede previous
  await query(
    `UPDATE rules SET is_active = false, superseded_at = now()
     WHERE jurisdiction = $1 AND entity_type = $2 AND obligation_type = $3 AND is_active = true AND id != $4`,
    [rule.jurisdiction, rule.entity_type, rule.obligation_type, ruleId]);
  // Activate this one
  const rows = await query('UPDATE rules SET is_active = true WHERE id = $1 RETURNING *', [ruleId]);
  return rows?.[0] || null;
}

// ── Obligations ────────────────────────────────────────────

export async function getObligationsForOrg(orgId) {
  const rows = await query('SELECT * FROM obligations WHERE organization_id = $1 ORDER BY due_date', [orgId]);
  return rows || [];
}

export async function getObligation(id) {
  const rows = await query(
    `SELECT o.*, org.legal_name, org.entity_type, org.jurisdiction
     FROM obligations o LEFT JOIN organizations org ON o.organization_id = org.id
     WHERE o.id = $1`, [id]);
  const row = rows?.[0];
  if (row) row.organizations = { legal_name: row.legal_name, entity_type: row.entity_type, jurisdiction: row.jurisdiction };
  return row || null;
}

export async function createObligation(obl) {
  const rows = await query(
    `INSERT INTO obligations (organization_id, obligation_type, jurisdiction, rule_id, rule_version, due_date, fee_usd, obligation_status, escalation_level, filing_method, source_reason, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [obl.organization_id, obl.obligation_type, obl.jurisdiction, obl.rule_id,
     obl.rule_version, obl.due_date, obl.fee_usd, obl.obligation_status || 'created',
     obl.escalation_level || 'none', obl.filing_method, obl.source_reason,
     JSON.stringify(obl.metadata || {})]);
  return rows?.[0] || null;
}

export async function updateObligation(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(updates)) {
    if (['obligation_status','escalation_level','filing_method','closed_at','source_reason'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(val);
    } else if (key === 'metadata') {
      setClauses.push(`metadata = $${i++}`);
      values.push(JSON.stringify(val));
    }
  }
  if (!setClauses.length) return null;
  setClauses.push(`updated_at = now()`);
  values.push(id);
  const rows = await query(`UPDATE obligations SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows?.[0] || null;
}

export async function getObligationsDueSoon(daysOut, jurisdiction) {
  const rows = await query(
    `SELECT o.*, org.legal_name, org.entity_type
     FROM obligations o LEFT JOIN organizations org ON o.organization_id = org.id
     WHERE o.due_date <= (CURRENT_DATE + $1 * INTERVAL '1 day')
     AND o.obligation_status NOT IN ('filed_confirmed','closed')
     ${jurisdiction ? 'AND o.jurisdiction = $2' : ''}
     ORDER BY o.due_date`,
    jurisdiction ? [daysOut, jurisdiction] : [daysOut]);
  return rows || [];
}

// ── Documents ──────────────────────────────────────────────

export async function getDocumentsForOrg(orgId) {
  const rows = await query('SELECT * FROM documents WHERE organization_id = $1 ORDER BY received_at DESC', [orgId]);
  return rows || [];
}

export async function createDocument(doc) {
  const rows = await query(
    `INSERT INTO documents (organization_id, obligation_id, document_type, source_channel, filename, mime_type, storage_key, storage_url, urgency, review_status, received_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [doc.organization_id, doc.obligation_id, doc.document_type, doc.source_channel,
     doc.filename, doc.mime_type, doc.storage_key, doc.storage_url,
     doc.urgency || 'normal', doc.review_status || 'pending',
     doc.received_at || new Date().toISOString(), JSON.stringify(doc.metadata || {})]);
  return rows?.[0] || null;
}

export async function updateDocument(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(updates)) {
    if (['document_type','urgency','review_status','processed_at','extracted_text','classifier_version'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(val);
    } else if (['extracted_entities','metadata'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(JSON.stringify(val));
    }
  }
  if (!setClauses.length) return null;
  values.push(id);
  const rows = await query(`UPDATE documents SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows?.[0] || null;
}

// ── Notifications ──────────────────────────────────────────

export async function getNotificationsForOrg(orgId) {
  const rows = await query('SELECT * FROM notifications WHERE organization_id = $1 ORDER BY scheduled_for DESC', [orgId]);
  return rows || [];
}

export async function createNotification(notif) {
  const rows = await query(
    `INSERT INTO notifications (organization_id, obligation_id, client_id, notification_type, channel, template_id, scheduled_for, delivery_status, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [notif.organization_id, notif.obligation_id, notif.client_id,
     notif.notification_type, notif.channel || 'email', notif.template_id,
     notif.scheduled_for, notif.delivery_status || 'scheduled',
     JSON.stringify(notif.metadata || {})]);
  return rows?.[0] || null;
}

export async function updateNotification(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(updates)) {
    if (['delivery_status','sent_at','retry_count','provider_message_id'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(val);
    } else if (key === 'metadata') {
      setClauses.push(`metadata = $${i++}`);
      values.push(JSON.stringify(val));
    }
  }
  if (!setClauses.length) return null;
  values.push(id);
  const rows = await query(`UPDATE notifications SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows?.[0] || null;
}

export async function getPendingNotifications() {
  const rows = await query(
    `SELECT n.*, o.legal_name as org_name, o.entity_type, obl.due_date, obl.filing_method
     FROM notifications n
     LEFT JOIN organizations o ON n.organization_id = o.id
     LEFT JOIN obligations obl ON n.obligation_id = obl.id
     WHERE n.delivery_status = 'scheduled' AND n.scheduled_for <= now()
     ORDER BY n.scheduled_for LIMIT 100`);
  return rows || [];
}

// ── Billing ────────────────────────────────────────────────

export async function getBillingAccount(clientId) {
  const rows = await query('SELECT * FROM billing_accounts WHERE client_id = $1', [clientId]);
  return rows?.[0] || null;
}

export async function upsertBillingAccount(account) {
  const rows = await query(
    `INSERT INTO billing_accounts (client_id, stripe_customer_id, stripe_subscription_id, current_period_end, billing_status, plan_code, entitlements)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (client_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       current_period_end = EXCLUDED.current_period_end,
       billing_status = EXCLUDED.billing_status,
       plan_code = EXCLUDED.plan_code,
       entitlements = EXCLUDED.entitlements,
       updated_at = now()
     RETURNING *`,
    [account.client_id, account.stripe_customer_id, account.stripe_subscription_id,
     account.current_period_end, account.billing_status, account.plan_code,
     JSON.stringify(account.entitlements || {})]);
  return rows?.[0] || null;
}

// ── Referrals ──────────────────────────────────────────────

export async function getReferrals(clientId) {
  const rows = await query('SELECT * FROM referrals WHERE referrer_client_id = $1 ORDER BY created_at DESC', [clientId]);
  return rows || [];
}

export async function createReferral(ref) {
  const rows = await query(
    `INSERT INTO referrals (referrer_client_id, referred_email, referral_status, metadata)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [ref.referrer_client_id, ref.referred_email, ref.referral_status || 'invited',
     JSON.stringify(ref.metadata || {})]);
  return rows?.[0] || null;
}

// ── AI Conversations ───────────────────────────────────────

export async function logAIConversation(conv) {
  try {
    const rows = await query(
      `INSERT INTO ai_conversations (organization_id, client_id, channel, user_message, assistant_answer, source_refs, confidence_score, escalation_flag, moderation_flag, model_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [conv.organization_id, conv.client_id, conv.channel, conv.user_message,
       conv.assistant_answer, JSON.stringify(conv.source_refs || []),
       conv.confidence_score, conv.escalation_flag || false,
       conv.moderation_flag || false, conv.model_name]);
    return rows?.[0] || null;
  } catch (err) {
    console.error('AI conversation log failed:', err.message);
    return null;
  }
}

// ── Audit Events ───────────────────────────────────────────

export async function writeAuditEvent(event) {
  try {
    const rows = await query(
      `INSERT INTO audit_events (actor_type, actor_id, event_type, target_type, target_id, before_json, after_json, reason, correlation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [event.actor_type, event.actor_id, event.event_type, event.target_type,
       event.target_id, event.before_json ? JSON.stringify(event.before_json) : null,
       event.after_json ? JSON.stringify(event.after_json) : null,
       event.reason, event.correlation_id]);
    return rows?.[0] || null;
  } catch (err) {
    console.log('AUDIT (write failed):', JSON.stringify(event));
    return null;
  }
}

export async function getAuditEvents({ targetType, targetId, eventType, since, limit = 50 }) {
  let where = 'WHERE 1=1';
  const params = [];
  let i = 1;
  if (targetType) { where += ` AND target_type = $${i++}`; params.push(targetType); }
  if (targetId) { where += ` AND target_id = $${i++}`; params.push(targetId); }
  if (eventType) { where += ` AND event_type = $${i++}`; params.push(eventType); }
  if (since) { where += ` AND created_at >= $${i++}`; params.push(since); }
  params.push(limit);
  const rows = await query(`SELECT * FROM audit_events ${where} ORDER BY created_at DESC LIMIT $${i}`, params);
  return rows || [];
}

// ── Workflow Jobs ──────────────────────────────────────────

export async function createWorkflowJob(job) {
  const rows = await query(
    `INSERT INTO workflow_jobs (job_type, job_status, payload, max_attempts, scheduled_for, correlation_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [job.job_type, job.job_status || 'queued', JSON.stringify(job.payload),
     job.max_attempts || 5, job.scheduled_for || new Date().toISOString(),
     job.correlation_id]);
  return rows?.[0] || null;
}

export async function getFailedJobs(limit = 50) {
  const rows = await query(
    `SELECT * FROM workflow_jobs WHERE job_status IN ('failed','dead_letter') ORDER BY created_at DESC LIMIT $1`,
    [limit]);
  return rows || [];
}

// ── Document by ID ────────────────────────────────────────

export async function getDocument(id) {
  const rows = await query(
    `SELECT d.*, o.legal_name, o.entity_type, obl.obligation_type, obl.due_date as obligation_due_date
     FROM documents d
     LEFT JOIN organizations o ON d.organization_id = o.id
     LEFT JOIN obligations obl ON d.obligation_id = obl.id
     WHERE d.id = $1`, [id]);
  return rows?.[0] || null;
}

// ── Workflow Job by ID ────────────────────────────────────

export async function getWorkflowJob(id) {
  const rows = await query('SELECT * FROM workflow_jobs WHERE id = $1', [id]);
  return rows?.[0] || null;
}

export async function updateWorkflowJob(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(updates)) {
    if (['job_status', 'attempt_count', 'last_error', 'completed_at'].includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(val);
    } else if (key === 'payload') {
      setClauses.push(`payload = $${i++}`);
      values.push(JSON.stringify(val));
    }
  }
  if (!setClauses.length) return null;
  setClauses.push(`updated_at = now()`);
  values.push(id);
  const rows = await query(`UPDATE workflow_jobs SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows?.[0] || null;
}

// ── Partner Clients ───────────────────────────────────────

export async function getPartnerClients(partnerId) {
  const rows = await query(
    `SELECT c.*, o.legal_name, o.entity_type, o.entity_status, o.dos_number,
            b.plan_code as billing_plan, b.billing_status
     FROM clients c
     LEFT JOIN organizations o ON c.organization_id = o.id
     LEFT JOIN billing_accounts b ON c.id = b.client_id
     WHERE o.partner_id = $1
     ORDER BY c.created_at DESC`, [partnerId]);
  return rows || [];
}

// ── AI Conversations ──────────────────────────────────────

export async function getAIConversations({ orgId, clientId, escalated, limit = 50 }) {
  let where = 'WHERE 1=1';
  const params = [];
  let i = 1;
  if (orgId) { where += ` AND organization_id = $${i++}`; params.push(orgId); }
  if (clientId) { where += ` AND client_id = $${i++}`; params.push(clientId); }
  if (escalated) { where += ` AND escalation_flag = true`; }
  params.push(limit);
  const rows = await query(`SELECT * FROM ai_conversations ${where} ORDER BY created_at DESC LIMIT $${i}`, params);
  return rows || [];
}

// ── SuiteDash passthrough for direct CRM operations ────────

export { suitedash };
