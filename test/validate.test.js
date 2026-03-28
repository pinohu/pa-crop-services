import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isValidUUID, isValidString, sanitize, isValidPlanCode } from '../api/_validate.js';

describe('_validate', () => {
  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      assert.ok(isValidEmail('test@example.com'));
      assert.ok(isValidEmail('user+tag@domain.co.uk'));
    });

    it('rejects invalid emails', () => {
      assert.ok(!isValidEmail(''));
      assert.ok(!isValidEmail('notanemail'));
      assert.ok(!isValidEmail('@no-local.com'));
      assert.ok(!isValidEmail('spaces here@test.com'));
      assert.ok(!isValidEmail(null));
      assert.ok(!isValidEmail(123));
    });

    it('rejects emails exceeding 254 chars', () => {
      const long = 'a'.repeat(250) + '@b.co';
      assert.ok(!isValidEmail(long));
    });
  });

  describe('isValidUUID', () => {
    it('accepts valid UUIDv4', () => {
      assert.ok(isValidUUID('550e8400-e29b-41d4-a716-446655440000'));
    });

    it('rejects non-UUID strings', () => {
      assert.ok(!isValidUUID('not-a-uuid'));
      assert.ok(!isValidUUID(''));
      assert.ok(!isValidUUID(null));
    });
  });

  describe('isValidString', () => {
    it('validates with defaults', () => {
      assert.ok(isValidString('hello'));
      assert.ok(!isValidString(''));
      assert.ok(!isValidString('   '));
    });

    it('validates with custom limits', () => {
      assert.ok(isValidString('ab', { minLength: 2, maxLength: 5 }));
      assert.ok(!isValidString('a', { minLength: 2 }));
      assert.ok(!isValidString('abcdef', { maxLength: 5 }));
    });
  });

  describe('sanitize', () => {
    it('strips HTML tags', () => {
      assert.equal(sanitize('<script>alert("xss")</script>'), 'alert("xss")');
      assert.equal(sanitize('<b>bold</b>'), 'bold');
    });

    it('handles non-string input', () => {
      assert.equal(sanitize(null), '');
      assert.equal(sanitize(123), '');
    });
  });

  describe('isValidPlanCode', () => {
    it('accepts valid plan codes', () => {
      assert.ok(isValidPlanCode('compliance_only'));
      assert.ok(isValidPlanCode('business_starter'));
      assert.ok(isValidPlanCode('business_pro'));
      assert.ok(isValidPlanCode('business_empire'));
    });

    it('rejects invalid plan codes', () => {
      assert.ok(!isValidPlanCode('free'));
      assert.ok(!isValidPlanCode(''));
      assert.ok(!isValidPlanCode(null));
    });
  });
});
