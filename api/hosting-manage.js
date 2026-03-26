// PA CROP Services — /api/hosting-manage
// Comprehensive hosting management API wrapping the 20i reseller API.
// Called by both the client portal (JWT Bearer) and admin dashboard (X-Admin-Key).
//
// POST { action, ...params }
// All responses: { success: boolean, data?: any, error?: string }

import { setCors, authenticateRequest, isAdminRequest } from './services/auth.js';
import { fetchWithTimeout, recordFailure, recordSuccess, isCircuitOpen } from './_fetch.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('hosting-manage');

const TWENTY_I_BASE = 'https://api.20i.com';
const CIRCUIT_KEY = '20i';

// ── 20i auth helpers ──────────────────────────────────────

function getBearer() {
  const key = process.env.TWENTY_I_GENERAL || (process.env.TWENTY_I_TOKEN || '').split('+')[0];
  return key ? `Bearer ${Buffer.from(key).toString('base64')}` : null;
}

function getResellerId() {
  return process.env.TWENTY_I_RESELLER_ID || '10455';
}

// ── 20i fetch wrapper ────────────────────────────────────

async function twentyiFetch(path, opts = {}) {
  if (isCircuitOpen(CIRCUIT_KEY)) {
    throw new Error('20i API temporarily unavailable (circuit open)');
  }

  const bearer = getBearer();
  if (!bearer) throw new Error('20i not configured');

  const method = opts.method || 'GET';
  const fetchOpts = {
    ...opts,
    method,
    headers: {
      Authorization: bearer,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  };

  try {
    const res = await fetchWithTimeout(`${TWENTY_I_BASE}${path}`, fetchOpts, 15000);
    if (res.status >= 500) {
      recordFailure(CIRCUIT_KEY);
      const text = await res.text().catch(() => '');
      throw new Error(`20i ${res.status}: ${text.slice(0, 200)}`);
    }
    recordSuccess(CIRCUIT_KEY);
    const data = await res.json().catch(() => ({ _rawStatus: res.status }));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      recordFailure(CIRCUIT_KEY);
      throw new Error('20i request timed out');
    }
    throw err;
  }
}

// ── Package ownership verification ───────────────────────
// 20i does not store a client email on packages; we match by the account slug
// that was created during provisioning (email username prefix, up to 15 chars).

async function verifyPackageOwnership(packageId, session) {
  // Fetch the single package and cross-check the name slug against the session email.
  const { ok, data } = await twentyiFetch(`/package/${packageId}`);
  if (!ok) return false;

  const email = session.email || '';
  const emailSlug = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 15);
  const pkgName = (data.name || data.label || '').toLowerCase();
  const pkgNames = (data.names || []).map(n => (typeof n === 'string' ? n.toLowerCase() : ''));

  return (
    pkgName.includes(emailSlug) ||
    pkgNames.some(n => n.includes(emailSlug))
  );
}

// ── Input validation helpers ──────────────────────────────

const VALID_DNS_TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT']);

function validateEmailAddress(address) {
  return typeof address === 'string' && /^[a-z0-9][a-z0-9.\-]*[a-z0-9]$/i.test(address) && address.length <= 64;
}

function validateDomain(domain) {
  return typeof domain === 'string' && /^[a-z0-9][a-z0-9.\-]{1,251}[a-z0-9]$/i.test(domain);
}

function requireParams(params, keys) {
  for (const key of keys) {
    if (!params[key] && params[key] !== 0) return key;
  }
  return null;
}

// ── Action handlers ───────────────────────────────────────

async function getPackage({ packageId }) {
  const missing = requireParams({ packageId }, ['packageId']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  return {
    data: {
      id: packageId,
      name: data.name || data.label || packageId,
      domain: data.domain || data.names?.[0] || '',
      diskUsed: data.diskUsage ?? null,
      diskLimit: data.diskLimit ?? null,
      bandwidth: data.bandwidth ?? null,
      emailCount: data.emailCount ?? null,
      ssl: !!(data.ssl || data.sslEnabled),
      turbo: !!(data.turbo || data.turboEnabled),
      wordpress: data.wordpress || null,
      active: data.active ?? true,
    },
  };
}

async function listEmails({ packageId, domain }) {
  const missing = requireParams({ packageId, domain }, ['packageId', 'domain']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/email/${domain}`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  const mailboxes = Array.isArray(data) ? data : (data.result || data.mailboxes || []);
  return {
    data: mailboxes.map(m => ({
      address: m.address || m.name || m,
      quota: m.quota ?? null,
      used: m.diskUsed ?? m.used ?? null,
    })),
  };
}

async function createEmail({ packageId, domain, address, password, quota }) {
  const missing = requireParams({ packageId, domain, address, password }, ['packageId', 'domain', 'address', 'password']);
  if (missing) return { error: `Missing required param: ${missing}` };

  if (!validateEmailAddress(address)) {
    return { error: 'Invalid email address: use alphanumeric characters, dots, and dashes only' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const quotaMb = quota != null ? Number(quota) : 1000;
  if (!Number.isInteger(quotaMb) || quotaMb < 1 || quotaMb > 50000) {
    return { error: 'Quota must be between 1 and 50000 MB' };
  }

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/email/${domain}`, {
    method: 'POST',
    body: JSON.stringify({ address, password, quota: quotaMb }),
  });
  if (!ok) return { error: data.message || `20i error ${status}` };

  log.info('email_created', { packageId, domain, address });
  return { data: { created: true, address: `${address}@${domain}` } };
}

async function resetEmailPassword({ packageId, domain, address, newPassword }) {
  const missing = requireParams({ packageId, domain, address, newPassword }, ['packageId', 'domain', 'address', 'newPassword']);
  if (missing) return { error: `Missing required param: ${missing}` };

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters' };
  }

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/email/${domain}/${encodeURIComponent(address)}`, {
    method: 'POST',
    body: JSON.stringify({ password: newPassword }),
  });
  if (!ok) return { error: data.message || `20i error ${status}` };

  log.info('email_password_reset', { packageId, domain, address });
  return { data: { updated: true } };
}

async function listDns({ packageId, domain }) {
  const missing = requireParams({ packageId, domain }, ['packageId', 'domain']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/web/domainDns`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  // 20i returns { result: { A: [], AAAA: [], MX: [], CNAME: [], TXT: [], ... } }
  const records = data.result || data;
  const filtered = {};
  for (const type of ['A', 'AAAA', 'MX', 'CNAME', 'TXT']) {
    if (Array.isArray(records[type])) {
      filtered[type] = records[type];
    }
  }

  return { data: filtered };
}

async function addDns({ packageId, domain, type, host, data: recordData, priority }) {
  const missing = requireParams({ packageId, domain, type, host, data: recordData }, ['packageId', 'domain', 'type', 'host', 'data']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const normalizedType = String(type).toUpperCase();
  if (!VALID_DNS_TYPES.has(normalizedType)) {
    return { error: `Invalid DNS type. Must be one of: ${[...VALID_DNS_TYPES].join(', ')}` };
  }

  const body = { type: normalizedType, host, data: recordData };
  if (normalizedType === 'MX' && priority != null) body.priority = Number(priority);

  const { ok, status, data: respData } = await twentyiFetch(`/package/${packageId}/web/domainDns`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!ok) return { error: respData.message || `20i error ${status}` };

  log.info('dns_record_added', { packageId, domain, type: normalizedType, host });
  return { data: { created: true } };
}

async function getBackups({ packageId }) {
  const missing = requireParams({ packageId }, ['packageId']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/web/backups`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  const backups = Array.isArray(data) ? data : (data.result || data.backups || []);
  return {
    data: backups.map(b => ({
      id: b.id || b.backupId,
      date: b.date || b.created_at || b.timestamp,
      size: b.size ?? null,
      label: b.label || b.name || null,
    })),
  };
}

async function restoreBackup({ packageId, backupId }) {
  const missing = requireParams({ packageId, backupId }, ['packageId', 'backupId']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/web/restoreBackup`, {
    method: 'POST',
    body: JSON.stringify({ backup_id: backupId }),
  });
  if (!ok) return { error: data.message || `20i error ${status}` };

  log.info('backup_restore_initiated', { packageId, backupId });
  return { data: { restoring: true, backupId } };
}

async function getUsage({ packageId }) {
  const missing = requireParams({ packageId }, ['packageId']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/web/usage`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  return {
    data: {
      disk: {
        used: data.disk?.used ?? data.diskUsed ?? null,
        limit: data.disk?.limit ?? data.diskLimit ?? null,
        unit: 'MB',
      },
      bandwidth: {
        used: data.bandwidth?.used ?? data.bandwidthUsed ?? null,
        limit: data.bandwidth?.limit ?? data.bandwidthLimit ?? null,
        unit: 'MB',
      },
    },
  };
}

async function checkDomain({ domain }) {
  if (!domain || !validateDomain(domain)) {
    return { error: 'Invalid or missing domain name' };
  }

  const { ok, status, data } = await twentyiFetch(`/reseller/domain-search?domain=${encodeURIComponent(domain)}`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  return {
    data: {
      domain,
      available: !!(data.available ?? data.isAvailable),
      price: data.price ?? data.registerPrice ?? null,
      currency: data.currency || 'USD',
    },
  };
}

async function registerDomain({ domain, years, name, email, address, city, state, zip }) {
  const missing = requireParams(
    { domain, years, name, email, address, city, state, zip },
    ['domain', 'years', 'name', 'email', 'address', 'city', 'state', 'zip']
  );
  if (missing) return { error: `Missing required param: ${missing}` };

  if (!validateDomain(domain)) return { error: 'Invalid domain name' };

  const resellerId = getResellerId();
  const { ok, status, data } = await twentyiFetch(`/reseller/${resellerId}/addDomain`, {
    method: 'POST',
    body: JSON.stringify({
      domain,
      years: Number(years),
      registrant: { name, email, address, city, state, zip },
    }),
  });
  if (!ok) return { error: data.message || `20i error ${status}` };

  log.info('domain_registered', { domain, years });
  return { data: { registered: true, domain, orderId: data.id || data.orderId || null } };
}

async function wordpressLoginUrl({ packageId }) {
  const missing = requireParams({ packageId }, ['packageId']);
  if (missing) return { error: `Missing required param: ${missing}` };

  const { ok, status, data } = await twentyiFetch(`/package/${packageId}/web/oneclick-login/wordpress`);
  if (!ok) return { error: data.message || `20i error ${status}` };

  return {
    data: {
      url: data.url || data.loginUrl || data.result || null,
      expiresAt: data.expires || null,
    },
  };
}

// ── Actions registry ─────────────────────────────────────

const ACTIONS = {
  get_package:            { fn: getPackage,          adminOnly: false },
  list_emails:            { fn: listEmails,           adminOnly: false },
  create_email:           { fn: createEmail,          adminOnly: false },
  reset_email_password:   { fn: resetEmailPassword,   adminOnly: false },
  list_dns:               { fn: listDns,              adminOnly: false },
  add_dns:                { fn: addDns,               adminOnly: false },
  get_backups:            { fn: getBackups,            adminOnly: false },
  restore_backup:         { fn: restoreBackup,         adminOnly: true  },
  get_usage:              { fn: getUsage,              adminOnly: false },
  check_domain:           { fn: checkDomain,           adminOnly: false },
  register_domain:        { fn: registerDomain,        adminOnly: true  },
  wordpress_login_url:    { fn: wordpressLoginUrl,     adminOnly: false },
};

// Actions that operate on a specific package and require ownership verification
const PACKAGE_ACTIONS = new Set([
  'get_package', 'list_emails', 'create_email', 'reset_email_password',
  'list_dns', 'add_dns', 'get_backups', 'restore_backup', 'get_usage',
  'wordpress_login_url',
]);

// ── Handler ───────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  // Auth: admin key takes precedence; otherwise require valid JWT
  const isAdmin = isAdminRequest(req);
  const session = !isAdmin ? await authenticateRequest(req) : null;

  if (!isAdmin && !session?.valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Rate limit client requests (admins are exempt)
  if (!isAdmin) {
    const ip = getClientIp(req);
    const limited = await checkRateLimit(ip, 'hosting-manage', 30, '60s');
    if (limited) {
      res.setHeader('Retry-After', String(limited.retryAfter));
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }
  }

  if (!getBearer()) {
    return res.status(503).json({ success: false, error: '20i not configured' });
  }

  const { action, ...params } = req.body || {};

  if (!action) {
    return res.status(400).json({ success: false, error: 'Missing required field: action' });
  }

  const actionDef = ACTIONS[action];
  if (!actionDef) {
    return res.status(400).json({
      success: false,
      error: `Unknown action: ${action}. Valid actions: ${Object.keys(ACTIONS).join(', ')}`,
    });
  }

  // Enforce admin-only actions
  if (actionDef.adminOnly && !isAdmin) {
    log.warn('admin_action_blocked', { action, clientId: session?.clientId });
    return res.status(403).json({ success: false, error: 'This action requires admin access' });
  }

  // For client requests on package-scoped actions, verify ownership
  if (!isAdmin && PACKAGE_ACTIONS.has(action) && params.packageId) {
    try {
      const owned = await verifyPackageOwnership(params.packageId, session);
      if (!owned) {
        log.warn('package_ownership_denied', { action, clientId: session.clientId, packageId: params.packageId });
        return res.status(403).json({ success: false, error: 'Package not found or access denied' });
      }
    } catch (err) {
      log.error('package_ownership_check_failed', { action, packageId: params.packageId }, err);
      return res.status(502).json({ success: false, error: 'Unable to verify package ownership' });
    }
  }

  try {
    const result = await actionDef.fn(params);

    if (result.error) {
      // Distinguish client errors (4xx) from upstream failures
      const status = result.error.includes('Missing required param') || result.error.includes('Invalid')
        ? 400
        : 502;
      return res.status(status).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    log.error('hosting_manage_action_failed', { action, isAdmin }, err);
    return res.status(502).json({ success: false, error: 'upstream_error' });
  }
}
