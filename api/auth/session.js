import { setCors, authenticateRequest } from '../services/auth.js';
import { getClient_ById } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const client = await getClient_ById(session.clientId);
    return res.status(200).json({
      success: true,
      session: { token: null, expires_at: null },
      client: client ? {
        id: client.id,
        organization_id: client.organization_id,
        plan_code: client.plan_code,
        roles: client.metadata?.roles || ['client']
      } : { id: session.clientId, organization_id: session.orgId, plan_code: session.plan, roles: session.roles }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
