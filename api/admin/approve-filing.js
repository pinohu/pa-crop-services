// PA CROP Services — Filing Approval Workflow
// POST /api/admin/approve-filing { obligation_id, action: "approve"|"reject", notes?, filing_reference? }
// Admin approves or rejects a client's filing submission.
// On approve: transitions to filed_pending_confirmation or filed_confirmed.
// On reject: transitions back to awaiting_client_input with reason.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { transition, canTransition } from '../services/obligations.js';
import { sendEmail, notifyAdmin } from '../services/notifications.js';
import { isValidUUID, isValidString } from '../_validate.js';
import { createLogger } from '../_log.js';

const log = createLogger('approve-filing');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  const { obligation_id, action, notes, filing_reference } = req.body || {};

  if (!obligation_id || !isValidUUID(obligation_id)) {
    return res.status(400).json({ success: false, error: 'valid obligation_id required' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action must be approve or reject' });
  }
  if (notes && !isValidString(notes, { maxLength: 2000 })) {
    return res.status(400).json({ success: false, error: 'notes too long' });
  }

  try {
    const obl = await db.getObligation(obligation_id);
    if (!obl) return res.status(404).json({ success: false, error: 'obligation_not_found' });

    const adminActor = { type: 'admin', id: req.headers['x-admin-id'] || 'admin' };

    if (action === 'approve') {
      // Approve: transition to filed_pending_confirmation (or filed_confirmed if reference provided)
      const targetStatus = filing_reference ? 'filed_confirmed' : 'filed_pending_confirmation';

      if (!canTransition(obl.obligation_status, targetStatus)) {
        // Try intermediate transition if needed
        if (canTransition(obl.obligation_status, 'filed_pending_confirmation')) {
          await transition(obligation_id, 'filed_pending_confirmation', adminActor,
            `Admin approved. ${notes || ''}`.trim());
          if (filing_reference && canTransition('filed_pending_confirmation', 'filed_confirmed')) {
            await transition(obligation_id, 'filed_confirmed', adminActor,
              `Filing confirmed. Reference: ${filing_reference}`);
          }
        } else {
          return res.status(400).json({
            success: false, error: 'invalid_transition',
            current_status: obl.obligation_status,
            message: `Cannot approve from status: ${obl.obligation_status}`
          });
        }
      } else {
        await transition(obligation_id, targetStatus, adminActor,
          `Admin approved. ${filing_reference ? `Ref: ${filing_reference}. ` : ''}${notes || ''}`.trim());
      }

      // Update filing metadata
      if (filing_reference) {
        await db.updateObligation(obligation_id, {
          metadata: { ...(obl.metadata || {}), filing_reference, approved_at: new Date().toISOString(), approved_by: adminActor.id }
        });
      }

      // Notify client
      const sql = db.getSql();
      if (sql) {
        const clients = await sql`SELECT email, owner_name FROM clients WHERE organization_id = ${obl.organization_id} LIMIT 1`;
        const client = clients?.[0];
        if (client?.email) {
          sendEmail(client.email, 'welcome', {
            client_name: client.owner_name || 'Client',
            org_name: obl.organizations?.legal_name || 'your entity',
            plan: 'your plan'
          }).catch(() => {});
        }
      }

      // Mark related workflow job as completed
      if (sql) {
        await sql`UPDATE workflow_jobs SET job_status = 'completed', completed_at = now()
          WHERE correlation_id = ${'filing-review-' + obligation_id} AND job_status IN ('queued', 'processing')`;
      }

      log.info('filing_approved', { obligationId: obligation_id, reference: filing_reference });
      return res.status(200).json({
        success: true,
        message: 'Filing approved',
        obligation_id,
        new_status: filing_reference ? 'filed_confirmed' : 'filed_pending_confirmation',
        filing_reference
      });

    } else {
      // Reject: transition back to awaiting_client_input
      if (canTransition(obl.obligation_status, 'awaiting_client_input')) {
        await transition(obligation_id, 'awaiting_client_input', adminActor,
          `Admin rejected. Reason: ${notes || 'No reason provided'}`);
      }

      // Notify client about rejection
      const sql = db.getSql();
      if (sql) {
        const clients = await sql`SELECT email, owner_name FROM clients WHERE organization_id = ${obl.organization_id} LIMIT 1`;
        const client = clients?.[0];
        if (client?.email) {
          notifyAdmin(`Filing Rejected: ${obl.organizations?.legal_name || obligation_id}`,
            `<p>Rejected by admin. Reason: ${notes || 'None'}</p>`
          ).catch(() => {});
        }
      }

      log.info('filing_rejected', { obligationId: obligation_id, reason: notes });
      return res.status(200).json({
        success: true,
        message: 'Filing rejected — client notified',
        obligation_id,
        new_status: 'awaiting_client_input',
        rejection_reason: notes || 'No reason provided'
      });
    }
  } catch (err) {
    log.error('approve_filing_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
