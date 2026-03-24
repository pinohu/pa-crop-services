// PA CROP Services — Shared Rate Limiter
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
// Falls back to in-memory Map when not configured (works but resets on cold starts).
//
// Usage:
//   import { checkRateLimit, getClientIp } from './_ratelimit.js';
//   const blocked = await checkRateLimit(getClientIp(req), 'chat', 15, '60s');
//   if (blocked) return blocked; // Returns Response object for Edge, or { status, body } for Node

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Upstash Redis (durable, cross-instance) ──
let _redis = null;
let _limiters = {};

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

function getUpstashLimiter(prefix, maxRequests, window) {
  const key = prefix + ':' + maxRequests + ':' + window;
  if (_limiters[key]) return _limiters[key];
  const redis = getRedis();
  if (!redis) return null;
  _limiters[key] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    prefix: 'crop:rl:' + prefix,
    analytics: false,
  });
  return _limiters[key];
}

// ── In-memory fallback (per-instance, resets on cold start) ──
const _memMap = new Map();

function memoryRateLimit(ip, prefix, max, windowMs) {
  const k = prefix + ':' + ip;
  const now = Date.now();
  let d = _memMap.get(k);
  if (!d || now - d.s > windowMs) {
    _memMap.set(k, { c: 1, s: now });
    return { limited: false };
  }
  d.c++;
  if (d.c > max) {
    const retryAfter = Math.ceil((d.s + windowMs - now) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

// Parse window string to ms: '60s' -> 60000, '1m' -> 60000
function parseWindow(w) {
  if (typeof w === 'number') return w;
  const match = String(w).match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 60000;
  const n = parseInt(match[1]);
  switch (match[2]) {
    case 's': return n * 1000;
    case 'm': return n * 60000;
    case 'h': return n * 3600000;
    case 'd': return n * 86400000;
    default: return 60000;
  }
}

/**
 * Extract client IP from request (works with both Edge Request and Node req).
 */
export function getClientIp(req) {
  // Edge runtime (Request object)
  if (typeof req.headers?.get === 'function') {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  }
  // Node runtime (IncomingMessage)
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || 'unknown';
}

/**
 * Check rate limit. Returns null if allowed, or a response-like object if blocked.
 * 
 * @param {string} ip - Client IP
 * @param {string} prefix - Namespace ('chat', 'subscribe', etc.)
 * @param {number} maxRequests - Max requests in window
 * @param {string} window - Window duration ('60s', '1m', '1h')
 * @returns {Promise<{status: number, retryAfter: number}|null>}
 */
export async function checkRateLimit(ip, prefix, maxRequests, window) {
  const limiter = getUpstashLimiter(prefix, maxRequests, window);

  if (limiter) {
    // Durable rate limiting via Upstash Redis
    try {
      const result = await limiter.limit(ip);
      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        return { status: 429, retryAfter: Math.max(retryAfter, 1) };
      }
      return null;
    } catch (err) {
      // If Redis fails, fall through to in-memory
      console.warn('[ratelimit] Upstash error, falling back to memory:', err.message);
    }
  }

  // In-memory fallback
  const windowMs = parseWindow(window);
  const result = memoryRateLimit(ip, prefix, maxRequests, windowMs);
  if (result.limited) {
    return { status: 429, retryAfter: result.retryAfter };
  }
  return null;
}

/**
 * Whether Upstash Redis is configured (for logging/health checks).
 */
export function isUpstashConfigured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
