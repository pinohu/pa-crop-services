// PA CROP Services — Referral Conversion Tracker
// POST /api/referral-track { newClientEmail, refCode, tier }
// Called during provisioning when a new client has a referral code.
// Records the conversion in Neon, creates a commission, and notifies the referrer.

import { isAdminRequest, setCors } from './services/auth.js';
import * as db from './services/db.js';
import { createLogger } from './_log.js';

const log = createLogger('referral-track');

const PLAN_PRICES = {
  compliance_only: 99,
  business_starter: 199,
  business_pro: 349,
  business_empire: 699
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  const { newClientEmail, refCode, tier, clientId, orgId } = req.body || {};
  if (!newClientEmail || !refCode) return res.status(400).json({ success: false, error: 'newClientEmail and refCode required' });

  try {
    // Find the referrer client by referral_code
    const sql = db.getSql();
    if (!sql) return res.status(503).json({ success: false, error: 'database_unavailable' });

    const referrers = await sql`
      SELECT c.id, c.email, c.owner_name, c.referral_code, c.organization_id,
             p.id as partner_id, p.commission_rate, p.name as partner_name
      FROM clients c
      LEFT JOIN partners p ON p.email = c.email AND p.is_active = true
      WHERE c.referral_code = ${refCode}
      LIMIT 1
    `;
    const referrer = referrers?.[0];

    if (!referrer) {
      log.info('referral_code_not_found', { refCode, newClientEmail });
      return res.status(200).json({ success: false, message: 'Referral code not found', refCode });
    }

    // Create referral record
    const referral = await db.createReferral({
      referrer_client_id: referrer.id,
      referred_email: newClientEmail,
      referral_status: 'converted',
      metadata: { tier: tier || 'compliance_only', ref_code: refCode }
    });

    // Mark conversion with client linkage
    if (referral && clientId) {
      await db.convertReferral(referral.id, {
        referred_client_id: clientId,
        partner_id: referrer.partner_id || null,
        credit_amount: 0 // will be set by commission
      });
    }

    // Create commission if referrer is a partner or has a partner record
    const plan = tier || 'compliance_only';
    const planAmount = PLAN_PRICES[plan] || PLAN_PRICES.compliance_only;
    const rate = referrer.partner_id ? (parseFloat(referrer.commission_rate) || 0.20) : 0.10;
    const commissionUsd = +(planAmount * rate).toFixed(2);

    let commission = null;
    if (referrer.partner_id) {
      commission = await db.createCommission({
        partner_id: referrer.partner_id,
        referral_id: referral?.id,
        client_id: clientId || null,
        organization_id: orgId || null,
        plan_code: plan,
        plan_amount_usd: planAmount,
        commission_rate: rate,
        commission_usd: commissionUsd,
        commission_status: 'pending'
      });
    }

    // Update referral credit amount
    if (referral) {
      await db.convertReferral(referral.id, {
        referred_client_id: clientId || null,
        partner_id: referrer.partner_id || null,
        credit_amount: commissionUsd
      });
    }

    // Audit trail
    db.writeAuditEvent({
      actor_type: 'system', actor_id: 'referral-track',
      event_type: 'referral.converted',
      target_type: 'referral', target_id: referral?.id,
      after_json: { referrer_email: referrer.email, new_client_email: newClientEmail, commission_usd: commissionUsd, plan },
      reason: 'new_client_signup'
    }).catch(() => {});

    // Notify referrer via email
    const emailitKey = process.env.EMAILIT_API_KEY;
    if (emailitKey) {
      const referrerName = referrer.owner_name || referrer.partner_name || 'Partner';
      fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'hello@pacropservices.com', to: referrer.email,
          subject: `You earned $${commissionUsd.toFixed(2)} — referral commission!`,
          html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
            <h2 style="color:#0C1220">Referral Commission Earned!</h2>
            <p>Hi ${referrerName}, someone signed up using your referral code and you've earned <strong>$${commissionUsd.toFixed(2)}</strong>.</p>
            <div style="background:#E8F0E9;border:1px solid #6B8F71;border-radius:12px;padding:20px;margin:16px 0">
              <p style="margin:0"><strong>This referral:</strong> $${commissionUsd.toFixed(2)}<br>
              <strong>Plan:</strong> ${plan.replace(/_/g, ' ')}</p>
            </div>
            <p>Keep sharing your referral code to earn more!</p>
          </div>`
        })
      }).catch(e => log.warn('email_send_failed', { error: e.message }));
    }

    log.info('referral_converted', { refCode, referrer: referrer.email, commissionUsd });
    return res.status(200).json({
      success: true,
      referrer: referrer.email,
      referral_id: referral?.id,
      commission_id: commission?.id,
      commission_usd: commissionUsd,
      commission_rate: rate,
      plan_code: plan
    });
  } catch (e) {
    log.error('referral_track_error', {}, e instanceof Error ? e : new Error(String(e)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
