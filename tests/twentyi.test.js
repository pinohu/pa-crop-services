// Tests for api/services/twentyi.js — Wave 7 canonical 20i client.
// HTTP calls aren't exercised here (those need a live 20i sandbox); these
// tests cover Bearer construction, env var fallbacks, and the helper that
// shapes registrar contact data, which were the regression-prone bits.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const tw = await import('../api/services/twentyi.js');

describe('getBearer', () => {
  beforeEach(() => {
    delete process.env.TWENTY_I_GENERAL;
    delete process.env.TWENTY_I_TOKEN;
    tw._resetCache();
  });

  it('returns null when neither env var is set', () => {
    assert.equal(tw.getBearer(), null);
    assert.equal(tw.isConfigured(), false);
  });

  it('uses TWENTY_I_GENERAL when set', () => {
    process.env.TWENTY_I_GENERAL = 'abc123';
    tw._resetCache();
    const expected = 'Bearer ' + Buffer.from('abc123').toString('base64');
    assert.equal(tw.getBearer(), expected);
    assert.equal(tw.isConfigured(), true);
  });

  it('falls back to TWENTY_I_TOKEN before the + separator (legacy combined format)', () => {
    delete process.env.TWENTY_I_GENERAL;
    process.env.TWENTY_I_TOKEN = 'general-key+oauth-key';
    tw._resetCache();
    const expected = 'Bearer ' + Buffer.from('general-key').toString('base64');
    assert.equal(tw.getBearer(), expected);
  });

  it('prefers TWENTY_I_GENERAL when both are set', () => {
    process.env.TWENTY_I_GENERAL = 'preferred';
    process.env.TWENTY_I_TOKEN = 'fallback+oauth';
    tw._resetCache();
    const expected = 'Bearer ' + Buffer.from('preferred').toString('base64');
    assert.equal(tw.getBearer(), expected);
  });

  it('caches the Bearer token on subsequent calls', () => {
    process.env.TWENTY_I_GENERAL = 'cached-key';
    tw._resetCache();
    const a = tw.getBearer();
    // Mutate env after first read; cached value should win until reset.
    process.env.TWENTY_I_GENERAL = 'different-key';
    const b = tw.getBearer();
    assert.equal(a, b);
    tw._resetCache();
    const c = tw.getBearer();
    assert.notEqual(a, c);
  });

  afterEach(() => {
    delete process.env.TWENTY_I_GENERAL;
    delete process.env.TWENTY_I_TOKEN;
    tw._resetCache();
  });
});

describe('packageLabel', () => {
  it('formats label with tier and email', () => {
    assert.equal(tw.packageLabel({ tier: 'pro', email: 'a@b.com' }), 'PA CROP — pro — a@b.com');
  });

  it('falls back to compliance + unknown for missing fields', () => {
    assert.equal(tw.packageLabel({}), 'PA CROP — compliance — unknown');
  });

  it('handles tier without email and vice-versa', () => {
    assert.equal(tw.packageLabel({ tier: 'empire' }), 'PA CROP — empire — unknown');
    assert.equal(tw.packageLabel({ email: 'x@y.z' }), 'PA CROP — compliance — x@y.z');
  });
});

describe('defaultRegistrarContact', () => {
  it('uses the registered office defaults when env vars are unset', () => {
    delete process.env.REGISTERED_OFFICE_STREET;
    delete process.env.REGISTERED_OFFICE_CITY;
    delete process.env.REGISTERED_OFFICE_STATE;
    delete process.env.REGISTERED_OFFICE_ZIP;
    delete process.env.REGISTERED_OFFICE_COUNTRY;
    const c = tw.defaultRegistrarContact({ name: 'Acme', email: 'owner@acme.com' });
    assert.equal(c.name, 'Acme');
    assert.equal(c.email, 'owner@acme.com');
    assert.equal(c.address, '924 W 23rd St');
    assert.equal(c.city, 'Erie');
    assert.equal(c.state, 'PA');
    assert.equal(c.zip, '16502');
    assert.equal(c.country, 'US');
  });

  it('falls back to the company name when name is not provided', () => {
    const c = tw.defaultRegistrarContact({ email: 'x@y.z' });
    assert.equal(c.name, 'PA Registered Office Services LLC');
  });

  it('honors REGISTERED_OFFICE_* env vars when set (deploy-time override)', () => {
    process.env.REGISTERED_OFFICE_STREET = '100 New St';
    process.env.REGISTERED_OFFICE_CITY = 'Pittsburgh';
    process.env.REGISTERED_OFFICE_STATE = 'PA';
    process.env.REGISTERED_OFFICE_ZIP = '15222';
    const c = tw.defaultRegistrarContact({ email: 'x@y.z' });
    assert.equal(c.address, '100 New St');
    assert.equal(c.city, 'Pittsburgh');
    assert.equal(c.zip, '15222');
    delete process.env.REGISTERED_OFFICE_STREET;
    delete process.env.REGISTERED_OFFICE_CITY;
    delete process.env.REGISTERED_OFFICE_STATE;
    delete process.env.REGISTERED_OFFICE_ZIP;
  });
});

describe('getResellerId / addWebPackage validation', () => {
  beforeEach(() => {
    delete process.env.TWENTY_I_RESELLER_ID;
    delete process.env.TWENTY_I_GENERAL;
    tw._resetCache();
  });

  it('getResellerId returns empty string when unset', () => {
    assert.equal(tw.getResellerId(), '');
  });

  it('getResellerId returns the env value when set', () => {
    process.env.TWENTY_I_RESELLER_ID = '10455';
    assert.equal(tw.getResellerId(), '10455');
    delete process.env.TWENTY_I_RESELLER_ID;
  });

  it('addWebPackage rejects calls without a domain_name', async () => {
    process.env.TWENTY_I_GENERAL = 'k';
    process.env.TWENTY_I_RESELLER_ID = '10455';
    tw._resetCache();
    await assert.rejects(() => tw.addWebPackage({ type: 'linux' }), /domain_name/);
    delete process.env.TWENTY_I_GENERAL;
    delete process.env.TWENTY_I_RESELLER_ID;
    tw._resetCache();
  });

  it('addWebPackage rejects when 20i is not configured', async () => {
    delete process.env.TWENTY_I_GENERAL;
    delete process.env.TWENTY_I_TOKEN;
    tw._resetCache();
    await assert.rejects(() => tw.addWebPackage({ domain_name: 'x.com' }), /not configured/);
  });

  it('addWebPackage rejects when reseller id is unset', async () => {
    process.env.TWENTY_I_GENERAL = 'k';
    delete process.env.TWENTY_I_RESELLER_ID;
    tw._resetCache();
    await assert.rejects(() => tw.addWebPackage({ domain_name: 'x.com' }), /TWENTY_I_RESELLER_ID/);
    delete process.env.TWENTY_I_GENERAL;
    tw._resetCache();
  });
});
