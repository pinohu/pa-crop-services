// PA CROP Services — Plan registry
// Single source of truth for plan codes, tier keys, pricing, services-value
// claims, and capability flags. Replaces ~6 duplicated lookup tables across
// provision.js, stripe-webhook.js, admin/index.js, admin/revenue.js,
// admin/billing-retention.js, mrr-dashboard.js, and others.
//
// Two naming conventions exist in the codebase:
//   - tier:       'compliance' | 'starter' | 'pro' | 'empire'  (short name; SuiteDash custom_fields, payload key)
//   - plan_code:  'compliance_only' | 'business_starter' | 'business_pro' | 'business_empire'  (Neon column, Stripe metadata)
// This module is the only place that knows how to convert between them.

export const PLANS = Object.freeze({
  compliance_only: Object.freeze({
    plan_code: 'compliance_only',
    tier: 'compliance',
    label: 'Compliance Only',
    annualFeeUsd: 99,
    monthlyFeeUsd: 99 / 12,
    servicesValueLabel: '$2,240+',
    includesHosting: false,
    includesVPS: false,
    includesFiling: false,
    includesNotary: false,
    emailCount: 0,
    domainCount: 0,
    websitePages: 0,
    stripePriceEnvVar: 'STRIPE_PRICE_COMPLIANCE_ONLY',
    stripeLinkEnvVar: 'STRIPE_LINK_COMPLIANCE'
  }),
  business_starter: Object.freeze({
    plan_code: 'business_starter',
    tier: 'starter',
    label: 'Business Starter',
    annualFeeUsd: 199,
    monthlyFeeUsd: 199 / 12,
    servicesValueLabel: '$4,817+',
    includesHosting: true,
    includesVPS: false,
    includesFiling: false,
    includesNotary: false,
    emailCount: 5,
    domainCount: 1,
    websitePages: 1,
    stripePriceEnvVar: 'STRIPE_PRICE_BUSINESS_STARTER',
    stripeLinkEnvVar: 'STRIPE_LINK_STARTER'
  }),
  business_pro: Object.freeze({
    plan_code: 'business_pro',
    tier: 'pro',
    label: 'Business Pro',
    annualFeeUsd: 349,
    monthlyFeeUsd: 349 / 12,
    servicesValueLabel: '$9,452+',
    includesHosting: true,
    includesVPS: false,
    includesFiling: true,
    includesNotary: false,
    emailCount: 99,
    domainCount: 3,
    websitePages: 5,
    stripePriceEnvVar: 'STRIPE_PRICE_BUSINESS_PRO',
    stripeLinkEnvVar: 'STRIPE_LINK_PRO'
  }),
  business_empire: Object.freeze({
    plan_code: 'business_empire',
    tier: 'empire',
    label: 'Business Empire',
    annualFeeUsd: 699,
    monthlyFeeUsd: 699 / 12,
    servicesValueLabel: '$21,582+',
    includesHosting: true,
    includesVPS: true,
    includesFiling: true,
    includesNotary: true,
    emailCount: 99,
    domainCount: 10,
    websitePages: 3,
    stripePriceEnvVar: 'STRIPE_PRICE_BUSINESS_EMPIRE',
    stripeLinkEnvVar: 'STRIPE_LINK_EMPIRE'
  })
});

export const DEFAULT_PLAN_CODE = 'compliance_only';
export const DEFAULT_TIER = 'compliance';

const _byTier = {};
for (const p of Object.values(PLANS)) _byTier[p.tier] = p;

/** Look up by plan_code; returns null if unknown. */
export function getPlan(planCode) {
  return PLANS[planCode] || null;
}

/** Look up by tier key (compliance | starter | pro | empire); returns null if unknown. */
export function getPlanByTier(tier) {
  return _byTier[tier] || null;
}

/**
 * Resolve any of plan_code OR tier to the canonical plan record. Returns
 * Compliance Only plan as a safe default rather than null, so callers don't
 * need to repeat fallback logic.
 */
export function resolvePlan(input) {
  if (!input) return PLANS[DEFAULT_PLAN_CODE];
  if (typeof input !== 'string') return PLANS[DEFAULT_PLAN_CODE];
  return PLANS[input] || _byTier[input] || PLANS[DEFAULT_PLAN_CODE];
}

/** Convert tier ('starter') → plan_code ('business_starter'). */
export function tierToPlanCode(tier) {
  return _byTier[tier]?.plan_code || DEFAULT_PLAN_CODE;
}

/** Convert plan_code ('business_starter') → tier ('starter'). */
export function planCodeToTier(planCode) {
  return PLANS[planCode]?.tier || DEFAULT_TIER;
}

/**
 * Annual fee in dollars for a given plan code or tier.
 * Returns the lowest-tier price as a safe fallback rather than 0.
 */
export function annualFee(planOrTier) {
  return resolvePlan(planOrTier).annualFeeUsd;
}

export function monthlyFee(planOrTier) {
  return resolvePlan(planOrTier).monthlyFeeUsd;
}

/** Map { plan_code → annualFeeUsd } convenient for revenue summing. */
export function priceMap() {
  const out = {};
  for (const [code, plan] of Object.entries(PLANS)) out[code] = plan.annualFeeUsd;
  return out;
}

/** Map { plan_code → label } convenient for display lookups. */
export function labelMap() {
  const out = {};
  for (const [code, plan] of Object.entries(PLANS)) out[code] = plan.label;
  return out;
}

/** Tier-keyed services-value labels (for marketing copy in welcome emails). */
export function servicesValueByTier() {
  const out = {};
  for (const plan of Object.values(PLANS)) out[plan.tier] = plan.servicesValueLabel;
  return out;
}

/** All valid plan_code strings — useful for validation allowlists. */
export const ALL_PLAN_CODES = Object.freeze(Object.keys(PLANS));
/** All valid tier strings. */
export const ALL_TIERS = Object.freeze(Object.values(PLANS).map(p => p.tier));

/**
 * Stripe price ID for a given plan code or tier, looked up from env.
 * Returns null if not configured (callers should check before creating a
 * checkout session).
 */
export function stripePriceId(planOrTier) {
  const plan = resolvePlan(planOrTier);
  return process.env[plan.stripePriceEnvVar] || null;
}

/**
 * Stripe payment link (legacy buy.stripe.com URL) for a plan, looked up from env.
 */
export function stripeLink(planOrTier) {
  const plan = resolvePlan(planOrTier);
  return process.env[plan.stripeLinkEnvVar] || null;
}
