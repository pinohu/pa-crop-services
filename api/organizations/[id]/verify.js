import { setCors, authenticateRequest, isAdminRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';


export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;
  try {
    const org = await db.updateOrganization(id, { entity_status: 'active' });
    await db.writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'entity.verified', target_type: 'organization', target_id: id,
      reason: 'client_verified'
    });
    return res.status(200).json({ success: true, organization: org });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
