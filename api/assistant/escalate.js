import { setCors, authenticateRequest } from '../services/auth.js';
import { writeAuditEvent } from '../services/db.js';
import { notifyAdmin } from '../services/notifications.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { conversation_id, reason } = req.body || {};
  try {
    await writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'ai.answer_escalated', target_type: 'conversation', target_id: conversation_id || 'unknown',
      reason: reason || 'client_requested_escalation'
    });
    await notifyAdmin('AI Conversation Escalated',
      `Client ${session.clientId} escalated conversation. Reason: ${reason || 'not provided'}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
