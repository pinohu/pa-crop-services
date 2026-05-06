// Tests for api/stripe-webhook.js — Wave 2 hardened the signature verification
// and added Redis-backed idempotency. The previous JSON.stringify-then-HMAC
// shape was structurally broken; this test suite locks in the correct
// raw-bytes-HMAC behavior so it can't regress.

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// ── Test environment ──────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-min-len-aaa';
process.env.ADMIN_SECRET_KEY = 'test-admin-key-XYZ-9876543210';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests';
delete process.env.UPSTASH_REDIS_REST_URL;        // disable Redis idempotency in tests
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.EMAILIT_API_KEY;               // notifyOps becomes a no-op
delete process.env.DATABASE_URL;                  // db.isConnected() returns false

// Stub global fetch so internal calls (n8n, /api/provision, /api/sms) all
// resolve to a generic 200 without triggering real network traffic.
const _origFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true, status: 200,
  json: async () => ({ success: true, steps: [] }),
  text: async () => 'OK'
});

// ── Helpers ──────────────────────────────────────────────────────────

function buildStripeSig(timestamp, rawBody, secret) {
  const signedPayload = `${timestamp}.${rawBody}`;
  const sig = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

/**
 * Construct a minimal req object with a body stream and headers.
 * The handler reads via `for await (const chunk of req)`.
 */
function mockReq({ method = 'POST', headers = {}, body = '' }) {
  const buffer = Buffer.from(body, 'utf8');
  return {
    method,
    headers,
    [Symbol.asyncIterator]: async function* () {
      yield buffer;
    }
  };
}

/**
 * Construct a minimal res object that captures status + body.
 */
function mockRes() {
  const res = { _status: null, _body: null, _headers: {} };
  res.status = (code) => { res._status = code; return res; };
  res.setHeader = (k, v) => { res._headers[k] = v; };
  res.json = (obj) => { res._body = obj; return res; };
  res.send = (s) => { res._body = s; return res; };
  res.end = () => res;
  return res;
}

// Import after env is set so the FATAL guards in services/auth.js don't trip.
const stripeWebhook = (await import('../api/stripe-webhook.js')).default;

// ── Tests ────────────────────────────────────────────────────────────

describe('stripe-webhook — signature verification', () => {
  it('returns 400 when Stripe-Signature header is missing', async () => {
    const event = JSON.stringify({ id: 'evt_no_sig', type: 'checkout.session.completed' });
    const req = mockReq({ headers: {}, body: event });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 400);
    assert.match(res._body?.error || '', /Missing Stripe-Signature/);
  });

  it('returns 400 when signature header is malformed (no t= or no v1=)', async () => {
    const event = JSON.stringify({ id: 'evt_malformed', type: 'checkout.session.completed' });
    const req = mockReq({
      headers: { 'stripe-signature': 'garbage,no-timestamp,no-v1' },
      body: event
    });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 400);
  });

  it('returns 400 when timestamp is more than 5 minutes old (replay attack)', async () => {
    const ts = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const event = JSON.stringify({ id: 'evt_old', type: 'checkout.session.completed' });
    const sig = buildStripeSig(ts, event, process.env.STRIPE_WEBHOOK_SECRET);
    const req = mockReq({ headers: { 'stripe-signature': sig }, body: event });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 400);
    assert.match(res._body?.error || '', /too old|timestamp/i);
  });

  it('returns 400 when signature is computed with the wrong secret', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const event = JSON.stringify({ id: 'evt_wrong_secret', type: 'checkout.session.completed' });
    const sig = buildStripeSig(ts, event, 'whsec_DIFFERENT_secret');
    const req = mockReq({ headers: { 'stripe-signature': sig }, body: event });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 400);
    assert.match(res._body?.error || '', /Invalid signature/);
  });

  it('returns 400 when body is tampered after signing (raw bytes must match)', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const originalBody = JSON.stringify({ id: 'evt_tamper', type: 'checkout.session.completed', original: true });
    const sig = buildStripeSig(ts, originalBody, process.env.STRIPE_WEBHOOK_SECRET);
    // Replay the signature with a different body
    const tamperedBody = JSON.stringify({ id: 'evt_tamper', type: 'checkout.session.completed', tampered: true });
    const req = mockReq({ headers: { 'stripe-signature': sig }, body: tamperedBody });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 400);
    assert.match(res._body?.error || '', /Invalid signature/);
  });

  it('accepts a correctly-signed event with current timestamp', async () => {
    const ts = Math.floor(Date.now() / 1000);
    // Use an event type the handler doesn't actively process so we don't
    // need to mock /api/provision, /api/sms, etc. The handler returns
    // 200 with received:true regardless.
    const event = JSON.stringify({ id: 'evt_unknown_type_' + Date.now(), type: 'product.updated' });
    const sig = buildStripeSig(ts, event, process.env.STRIPE_WEBHOOK_SECRET);
    const req = mockReq({ headers: { 'stripe-signature': sig }, body: event });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 200);
    assert.equal(res._body?.received, true);
  });

  it('rejects requests with method other than POST or OPTIONS', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 405);
  });

  it('handles OPTIONS preflight with 200', async () => {
    const req = mockReq({ method: 'OPTIONS' });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 200);
  });
});

describe('stripe-webhook — body parsing', () => {
  it('returns 400 when payload is not valid JSON', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const garbageBody = 'not valid json {';
    const sig = buildStripeSig(ts, garbageBody, process.env.STRIPE_WEBHOOK_SECRET);
    const req = mockReq({ headers: { 'stripe-signature': sig }, body: garbageBody });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 400);
    assert.match(res._body?.error || '', /Invalid JSON payload/);
  });
});

describe('stripe-webhook — environment guards', () => {
  it('returns 500 when STRIPE_WEBHOOK_SECRET is unset', async () => {
    const original = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const event = JSON.stringify({ id: 'evt_no_secret', type: 'checkout.session.completed' });
    const req = mockReq({ headers: { 'stripe-signature': 't=1,v1=x' }, body: event });
    const res = mockRes();
    await stripeWebhook(req, res);
    assert.equal(res._status, 500);
    assert.match(res._body?.error || '', /Webhook secret not configured/);
    process.env.STRIPE_WEBHOOK_SECRET = original;
  });
});

after(() => {
  globalThis.fetch = _origFetch;
});
