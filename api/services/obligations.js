// PA CROP Services — Obligation Service
// Tech spec: sections 5.3, 6.1, 6.2, 6.3
// State machine, deadline computation, risk scoring backed by Postgres.

import * as db from './db.js';

// ── State Machine (section 6.1) ────────────────────────────

const VALID_TRANSITIONS = {
  created:                    ['upcoming'],
  upcoming:                   ['reminder_scheduled', 'overdue', 'filed_pending_confirmation'],
  reminder_scheduled:         ['reminder_sent', 'overdue', 'filed_pending_confirmation'],
  reminder_sent:              ['awaiting_client_input', 'overdue', 'filed_pending_confirmation'],
  awaiting_client_input:      ['ready_to_file', 'overdue', 'filed_pending_confirmation'],
  ready_to_file:              ['filed_pending_confirmation', 'overdue'],
  filed_pending_confirmation: ['filed_confirmed'],
  filed_confirmed:            ['closed'],
  overdue:                    ['escalated', 'filed_pending_confirmation'],
  escalated:                  ['filed_pending_confirmation', 'closed']
};

const ESCALATION_ORDER = ['none', 'low', 'medium', 'high', 'critical'];

export function canTransition(fromStatus, toStatus) {
  return (VALID_TRANSITIONS[fromStatus] || []).includes(toStatus);
}

export async function transition(obligationId, toStatus, actor, reason) {
  const obl = await db.getObligation(obligationId);
  if (!obl) throw new Error('Obligation not found');

  if (!canTransition(obl.obligation_status, toStatus)) {
    throw new Error(`Invalid transition: ${obl.obligation_status} → ${toStatus}`);
  }

  const before = { status: obl.obligation_status, escalation_level: obl.escalation_level };
  const updates = { obligation_status: toStatus };

  if (toStatus === 'closed') updates.closed_at = new Date().toISOString();
  if (toStatus === 'overdue') updates.escalation_level = 'low';
  if (toStatus === 'escalated') {
    const currentIdx = ESCALATION_ORDER.indexOf(obl.escalation_level);
    updates.escalation_level = ESCALATION_ORDER[Math.min(currentIdx + 1, ESCALATION_ORDER.length - 1)];
  }

  const updated = await db.updateObligation(obligationId, updates);

  await db.writeAuditEvent({
    actor_type: actor?.type || 'system',
    actor_id: actor?.id || 'obligation-service',
    event_type: 'obligation.status_changed',
    target_type: 'obligation',
    target_id: obligationId,
    before_json: before,
    after_json: { status: toStatus, escalation_level: updates.escalation_level || obl.escalation_level },
    reason
  });

  return updated;
}

// ── Obligation Creation from Rules ─────────────────────────

export async function computeObligations(orgId, year) {
  const org = await db.getOrganization(orgId);
  if (!org) throw new Error('Organization not found');

  const rule = await db.getActiveRule(org.jurisdiction, org.entity_type, 'annual_report');
  if (!rule) return { created: 0, updated: 0, message: 'No active rule for this entity type' };

  const ruleJson = rule.rule_json;
  const dueDate = `${year}-${String(ruleJson.due_date_rule.month).padStart(2, '0')}-${String(ruleJson.due_date_rule.day).padStart(2, '0')}`;

  // Check if obligation already exists
  const existing = await db.getObligationsForOrg(orgId);
  const match = existing.find(o => o.obligation_type === 'annual_report' && o.due_date === dueDate);

  if (match) {
    return { created: 0, updated: 0, existing_id: match.id, message: 'Obligation already exists' };
  }

  const obl = await db.createObligation({
    organization_id: orgId,
    obligation_type: 'annual_report',
    jurisdiction: org.jurisdiction,
    rule_id: rule.id,
    rule_version: rule.version,
    due_date: dueDate,
    fee_usd: ruleJson.fee?.amount_usd || 7,
    obligation_status: 'created',
    filing_method: ruleJson.filing?.client_action_required ? 'self' : 'managed',
    source_reason: `Computed from rule ${rule.id} v${rule.version}`
  });

  // Immediately transition to upcoming if due date exists
  if (obl) {
    await transition(obl.id, 'upcoming', { type: 'system', id: 'obligation-service' }, 'Auto-created from rules');
  }

  await db.writeAuditEvent({
    actor_type: 'system',
    actor_id: 'obligation-service',
    event_type: 'obligation.created',
    target_type: 'obligation',
    target_id: obl.id,
    after_json: obl,
    reason: `Annual report obligation for ${year}`
  });

  return { created: 1, updated: 0, obligation_id: obl.id };
}

// ── Risk Scoring ───────────────────────────────────────────

export function computeRisk(obligations) {
  if (!obligations?.length) return 'low';
  const now = new Date();

  let maxRisk = 0;
  for (const obl of obligations) {
    if (obl.obligation_status === 'escalated') maxRisk = Math.max(maxRisk, 4);
    else if (obl.obligation_status === 'overdue') maxRisk = Math.max(maxRisk, 3);
    else if (obl.escalation_level === 'high' || obl.escalation_level === 'critical') maxRisk = Math.max(maxRisk, 3);
    else {
      const due = new Date(obl.due_date);
      const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) maxRisk = Math.max(maxRisk, 3);
      else if (daysUntil < 14) maxRisk = Math.max(maxRisk, 2);
      else if (daysUntil < 30) maxRisk = Math.max(maxRisk, 1);
    }
  }

  return ['low', 'medium', 'medium', 'high', 'critical'][maxRisk] || 'low';
}

// ── Mark Filed ─────────────────────────────────────────────

export async function markFiled(obligationId, proof, actor) {
  return transition(obligationId, 'filed_pending_confirmation', actor, `Filed. Proof: ${proof?.filing_reference || 'none'}`);
}

// ── Reminder Scheduling ────────────────────────────────────

export async function scheduleReminders(obligationId) {
  const obl = await db.getObligation(obligationId);
  if (!obl) return [];

  const rule = await db.getActiveRule(obl.jurisdiction, obl.organizations?.entity_type, obl.obligation_type);
  if (!rule) return [];

  const reminders = rule.rule_json?.reminders || [];
  const dueDate = new Date(obl.due_date);
  const created = [];

  for (const r of reminders) {
    const sendDate = new Date(dueDate);
    sendDate.setDate(sendDate.getDate() - r.days_before);
    if (sendDate <= new Date()) continue; // Skip past dates

    const notif = await db.createNotification({
      organization_id: obl.organization_id,
      obligation_id: obligationId,
      notification_type: `annual_report_${r.days_before}`,
      channel: 'email',
      template_id: `annual_report_${r.days_before}`,
      scheduled_for: sendDate.toISOString(),
      delivery_status: 'scheduled'
    });
    if (notif) created.push(notif);
  }

  if (created.length > 0 && canTransition(obl.obligation_status, 'reminder_scheduled')) {
    await transition(obligationId, 'reminder_scheduled', { type: 'system', id: 'scheduler' }, `${created.length} reminders scheduled`);
  }

  return created;
}

// ── Evaluate (daily check) ─────────────────────────────────

export async function evaluateObligation(obligationId) {
  const obl = await db.getObligation(obligationId);
  if (!obl) return null;

  const now = new Date();
  const due = new Date(obl.due_date);
  const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  // Check for overdue
  if (daysUntil < 0 && !['overdue', 'escalated', 'filed_pending_confirmation', 'filed_confirmed', 'closed'].includes(obl.obligation_status)) {
    if (canTransition(obl.obligation_status, 'overdue')) {
      await transition(obligationId, 'overdue', { type: 'system', id: 'scheduler' }, 'Deadline passed');
    }
  }

  // Escalate if already overdue and beyond threshold
  if (obl.obligation_status === 'overdue' && daysUntil < -30) {
    await transition(obligationId, 'escalated', { type: 'system', id: 'scheduler' }, `${Math.abs(daysUntil)} days overdue`);
  }

  return { obligation_id: obligationId, status: obl.obligation_status, days_until: daysUntil };
}
