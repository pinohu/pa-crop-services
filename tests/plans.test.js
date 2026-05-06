// Tests for api/services/plans.js — the Wave 8 single-source-of-truth plan
// registry. These guard against silent regressions when somebody edits the
// PLANS table (e.g. price change, new plan added) without updating the
// helper functions.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as plans from '../api/services/plans.js';

describe('PLANS registry', () => {
  it('contains exactly the four canonical plan codes', () => {
    assert.deepEqual(Object.keys(plans.PLANS).sort(), [
      'business_empire', 'business_pro', 'business_starter', 'compliance_only'
    ]);
  });

  it('PLANS is frozen (immutable)', () => {
    assert.throws(() => { plans.PLANS.compliance_only = {}; }, TypeError);
    assert.throws(() => { plans.PLANS.compliance_only.annualFeeUsd = 0; }, TypeError);
  });

  it('every plan has the required fields', () => {
    for (const [code, p] of Object.entries(plans.PLANS)) {
      assert.equal(p.plan_code, code, `plan_code matches key for ${code}`);
      assert.equal(typeof p.tier, 'string', `${code} has tier`);
      assert.equal(typeof p.label, 'string', `${code} has label`);
      assert.equal(typeof p.annualFeeUsd, 'number', `${code} has numeric annualFeeUsd`);
      assert.ok(p.annualFeeUsd > 0, `${code} fee > 0`);
      assert.equal(typeof p.servicesValueLabel, 'string', `${code} has servicesValueLabel`);
      assert.equal(typeof p.includesHosting, 'boolean');
      assert.equal(typeof p.includesFiling, 'boolean');
      assert.equal(typeof p.stripePriceEnvVar, 'string', `${code} has stripePriceEnvVar`);
    }
  });

  it('pricing matches the canonical $99/$199/$349/$699 ladder', () => {
    assert.equal(plans.PLANS.compliance_only.annualFeeUsd, 99);
    assert.equal(plans.PLANS.business_starter.annualFeeUsd, 199);
    assert.equal(plans.PLANS.business_pro.annualFeeUsd, 349);
    assert.equal(plans.PLANS.business_empire.annualFeeUsd, 699);
  });

  it('capability matrix matches the audit findings', () => {
    // includesFiling: pro+empire only (per CLAUDE.md feature matrix)
    assert.equal(plans.PLANS.compliance_only.includesFiling, false);
    assert.equal(plans.PLANS.business_starter.includesFiling, false);
    assert.equal(plans.PLANS.business_pro.includesFiling, true);
    assert.equal(plans.PLANS.business_empire.includesFiling, true);
    // includesNotary: empire only
    assert.equal(plans.PLANS.business_empire.includesNotary, true);
    assert.equal(plans.PLANS.business_pro.includesNotary, false);
    // includesHosting: starter+pro+empire
    assert.equal(plans.PLANS.compliance_only.includesHosting, false);
    assert.equal(plans.PLANS.business_starter.includesHosting, true);
    // includesVPS: empire only
    assert.equal(plans.PLANS.business_empire.includesVPS, true);
    assert.equal(plans.PLANS.business_pro.includesVPS, false);
  });
});

describe('getPlan / getPlanByTier', () => {
  it('getPlan returns the plan record by plan_code', () => {
    assert.equal(plans.getPlan('business_pro').tier, 'pro');
  });

  it('getPlan returns null for unknown plan_code', () => {
    assert.equal(plans.getPlan('nonexistent_plan'), null);
  });

  it('getPlanByTier returns the plan record by tier key', () => {
    assert.equal(plans.getPlanByTier('starter').plan_code, 'business_starter');
    assert.equal(plans.getPlanByTier('compliance').plan_code, 'compliance_only');
  });

  it('getPlanByTier returns null for unknown tier', () => {
    assert.equal(plans.getPlanByTier('platinum'), null);
  });
});

describe('resolvePlan (accepts either plan_code or tier)', () => {
  it('resolves a plan_code', () => {
    assert.equal(plans.resolvePlan('business_pro').label, 'Business Pro');
  });

  it('resolves a tier key', () => {
    assert.equal(plans.resolvePlan('pro').label, 'Business Pro');
  });

  it('returns the default plan for unknown input (NOT null)', () => {
    // Documented behavior: never returns null so callers don't need to
    // repeat fallback logic. Callers that want strict validation should
    // check ALL_PLAN_CODES / ALL_TIERS first.
    assert.equal(plans.resolvePlan('garbage').plan_code, plans.DEFAULT_PLAN_CODE);
    assert.equal(plans.resolvePlan('').plan_code, plans.DEFAULT_PLAN_CODE);
    assert.equal(plans.resolvePlan(null).plan_code, plans.DEFAULT_PLAN_CODE);
    assert.equal(plans.resolvePlan(undefined).plan_code, plans.DEFAULT_PLAN_CODE);
  });

  it('returns the default plan for non-string input', () => {
    assert.equal(plans.resolvePlan(123).plan_code, plans.DEFAULT_PLAN_CODE);
    assert.equal(plans.resolvePlan({}).plan_code, plans.DEFAULT_PLAN_CODE);
  });
});

describe('tierToPlanCode / planCodeToTier', () => {
  it('round-trips every tier through tierToPlanCode → planCodeToTier', () => {
    for (const tier of plans.ALL_TIERS) {
      const code = plans.tierToPlanCode(tier);
      const back = plans.planCodeToTier(code);
      assert.equal(back, tier, `${tier} → ${code} → ${back}`);
    }
  });

  it('round-trips every plan_code through planCodeToTier → tierToPlanCode', () => {
    for (const code of plans.ALL_PLAN_CODES) {
      const tier = plans.planCodeToTier(code);
      const back = plans.tierToPlanCode(tier);
      assert.equal(back, code);
    }
  });

  it('falls back to DEFAULT for unknown tier', () => {
    assert.equal(plans.tierToPlanCode('platinum'), plans.DEFAULT_PLAN_CODE);
  });

  it('falls back to DEFAULT_TIER for unknown plan_code', () => {
    assert.equal(plans.planCodeToTier('platinum_only'), plans.DEFAULT_TIER);
  });
});

describe('annualFee / monthlyFee', () => {
  it('annualFee accepts plan_code', () => {
    assert.equal(plans.annualFee('business_pro'), 349);
  });

  it('annualFee accepts tier', () => {
    assert.equal(plans.annualFee('pro'), 349);
  });

  it('monthlyFee divides annualFee by 12', () => {
    assert.equal(plans.monthlyFee('compliance_only'), 99 / 12);
    assert.equal(plans.monthlyFee('business_empire'), 699 / 12);
  });

  it('falls back to compliance_only fee for unknown input', () => {
    assert.equal(plans.annualFee('platinum'), 99);
  });
});

describe('priceMap / labelMap', () => {
  it('priceMap returns { plan_code → annualFeeUsd }', () => {
    const m = plans.priceMap();
    assert.equal(m.compliance_only, 99);
    assert.equal(m.business_starter, 199);
    assert.equal(m.business_pro, 349);
    assert.equal(m.business_empire, 699);
  });

  it('labelMap returns { plan_code → label }', () => {
    const m = plans.labelMap();
    assert.equal(m.compliance_only, 'Compliance Only');
    assert.equal(m.business_pro, 'Business Pro');
  });

  it('priceMap output is a plain object, not the frozen PLANS', () => {
    const m = plans.priceMap();
    m.business_pro = 999;  // should not throw — it's a fresh object
    assert.equal(m.business_pro, 999);
    // Original plans untouched
    assert.equal(plans.PLANS.business_pro.annualFeeUsd, 349);
  });
});

describe('servicesValueByTier', () => {
  it('returns dollar-amount-shaped strings for every tier', () => {
    const m = plans.servicesValueByTier();
    assert.match(m.compliance, /^\$[\d,]+/);
    assert.match(m.starter, /^\$[\d,]+/);
    assert.match(m.pro, /^\$[\d,]+/);
    assert.match(m.empire, /^\$[\d,]+/);
  });
});

describe('Stripe env-var lookups', () => {
  it('stripePriceId reads from process.env using the plan-specific key', () => {
    process.env.STRIPE_PRICE_BUSINESS_PRO = 'price_test_pro_123';
    assert.equal(plans.stripePriceId('business_pro'), 'price_test_pro_123');
    assert.equal(plans.stripePriceId('pro'), 'price_test_pro_123'); // tier accepted
    delete process.env.STRIPE_PRICE_BUSINESS_PRO;
  });

  it('stripePriceId returns null when env var is unset', () => {
    delete process.env.STRIPE_PRICE_COMPLIANCE_ONLY;
    assert.equal(plans.stripePriceId('compliance_only'), null);
  });

  it('stripeLink reads STRIPE_LINK_* names', () => {
    process.env.STRIPE_LINK_PRO = 'https://buy.stripe.com/test_pro';
    assert.equal(plans.stripeLink('business_pro'), 'https://buy.stripe.com/test_pro');
    delete process.env.STRIPE_LINK_PRO;
  });
});

describe('ALL_PLAN_CODES / ALL_TIERS', () => {
  it('ALL_PLAN_CODES is frozen and contains all four', () => {
    assert.equal(plans.ALL_PLAN_CODES.length, 4);
    assert.throws(() => { plans.ALL_PLAN_CODES.push('hack'); }, TypeError);
  });

  it('ALL_TIERS is frozen and contains all four', () => {
    assert.equal(plans.ALL_TIERS.length, 4);
    assert.throws(() => { plans.ALL_TIERS.push('hack'); }, TypeError);
  });
});
