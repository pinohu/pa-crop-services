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
    const activeReferrals = referrals.filter(r => r.referred_client_id);
    if (activeReferrals.length === 0) return res.status(200).json({ success: true, items: [] });

    // Fetch all clients, orgs, and obligations in parallel — avoids N+1 per referral
    const [clients, orgsAndObligations] = await Promise.all([
      Promise.all(activeReferrals.map(r => db.getClientById(r.referred_client_id))),
      Promise.all(
        activeReferrals.map(async r => {
          const client = await db.getClientById(r.referred_client_id);
          if (!client?.organization_id) return { org: null, obligations: [] };
          const [org, obligations] = await Promise.all([
            db.getOrganization(client.organization_id),
            db.getObligationsForOrg(client.organization_id)
          ]);
          return { org, obligations };
        })
      )
    ]);

    const portfolio = [];
    for (let i = 0; i < activeReferrals.length; i++) {
      const ref = activeReferrals[i];
      const client = clients[i];
      if (!client) continue;
      const { org, obligations } = orgsAndObligations[i];
      const risk = computeRisk(obligations);

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
