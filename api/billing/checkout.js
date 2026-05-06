// PA CROP Services — /api/billing/checkout
// POST { plan_code | tier, email, refCode?, partnerId? }
// Creates a Stripe Checkout Session with plan_code metadata so detectTier()
// in stripe-webhook.js never has to fall back to amount-bracket inference.
//
// Replaces the static buy.stripe.com Payment Links in index.html. When
// STRIPE_PRICE_* env vars aren't set, falls back to the legacy STRIPE_LINK_*
// URLs so the page keeps working during rollout.

import { setCors } from '../services/auth.js';
import { isValidEmail, isValidString } from '../_validate.js';
import { logError } from '../_log.js';
import { fetchWithTimeout } from '../_fetch.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import * as plans from '../services/plans.js';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

function pickSuccessUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'pacropservices.com';
  return `${proto}://${host}/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}
function pickCancelUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'pacropservices.com';
  return `${proto}://${host}/#pricing?checkout=cancelled`;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const rlResult = await checkRateLimit(getClientIp(req), 'billing-checkout', 10, '10m');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  const body = req.body || {};
  const { email, refCode, partnerId } = body;
  // Accept either plan_code or tier; resolvePlan handles both.
  const planInput = body.plan_code || body.tier;
  if (!planInput) return res.status(400).json({ success: false, error: 'missing_plan' });
  // Email is optional — Stripe Checkout will collect it if omitted, which is
  // the recommended one-click UX from the pricing page.
  if (email && !isValidEmail(email)) return res.status(400).json({ success: false, error: 'invalid_email' });
  if (refCode && !isValidString(refCode, { minLength: 1, maxLength: 64 })) {
    return res.status(400).json({ success: false, error: 'invalid_refCode' });
  }
  if (partnerId && !isValidString(partnerId, { minLength: 1, maxLength: 128 })) {
    return res.status(400).json({ success: false, error: 'invalid_partnerId' });
  }

  const plan = plans.resolvePlan(planInput);
  // resolvePlan never returns null but it does default to compliance_only on
  // unknown input — reject explicitly so a typo doesn't silently downgrade.
  if (!plans.PLANS[planInput] && !plans.ALL_TIERS.includes(planInput)) {
    return res.status(400).json({ success: false, error: 'unknown_plan' });
  }

  // Prefer real Checkout Session (gives us metadata.plan_code on the webhook).
  const priceId = plans.stripePriceId(plan.plan_code);
  if (STRIPE_KEY && priceId) {
    try {
      const params = new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': pickSuccessUrl(req),
        'cancel_url': pickCancelUrl(req),
        'metadata[plan_code]': plan.plan_code,
        'metadata[tier]': plan.tier,
        'subscription_data[metadata][plan_code]': plan.plan_code
      });
      if (email) params.append('customer_email', email);
      if (refCode) params.append('metadata[ref_code]', refCode);
      if (partnerId) params.append('metadata[partner_id]', partnerId);
      // Mirror metadata on the client_reference_id so it survives Stripe Tax /
      // payment-intent splits.
      params.append('client_reference_id', refCode || partnerId || `${plan.plan_code}:${Date.now()}`);

      const resp = await fetchWithTimeout('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        logError('checkout_session_failed', { status: resp.status, detail: text.slice(0, 200) });
        return res.status(502).json({ success: false, error: 'stripe_session_failed' });
      }
      const session = await resp.json();
      return res.status(200).json({ success: true, checkout_url: session.url, plan_code: plan.plan_code });
    } catch (err) {
      logError('checkout_failed', {}, err);
      return res.status(500).json({ success: false, error: 'checkout_failed' });
    }
  }

  // Fallback: redirect to the legacy Payment Link if STRIPE_PRICE_* unset.
  // Less reliable (Payment Link metadata must be configured in Stripe
  // dashboard) but unblocks revenue while migration is in progress.
  const legacyLink = plans.stripeLink(plan.plan_code);
  if (legacyLink) {
    return res.status(200).json({
      success: true,
      checkout_url: legacyLink,
      plan_code: plan.plan_code,
      via: 'legacy_payment_link'
    });
  }

  return res.status(500).json({ success: false, error: 'no_stripe_target_configured' });
}
