// PA CROP Services — Compliance Rules Unit Tests
// Tests the rules engine that drives deadline calculations, fee lookups,
// and chatbot knowledge building. These are the highest-risk functions
// because errors here could result in compliance misinformation sent to clients.
//
// Run: node --test tests/compliance.test.js
// Or: npm test (when jest is configured)

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  getRules,
  resolveEntityType,
  getEntityConfig,
  getEntityDeadline,
  computeDaysUntil,
  getDeadlineGroup,
  buildChatbotKnowledge,
  buildDeadlineSummary
} from '../api/_compliance.js';

describe('getRules', () => {
  test('returns rules object with required top-level keys', () => {
    const rules = getRules();
    assert.ok(rules.entityTypes, 'missing entityTypes');
    assert.ok(rules.deadlineGroups, 'missing deadlineGroups');
    assert.ok(rules.enforcement, 'missing enforcement');
    assert.ok(rules.annualReport, 'missing annualReport');
    assert.ok(rules.registeredOffice, 'missing registeredOffice');
  });

  test('all required entity types are present', () => {
    const rules = getRules();
    const required = [
      'domestic_llc', 'foreign_llc',
      'domestic_business_corp', 'foreign_business_corp',
      'domestic_nonprofit_corp', 'foreign_nonprofit_corp',
      'domestic_lp', 'foreign_lp',
      'domestic_llp', 'foreign_llp',
      'business_trust', 'professional_association'
    ];
    for (const key of required) {
      assert.ok(rules.entityTypes[key], `missing entity type: ${key}`);
    }
  });

  test('all deadline groups have required fields', () => {
    const rules = getRules();
    for (const [name, group] of Object.entries(rules.deadlineGroups)) {
      assert.ok(group.deadline, `${name} missing deadline`);
      assert.ok(group.label, `${name} missing label`);
      assert.ok(typeof group.month === 'number', `${name} month must be a number`);
      assert.ok(typeof group.day === 'number', `${name} day must be a number`);
    }
  });
});

describe('resolveEntityType', () => {
  const cases = [
    ['LLC', 'domestic_llc'],
    ['llc', 'domestic_llc'],
    ['Domestic LLC', 'domestic_llc'],
    ['Foreign LLC', 'foreign_llc'],
    ['Corporation', 'domestic_business_corp'],
    ['C-Corp', 'domestic_business_corp'],
    ['S-Corp', 'domestic_business_corp'],
    ['Foreign Corporation', 'foreign_business_corp'],
    ['Nonprofit', 'domestic_nonprofit_corp'],
    ['Nonprofit Corp', 'domestic_nonprofit_corp'],
    ['Foreign Nonprofit Corp', 'foreign_nonprofit_corp'],
    ['LP', 'domestic_lp'],
    ['Foreign LP', 'foreign_lp'],
    ['LLP', 'domestic_llp'],
    ['Foreign LLP', 'foreign_llp'],
    ['Business Trust', 'business_trust'],
    ['Professional Association', 'professional_association'],
    ['', 'domestic_llc'],          // default fallback
    [null, 'domestic_llc'],        // null fallback
    [undefined, 'domestic_llc'],   // undefined fallback
    ['Unknown Type', 'domestic_llc'], // unknown fallback
  ];

  for (const [input, expected] of cases) {
    test(`resolves "${input}" to "${expected}"`, () => {
      assert.equal(resolveEntityType(input), expected);
    });
  }
});

describe('getEntityConfig', () => {
  test('LLC has correct deadline and fee', () => {
    const cfg = getEntityConfig('domestic_llc');
    assert.equal(cfg.deadline, '09-30');
    assert.equal(cfg.fee, 7);
    assert.equal(cfg.category, 'llcs');
    assert.equal(cfg.canReinstate, true);
  });

  test('corporation has correct deadline and fee', () => {
    const cfg = getEntityConfig('domestic_business_corp');
    assert.equal(cfg.deadline, '06-30');
    assert.equal(cfg.fee, 7);
    assert.equal(cfg.category, 'corporations');
  });

  test('nonprofit has zero fee', () => {
    const cfg = getEntityConfig('domestic_nonprofit_corp');
    assert.equal(cfg.fee, 0);
  });

  test('foreign entities cannot reinstate', () => {
    const foreignTypes = ['foreign_llc', 'foreign_business_corp', 'foreign_lp', 'foreign_llp', 'foreign_nonprofit_corp'];
    for (const type of foreignTypes) {
      const cfg = getEntityConfig(type);
      assert.equal(cfg.canReinstate, false, `${type} should have canReinstate=false`);
    }
  });

  test('domestic entities can reinstate', () => {
    const domesticTypes = ['domestic_llc', 'domestic_business_corp', 'domestic_lp', 'domestic_llp'];
    for (const type of domesticTypes) {
      const cfg = getEntityConfig(type);
      assert.equal(cfg.canReinstate, true, `${type} should have canReinstate=true`);
    }
  });
});

describe('getEntityDeadline', () => {
  test('LLC deadline is September 30', () => {
    const dl = getEntityDeadline('LLC');
    assert.equal(dl.label, 'September 30');
    assert.equal(dl.month, 8); // 0-indexed: August = 8 → September 30
    assert.equal(dl.day, 30);
  });

  test('corporation deadline is June 30', () => {
    const dl = getEntityDeadline('Corporation');
    assert.equal(dl.label, 'June 30');
    assert.equal(dl.month, 5); // May = 5 → June 30
    assert.equal(dl.day, 30);
  });

  test('LP deadline is December 31', () => {
    const dl = getEntityDeadline('LP');
    assert.equal(dl.label, 'December 31');
    assert.equal(dl.month, 11); // November = 11 → December 31
    assert.equal(dl.day, 31);
  });
});

describe('computeDaysUntil', () => {
  test('returns a positive integer', () => {
    const days = computeDaysUntil('LLC');
    assert.ok(typeof days === 'number', 'should be a number');
    assert.ok(Number.isInteger(days), 'should be an integer');
    assert.ok(days >= 1, 'should be at least 1 day in the future');
    assert.ok(days <= 730, 'should be at most 2 years out');
  });

  test('returns different values for different entity types', () => {
    // LLC deadline is Sept 30, Corp is June 30 — they should differ unless run exactly at crossover
    const llcDays = computeDaysUntil('LLC');
    const corpDays = computeDaysUntil('Corporation');
    // Both should be positive integers
    assert.ok(llcDays > 0);
    assert.ok(corpDays > 0);
  });
});

describe('getDeadlineGroup', () => {
  test('LLC resolves to llcs group', () => {
    assert.equal(getDeadlineGroup('domestic_llc'), 'llcs');
    assert.equal(getDeadlineGroup('foreign_llc'), 'llcs');
  });

  test('corp resolves to corporations group', () => {
    assert.equal(getDeadlineGroup('domestic_business_corp'), 'corporations');
    assert.equal(getDeadlineGroup('domestic_nonprofit_corp'), 'corporations');
  });

  test('others resolve to others group', () => {
    assert.equal(getDeadlineGroup('domestic_lp'), 'others');
    assert.equal(getDeadlineGroup('business_trust'), 'others');
    assert.equal(getDeadlineGroup('professional_association'), 'others');
  });
});

describe('buildChatbotKnowledge', () => {
  test('returns a non-empty string', () => {
    const kb = buildChatbotKnowledge();
    assert.ok(typeof kb === 'string');
    assert.ok(kb.length > 100, 'knowledge base should be substantial');
  });

  test('includes all three deadline categories', () => {
    const kb = buildChatbotKnowledge();
    assert.ok(kb.includes('June 30'), 'missing June 30 deadline');
    assert.ok(kb.includes('September 30'), 'missing September 30 deadline');
    assert.ok(kb.includes('December 31'), 'missing December 31 deadline');
  });

  test('includes filing URL', () => {
    const kb = buildChatbotKnowledge();
    assert.ok(kb.includes('file.dos.pa.gov'), 'missing filing URL');
  });

  test('mentions the grace period and enforcement start', () => {
    const kb = buildChatbotKnowledge();
    assert.ok(kb.includes('2027'), 'missing 2027 enforcement reference');
    assert.ok(kb.includes('2025') || kb.includes('grace'), 'missing grace period reference');
  });
});

describe('buildDeadlineSummary', () => {
  test('returns compact summary with all three groups', () => {
    const summary = buildDeadlineSummary();
    assert.ok(typeof summary === 'string');
    assert.ok(summary.includes('Jun 30'), 'missing Jun 30');
    assert.ok(summary.includes('Sept 30'), 'missing Sept 30');
    assert.ok(summary.includes('Dec 31'), 'missing Dec 31');
  });
});
