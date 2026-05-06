import { setCors, authenticateRequest } from '../services/auth.js';
import { getBillingAccount, writeAuditEvent } from '../services/db.js';
import * as plans from '../services/plans.js';

// Stripe price IDs delegated to services/plans.js — that's the single source
// of truth for env-var names (STRIPE_PRICE_BUSINESS_STARTER/_PRO/_EMPIRE,
// STRIPE_PRICE_COMPLIANCE_ONLY). Previously this file read STRIPE_PRICE_STARTER
// (no _BUSINESS_ prefix), which silently disagreed with services/plans.js and
// could make either upgrade or new-checkout return null for the price ID
// depending on which name set was actually configured in Vercel.

// Normalize plan codes to canonical form (uses plans.tierToPlanCode if input
// is a tier; otherwise pass-through if already a plan_code).
function normalizePlan(code) {
  if (!code) return null;
  if (plans.PLANS[code]) return code; // already a plan_code
  if (plans.ALL_TIERS.includes(code)) return plans.tierToPlanCode(code);
  return code; // unknown — let validation reject downstream
}

const PLAN_ORDER = ['compliance_only', 'business_starter', 'business_pro', 'business_empire'];

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const rawTarget = req.body?.target_plan_code;
  const targetPlanCode = normalizePlan(rawTarget);
  if (!targetPlanCode || !PLAN_ORDER.includes(targetPlanCode)) {
    return res.status(400).json({ success: false, error: 'invalid_plan_code' });
  }

  try {
    const billing = await getBillingAccount(session.clientId);
    const currentPlan = billing?.plan_code || session.plan || plans.DEFAULT_PLAN_CODE;

    if (PLAN_ORDER.indexOf(targetPlanCode) <= PLAN_ORDER.indexOf(currentPlan)) {
      return res.status(400).json({ success: false, error: 'cannot_downgrade_via_upgrade', current: currentPlan });
    }

    // If Stripe is configured, create a billing portal session for upgrade
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && billing?.stripe_customer_id) {
      const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          customer: billing.stripe_customer_id,
          return_url: 'https://pacropservices.com/portal'
        })
      });
      const portal = await portalRes.json();
      if (portal.url) {
        await writeAuditEvent({
          actor_type: 'client', actor_id: session.clientId,
          event_type: 'billing.upgrade_initiated', target_type: 'billing', target_id: session.clientId,
          reason: `upgrade_to_${targetPlanCode}`
        });
        return res.status(200).json({ success: true, checkout_url: portal.url });
      }
    }

    // Fallback: return the legacy Stripe Payment Link for the target plan via
    // services/plans.stripeLink (single source of truth for env-var names).
    const link = plans.stripeLink(targetPlanCode);

    await writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'billing.upgrade_initiated', target_type: 'billing', target_id: session.clientId,
      reason: `upgrade_to_${targetPlanCode}`
    });

    return res.status(200).json({
      success: true,
      checkout_url: link || `https://pacropservices.com/portal?upgrade=${targetPlanCode}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
