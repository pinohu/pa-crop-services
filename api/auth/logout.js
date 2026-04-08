import { setCors, authenticateRequest, revokeSession } from '../services/auth.js';
import { db } from '../_db.js';
import { getClientIp } from '../_ratelimit.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  // Revoke the current token so it cannot be reused
  const session = await authenticateRequest(req);
  if (session.valid && session.jti && session.exp) {
    await revokeSession(session.jti, session.exp);
    db.logEvent({ actor: session.email || session.clientId, eventType: 'auth.logout', targetType: 'session', targetId: session.jti, orgId: session.orgId, metadata: { ip: getClientIp(req) } }).catch(() => {});
  }

  return res.status(200).json({ success: true });
}
