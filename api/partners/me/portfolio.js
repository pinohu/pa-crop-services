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
    const supabase = db.getClient();
    if (!supabase) return res.status(200).json({ items: [] });

    // Get all clients referred by this partner
    const { data: referrals } = await supabase.from('referrals')
      .select('*, referred_client:clients!referred_client_id(*, organizations(*))')
      .eq('referrer_client_id', session.clientId);

    const portfolio = [];
    for (const ref of (referrals || [])) {
      const client = ref.referred_client;
      if (!client) continue;
      const org = client.organizations;
      const obligations = org ? await db.getObligationsForOrg(org.id) : [];
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
