import { setCors, authenticateRequest } from '../services/auth.js';
import { getClient_ById } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const client = await getClient_ById(session.clientId);
    const code = client?.referral_code || session.clientId?.slice(0, 8);
    return res.status(200).json({
      success: true,
      referral_url: `https://pacropservices.com/?ref=${code}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
