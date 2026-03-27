// PA CROP Services — Portal Billing
// GET /api/portal/billing
// Returns current plan info, payment history, next billing date.
// Calls Stripe API if STRIPE_SECRET_KEY is set, otherwise returns structured mock data.
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';
import { getPlanEntitlements } from '../services/entitlements.js';

const log = createLogger('portal-billing');

const PLAN_DETAILS = {
  compliance_only: {
    label: 'Compliance Only',
    price_annual: 99,
    price_monthly: null,
    description: 'Registered office, compliance monitoring, deadline reminders, AI assistant',
    features: ['Registered Office Address', 'Mail Handling', '5 Deadline Reminders', 'Compliance Dashboard', 'AI Assistant'],
    stripe_price_id: process.env.STRIPE_PRICE_COMPLIANCE_ONLY || null
  },
  business_starter: {
    label: 'Business Starter',
    price_annual: 199,
    price_monthly: null,
    description: 'Everything in Compliance Only, plus domain, email hosting, business website',
    features: ['Everything in Compliance Only', 'Domain Name', '5 Email Mailboxes', 'Website Hosting + SSL', '1-Page Business Website'],
    stripe_price_id: process.env.STRIPE_PRICE_BUSINESS_STARTER || null
  },
  business_pro: {
    label: 'Business Pro',
    price_annual: 349,
    price_monthly: null,
    description: 'Everything in Starter, plus managed annual report filing, up to 3 entities',
    features: ['Everything in Starter', 'Managed Annual Report Filing', 'Up to 3 Entities', 'Dedicated Phone Line', '5-Page Website'],
    stripe_price_id: process.env.STRIPE_PRICE_BUSINESS_PRO || null
  },
  business_empire: {
    label: 'Business Empire',
    price_annual: 699,
    price_monthly: null,
    description: 'Everything in Pro, plus up to 10 entities, VPS hosting, 2 notarizations/yr',
    features: ['Everything in Pro', 'Up to 10 Entities', 'Dedicated VPS Hosting', '3 Websites', '2 Free Notarizations/Year'],
    stripe_price_id: process.env.STRIPE_PRICE_BUSINESS_EMPIRE || null
  }
};

const ALL_PLAN_CODES = ['compliance_only', 'business_starter', 'business_pro', 'business_empire'];

function getNextTier(planCode) {
  const idx = ALL_PLAN_CODES.indexOf(planCode);
  if (idx === -1 || idx === ALL_PLAN_CODES.length - 1) return null;
  const nextCode = ALL_PLAN_CODES[idx + 1];
  return { code: nextCode, ...PLAN_DETAILS[nextCode] };
}

function buildMockBilling(planCode, clientId) {
  const plan = PLAN_DETAILS[planCode] || PLAN_DETAILS.compliance_only;
  const now = new Date();
  const nextBillingDate = new Date(now);
  nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

  // Generate deterministic mock payment history based on clientId
  const seedYear = now.getFullYear();
  const payments = [];
  for (let i = 0; i < 2; i++) {
    const payDate = new Date(seedYear - i, 0, 15);
    payments.push({
      id: `mock_inv_${clientId || 'demo'}_${seedYear - i}`,
      date: payDate.toISOString(),
      amount: plan.price_annual,
      currency: 'usd',
      status: 'paid',
      description: `PA CROP Services — ${plan.label} (${seedYear - i})`,
      invoice_url: null
    });
  }

  return {
    current_plan: {
      code: planCode,
      label: plan.label,
      price_annual: plan.price_annual,
      description: plan.description,
      features: plan.features,
      entitlements: getPlanEntitlements(planCode)
    },
    billing_status: 'active',
    next_billing_date: nextBillingDate.toISOString().split('T')[0],
    next_billing_amount: plan.price_annual,
    payment_method: {
      type: 'card',
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: seedYear + 2
    },
    payment_history: payments,
    upgrade_options: getNextTier(planCode) ? [getNextTier(planCode)] : [],
    portal_url: null,
    source: 'mock'
  };
}

async function fetchStripeData(stripeSecretKey, billingAccount, planCode, clientId) {
  const stripe = await import('stripe').then(m => m.default(stripeSecretKey)).catch(() => null);
  if (!stripe) {
    log.warn('stripe_import_failed', { clientId });
    return null;
  }

  try {
    const customerId = billingAccount?.stripe_customer_id;
    const subscriptionId = billingAccount?.stripe_subscription_id;

    if (!customerId) return null;

    // Fetch subscription details
    let subscription = null;
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice']
      }).catch(() => null);
    } else {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
        expand: ['data.default_payment_method']
      }).catch(() => null);
      subscription = subs?.data?.[0] || null;
    }

    // Fetch recent invoices
    const invoicesResponse = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
      status: 'paid'
    }).catch(() => ({ data: [] }));

    const paymentHistory = (invoicesResponse?.data || []).map(inv => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      description: inv.description || `PA CROP Services`,
      invoice_url: inv.hosted_invoice_url || null
    }));

    const paymentMethod = subscription?.default_payment_method;
    const card = paymentMethod?.card || null;
    const plan = PLAN_DETAILS[planCode] || PLAN_DETAILS.compliance_only;

    // Customer portal link
    let portalUrl = null;
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: 'https://pacropservices.com/portal'
      });
      portalUrl = portalSession.url;
    } catch {
      // Billing portal may not be configured — not fatal
    }

    const nextBillingTimestamp = subscription?.current_period_end;
    const nextBillingDate = nextBillingTimestamp
      ? new Date(nextBillingTimestamp * 1000).toISOString().split('T')[0]
      : null;

    const nextAmount = subscription?.items?.data?.[0]?.price?.unit_amount
      ? subscription.items.data[0].price.unit_amount / 100
      : plan.price_annual;

    return {
      current_plan: {
        code: planCode,
        label: plan.label,
        price_annual: plan.price_annual,
        description: plan.description,
        features: plan.features,
        entitlements: getPlanEntitlements(planCode)
      },
      billing_status: subscription?.status || billingAccount?.billing_status || 'active',
      next_billing_date: nextBillingDate,
      next_billing_amount: nextAmount,
      payment_method: card ? {
        type: 'card',
        brand: card.brand,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year
      } : null,
      payment_history: paymentHistory,
      upgrade_options: getNextTier(planCode) ? [getNextTier(planCode)] : [],
      portal_url: portalUrl,
      stripe_customer_id: customerId,
      source: 'stripe'
    };
  } catch (err) {
    log.error('stripe_fetch_error', { clientId }, err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' },
      meta: {}
    });
  }

  // Rate limit: 30 requests/min (billing data is sensitive)
  const rlResult = await checkRateLimit(getClientIp(req), 'portal-billing', 30, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({
      data: null,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      meta: { retryAfter: rlResult.retryAfter }
    });
  }

  const session = await authenticateRequest(req);
  if (!session?.valid) {
    return res.status(401).json({
      data: null,
      error: { code: 'UNAUTHENTICATED', message: 'Valid Authorization: Bearer <token> required' },
      meta: {}
    });
  }

  const planCode = session.plan || 'compliance_only';

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    let billingData = null;

    if (stripeKey && db.isConnected()) {
      const billingAccount = await db.getBillingAccount(session.clientId);
      billingData = await fetchStripeData(stripeKey, billingAccount, planCode, session.clientId);
    }

    // Fall back to mock data when Stripe is not configured or fetch fails
    if (!billingData) {
      billingData = buildMockBilling(planCode, session.clientId);
    }

    return res.status(200).json({
      data: billingData,
      error: null,
      meta: {
        requestId: `billing_${Date.now()}`,
        clientId: session.clientId,
        source: billingData.source
      }
    });
  } catch (err) {
    log.error('billing_error', { clientId: session.clientId }, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load billing data' },
      meta: { requestId: `billing_${Date.now()}` }
    });
  }
}
