import { setCors, authenticateRequest } from '../services/auth.js';
import { writeAuditEvent, getWorkflowJob } from '../services/db.js';
import { notifyAdmin } from '../services/notifications.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { conversation_id, reason } = req.body || {};
  if (!reason) return res.status(400).json({ success: false, error: 'missing_reason' });

  try {
    await writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'ai.answer_escalated', target_type: 'conversation',
      target_id: conversation_id || 'unknown',
      after_json: { reason, client_id: session.clientId, org_id: session.orgId },
      reason: reason || 'client_requested_escalation'
    });

    await notifyAdmin('AI Conversation Escalated',
      `Client ${session.clientId} (org: ${session.orgId}) escalated conversation ${conversation_id || 'N/A'}. Reason: ${reason}`);

    return res.status(200).json({ success: true, message: 'Escalation recorded. A team member will follow up.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
