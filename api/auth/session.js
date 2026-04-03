import { setCors, authenticateRequest, createSession } from '../services/auth.js';
import { getClientById } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const client = await getClientById(session.clientId);

    // Check if token is close to expiry (< 20 minutes remaining) and refresh
    let refreshedToken = null;
    if (session.exp) {
      const minutesRemaining = (session.exp * 1000 - Date.now()) / (1000 * 60);
      if (minutesRemaining < 20 && client) {
        const newSession = await createSession({
          id: client.id,
          organization_id: client.organization_id,
          plan_code: client.plan_code,
          roles: client.metadata?.roles || ['client'],
          email: client.email
        });
        refreshedToken = newSession;
      }
    }

    return res.status(200).json({
      success: true,
      session: refreshedToken || { token: null, expires_at: null },
      client: client ? {
        id: client.id,
        organization_id: client.organization_id,
        plan_code: client.plan_code,
        roles: client.metadata?.roles || ['client'],
        email: client.email,
        owner_name: client.owner_name
      } : { id: session.clientId, organization_id: session.orgId, plan_code: session.plan, roles: session.roles }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
