// PA CROP Services — Daily Compliance Automation
// POST /api/admin/run-compliance { action: "daily_eval"|"schedule_reminders"|"compute_all"|"full_cycle" }
// Runs compliance checks across all organizations in Neon.
// Called by n8n daily cron or Vercel cron.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { computeObligations, evaluateObligation, scheduleReminders } from '../services/obligations.js';
import { createLogger } from '../_log.js';

const log = createLogger('run-compliance');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  const { action, year } = req.body || {};
  const y = parseInt(year) || new Date().getFullYear();
  const sql = db.getSql();
  if (!sql) return res.status(503).json({ success: false, error: 'database_unavailable' });

  try {
    switch (action) {
      // Evaluate all open obligations for overdue/escalation
      case 'daily_eval': {
        const openObls = await sql`
          SELECT id FROM obligations
          WHERE obligation_status NOT IN ('filed_confirmed', 'closed')
          ORDER BY due_date ASC LIMIT 500
        `;

        const results = { evaluated: 0, transitioned: 0, errors: 0 };
        for (const row of (openObls || [])) {
          try {
            const result = await evaluateObligation(row.id);
            results.evaluated++;
            if (result?.status !== result?.previous_status) results.transitioned++;
          } catch {
            results.errors++;
          }
        }

        log.info('daily_eval_complete', results);
        return res.status(200).json({ success: true, action: 'daily_eval', year: y, ...results });
      }

      // Schedule reminders for obligations that don't have them yet
      case 'schedule_reminders': {
        const needReminders = await sql`
          SELECT o.id FROM obligations o
          LEFT JOIN notifications n ON n.obligation_id = o.id AND n.delivery_status = 'scheduled'
          WHERE o.obligation_status IN ('upcoming', 'created')
            AND o.due_date IS NOT NULL
            AND n.id IS NULL
          LIMIT 200
        `;

        const results = { processed: 0, reminders_created: 0 };
        for (const row of (needReminders || [])) {
          const created = await scheduleReminders(row.id);
          results.processed++;
          results.reminders_created += created.length;
        }

        log.info('schedule_reminders_complete', results);
        return res.status(200).json({ success: true, action: 'schedule_reminders', ...results });
      }

      // Compute obligations from rules for all active organizations
      case 'compute_all': {
        const orgs = await sql`
          SELECT id, entity_type, jurisdiction FROM organizations
          WHERE entity_status IN ('active', 'pending_verification')
          LIMIT 500
        `;

        const results = { processed: 0, created: 0, existing: 0, errors: 0 };
        for (const org of (orgs || [])) {
          try {
            const result = await computeObligations(org.id, y);
            results.processed++;
            results.created += result.created || 0;
            if (result.existing_id) results.existing++;
          } catch {
            results.errors++;
          }
        }

        log.info('compute_all_complete', results);
        return res.status(200).json({ success: true, action: 'compute_all', year: y, ...results });
      }

      // Full cycle: compute → evaluate → schedule reminders
      case 'full_cycle': {
        const startTime = Date.now();

        // Step 1: Compute obligations for all orgs
        const orgs = await sql`
          SELECT id FROM organizations WHERE entity_status IN ('active', 'pending_verification') LIMIT 500
        `;
        let computed = 0;
        for (const org of (orgs || [])) {
          try { await computeObligations(org.id, y); computed++; } catch { /* skip */ }
        }

        // Step 2: Evaluate all open obligations
        const openObls = await sql`
          SELECT id FROM obligations WHERE obligation_status NOT IN ('filed_confirmed', 'closed') LIMIT 500
        `;
        let evaluated = 0;
        for (const row of (openObls || [])) {
          try { await evaluateObligation(row.id); evaluated++; } catch { /* skip */ }
        }

        // Step 3: Schedule reminders
        const needReminders = await sql`
          SELECT o.id FROM obligations o
          LEFT JOIN notifications n ON n.obligation_id = o.id AND n.delivery_status = 'scheduled'
          WHERE o.obligation_status IN ('upcoming', 'created') AND o.due_date IS NOT NULL AND n.id IS NULL
          LIMIT 200
        `;
        let remindersCreated = 0;
        for (const row of (needReminders || [])) {
          const created = await scheduleReminders(row.id);
          remindersCreated += created.length;
        }

        const durationMs = Date.now() - startTime;

        // Audit
        db.writeAuditEvent({
          actor_type: 'system', actor_id: 'compliance-automation',
          event_type: 'compliance.full_cycle',
          target_type: 'system', target_id: null,
          after_json: { year: y, orgs_computed: computed, obligations_evaluated: evaluated, reminders_created: remindersCreated, duration_ms: durationMs },
          reason: 'daily_compliance_cycle'
        }).catch(() => {});

        log.info('full_cycle_complete', { computed, evaluated, remindersCreated, durationMs });
        return res.status(200).json({
          success: true, action: 'full_cycle', year: y,
          orgs_computed: computed,
          obligations_evaluated: evaluated,
          reminders_created: remindersCreated,
          duration_ms: durationMs
        });
      }

      default:
        return res.status(400).json({
          success: false,
          error: 'action must be daily_eval|schedule_reminders|compute_all|full_cycle'
        });
    }
  } catch (err) {
    log.error('run_compliance_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
