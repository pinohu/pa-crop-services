// Tests for api/services/auth.js — isAdminRequest, verifyTwilioSignature,
// safeCompare. These are the security-critical helpers that gate every
// admin/internal/twilio webhook in the codebase.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// services/auth.js fails fast on missing JWT_SECRET / ADMIN_SECRET_KEY unless
// NODE_ENV is 'test'. Set both before the module loads.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-min-len-aaa';
process.env.ADMIN_SECRET_KEY = 'test-admin-key-XYZ-9876543210';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token-AAAAAAAAAAAAAAAA';

const auth = await import('../api/services/auth.js');

describe('isAdminRequest', () => {
  it('returns true when X-Admin-Key matches ADMIN_SECRET_KEY exactly', () => {
    const req = { headers: { 'x-admin-key': 'test-admin-key-XYZ-9876543210' } };
    assert.equal(auth.isAdminRequest(req), true);
  });

  it('returns true when X-Internal-Key matches (Wave 1 unified header support)', () => {
    const req = { headers: { 'x-internal-key': 'test-admin-key-XYZ-9876543210' } };
    assert.equal(auth.isAdminRequest(req), true);
  });

  it('returns false for an off-by-one-character key (timing-safe compare)', () => {
    const req = { headers: { 'x-admin-key': 'test-admin-key-XYZ-9876543211' } };
    assert.equal(auth.isAdminRequest(req), false);
  });

  it('returns false for a shorter prefix of the real key', () => {
    const req = { headers: { 'x-admin-key': 'test-admin-key-XYZ' } };
    assert.equal(auth.isAdminRequest(req), false);
  });

  it('returns false for a longer key with the real key as prefix', () => {
    const req = { headers: { 'x-admin-key': 'test-admin-key-XYZ-9876543210EXTRA' } };
    assert.equal(auth.isAdminRequest(req), false);
  });

  it('returns false when both headers are missing', () => {
    assert.equal(auth.isAdminRequest({ headers: {} }), false);
  });

  it('returns false when the header value is non-string', () => {
    assert.equal(auth.isAdminRequest({ headers: { 'x-admin-key': 12345 } }), false);
    assert.equal(auth.isAdminRequest({ headers: { 'x-admin-key': null } }), false);
    assert.equal(auth.isAdminRequest({ headers: { 'x-admin-key': undefined } }), false);
  });

  it('does NOT accept the admin key from the request body or query', () => {
    // Even if the body says adminKey, isAdminRequest reads from headers only.
    const req = { headers: {}, body: { adminKey: 'test-admin-key-XYZ-9876543210' }, query: { adminKey: 'test-admin-key-XYZ-9876543210' } };
    assert.equal(auth.isAdminRequest(req), false);
  });

  it('prefers x-admin-key when both headers are present', () => {
    const req = { headers: {
      'x-admin-key': 'test-admin-key-XYZ-9876543210',
      'x-internal-key': 'wrong-key'
    }};
    assert.equal(auth.isAdminRequest(req), true);
  });
});

describe('verifyTwilioSignature', () => {
  // Helper: produce the signature Twilio would produce for given URL + params
  function sign(authToken, url, params) {
    const sortedKeys = Object.keys(params).sort();
    let signedString = url;
    for (const k of sortedKeys) {
      const v = params[k];
      signedString += k + (v === null || v === undefined ? '' : String(v));
    }
    return createHmac('sha1', authToken).update(signedString, 'utf8').digest('base64');
  }

  function buildReq({ proto = 'https', host = 'pacropservices.com', url = '/api/voice', body = {}, sig }) {
    return {
      headers: {
        'x-forwarded-proto': proto,
        'x-forwarded-host': host,
        'x-twilio-signature': sig
      },
      url,
      body
    };
  }

  it('accepts a request signed with TWILIO_AUTH_TOKEN', () => {
    const params = { CallSid: 'CA123', From: '+12025551212', SpeechResult: 'Hello' };
    const url = 'https://pacropservices.com/api/voice';
    const sig = sign('test-twilio-token-AAAAAAAAAAAAAAAA', url, params);
    const req = buildReq({ url: '/api/voice', body: params, sig });
    assert.equal(auth.verifyTwilioSignature(req), true);
  });

  it('accepts when params are in any order (signature recomputes from sorted keys)', () => {
    const params = { Z: '1', A: '2', M: '3' };
    const url = 'https://pacropservices.com/api/voice';
    const sig = sign('test-twilio-token-AAAAAAAAAAAAAAAA', url, params);
    const req = buildReq({ url: '/api/voice', body: { A: '2', M: '3', Z: '1' }, sig });
    assert.equal(auth.verifyTwilioSignature(req), true);
  });

  it('rejects when the signature header is missing', () => {
    const req = buildReq({ body: { CallSid: 'CA1' }, sig: undefined });
    assert.equal(auth.verifyTwilioSignature(req), false);
  });

  it('rejects when the body has been tampered with', () => {
    const params = { CallSid: 'CA123', From: '+12025551212' };
    const url = 'https://pacropservices.com/api/voice';
    const sig = sign('test-twilio-token-AAAAAAAAAAAAAAAA', url, params);
    const tamperedReq = buildReq({
      url: '/api/voice',
      body: { CallSid: 'CA123', From: '+19999999999' }, // changed
      sig
    });
    assert.equal(auth.verifyTwilioSignature(tamperedReq), false);
  });

  it('rejects when the URL has been tampered with (path mismatch)', () => {
    const params = { CallSid: 'CA1' };
    const sigForVoice = sign('test-twilio-token-AAAAAAAAAAAAAAAA', 'https://pacropservices.com/api/voice', params);
    // Replay against /api/voice-recording with the same body + sig
    const req = buildReq({ url: '/api/voice-recording', body: params, sig: sigForVoice });
    assert.equal(auth.verifyTwilioSignature(req), false);
  });

  it('rejects when signed by a different auth token', () => {
    const params = { CallSid: 'CA1' };
    const url = 'https://pacropservices.com/api/voice';
    const sig = sign('different-token-evil', url, params);
    const req = buildReq({ url: '/api/voice', body: params, sig });
    assert.equal(auth.verifyTwilioSignature(req), false);
  });

  it('rejects when the host header is missing entirely', () => {
    const params = { CallSid: 'CA1' };
    const sig = sign('test-twilio-token-AAAAAAAAAAAAAAAA', 'https://pacropservices.com/api/voice', params);
    const req = { headers: { 'x-twilio-signature': sig }, url: '/api/voice', body: params };
    assert.equal(auth.verifyTwilioSignature(req), false);
  });

  it('handles empty body (e.g. status callbacks with only query params on URL)', () => {
    const url = 'https://pacropservices.com/api/voice';
    const sig = sign('test-twilio-token-AAAAAAAAAAAAAAAA', url, {});
    const req = buildReq({ url: '/api/voice', body: {}, sig });
    assert.equal(auth.verifyTwilioSignature(req), true);
  });

  it('treats null/undefined param values as empty string in signature input', () => {
    // Twilio sometimes sends fields with empty values; the signature uses ''
    // for those. Our verifier must too.
    const params = { CallSid: 'CA1', Optional: '' };
    const url = 'https://pacropservices.com/api/voice';
    const sig = sign('test-twilio-token-AAAAAAAAAAAAAAAA', url, params);
    const req = buildReq({ url: '/api/voice', body: { CallSid: 'CA1', Optional: null }, sig });
    assert.equal(auth.verifyTwilioSignature(req), true);
  });
});

// safeCompare is intentionally private to services/auth.js — its behavior is
// covered transitively by the isAdminRequest length-mismatch + off-by-one
// cases above.
