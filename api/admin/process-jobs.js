// PA CROP Services — Background Job Processor
// POST /api/admin/process-jobs { job_types?, limit? }
// Dequeues and processes workflow_jobs. Called by n8n cron or Vercel cron.
// Each job type has a handler that does the actual work.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { sendEmail, notifyAdmin } from '../services/notifications.js';
import { scheduleReminders } from '../services/obligations.js';
import { createLogger } from '../_log.js';

const log = createLogger('process-jobs');

// ── Job Handlers ──────────────────────────────────────────
// Each handler receives the job row and returns { success, result?, error? }

const JOB_HANDLERS = {
  // Admin reviews a managed-plan client's filing submission
  filing_review: async (job) => {
    const { obligation_id, organization_id, notes } = job.payload || {};
    if (!obligation_id) return { success: false, error: 'missing_obligation_id' };

    // Notify admin about the review queue item
    const obl = await db.getObligation(obligation_id);
    const org = obl?.organizations?.legal_name || organization_id;
    await notifyAdmin('Filing Review Required',
      `<p><strong>Entity:</strong> ${org}</p>
       <p><strong>Due:</strong> ${obl?.due_date || 'unknown'}</p>
       <p><strong>Notes:</strong> ${notes || 'None'}</p>
       <p><a href="https://pacropservices.com/admin">Review in Admin</a></p>`);

    return { success: true, result: 'admin_notified' };
  },

  // Schedule reminders for an obligation
  schedule_reminders: async (job) => {
    const { obligation_id } = job.payload || {};
    if (!obligation_id) return { success: false, error: 'missing_obligation_id' };

    const created = await scheduleReminders(obligation_id);
    return { success: true, result: { reminders_scheduled: created.length } };
  },

  // Send a notification
  send_notification: async (job) => {
    const { to, template_id, variables } = job.payload || {};
    if (!to || !template_id) return { success: false, error: 'missing_to_or_template' };

    const result = await sendEmail(to, template_id, variables || {});
    if (!result.success) return { success: false, error: result.error };
    return { success: true, result: { provider_message_id: result.provider_message_id } };
  },

  // Evaluate a single obligation (overdue check, escalation)
  evaluate_obligation: async (job) => {
    const { obligation_id } = job.payload || {};
    if (!obligation_id) return { success: false, error: 'missing_obligation_id' };

    const { evaluateObligation } = await import('../services/obligations.js');
    const result = await evaluateObligation(obligation_id);
    return { success: true, result };
  },

  // Compute obligations for an organization from rules
  compute_obligations: async (job) => {
    const { organization_id, year } = job.payload || {};
    if (!organization_id) return { success: false, error: 'missing_organization_id' };

    const { computeObligations } = await import('../services/obligations.js');
    const result = await computeObligations(organization_id, year || new Date().getFullYear());
    return { success: true, result };
  }
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  const { job_types, limit = 20 } = req.body || {};
  const sql = db.getSql();
  if (!sql) return res.status(503).json({ success: false, error: 'database_unavailable' });

  try {
    // Dequeue jobs: fetch queued jobs, oldest first
    const typeFilter = job_types?.length
      ? `AND job_type = ANY(ARRAY[${job_types.map((_, i) => `$${i + 3}`).join(',')}])`
      : '';
    const params = ['queued', limit, ...(job_types || [])];

    const jobs = await sql.query(
      `SELECT * FROM workflow_jobs
       WHERE job_status = $1 AND (scheduled_for IS NULL OR scheduled_for <= now())
       ${typeFilter}
       ORDER BY scheduled_for ASC NULLS FIRST, created_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      params
    );

    const results = { processed: 0, succeeded: 0, failed: 0, dead_lettered: 0, items: [] };

    for (const job of (jobs || [])) {
      const handler = JOB_HANDLERS[job.job_type];
      if (!handler) {
        await db.updateWorkflowJob(job.id, { job_status: 'failed', last_error: `Unknown job type: ${job.job_type}` });
        results.failed++;
        results.items.push({ id: job.id, type: job.job_type, status: 'failed', error: 'unknown_job_type' });
        continue;
      }

      // Mark as processing
      await db.updateWorkflowJob(job.id, { job_status: 'processing', attempt_count: (job.attempt_count || 0) + 1 });

      try {
        const result = await handler(job);

        if (result.success) {
          await db.updateWorkflowJob(job.id, {
            job_status: 'completed',
            completed_at: new Date().toISOString(),
            payload: { ...job.payload, result: result.result }
          });
          results.succeeded++;
          results.items.push({ id: job.id, type: job.job_type, status: 'completed' });
        } else {
          const attempts = (job.attempt_count || 0) + 1;
          const maxAttempts = job.max_attempts || 5;
          const newStatus = attempts >= maxAttempts ? 'dead_letter' : 'failed';

          await db.updateWorkflowJob(job.id, {
            job_status: newStatus,
            last_error: result.error || 'handler_returned_failure',
            attempt_count: attempts
          });

          if (newStatus === 'dead_letter') results.dead_lettered++;
          else results.failed++;

          results.items.push({ id: job.id, type: job.job_type, status: newStatus, error: result.error });
        }
      } catch (err) {
        const attempts = (job.attempt_count || 0) + 1;
        const maxAttempts = job.max_attempts || 5;
        const newStatus = attempts >= maxAttempts ? 'dead_letter' : 'failed';

        await db.updateWorkflowJob(job.id, {
          job_status: newStatus,
          last_error: err.message,
          attempt_count: attempts
        });

        if (newStatus === 'dead_letter') results.dead_lettered++;
        else results.failed++;

        results.items.push({ id: job.id, type: job.job_type, status: newStatus, error: err.message });
        log.error('job_execution_failed', { jobId: job.id, jobType: job.job_type }, err instanceof Error ? err : new Error(String(err)));
      }

      results.processed++;
    }

    // Audit
    if (results.processed > 0) {
      db.writeAuditEvent({
        actor_type: 'system', actor_id: 'job-processor',
        event_type: 'jobs.batch_processed',
        target_type: 'workflow_jobs', target_id: null,
        after_json: { processed: results.processed, succeeded: results.succeeded, failed: results.failed, dead_lettered: results.dead_lettered },
        reason: 'scheduled_processing'
      }).catch(() => {});
    }

    log.info('jobs_processed', results);
    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    log.error('process_jobs_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
