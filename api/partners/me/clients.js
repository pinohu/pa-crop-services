import { setCors, authenticateRequest } from '../../services/auth.js';
import { getPartnerClients } from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  if (!session.roles?.includes('partner') && !session.roles?.includes('ops_admin')) {
    return res.status(403).json({ success: false, error: 'partner_role_required' });
  }

  try {
    const partnerId = session.partnerId || session.clientId;
    const clients = await getPartnerClients(partnerId);
    return res.status(200).json({
      success: true,
      items: clients,
      total: clients.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
