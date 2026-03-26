import { setCors, authenticateRequest } from '../services/auth.js';
import { getReferrals, getClientById } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const client = await getClientById(session.clientId);
    const referrals = await getReferrals(session.clientId);
    const converted = referrals.filter(r => r.referral_status === 'converted');
    return res.status(200).json({
      referral_code: client?.referral_code || null,
      total_referrals: referrals.length,
      converted: converted.length,
      total_credit: converted.reduce((sum, r) => sum + (parseFloat(r.credit_amount) || 0), 0)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
