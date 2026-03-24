// PA CROP Services — Submit Filing for Review
// Premium workflow for managed-plan clients: marks obligation as ready
// and creates a workflow job for admin to process.

import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { canTransition, transition } from '../../services/obligations.js';
import { notifyAdmin } from '../../services/notifications.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const obligationId = req.query.id;
  const { notes, supporting_document_ids } = req.body || {};

  try {
    const obl = await db.getObligation(obligationId);
    if (!obl) return res.status(404).json({ success: false, error: 'obligation_not_found' });

    // Transition to ready_to_file if possible
    if (canTransition(obl.obligation_status, 'ready_to_file')) {
      await transition(obligationId, 'ready_to_file',
        { type: 'client', id: session.clientId },
        'Client submitted for review' + (notes ? ': ' + notes : ''));
    }

    // Create workflow job for admin
    const job = await db.createWorkflowJob({
      job_type: 'filing_review',
      job_status: 'queued',
      payload: {
        obligation_id: obligationId,
        organization_id: obl.organization_id,
        client_id: session.clientId,
        notes,
        supporting_document_ids: supporting_document_ids || [],
        submitted_at: new Date().toISOString()
      },
      max_attempts: 1,
      correlation_id: `filing-review-${obligationId}`
    });

    // Audit
    await db.writeAuditEvent({
      actor_type: 'client',
      actor_id: session.clientId,
      event_type: 'obligation.submitted_for_review',
      target_type: 'obligation',
      target_id: obligationId,
      after_json: { notes, supporting_document_ids },
      reason: 'Client submitted filing for admin review'
    });

    // Notify admin
    await notifyAdmin('Filing Submitted for Review',
      `<p><strong>Obligation:</strong> ${obligationId}</p>
       <p><strong>Entity:</strong> ${obl.organizations?.legal_name || 'Unknown'}</p>
       <p><strong>Due:</strong> ${obl.due_date}</p>
       <p><strong>Notes:</strong> ${notes || 'None'}</p>
       <p>Review in the Filing Queue: <a href="https://pacropservices.com/admin">Admin Panel</a></p>`);

    return res.status(200).json({
      success: true,
      message: 'Filing submitted for review. We\'ll process it and notify you when complete.',
      job_id: job?.id,
      obligation_status: 'ready_to_file'
    });
  } catch (err) {
    console.error('Submit review error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
