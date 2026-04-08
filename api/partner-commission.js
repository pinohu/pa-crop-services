// PA CROP Services — Partner Commission Tracker
// POST /api/partner-commission { action: "track|calculate|report|payout" }
// Tracks referral conversions and calculates partner commissions.
// Source of truth: Neon Postgres commissions table (SuiteDash synced secondarily).

import { isAdminRequest, setCors } from './services/auth.js';
import * as db from './services/db.js';
import { createLogger } from './_log.js';

const log = createLogger('partner-commission');

// Commission rates by plan tier (annual fee → 20% partner share)
const PLAN_PRICES = {
  compliance_only: 99,
  business_starter: 199,
  business_pro: 349,
  business_empire: 699
};
const DEFAULT_COMMISSION_RATE = 0.20;

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  const { action, payload = {} } = req.body || {};

  try {
    switch (action) {
      case 'track': {
        // Record a referral conversion as a commission in Neon
        const { partnerId, partnerEmail, clientId, orgId, planCode, referralId } = payload;
        if (!partnerId && !partnerEmail) {
          return res.status(400).json({ success: false, error: 'partnerId or partnerEmail required' });
        }

        // Resolve partner
        const partner = partnerId
          ? await db.getPartnerById(partnerId)
          : await db.getPartnerByEmail(partnerEmail);
        if (!partner) return res.status(404).json({ success: false, error: 'partner_not_found' });

        const plan = planCode || 'compliance_only';
        const planAmount = PLAN_PRICES[plan] || PLAN_PRICES.compliance_only;
        const rate = parseFloat(partner.commission_rate) || DEFAULT_COMMISSION_RATE;
        const commissionUsd = +(planAmount * rate).toFixed(2);

        const commission = await db.createCommission({
          partner_id: partner.id,
          referral_id: referralId || null,
          client_id: clientId || null,
          organization_id: orgId || null,
          plan_code: plan,
          plan_amount_usd: planAmount,
          commission_rate: rate,
          commission_usd: commissionUsd,
          commission_status: 'pending'
        });

        // Audit trail
        db.writeAuditEvent({
          actor_type: 'admin', actor_id: 'admin_key',
          event_type: 'commission.created',
          target_type: 'commission', target_id: commission?.id,
          after_json: { partner_id: partner.id, commission_usd: commissionUsd, plan },
          reason: 'referral_conversion'
        }).catch(() => {});

        log.info('commission_tracked', { partnerId: partner.id, commissionUsd, plan });
        return res.status(201).json({
          success: true,
          commission_id: commission?.id,
          partner: { id: partner.id, name: partner.name, email: partner.email },
          plan_code: plan,
          plan_amount: planAmount,
          commission_rate: rate,
          commission_usd: commissionUsd
        });
      }

      case 'calculate': {
        // Calculate earnings summary for a partner
        const { partnerId } = payload;
        if (!partnerId) return res.status(400).json({ success: false, error: 'partnerId required' });

        const summary = await db.getPartnerEarningsSummary(partnerId);
        const commissions = await db.getCommissionsForPartner(partnerId, {
          since: payload.since, limit: payload.limit || 50
        });

        return res.status(200).json({ success: true, summary, commissions });
      }

      case 'report': {
        // Generate commission report for all active partners
        const partners = await db.getActivePartners();
        const reports = [];

        for (const p of partners) {
          const summary = await db.getPartnerEarningsSummary(p.id);
          reports.push({
            partner_id: p.id,
            name: p.name,
            email: p.email,
            partner_type: p.partner_type,
            commission_rate: p.commission_rate,
            ...summary
          });
        }

        return res.status(200).json({
          success: true,
          partner_count: reports.length,
          rates: Object.fromEntries(
            Object.entries(PLAN_PRICES).map(([k, v]) => [k, { annual: v, commission_20pct: +(v * 0.20).toFixed(2) }])
          ),
          partners: reports
        });
      }

      case 'payout': {
        // Mark commissions as paid for a partner
        const { partnerId, commissionIds, payoutReference } = payload;
        if (!partnerId || !commissionIds?.length) {
          return res.status(400).json({ success: false, error: 'partnerId and commissionIds required' });
        }

        const results = [];
        for (const cid of commissionIds) {
          const updated = await db.updateCommission(cid, {
            commission_status: 'paid',
            paid_at: new Date().toISOString(),
            payout_reference: payoutReference || null
          });
          if (updated) results.push(updated.id);
        }

        db.writeAuditEvent({
          actor_type: 'admin', actor_id: 'admin_key',
          event_type: 'commission.payout',
          target_type: 'partner', target_id: partnerId,
          after_json: { paid_count: results.length, payout_reference: payoutReference },
          reason: 'commission_payout'
        }).catch(() => {});

        log.info('commissions_paid', { partnerId, count: results.length });
        return res.status(200).json({ success: true, paid_count: results.length, commission_ids: results });
      }

      default:
        return res.status(400).json({ success: false, error: 'action must be track|calculate|report|payout' });
    }
  } catch (err) {
    log.error('commission_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
