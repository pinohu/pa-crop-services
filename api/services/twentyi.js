// PA CROP Services — 20i hosting service module
// Single canonical client for the 20i Reseller API. Replaces the duplicated
// Bearer construction + ad-hoc fetch wrappers spread across provision.js,
// admin/index.js, hosting-manage.js, hosting-health.js, client-hosting.js,
// website-builder.js, ops-digest.js, and others.
//
// API reference: https://my.20i.com/reseller/apiDoc
// All endpoints expect Authorization: Bearer base64(GENERAL_API_KEY).

import { fetchWithTimeout } from '../_fetch.js';

const TWENTY_I_BASE = 'https://api.20i.com';

let _bearerCache = null;

/**
 * Returns the Bearer token (base64-encoded general key) or null if not configured.
 * Reads from TWENTY_I_GENERAL preferred; falls back to TWENTY_I_TOKEN.split('+')[0]
 * for legacy combined-token format.
 */
export function getBearer() {
  if (_bearerCache) return _bearerCache;
  const generalKey = process.env.TWENTY_I_GENERAL
    || (process.env.TWENTY_I_TOKEN ? process.env.TWENTY_I_TOKEN.split('+')[0] : '');
  if (!generalKey) return null;
  _bearerCache = `Bearer ${Buffer.from(generalKey).toString('base64')}`;
  return _bearerCache;
}

export function getResellerId() {
  return process.env.TWENTY_I_RESELLER_ID || '';
}

export function isConfigured() {
  return !!getBearer();
}

/**
 * Low-level 20i fetch. Throws on non-OK response (callers can catch and decide).
 * Prefer the typed helpers below for known endpoints.
 */
export async function twentyiFetch(path, opts = {}) {
  const bearer = getBearer();
  if (!bearer) throw new Error('20i not configured (TWENTY_I_GENERAL missing)');
  const url = path.startsWith('http') ? path : `${TWENTY_I_BASE}${path}`;
  const res = await fetchWithTimeout(url, {
    ...opts,
    headers: {
      'Authorization': bearer,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`20i ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json().catch(() => ({}));
}

// ── Reseller-level operations ──────────────────────────────────────────────

/**
 * Create a new web hosting package under the reseller account.
 * Per 20i API docs, valid `type` values are: linux | windows | vps | iaas.
 * (`standard` is NOT a valid type — earlier admin/index.js used a made-up
 * `packageBundle` shape and `type: 'standard'`; this helper unifies on the
 * documented schema.)
 *
 * @param {object} opts
 * @param {string} opts.type - linux | windows | vps | iaas
 * @param {string} opts.domain_name - Primary domain for the package
 * @param {string[]} [opts.extra_domain_names=[]] - Additional domains to bind
 * @param {string} [opts.label] - Internal label for the reseller dashboard
 * @returns {Promise<{ packageId: string|number, raw: object }>}
 */
export async function addWebPackage({ type = 'linux', domain_name, extra_domain_names = [], label }) {
  if (!domain_name) throw new Error('addWebPackage requires domain_name');
  const resellerId = getResellerId();
  if (!resellerId) throw new Error('TWENTY_I_RESELLER_ID not configured');
  const body = {
    type,
    domain_name,
    extra_domain_names: Array.isArray(extra_domain_names) ? extra_domain_names : [],
    ...(label ? { label } : {})
  };
  const data = await twentyiFetch(`/reseller/${resellerId}/addWeb`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  // 20i returns the new package id under either `result` or `id` depending on
  // endpoint variant. Normalize.
  const packageId = data?.result || data?.id || (typeof data === 'string' || typeof data === 'number' ? data : null);
  return { packageId, raw: data };
}

/**
 * Create a StackCP user (the client's hosting control-panel login).
 */
export async function addStackUser({ person_name, email, password, package_ids = [], grant_all_packages = false, send_welcome_email = true }) {
  const resellerId = getResellerId();
  if (!resellerId) throw new Error('TWENTY_I_RESELLER_ID not configured');
  return twentyiFetch(`/reseller/${resellerId}/addStackUser`, {
    method: 'POST',
    body: JSON.stringify({
      person_name, email, password, package_ids, grant_all_packages, send_welcome_email
    })
  });
}

/**
 * Register a domain via the reseller account.
 */
export async function addDomain({ name, years = 1, contact }) {
  const resellerId = getResellerId();
  if (!resellerId) throw new Error('TWENTY_I_RESELLER_ID not configured');
  return twentyiFetch(`/reseller/${resellerId}/addDomain`, {
    method: 'POST',
    body: JSON.stringify({ name, years, contact })
  });
}

/**
 * List all hosting packages under the reseller account. Returns the raw map
 * (packageId → details) per 20i convention.
 */
export async function listResellerPackages() {
  const resellerId = getResellerId();
  if (!resellerId) throw new Error('TWENTY_I_RESELLER_ID not configured');
  return twentyiFetch(`/reseller/${resellerId}/package`);
}

/** Search for a domain's availability + pricing. */
export async function domainSearch(domain) {
  const resellerId = getResellerId();
  if (!resellerId) throw new Error('TWENTY_I_RESELLER_ID not configured');
  return twentyiFetch(`/reseller/domain-search?domain=${encodeURIComponent(domain)}`);
}

// ── Package-level operations ───────────────────────────────────────────────

export async function getPackage(packageId) {
  return twentyiFetch(`/package/${packageId}`);
}

export async function addSsl(packageId, domain) {
  return twentyiFetch(`/package/${packageId}/web/addSsl`, {
    method: 'POST',
    body: JSON.stringify({ name: domain })
  });
}

export async function getSslStatus(packageId) {
  return twentyiFetch(`/package/${packageId}/web/ssl`);
}

export async function addEmailMailbox(packageId, domain, { address, password, quota = 25000 }) {
  return twentyiFetch(`/package/${packageId}/email/${domain}`, {
    method: 'POST',
    body: JSON.stringify({ email: { address, quota, password } })
  });
}

export async function installOneClickApp(packageId, { domain, app, directory = '/', admin_email, admin_user, admin_password, site_name }) {
  return twentyiFetch(`/package/${packageId}/web/oneclick`, {
    method: 'POST',
    body: JSON.stringify({ domain, app, directory, admin_email, admin_user, admin_password, site_name })
  });
}

/**
 * Convenience: install WordPress (the only one-click app PA CROP currently uses).
 */
export async function installWordPress(packageId, opts) {
  return installOneClickApp(packageId, { ...opts, app: 'wordpress' });
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Construct a sensible label for a new package given client context.
 */
export function packageLabel({ tier, email }) {
  return `PA CROP — ${tier || 'compliance'} — ${email || 'unknown'}`;
}

/**
 * Default 20i contact block for domain registration. Pulls registered office
 * from env (NOT hardcoded) so a future address change doesn't require a code
 * deploy.
 */
export function defaultRegistrarContact({ name, email }) {
  return {
    name: name || 'PA Registered Office Services LLC',
    email,
    address: process.env.REGISTERED_OFFICE_STREET || '924 W 23rd St',
    city: process.env.REGISTERED_OFFICE_CITY || 'Erie',
    state: process.env.REGISTERED_OFFICE_STATE || 'PA',
    zip: process.env.REGISTERED_OFFICE_ZIP || '16502',
    country: process.env.REGISTERED_OFFICE_COUNTRY || 'US'
  };
}

// Reset cached Bearer (test-only).
export function _resetCache() { _bearerCache = null; }
