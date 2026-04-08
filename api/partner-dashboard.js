// PA CROP Services — Partner Dashboard API
// GET /api/partner-dashboard
// Returns authenticated partner's referred clients, commissions, performance.
// Source of truth: Neon Postgres (no SuiteDash dependency).

import { setCors, authenticateRequest } from './services/auth.js';
import * as db from './services/db.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('partner-dashboard');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const rlResult = await checkRateLimit(getClientIp(req), 'partner-dashboard', 20, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  // Require authenticated session with partner role
  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });
  if (!session.roles?.includes('partner') && !session.roles?.includes('ops_admin')) {
    return res.status(403).json({ success: false, error: 'partner_role_required' });
  }

  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  try {
    // Resolve partner record from session
    const client = await db.getClientById(session.clientId);
    const partner = client?.email ? await db.getPartnerByEmail(client.email) : null;

    if (!partner) {
      return res.status(404).json({ success: false, error: 'partner_record_not_found' });
    }

    // Fetch data in parallel
    const [earnings, commissions, clients, referrals] = await Promise.all([
      db.getPartnerEarningsSummary(partner.id),
      db.getCommissionsForPartner(partner.id, { limit: 20 }),
      db.getPartnerClients(partner.id),
      db.getReferrals(session.clientId)
    ]);

    const referralCode = client?.referral_code || session.clientId?.slice(0, 8);

    return res.status(200).json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        partner_type: partner.partner_type,
        commission_rate: partner.commission_rate,
        member_since: partner.created_at
      },
      referral_code: referralCode,
      referral_link: `https://pacropservices.com/?ref=${referralCode}`,
      earnings,
      recent_commissions: commissions.map(c => ({
        id: c.id,
        client_email: c.client_email,
        client_name: c.client_name,
        plan_code: c.plan_code,
        commission_usd: c.commission_usd,
        status: c.commission_status,
        created_at: c.created_at
      })),
      clients: {
        total: clients.length,
        items: clients.map(c => ({
          name: c.owner_name || c.email,
          entity_name: c.legal_name,
          entity_type: c.entity_type,
          plan: c.billing_plan || c.plan_code,
          status: c.entity_status,
          billing_status: c.billing_status
        }))
      },
      referrals: {
        total: referrals.length,
        converted: referrals.filter(r => r.referral_status === 'converted').length,
        pending: referrals.filter(r => r.referral_status === 'invited').length
      }
    });
  } catch (e) {
    log.error('partner_dashboard_error', {}, e instanceof Error ? e : new Error(String(e)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
