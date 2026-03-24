// PA CROP Services — Compliance Scheduler Webhook
// POST /api/scheduler { action: 'process_reminders' | 'evaluate_all' | 'overdue_check' }
// Called by n8n daily cron workflows. Admin-key protected.
//
// This is the scheduler brain — it reads all entities from Redis,
// evaluates their obligations, and returns a list of actions to take.
// n8n then executes each action (send email, send SMS, escalate, etc.)

import { getRules } from './_compliance.js';
import { obligations } from './_obligations.js';
import { db } from './_db.js';
import { createLogger } from './_log.js';

const logger = createLogger('scheduler');
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Admin key required
  const key = req.headers['x-admin-key'] || req.body?.adminKey;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });

  const { action, entityIds, year, deadlineGroup } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action required' });

  const y = parseInt(year) || new Date().getFullYear();
  const rules = getRules();

  switch (action) {

    // ── Process reminders for a batch of entities ──
    // n8n sends entityIds from its entity list. Scheduler evaluates each
    // and returns which reminders need to be sent.
    case 'process_reminders': {
      if (!entityIds || !Array.isArray(entityIds)) {
        return res.status(400).json({ error: 'entityIds array required' });
      }

      const results = [];
      let processed = 0;
      let remindersNeeded = 0;

      for (const id of entityIds) {
        const entity = await db.getEntity(id);
        if (!entity) continue;

        // Only process entities matching the deadline group if specified
        if (deadlineGroup) {
          const config = obligations.computeForEntity(entity, y);
          const group = rules.deadlineGroups[deadlineGroup];
          if (group && config.dueDate !== `${y}-${group.deadline}`) continue;
        }

        const ob = await obligations.load(id, y, entity);
        if (!ob) continue;

        // Skip already filed/confirmed/resolved
        if (['FILED', 'CONFIRMED', 'RESOLVED'].includes(ob.status)) {
          processed++;
          continue;
        }

        const evaluation = obligations.evaluate(ob);
        const reminderActions = evaluation.actions.filter(a => a.action === 'SEND_REMINDER');
        const transitionActions = evaluation.actions.filter(a => a.action === 'TRANSITION');

        // Auto-execute transitions
        for (const ta of transitionActions) {
          const updated = obligations.transition(ob, ta.newStatus, { reason: ta.reason }, 'scheduler');
          if (updated) {
            await obligations.save(id, y, updated);
            await db.updateEntity(id, { riskLevel: evaluation.riskLevel });
          }
        }

        if (reminderActions.length > 0) {
          remindersNeeded += reminderActions.length;
          results.push({
            entityId: id,
            entityName: entity.name,
            entityType: entity.entityType,
            email: entity.email,
            plan: entity.plan,
            deadline: ob.dueDate,
            daysUntilDeadline: evaluation.obligation.daysUntilDeadline,
            riskLevel: evaluation.riskLevel,
            reminders: reminderActions.map(r => ({
              daysBeforeDeadline: r.daysBeforeDeadline,
              priority: r.priority
            })),
            filingMethod: ob.filingMethod
          });
        }

        processed++;
      }

      logger.info('reminders_processed', { processed, remindersNeeded, deadlineGroup, year: y });

      return res.status(200).json({
        success: true,
        processed,
        remindersNeeded,
        reminders: results
      });
    }

    // ── Evaluate all entities and return a compliance summary ──
    case 'evaluate_all': {
      if (!entityIds || !Array.isArray(entityIds)) {
        return res.status(400).json({ error: 'entityIds array required' });
      }

      const summary = {
        total: 0,
        byStatus: {},
        byRisk: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        overdue: [],
        atRisk: [],
        upcomingDeadlines: []
      };

      for (const id of entityIds) {
        const entity = await db.getEntity(id);
        if (!entity) continue;

        const ob = await obligations.load(id, y, entity);
        if (!ob) continue;

        const evaluation = obligations.evaluate(ob);
        const status = evaluation.obligation.status;
        const risk = evaluation.riskLevel;
        const days = evaluation.obligation.daysUntilDeadline;

        summary.total++;
        summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
        summary.byRisk[risk] = (summary.byRisk[risk] || 0) + 1;

        if (status === 'OVERDUE') {
          summary.overdue.push({ entityId: id, name: entity.name, entityType: entity.entityType, daysOverdue: Math.abs(days) });
        }
        if (risk === 'CRITICAL' || risk === 'HIGH') {
          summary.atRisk.push({ entityId: id, name: entity.name, entityType: entity.entityType, risk, status, days });
        }
        if (days > 0 && days <= 30 && !['FILED', 'CONFIRMED', 'RESOLVED'].includes(status)) {
          summary.upcomingDeadlines.push({ entityId: id, name: entity.name, daysUntilDeadline: days, deadline: ob.dueDate });
        }
      }

      logger.info('evaluate_all_complete', { total: summary.total, overdue: summary.overdue.length, atRisk: summary.atRisk.length });

      return res.status(200).json({ success: true, year: y, summary });
    }

    // ── Overdue escalation check ──
    case 'overdue_check': {
      if (!entityIds || !Array.isArray(entityIds)) {
        return res.status(400).json({ error: 'entityIds array required' });
      }

      const escalations = [];

      for (const id of entityIds) {
        const entity = await db.getEntity(id);
        if (!entity) continue;

        const ob = await obligations.load(id, y, entity);
        if (!ob || !['OVERDUE', 'ESCALATED'].includes(ob.status)) continue;

        const evaluation = obligations.evaluate(ob);
        const escalationActions = evaluation.actions.filter(a => a.action === 'TRANSITION' && a.newStatus === 'ESCALATED');

        if (escalationActions.length > 0) {
          // Auto-escalate
          const updated = obligations.transition(ob, 'ESCALATED', { reason: escalationActions[0].reason }, 'scheduler');
          if (updated) {
            await obligations.save(id, y, updated);
            await db.updateEntity(id, { riskLevel: 'CRITICAL', status: 'AT_RISK' });
          }
          escalations.push({
            entityId: id,
            name: entity.name,
            email: entity.email,
            entityType: entity.entityType,
            daysOverdue: Math.abs(evaluation.obligation.daysUntilDeadline),
            escalationLevel: (ob.escalationLevel || 0) + 1,
            canReinstate: ob.canReinstate,
            riskLevel: 'CRITICAL'
          });
        }
      }

      logger.info('overdue_check_complete', { checked: entityIds.length, escalated: escalations.length });

      return res.status(200).json({ success: true, escalations });
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${action}`, validActions: ['process_reminders', 'evaluate_all', 'overdue_check'] });
  }
}
