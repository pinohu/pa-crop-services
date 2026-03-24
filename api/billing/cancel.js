import { setCors, authenticateRequest } from '../services/auth.js';
import { writeAuditEvent } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    await writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'billing.cancellation_requested', target_type: 'client', target_id: session.clientId,
      reason: req.body?.reason || 'client_requested'
    });
    return res.status(200).json({ success: true, message: 'Cancellation request received. We will process within 24 hours.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
