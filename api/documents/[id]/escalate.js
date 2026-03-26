import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { notifyAdmin } from '../../services/notifications.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const docId = req.query.id;
  const { reason, priority } = req.body || {};

  try {
    const doc = await db.getDocument(docId);
    if (!doc) return res.status(404).json({ success: false, error: 'document_not_found' });

    await db.updateDocument(docId, {
      urgency: priority || 'critical',
      review_status: 'escalated'
    });

    await notifyAdmin('Document Escalated',
      `Document ${docId} (${doc.document_type || 'unknown type'}) escalated by client ${session.clientId}. Reason: ${reason || 'not provided'}`);

    await db.writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'document.escalated', target_type: 'document', target_id: docId,
      before_json: { urgency: doc.urgency, review_status: doc.review_status },
      after_json: { urgency: priority || 'critical', review_status: 'escalated' },
      reason: reason || 'client_escalation'
    });

    return res.status(200).json({ success: true, message: 'Document escalated for urgent review.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
