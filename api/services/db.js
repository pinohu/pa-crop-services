// PA CROP Services — Database Service
// Tech spec: section 6 (Data architecture)
// Provides Supabase client + typed query helpers for all domain objects.
// Falls back gracefully when SUPABASE_URL is not set (dev/preview mode).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _client = null;

export function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _client;
}

export function isConnected() {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

// ── Organizations ──────────────────────────────────────────

export async function getOrganization(id) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('organizations').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getOrganizationByDos(dosNumber) {
  const db = getClient();
  if (!db) return null;
  const { data } = await db.from('organizations').select('*').eq('dos_number', dosNumber).single();
  return data;
}

export async function createOrganization(org) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('organizations').insert(org).select().single();
  if (error) throw error;
  return data;
}

export async function updateOrganization(id, updates) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('organizations').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Clients ────────────────────────────────────────────────

export async function getClient_ById(id) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getClientByEmail(email) {
  const db = getClient();
  if (!db) return null;
  const { data } = await db.from('clients').select('*, organizations(*)').eq('email', email).single();
  return data;
}

export async function createClientRecord(client) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('clients').insert(client).select().single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, updates) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('clients').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Rules ──────────────────────────────────────────────────

export async function getActiveRule(jurisdiction, entityType, obligationType) {
  const db = getClient();
  if (!db) return null;
  const { data } = await db.from('rules').select('*')
    .eq('jurisdiction', jurisdiction)
    .eq('entity_type', entityType)
    .eq('obligation_type', obligationType)
    .eq('is_active', true)
    .single();
  return data;
}

export async function getAllActiveRules(jurisdiction) {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('rules').select('*')
    .eq('jurisdiction', jurisdiction || 'PA')
    .eq('is_active', true)
    .order('entity_type');
  return data || [];
}

export async function getAllRules() {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('rules').select('*').order('jurisdiction, entity_type, effective_date');
  return data || [];
}

export async function createRule(rule) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('rules').insert(rule).select().single();
  if (error) throw error;
  return data;
}

export async function publishRule(ruleId) {
  const db = getClient();
  if (!db) return null;
  const rule = await db.from('rules').select('*').eq('id', ruleId).single();
  if (!rule.data) throw new Error('Rule not found');
  // Supersede previous active rule
  await db.from('rules').update({ is_active: false, superseded_at: new Date().toISOString() })
    .eq('jurisdiction', rule.data.jurisdiction)
    .eq('entity_type', rule.data.entity_type)
    .eq('obligation_type', rule.data.obligation_type)
    .eq('is_active', true)
    .neq('id', ruleId);
  // Activate this rule
  const { data, error } = await db.from('rules').update({ is_active: true }).eq('id', ruleId).select().single();
  if (error) throw error;
  return data;
}

// ── Obligations ────────────────────────────────────────────

export async function getObligationsForOrg(orgId) {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('obligations').select('*').eq('organization_id', orgId).order('due_date');
  return data || [];
}

export async function getObligation(id) {
  const db = getClient();
  if (!db) return null;
  const { data } = await db.from('obligations').select('*, organizations(*)').eq('id', id).single();
  return data;
}

export async function createObligation(obl) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('obligations').insert(obl).select().single();
  if (error) throw error;
  return data;
}

export async function updateObligation(id, updates) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('obligations').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getObligationsDueSoon(daysOut, jurisdiction) {
  const db = getClient();
  if (!db) return [];
  const future = new Date();
  future.setDate(future.getDate() + daysOut);
  let q = db.from('obligations').select('*, organizations(*)')
    .lte('due_date', future.toISOString().split('T')[0])
    .not('obligation_status', 'in', '("filed_confirmed","closed")')
    .order('due_date');
  if (jurisdiction) q = q.eq('jurisdiction', jurisdiction);
  const { data } = await q;
  return data || [];
}

// ── Documents ──────────────────────────────────────────────

export async function getDocumentsForOrg(orgId) {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('documents').select('*').eq('organization_id', orgId).order('received_at', { ascending: false });
  return data || [];
}

export async function createDocument(doc) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('documents').insert(doc).select().single();
  if (error) throw error;
  return data;
}

export async function updateDocument(id, updates) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('documents').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Notifications ──────────────────────────────────────────

export async function getNotificationsForOrg(orgId) {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('notifications').select('*').eq('organization_id', orgId).order('scheduled_for', { ascending: false });
  return data || [];
}

export async function createNotification(notif) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('notifications').insert(notif).select().single();
  if (error) throw error;
  return data;
}

export async function updateNotification(id, updates) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('notifications').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getPendingNotifications() {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('notifications').select('*, organizations(*), obligations(*)')
    .eq('delivery_status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for')
    .limit(100);
  return data || [];
}

// ── Billing ────────────────────────────────────────────────

export async function getBillingAccount(clientId) {
  const db = getClient();
  if (!db) return null;
  const { data } = await db.from('billing_accounts').select('*').eq('client_id', clientId).single();
  return data;
}

export async function upsertBillingAccount(account) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('billing_accounts').upsert(account, { onConflict: 'client_id' }).select().single();
  if (error) throw error;
  return data;
}

// ── Referrals ──────────────────────────────────────────────

export async function getReferrals(clientId) {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('referrals').select('*').eq('referrer_client_id', clientId).order('created_at', { ascending: false });
  return data || [];
}

export async function createReferral(ref) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('referrals').insert(ref).select().single();
  if (error) throw error;
  return data;
}

// ── AI Conversations ───────────────────────────────────────

export async function logAIConversation(conv) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('ai_conversations').insert(conv).select().single();
  if (error) { console.error('AI conversation log failed:', error.message); return null; }
  return data;
}

// ── Audit Events ───────────────────────────────────────────

export async function writeAuditEvent(event) {
  const db = getClient();
  if (!db) { console.log('AUDIT (no DB):', JSON.stringify(event)); return null; }
  const { data, error } = await db.from('audit_events').insert(event).select().single();
  if (error) { console.error('Audit write failed:', error.message); return null; }
  return data;
}

export async function getAuditEvents({ targetType, targetId, eventType, since, limit = 50 }) {
  const db = getClient();
  if (!db) return [];
  let q = db.from('audit_events').select('*');
  if (targetType) q = q.eq('target_type', targetType);
  if (targetId) q = q.eq('target_id', targetId);
  if (eventType) q = q.eq('event_type', eventType);
  if (since) q = q.gte('created_at', since);
  const { data } = await q.order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

// ── Workflow Jobs ──────────────────────────────────────────

export async function createWorkflowJob(job) {
  const db = getClient();
  if (!db) return null;
  const { data, error } = await db.from('workflow_jobs').insert(job).select().single();
  if (error) throw error;
  return data;
}

export async function getFailedJobs(limit = 50) {
  const db = getClient();
  if (!db) return [];
  const { data } = await db.from('workflow_jobs').select('*')
    .in('job_status', ['failed', 'dead_letter'])
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
