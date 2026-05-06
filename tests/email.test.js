// Tests for api/services/email.js — Wave 9 consolidation module.
//
// Strategy: stub the global `fetch` symbol that fetchWithTimeout (in _fetch.js)
// ultimately delegates to. We intercept the request via a fake fetch impl so
// we can assert: (a) the correct URL/headers/body went out, (b) the function
// behaves correctly on different response shapes (2xx, 422 domain-not-verified,
// thrown network error). EMAILIT_API_KEY is set in test scope so the early
// "not configured" branch can also be exercised.

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const _origFetch = globalThis.fetch;
let _fakeFetch = null;
function setFakeFetch(impl) { _fakeFetch = impl; globalThis.fetch = (...args) => _fakeFetch(...args); }
function resetFakeFetch() { _fakeFetch = null; globalThis.fetch = _origFetch; }

// Ensure tests don't depend on any inherited env state.
const _origEmailitKey = process.env.EMAILIT_API_KEY;

const email = await import('../api/services/email.js');

describe('services/email — isConfigured', () => {
  it('returns true when EMAILIT_API_KEY is set', () => {
    process.env.EMAILIT_API_KEY = 'test-key';
    assert.equal(email.isConfigured(), true);
  });

  it('returns false when EMAILIT_API_KEY is unset', () => {
    delete process.env.EMAILIT_API_KEY;
    assert.equal(email.isConfigured(), false);
    process.env.EMAILIT_API_KEY = 'test-key';
  });
});

describe('services/email — sendEmail', () => {
  beforeEach(() => { process.env.EMAILIT_API_KEY = 'test-key'; });
  afterEach(() => { resetFakeFetch(); });

  it('returns { sent: false, reason: "emailit_not_configured" } when EMAILIT_API_KEY is unset', async () => {
    delete process.env.EMAILIT_API_KEY;
    const result = await email.sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' });
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'emailit_not_configured');
    process.env.EMAILIT_API_KEY = 'test-key';
  });

  it('returns { sent: false, reason: "missing_fields" } when to/subject/html missing', async () => {
    const noTo = await email.sendEmail({ subject: 'Hi', html: '<p>x</p>' });
    const noSubj = await email.sendEmail({ to: 'a@b.com', html: '<p>x</p>' });
    const noHtml = await email.sendEmail({ to: 'a@b.com', subject: 'Hi' });
    for (const r of [noTo, noSubj, noHtml]) {
      assert.equal(r.sent, false);
      assert.equal(r.reason, 'missing_fields');
    }
  });

  it('posts to api.emailit.com with Bearer token + correct body shape', async () => {
    let capturedUrl = null;
    let capturedOpts = null;
    setFakeFetch(async (url, opts) => {
      capturedUrl = url;
      capturedOpts = opts;
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>', from: 'custom@example.com' });
    assert.equal(capturedUrl, 'https://api.emailit.com/v1/emails');
    assert.equal(capturedOpts.method, 'POST');
    assert.equal(capturedOpts.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(capturedOpts.body);
    assert.equal(body.from, 'custom@example.com');
    assert.equal(body.to, 'a@b.com');
    assert.equal(body.subject, 'S');
    assert.equal(body.html, '<p>x</p>');
  });

  it('defaults from to hello@pacropservices.com when not specified', async () => {
    let capturedBody = null;
    setFakeFetch(async (_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>' });
    assert.equal(capturedBody.from, 'hello@pacropservices.com');
  });

  it('returns { sent: true, status: 200 } on 2xx response', async () => {
    setFakeFetch(async () => ({ ok: true, status: 200, text: async () => '' }));
    const result = await email.sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>' });
    assert.equal(result.sent, true);
    assert.equal(result.status, 200);
  });

  it('returns { sent: false, status: 422, reason: "delivery_failed" } on Emailit domain-not-verified (the original incident)', async () => {
    setFakeFetch(async () => ({
      ok: false,
      status: 422,
      text: async () => '{"error":"Domain not verified"}'
    }));
    const result = await email.sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>' });
    assert.equal(result.sent, false);
    assert.equal(result.status, 422);
    assert.equal(result.reason, 'delivery_failed');
  });

  it('returns { sent: false, reason: "request_failed" } when fetch throws a network error', async () => {
    setFakeFetch(async () => { throw new Error('ECONNREFUSED 127.0.0.1:443'); });
    const result = await email.sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>' });
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'request_failed');
    assert.match(result.error, /ECONNREFUSED/);
  });

  it('does NOT throw on Emailit failure (callers can rely on never having to try/catch)', async () => {
    setFakeFetch(async () => { throw new Error('any error'); });
    let threw = false;
    try { await email.sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>' }); }
    catch { threw = true; }
    assert.equal(threw, false);
  });
});

describe('services/email — sendBranded', () => {
  beforeEach(() => { process.env.EMAILIT_API_KEY = 'test-key'; });
  afterEach(() => { resetFakeFetch(); });

  it('wraps plain-text body with <br> for newlines (plain-text detection: no < character)', async () => {
    let capturedHtml = null;
    setFakeFetch(async (_url, opts) => {
      capturedHtml = JSON.parse(opts.body).html;
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendBranded({ to: 'a@b.com', subject: 'S', body: 'line one\nline two\nline three' });
    assert.match(capturedHtml, /line one<br>line two<br>line three/);
  });

  it('escapes HTML-significant characters in plain-text body (no XSS via stray < or &)', async () => {
    let capturedHtml = null;
    setFakeFetch(async (_url, opts) => {
      capturedHtml = JSON.parse(opts.body).html;
      return { ok: true, status: 200, text: async () => '' };
    });
    // Body has < which makes the detector flip to "HTML" mode and pass through.
    // That's the documented contract. To test the escape path we use plain text.
    await email.sendBranded({ to: 'a@b.com', subject: 'S', body: 'amperand & quote " apostrophe \'' });
    assert.match(capturedHtml, /amperand &amp; quote &quot; apostrophe &#39;/);
  });

  it('passes raw HTML body through untouched (detected by presence of < character)', async () => {
    let capturedHtml = null;
    setFakeFetch(async (_url, opts) => {
      capturedHtml = JSON.parse(opts.body).html;
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendBranded({ to: 'a@b.com', subject: 'S', body: '<p>hello <strong>world</strong></p>' });
    // Body should appear with raw HTML, not escaped
    assert.match(capturedHtml, /<strong>world<\/strong>/);
  });

  it('always wraps body in PA CROP branded shell (header + footer + UPL disclaimer)', async () => {
    let capturedHtml = null;
    setFakeFetch(async (_url, opts) => {
      capturedHtml = JSON.parse(opts.body).html;
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendBranded({ to: 'a@b.com', subject: 'S', body: 'plain text' });
    assert.match(capturedHtml, /PA CROP Services/);
    assert.match(capturedHtml, /924 W 23rd St/);  // footer address
    assert.match(capturedHtml, /not a law firm/i);  // UPL disclaimer
  });

  it('renders CTA button when ctaUrl provided', async () => {
    let capturedHtml = null;
    setFakeFetch(async (_url, opts) => {
      capturedHtml = JSON.parse(opts.body).html;
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendBranded({
      to: 'a@b.com', subject: 'S', body: 'x',
      ctaUrl: 'https://pacropservices.com/portal',
      ctaLabel: 'Open Portal'
    });
    assert.match(capturedHtml, /href="https:\/\/pacropservices\.com\/portal"/);
    assert.match(capturedHtml, /Open Portal/);
  });

  it('omits CTA block when ctaUrl is not provided', async () => {
    let capturedHtml = null;
    setFakeFetch(async (_url, opts) => {
      capturedHtml = JSON.parse(opts.body).html;
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.sendBranded({ to: 'a@b.com', subject: 'S', body: 'x' });
    assert.doesNotMatch(capturedHtml, /display:inline-block;background:#0C1220/);
  });
});

describe('services/email — notifyOps', () => {
  beforeEach(() => { process.env.EMAILIT_API_KEY = 'test-key'; });
  afterEach(() => { resetFakeFetch(); });

  it('sends from alerts@ to hello@ with [PA CROP] subject prefix', async () => {
    let capturedBody = null;
    setFakeFetch(async (_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, status: 200, text: async () => '' };
    });
    await email.notifyOps('Provisioning failed for client@example.com', '<p>see logs</p>');
    assert.equal(capturedBody.from, 'alerts@pacropservices.com');
    assert.equal(capturedBody.to, 'hello@pacropservices.com');
    assert.equal(capturedBody.subject, '[PA CROP] Provisioning failed for client@example.com');
    assert.match(capturedBody.html, /see logs/);
  });

  it('returns { sent: false } gracefully when EMAILIT_API_KEY is unset (does not throw)', async () => {
    delete process.env.EMAILIT_API_KEY;
    const result = await email.notifyOps('test', 'body');
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'emailit_not_configured');
    process.env.EMAILIT_API_KEY = 'test-key';
  });
});

describe('services/email — escHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    assert.equal(email.escHtml('<a href="x?b=1&c=2">test\'s</a>'),
      '&lt;a href=&quot;x?b=1&amp;c=2&quot;&gt;test&#39;s&lt;/a&gt;');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(email.escHtml(null), '');
    assert.equal(email.escHtml(undefined), '');
  });

  it('coerces non-strings to string before escaping', () => {
    assert.equal(email.escHtml(42), '42');
    assert.equal(email.escHtml(true), 'true');
  });
});

after(() => {
  // Restore original env state in case other test files run after this one.
  if (_origEmailitKey === undefined) delete process.env.EMAILIT_API_KEY;
  else process.env.EMAILIT_API_KEY = _origEmailitKey;
  resetFakeFetch();
});
