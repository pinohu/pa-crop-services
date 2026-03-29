// PA CROP Services — Input Validation Unit Tests
// Tests the shared validation utilities used across all API handlers.
// These gate all external input so correctness is critical.
//
// Run: node --test tests/validate.test.js

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  isValidEmail,
  isValidUUID,
  isValidString,
  isValidPlanCode,
  sanitize,
  requestId,
  requireJson,
  rejectOversizedBody
} from '../api/_validate.js';

describe('isValidEmail', () => {
  const valid = [
    'user@example.com',
    'user+tag@example.co.uk',
    'first.last@sub.domain.com',
    'a@b.io',
  ];
  const invalid = [
    '',
    'notanemail',
    '@nodomain.com',
    'noatsign',
    'user@',
    'user@.com',
    'a'.repeat(255) + '@example.com', // too long
    null,
    undefined,
    123,
  ];

  for (const email of valid) {
    test(`accepts valid email: "${email}"`, () => {
      assert.equal(isValidEmail(email), true);
    });
  }

  for (const email of invalid) {
    test(`rejects invalid email: ${JSON.stringify(email)}`, () => {
      assert.equal(isValidEmail(email), false);
    });
  }
});

describe('isValidUUID', () => {
  test('accepts valid UUID v4', () => {
    // Valid v4: version nibble = 4, variant nibble = 8, 9, a, or b
    assert.equal(isValidUUID('550e8400-e29b-4000-8716-446655440000'), true);
    assert.equal(isValidUUID('6ba7b810-9dad-4000-b000-00c04fd430c8'), true);
    assert.equal(isValidUUID('550e8400-e29b-41d4-a716-446655440000'), true);  // 'a' variant is valid
  });

  test('rejects UUIDs with wrong version', () => {
    // Version must be 4 (the third segment must start with 4)
    assert.equal(isValidUUID('550e8400-e29b-1000-8716-446655440000'), false); // v1
    assert.equal(isValidUUID('550e8400-e29b-3000-8716-446655440000'), false); // v3
    assert.equal(isValidUUID('550e8400-e29b-5000-8716-446655440000'), false); // v5
  });

  test('rejects UUIDs with wrong variant', () => {
    // Variant nibble must be 8, 9, a, or b
    assert.equal(isValidUUID('550e8400-e29b-4000-0716-446655440000'), false); // 0 variant
    assert.equal(isValidUUID('550e8400-e29b-4000-f716-446655440000'), false); // f variant
  });

  test('rejects non-UUIDs', () => {
    assert.equal(isValidUUID(''), false);
    assert.equal(isValidUUID('not-a-uuid'), false);
    assert.equal(isValidUUID(null), false);
    assert.equal(isValidUUID(undefined), false);
    assert.equal(isValidUUID('123'), false);
    assert.equal(isValidUUID('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'), false);
  });
});

describe('isValidString', () => {
  test('accepts strings within length bounds', () => {
    assert.equal(isValidString('hello'), true);
    assert.equal(isValidString('a', { minLength: 1 }), true);
    assert.equal(isValidString('hello world', { maxLength: 100 }), true);
  });

  test('rejects strings outside bounds', () => {
    assert.equal(isValidString('', { minLength: 1 }), false);
    assert.equal(isValidString('   ', { minLength: 1 }), false); // only whitespace
    assert.equal(isValidString('toolong', { maxLength: 3 }), false);
  });

  test('rejects non-strings', () => {
    assert.equal(isValidString(null), false);
    assert.equal(isValidString(undefined), false);
    assert.equal(isValidString(123), false);
    assert.equal(isValidString([]), false);
  });

  test('defaults: minLength=1, maxLength=1000', () => {
    assert.equal(isValidString('a'), true);
    assert.equal(isValidString(''), false);
    assert.equal(isValidString('a'.repeat(1001)), false);
    assert.equal(isValidString('a'.repeat(1000)), true);
  });
});

describe('isValidPlanCode', () => {
  const valid = ['compliance_only', 'business_starter', 'business_pro', 'business_empire'];
  const invalid = ['', 'basic', 'enterprise', 'COMPLIANCE_ONLY', null, undefined];

  for (const code of valid) {
    test(`accepts valid plan code: "${code}"`, () => {
      assert.equal(isValidPlanCode(code), true);
    });
  }

  for (const code of invalid) {
    test(`rejects invalid plan code: ${JSON.stringify(code)}`, () => {
      assert.equal(isValidPlanCode(code), false);
    });
  }
});

describe('sanitize', () => {
  test('strips HTML tags', () => {
    assert.equal(sanitize('<script>alert(1)</script>'), 'alert(1)');
    assert.equal(sanitize('<b>bold</b>'), 'bold');
    assert.equal(sanitize('<img src="x" onerror="evil()">'), '');
  });

  test('trims whitespace', () => {
    assert.equal(sanitize('  hello  '), 'hello');
  });

  test('returns empty string for non-strings', () => {
    assert.equal(sanitize(null), '');
    assert.equal(sanitize(undefined), '');
    assert.equal(sanitize(123), '');
  });

  test('preserves plain text', () => {
    assert.equal(sanitize('Hello, world!'), 'Hello, world!');
    assert.equal(sanitize('user@example.com'), 'user@example.com');
  });

  test('handles XSS vectors', () => {
    const xss = '<img src=x onerror=alert(1)>';
    const result = sanitize(xss);
    assert.ok(!result.includes('<'), 'should strip < character');
    assert.ok(!result.includes('>'), 'should strip > character');
  });
});

describe('requestId', () => {
  test('returns a string starting with req_', () => {
    const id = requestId();
    assert.ok(typeof id === 'string');
    assert.ok(id.startsWith('req_'));
  });

  test('returns unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, requestId));
    assert.equal(ids.size, 100, 'all 100 request IDs should be unique');
  });
});

describe('requireJson', () => {
  function mockRes() {
    let code; let body;
    return {
      status(c) { code = c; return this; },
      json(b) { body = b; return this; },
      get code() { return code; },
      get body() { return body; }
    };
  }

  test('passes GET requests without checking Content-Type', () => {
    const req = { method: 'GET', headers: {} };
    const res = mockRes();
    assert.equal(requireJson(req, res), false);
  });

  test('passes POST with application/json', () => {
    const req = { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' } };
    const res = mockRes();
    assert.equal(requireJson(req, res), false);
  });

  test('rejects POST without Content-Type', () => {
    const req = { method: 'POST', headers: {} };
    const res = mockRes();
    assert.equal(requireJson(req, res), true);
    assert.equal(res.code, 415);
    assert.equal(res.body.success, false);
  });

  test('rejects POST with text/plain Content-Type', () => {
    const req = { method: 'POST', headers: { 'content-type': 'text/plain' } };
    const res = mockRes();
    assert.equal(requireJson(req, res), true);
    assert.equal(res.code, 415);
  });

  test('passes PUT with application/json', () => {
    const req = { method: 'PUT', headers: { 'content-type': 'application/json' } };
    const res = mockRes();
    assert.equal(requireJson(req, res), false);
  });
});

describe('rejectOversizedBody', () => {
  function mockRes() {
    let code; let body;
    return {
      status(c) { code = c; return this; },
      json(b) { body = b; return this; },
      get code() { return code; },
      get body() { return body; }
    };
  }

  test('passes when Content-Length is within limit', () => {
    const req = { headers: { 'content-length': '1000' } };
    const res = mockRes();
    assert.equal(rejectOversizedBody(req, res, 4096), false);
  });

  test('passes when Content-Length is absent', () => {
    const req = { headers: {} };
    const res = mockRes();
    assert.equal(rejectOversizedBody(req, res, 4096), false);
  });

  test('rejects when Content-Length exceeds limit', () => {
    const req = { headers: { 'content-length': '10000' } };
    const res = mockRes();
    assert.equal(rejectOversizedBody(req, res, 4096), true);
    assert.equal(res.code, 413);
    assert.equal(res.body.success, false);
  });

  test('uses 1 MB default limit', () => {
    const req = { headers: { 'content-length': String(1_048_577) } };
    const res = mockRes();
    assert.equal(rejectOversizedBody(req, res), true);
    assert.equal(res.code, 413);
  });
});
