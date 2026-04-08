// PA CROP Services — Auth Service
// Tech spec: sections 7.1, 12.1, 12.2
// JWT session management, RBAC, access code verification.

import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual, randomBytes, createHmac } from 'crypto';
import { Redis } from '@upstash/redis';
import * as db from './db.js';
import { logWarn } from '../_log.js';
import { checkRateLimit } from '../_ratelimit.js';

// ── Redis for session blocklist ────────────────────────────
let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }
  return null;
}
// ── Secrets (fail hard if missing) ──────────────────────
// No default fallbacks — any missing secret is a fatal configuration error.
const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('FATAL: JWT_SECRET environment variable is required');
  }
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW || 'test-only-key-not-for-production');
const TOKEN_EXPIRY = '1h';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
if (!ADMIN_KEY) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('FATAL: ADMIN_SECRET_KEY environment variable is required');
  }
}
const ADMIN_KEY_VALUE = ADMIN_KEY || '';

// ── JWT ────────────────────────────────────────────────────

export async function createSession(client) {
  const jti = randomBytes(16).toString('hex');
  const token = await new SignJWT({
    sub: client.id,
    org: client.organization_id,
    plan: client.plan_code,
    roles: client.roles || ['client'],
    email: client.email,
    jti
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return {
    token,
    expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
  };
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check if token has been revoked (blocklist)
    if (payload.jti) {
      const redis = getRedis();
      if (redis) {
        try {
          const revoked = await redis.get(`revoked:${payload.jti}`);
          if (revoked) return { valid: false, error: 'token_revoked' };
        } catch (err) {
          // Redis failure — fail CLOSED. Revocation check is security-critical.
          // Short token TTL (1h) limits blast radius. Users re-authenticate.
          logWarn('session_revocation_check_failed', { jti: payload.jti, error: err.message });
          return { valid: false, error: 'revocation_check_unavailable' };
        }
      } else if (process.env.NODE_ENV !== 'test') {
        // Redis not configured — revocation cannot be enforced.
        // Log once per cold start. In production this is a misconfiguration.
        logWarn('session_revocation_no_redis', { jti: payload.jti, note: 'Redis not configured — revocation bypass possible' });
      }
    }

    return {
      valid: true,
      clientId: payload.sub,
      orgId: payload.org,
      plan: payload.plan,
      roles: payload.roles || ['client'],
      email: payload.email,
      exp: payload.exp,
      jti: payload.jti
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Revoke a session by adding its JTI to the Redis blocklist.
 * TTL is set to the token's remaining lifetime so the entry self-cleans.
 */
export async function revokeSession(jti, expTimestamp) {
  const redis = getRedis();
  if (!redis || !jti) return false;
  try {
    const ttlSeconds = Math.max(Math.ceil(expTimestamp - Date.now() / 1000), 1);
    await redis.set(`revoked:${jti}`, '1', { ex: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

// ── Access Code ────────────────────────────────────────────

export function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

export async function sendAccessCode(email) {
  const code = generateAccessCode();
  const client = await db.getClientByEmail(email);
  if (!client) return { success: false, error: 'not_found' };

  await db.updateClient(client.id, {
    metadata: {
      ...client.metadata,
      access_code: code,
      access_code_expires: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  });

  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${emailitKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PA CROP Services <access@pacropservices.com>',
        to: email,
        subject: 'Your PA CROP Access Code',
        html: `<div style="font-family:Outfit,sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#0C1220">Your Access Code</h2>
          <div style="background:#f0f4f8;padding:20px;border-radius:12px;text-align:center;margin:20px 0">
            <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0C1220">${code}</span>
          </div>
          <p>This code expires in 15 minutes.</p>
          <p style="color:#666;font-size:13px">If you didn't request this, ignore this email.</p>
        </div>`
      })
    });
  }

  return { success: true };
}

// Timing-safe string comparison — hash both values to prevent length leaking.
// HMAC key derived from JWT_SECRET so no additional hardcoded secret is needed.
const COMPARE_KEY = JWT_SECRET_RAW || 'test-only-key';
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = createHmac('sha256', COMPARE_KEY).update(a).digest();
  const hb = createHmac('sha256', COMPARE_KEY).update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function verifyAccessCode(email, code) {
  const client = await db.getClientByEmail(email);
  if (!client) return { valid: false, error: 'not_found' };

  const meta = client.metadata || {};
  if (!meta.access_code || !safeCompare(meta.access_code, code)) return { valid: false, error: 'invalid_code' };
  if (new Date(meta.access_code_expires) < new Date()) return { valid: false, error: 'expired' };

  // Clear used code
  await db.updateClient(client.id, {
    metadata: { ...meta, access_code: null, access_code_expires: null }
  });

  return {
    valid: true,
    client: {
      id: client.id,
      organization_id: client.organization_id,
      plan_code: client.plan_code,
      email: client.email,
      roles: meta.roles || ['client']
    }
  };
}

// ── RBAC ───────────────────────────────────────────────────

export function requireRole(session, ...roles) {
  if (!session?.valid) return { authorized: false, error: 'unauthenticated' };
  const userRoles = session.roles || [];
  if (roles.some(r => userRoles.includes(r))) return { authorized: true };
  return { authorized: false, error: 'insufficient_role' };
}

// ── Middleware helpers ──────────────────────────────────────

export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifySession(token);
  }
  return { valid: false };
}

export function isAdminRequest(req) {
  // Only accept admin key from header, never from query params or body
  const key = req.headers['x-admin-key'];
  if (!key || !ADMIN_KEY_VALUE) return false;
  return safeCompare(key, ADMIN_KEY_VALUE);
}

// ── API Key Authentication ────────────────────────────────
// Supports X-API-Key header for machine-to-machine access.
// Keys are SHA-256 hashed before storage/comparison — raw keys
// are never persisted.

const API_KEY_PREFIX = 'crop_';

function hashApiKey(rawKey) {
  return createHmac('sha256', COMPARE_KEY).update(rawKey).digest('hex');
}

/**
 * Generate a new API key and its hash for storage.
 * The raw key is returned ONCE and must be given to the client.
 * Only the hash should be stored in the database.
 */
export function generateApiKey() {
  const raw = API_KEY_PREFIX + randomBytes(24).toString('hex');
  const hash = hashApiKey(raw);
  return { raw, hash };
}

/**
 * Authenticate a request using the X-API-Key header.
 * Looks up the hashed key in the api_keys table (Neon).
 * Returns the key record with scopes, or null if invalid.
 */
export async function authenticateApiKey(req) {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.startsWith(API_KEY_PREFIX)) return null;

  const hash = hashApiKey(rawKey);
  if (!db.isConnected()) return null;

  try {
    const sql = db.getSql();
    if (!sql) return null;
    const rows = await sql`
      SELECT id, client_id, organization_id, scopes, rate_limit, is_active, expires_at
      FROM api_keys
      WHERE key_hash = ${hash} AND is_active = true
    `;
    const key = rows?.[0];
    if (!key) return null;

    // Check expiry
    if (key.expires_at && new Date(key.expires_at) < new Date()) return null;

    // Update last_used_at (fire-and-forget)
    sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${key.id}`.catch(() => {});

    return {
      valid: true,
      keyId: key.id,
      clientId: key.client_id,
      orgId: key.organization_id,
      scopes: key.scopes || [],
      rateLimit: key.rate_limit || 100
    };
  } catch {
    return null;
  }
}

/**
 * Require specific API key scopes.
 */
export function requireScope(apiKeyResult, ...requiredScopes) {
  if (!apiKeyResult?.valid) return { authorized: false, error: 'invalid_api_key' };
  const keyScopes = apiKeyResult.scopes || [];
  if (keyScopes.includes('*')) return { authorized: true };
  if (requiredScopes.some(s => keyScopes.includes(s))) return { authorized: true };
  return { authorized: false, error: 'insufficient_scope' };
}

/**
 * Unified authentication: tries Bearer JWT, X-API-Key, and X-Admin-Key.
 * Returns a normalized auth result with source indicator.
 */
export async function authenticateAny(req) {
  // 1. Bearer JWT (portal sessions)
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const session = await verifySession(authHeader.slice(7));
    if (session.valid) return { ...session, authMethod: 'jwt' };
  }

  // 2. X-API-Key (machine-to-machine)
  const apiKeyResult = await authenticateApiKey(req);
  if (apiKeyResult?.valid) return { ...apiKeyResult, authMethod: 'api_key' };

  // 3. X-Admin-Key (admin operations)
  if (isAdminRequest(req)) return { valid: true, authMethod: 'admin_key', roles: ['admin'] };

  return { valid: false };
}

// ── API Key Middleware ─────────────────────────────────────
// Wraps auth + scope check + per-key rate limiting for machine-to-machine endpoints.

/**
 * Middleware that authenticates via X-API-Key, checks scopes, enforces per-key rate limits.
 * @param {object} req
 * @param {object} res
 * @param {{ requiredScopes?: string[], handler: Function }} opts
 */
export async function withApiKeyAuth(req, res, { requiredScopes = [], handler }) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey?.valid) return res.status(401).json({ success: false, error: 'invalid_api_key' });

  // Scope check
  if (requiredScopes.length) {
    const scopeCheck = requireScope(apiKey, ...requiredScopes);
    if (!scopeCheck.authorized) return res.status(403).json({ success: false, error: scopeCheck.error });
  }

  // Per-key rate limiting (uses key ID as identifier, not IP)
  const rateLimited = await checkRateLimit(`apikey:${apiKey.keyId}`, 'api_key', apiKey.rateLimit, '60s');
  if (rateLimited) {
    res.setHeader('Retry-After', String(rateLimited.retryAfter));
    return res.status(429).json({ success: false, error: 'rate_limit_exceeded' });
  }

  // Attach auth context to request
  req.apiKey = apiKey;
  return handler(req, res);
}

// ── CORS helper ────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://pacropservices.com',
  'https://www.pacropservices.com',
  'https://pa-crop-services.vercel.app'
];

export function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    // Allow preview deployments for testing only
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  } else {
    // Default to primary domain — never wildcard
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Security headers applied to all API responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
