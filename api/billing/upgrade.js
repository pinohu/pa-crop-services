import { setCors, authenticateRequest } from '../services/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { client_id, target_plan_code } = req.body || {};
  // In production, this would create a Stripe billing portal session
  return res.status(200).json({
    success: true,
    checkout_url: `https://pacropservices.com/portal?upgrade=${target_plan_code}`
  });
}
