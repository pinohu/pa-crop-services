import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { computeRisk } from '../../services/obligations.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });
  if (!session.roles?.includes('partner') && !session.roles?.includes('ops_admin')) {
    return res.status(403).json({ success: false, error: 'partner_role_required' });
  }

  try {
    if (!db.isConnected()) return res.status(200).json({ success: true, items: [] });

    const referrals = await db.getReferrals(session.clientId);
    const portfolio = [];

    for (const ref of referrals) {
      if (!ref.referred_client_id) continue;
      const client = await db.getClient_ById(ref.referred_client_id);
      if (!client) continue;
      const obligations = client.organization_id ? await db.getObligationsForOrg(client.organization_id) : [];
      const risk = computeRisk(obligations);
      const org = client.organization_id ? await db.getOrganization(client.organization_id) : null;

      portfolio.push({
        client_name: client.owner_name || client.email,
        entity_name: org?.legal_name,
        entity_type: org?.entity_type,
        plan: client.plan_code,
        status: org?.entity_status,
        risk_level: risk,
        next_deadline: obligations[0]?.due_date,
        referral_status: ref.referral_status,
        credit: ref.credit_amount
      });
    }

    return res.status(200).json({ success: true, items: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
