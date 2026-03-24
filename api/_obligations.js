// PA CROP Services — Obligation State Machine
// Manages the lifecycle of compliance obligations (annual reports, reinstatements, etc.)
//
// States: DETECTED → UPCOMING → REMINDER_SENT → AWAITING_CLIENT → READY_TO_FILE
//         → FILED → CONFIRMED | OVERDUE → ESCALATED → RESOLVED
//
// Usage:
//   import { obligations } from './_obligations.js';
//   const ob = await obligations.computeForEntity(entityRecord);
//   const next = obligations.transition(ob, 'REMINDER_SENT', { daysSent: 90 });
//   await obligations.save(entityId, year, next);

import { getEntityDeadline, computeDaysUntil, getEntityConfig, getRules } from './_compliance.js';
import { db } from './_db.js';
import { logStateChange } from './_log.js';

// ── Valid state transitions ──
const TRANSITIONS = {
  DETECTED:         ['UPCOMING'],
  UPCOMING:         ['REMINDER_SENT', 'FILED', 'OVERDUE'],
  REMINDER_SENT:    ['AWAITING_CLIENT', 'FILED', 'OVERDUE'],
  AWAITING_CLIENT:  ['READY_TO_FILE', 'FILED', 'OVERDUE'],
  READY_TO_FILE:    ['FILED', 'OVERDUE'],
  FILED:            ['CONFIRMED', 'RESOLVED'],
  CONFIRMED:        ['RESOLVED'],
  OVERDUE:          ['ESCALATED', 'FILED', 'RESOLVED'],
  ESCALATED:        ['FILED', 'RESOLVED'],
  RESOLVED:         [] // Terminal
};

/**
 * Check if a state transition is valid.
 */
function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Compute the obligation record for an entity + year.
 * Uses the compliance rules engine for deadlines and fees.
 * @param {{ id: string, entityType: string, plan?: string }} entity
 * @param {number} [year] - defaults to current year
 * @returns {object} obligation record
 */
function computeForEntity(entity, year) {
  const y = year || new Date().getFullYear();
  const config = getEntityConfig(entity.entityType);
  const deadline = getEntityDeadline(entity.entityType);
  const rules = getRules();
  const daysUntil = computeDaysUntil(entity.entityType);
  const reminderDays = rules.reminderSchedule.daysBeforeDeadline;

  // Determine initial status based on timeline
  let status = 'DETECTED';
  if (daysUntil <= reminderDays[0]) status = 'UPCOMING'; // within 90 days
  if (daysUntil <= 0) status = 'OVERDUE';

  // Filing method based on plan
  const managedPlans = ['business_pro', 'business_empire'];
  const filingMethod = managedPlans.includes(entity.plan) ? 'MANAGED' : 'SELF';

  return {
    entityId: entity.id,
    entityType: config.key,
    obligationType: 'ANNUAL_REPORT',
    jurisdiction: 'PA',
    year: y,
    dueDate: `${y}-${config.deadline}`,
    dueDateLabel: deadline.label,
    daysUntilDeadline: daysUntil,
    status,
    filingMethod,
    fee: config.fee,
    dissolutionTerm: config.dissolutionTerm,
    canReinstate: config.canReinstate,
    sourceRuleVersion: rules.version,
    remindersSent: [],
    escalationLevel: 0,
    confirmationNum: null,
    filedAt: null,
    filedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Transition an obligation to a new state.
 * Validates the transition, logs the change, returns the updated obligation.
 * @param {object} obligation - current obligation record
 * @param {string} newStatus - target status
 * @param {object} [context] - additional context for the transition
 * @param {string} [actor] - who triggered the transition
 * @returns {object} updated obligation, or null if transition invalid
 */
function transition(obligation, newStatus, context = {}, actor = 'system') {
  const oldStatus = obligation.status;

  if (!canTransition(oldStatus, newStatus)) {
    return null; // Invalid transition
  }

  const updated = {
    ...obligation,
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  // Apply context-specific updates
  if (newStatus === 'REMINDER_SENT' && context.daysSent) {
    updated.remindersSent = [...(obligation.remindersSent || []), context.daysSent];
  }
  if (newStatus === 'FILED') {
    updated.filedAt = context.filedAt || new Date().toISOString();
    updated.filedBy = context.filedBy || actor;
    updated.confirmationNum = context.confirmationNum || null;
  }
  if (newStatus === 'ESCALATED') {
    updated.escalationLevel = (obligation.escalationLevel || 0) + 1;
  }

  // Log the state change
  logStateChange({
    actor,
    eventType: 'obligation_state_change',
    targetType: 'obligation',
    targetId: `${obligation.entityId}:${obligation.year}`,
    orgId: obligation.entityId,
    beforeState: oldStatus,
    afterState: newStatus,
    reason: context.reason || `Transition ${oldStatus} → ${newStatus}`
  });

  return updated;
}

/**
 * Evaluate what action is needed for an obligation based on current state and timeline.
 * Returns an action recommendation for the scheduler/agent.
 */
function evaluate(obligation) {
  const { status, daysUntilDeadline, remindersSent, filingMethod, year } = obligation;
  const rules = getRules();
  const reminderSchedule = rules.reminderSchedule.daysBeforeDeadline; // [90, 60, 30, 14, 7]
  const currentYear = new Date().getFullYear();
  const isEnforcementYear = year >= rules.annualReport.enforcementStartYear; // 2027+

  // Recompute days (obligation might be stale)
  const freshDays = computeDaysUntil(obligation.entityType);

  const actions = [];

  // Check if any reminders are due but not yet sent
  for (const days of reminderSchedule) {
    if (freshDays <= days && !(remindersSent || []).includes(days)) {
      actions.push({
        action: 'SEND_REMINDER',
        daysBeforeDeadline: days,
        priority: days <= 14 ? 'HIGH' : 'NORMAL'
      });
    }
  }

  // Status-specific evaluations
  if (status === 'DETECTED' && freshDays <= reminderSchedule[0]) {
    actions.push({ action: 'TRANSITION', newStatus: 'UPCOMING', reason: 'Within reminder window' });
  }

  if (freshDays <= 0 && !['FILED', 'CONFIRMED', 'RESOLVED', 'OVERDUE', 'ESCALATED'].includes(status)) {
    actions.push({ action: 'TRANSITION', newStatus: 'OVERDUE', reason: 'Deadline passed', priority: 'CRITICAL' });
  }

  if (status === 'OVERDUE' && isEnforcementYear) {
    const monthsPastDeadline = Math.floor(Math.abs(freshDays) / 30);
    if (monthsPastDeadline >= 4) {
      actions.push({ action: 'TRANSITION', newStatus: 'ESCALATED', reason: `${monthsPastDeadline} months overdue in enforcement year`, priority: 'CRITICAL' });
    }
  }

  if (filingMethod === 'MANAGED' && status === 'UPCOMING' && freshDays <= 30) {
    actions.push({ action: 'PREPARE_FILING', reason: 'Managed client, 30 days to deadline', priority: 'HIGH' });
  }

  return {
    obligation: { ...obligation, daysUntilDeadline: freshDays },
    actions,
    riskLevel: computeRisk(obligation, freshDays, isEnforcementYear)
  };
}

/**
 * Compute risk level for an obligation.
 */
function computeRisk(obligation, daysUntil, isEnforcementYear) {
  const { status, canReinstate } = obligation;

  if (['FILED', 'CONFIRMED', 'RESOLVED'].includes(status)) return 'LOW';
  if (status === 'ESCALATED') return 'CRITICAL';
  if (status === 'OVERDUE' && isEnforcementYear && !canReinstate) return 'CRITICAL'; // Foreign entity
  if (status === 'OVERDUE' && isEnforcementYear) return 'HIGH';
  if (status === 'OVERDUE') return 'MEDIUM';
  if (daysUntil <= 7) return 'HIGH';
  if (daysUntil <= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Save an obligation to the database.
 */
async function save(entityId, year, obligation) {
  return db.setObligation(entityId, year, obligation);
}

/**
 * Load an obligation from the database, or compute a fresh one if not found.
 */
async function load(entityId, year, entityRecord) {
  const existing = await db.getObligation(entityId, year);
  if (existing) return existing;
  if (entityRecord) {
    const fresh = computeForEntity(entityRecord, year);
    await save(entityId, year, fresh);
    return fresh;
  }
  return null;
}

export const obligations = {
  TRANSITIONS,
  canTransition,
  computeForEntity,
  transition,
  evaluate,
  computeRisk,
  save,
  load
};
