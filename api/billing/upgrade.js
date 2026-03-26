import { setCors, authenticateRequest } from '../services/auth.js';
import { getBillingAccount, writeAuditEvent } from '../services/db.js';

const PLAN_STRIPE_PRICES = {
  compliance_only: null,
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  empire: process.env.STRIPE_PRICE_EMPIRE
};

const PLAN_ORDER = ['compliance_only', 'starter', 'pro', 'empire'];

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { target_plan_code } = req.body || {};
  if (!target_plan_code || !PLAN_ORDER.includes(target_plan_code)) {
    return res.status(400).json({ success: false, error: 'invalid_plan_code' });
  }

  try {
    const billing = await getBillingAccount(session.clientId);
    const currentPlan = billing?.plan_code || session.plan || 'compliance_only';

    if (PLAN_ORDER.indexOf(target_plan_code) <= PLAN_ORDER.indexOf(currentPlan)) {
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
          reason: `upgrade_to_${target_plan_code}`
        });
        return res.status(200).json({ success: true, checkout_url: portal.url });
      }
    }

    // Fallback: return Stripe payment link for the target plan
    const paymentLinks = {
      starter: process.env.STRIPE_LINK_STARTER || 'https://buy.stripe.com/starter',
      pro: process.env.STRIPE_LINK_PRO || 'https://buy.stripe.com/pro',
      empire: process.env.STRIPE_LINK_EMPIRE || 'https://buy.stripe.com/empire'
    };

    await writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'billing.upgrade_initiated', target_type: 'billing', target_id: session.clientId,
      reason: `upgrade_to_${target_plan_code}`
    });

    return res.status(200).json({
      success: true,
      checkout_url: paymentLinks[target_plan_code] || `https://pacropservices.com/portal?upgrade=${target_plan_code}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
