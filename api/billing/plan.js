import { setCors, authenticateRequest } from '../services/auth.js';
import { getPlanEntitlements } from '../services/entitlements.js';
import { getBillingAccount } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const billing = await getBillingAccount(session.clientId);
    const plan = session.plan || billing?.plan_code || 'compliance_only';
    const entitlements = getPlanEntitlements(plan);
    return res.status(200).json({ success: true, plan_code: plan, entitlements, billing_status: billing?.billing_status || 'unknown' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
