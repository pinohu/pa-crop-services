import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRules, resolveEntityType, getEntityConfig, getEntityDeadline, computeDaysUntil, getDeadlineGroup } from '../api/_compliance.js';

describe('_compliance', () => {
  describe('getRules', () => {
    it('returns rules object with required keys', () => {
      const rules = getRules();
      assert.ok(rules.entityTypes, 'must have entityTypes');
      assert.ok(rules.deadlineGroups, 'must have deadlineGroups');
      assert.ok(rules.enforcement, 'must have enforcement');
      assert.ok(rules.registeredOffice, 'must have registeredOffice');
    });

    it('has correct deadline groups', () => {
      const rules = getRules();
      assert.ok(rules.deadlineGroups.corporations, 'must have corporations group');
      assert.ok(rules.deadlineGroups.llcs, 'must have llcs group');
      assert.ok(rules.deadlineGroups.others, 'must have others group');
    });
  });

  describe('resolveEntityType', () => {
    it('resolves common entity type strings', () => {
      assert.equal(resolveEntityType('LLC'), 'domestic_llc');
      assert.equal(resolveEntityType('Domestic LLC'), 'domestic_llc');
      assert.equal(resolveEntityType('Corporation'), 'domestic_business_corp');
      assert.equal(resolveEntityType('foreign LLC'), 'foreign_llc');
      assert.equal(resolveEntityType('Nonprofit'), 'domestic_nonprofit_corp');
    });

    it('defaults to domestic_llc for unknown types', () => {
      assert.equal(resolveEntityType(''), 'domestic_llc');
      assert.equal(resolveEntityType('unknown'), 'domestic_llc');
    });
  });

  describe('getEntityConfig', () => {
    it('returns config with required fields', () => {
      const config = getEntityConfig('LLC');
      assert.ok(config.key);
      assert.ok(config.label);
      assert.ok(typeof config.fee === 'number');
      assert.ok(typeof config.canReinstate === 'boolean');
    });
  });

  describe('getEntityDeadline', () => {
    it('returns deadline for corporations (June 30)', () => {
      const dl = getEntityDeadline('Corporation');
      assert.ok(dl.label.includes('June'), `Expected June deadline, got: ${dl.label}`);
    });

    it('returns deadline for LLCs (September 30)', () => {
      const dl = getEntityDeadline('LLC');
      assert.ok(dl.label.includes('September'), `Expected September deadline, got: ${dl.label}`);
    });
  });

  describe('getDeadlineGroup', () => {
    it('groups corporations correctly', () => {
      assert.equal(getDeadlineGroup('Corporation'), 'corporations');
      assert.equal(getDeadlineGroup('Nonprofit'), 'corporations');
    });

    it('groups LLCs correctly', () => {
      assert.equal(getDeadlineGroup('LLC'), 'llcs');
      assert.equal(getDeadlineGroup('foreign LLC'), 'llcs');
    });
  });

  describe('computeDaysUntil', () => {
    it('returns a positive number', () => {
      const days = computeDaysUntil('LLC');
      assert.ok(typeof days === 'number');
      // Should always be 1-365 since it wraps to next year if past
      assert.ok(days > 0 && days <= 366, `Days should be 1-366, got: ${days}`);
    });
  });
});
