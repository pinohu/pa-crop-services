import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { notifyAdmin } from '../../services/notifications.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    await db.updateDocument(req.query.id, { urgency: 'critical', review_status: 'escalated' });
    await notifyAdmin('Document Escalated', `Document ${req.query.id} escalated by client ${session.clientId}`);
    await db.writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'document.escalated', target_type: 'document', target_id: req.query.id,
      reason: req.body?.reason || 'client_escalation'
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
