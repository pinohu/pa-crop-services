// PA CROP Services — Retry Failed Workflow Job
// Requeues a failed or dead-letter job for another attempt.

import { setCors, isAdminRequest } from '../../../services/auth.js';
import * as db from '../../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const jobId = req.query.id;
  if (!jobId) return res.status(400).json({ success: false, error: 'missing_job_id' });

  try {
    if (!db.isConnected()) return res.status(200).json({ success: false, error: 'db_not_connected' });

    const sql = db.getSql();

    // Get the job
    const jobs = await sql.query('SELECT * FROM workflow_jobs WHERE id = $1', [jobId]);
    const job = jobs?.[0];
    if (!job) return res.status(404).json({ success: false, error: 'job_not_found' });

    if (!['failed', 'dead_letter'].includes(job.job_status)) {
      return res.status(400).json({ success: false, error: 'job_not_in_retryable_state', current_status: job.job_status });
    }

    // Reset to queued
    await sql.query(
      'UPDATE workflow_jobs SET job_status = $1, attempts = 0, last_error = NULL, updated_at = now() WHERE id = $2',
      ['queued', jobId]
    );

    await db.writeAuditEvent({
      actor_type: 'admin',
      actor_id: 'ike',
      event_type: 'workflow.job_retried',
      target_type: 'workflow_job',
      target_id: jobId,
      before_json: { status: job.job_status, attempts: job.attempts },
      after_json: { status: 'queued', attempts: 0 },
      reason: 'Admin manual retry'
    });

    return res.status(200).json({
      success: true,
      message: 'Job requeued for retry',
      job_id: jobId,
      previous_status: job.job_status,
      new_status: 'queued'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
