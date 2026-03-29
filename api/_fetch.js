// PA CROP Services — Resilient fetch wrapper
// Adds timeout, structured error logging, and circuit breaker.

import { logError, logWarn } from './_log.js';

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fetch with timeout. Throws on timeout or network error.
 * Uses AbortSignal.timeout when available (Node 17.3+, modern browsers),
 * falls back to manual AbortController for older environments.
 */
export async function fetchWithTimeout(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  // Prefer AbortSignal.timeout which self-cleans; fall back for old runtimes
  if (typeof AbortSignal?.timeout === 'function') {
    return fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST JSON with timeout. Convenience wrapper for the common pattern.
 * Returns the raw Response; callers must handle .ok and .json().
 */
export async function postJson(url, body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  }, timeoutMs);
}

/**
 * Retry a fetch call with exponential backoff.
 * Only retries on network errors or 5xx responses (not 4xx client errors).
 * @param {() => Promise<Response>} fn - Factory that returns a fetch promise
 * @param {{ maxAttempts?: number, baseDelayMs?: number, label?: string }} [opts]
 * @returns {Promise<Response>}
 */
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 250, label = 'fetch' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fn();
      // Retry on server errors only
      if (res.status >= 500 && attempt < maxAttempts) {
        logWarn('retry_on_5xx', { label, attempt, status: res.status });
        await _sleep(baseDelayMs * Math.pow(2, attempt - 1));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        logWarn('retry_on_network_error', { label, attempt, error: err.message });
        await _sleep(baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastErr || new Error(`${label} failed after ${maxAttempts} attempts`);
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Circuit Breaker (per-service) ──
const _circuits = {};

export function getCircuit(service, { threshold = 3, resetMs = 60000 } = {}) {
  if (!_circuits[service]) {
    _circuits[service] = { failures: 0, lastFailure: 0, open: false, threshold, resetMs };
  }
  const c = _circuits[service];
  // Auto-reset after cooldown
  if (c.open && Date.now() - c.lastFailure > c.resetMs) {
    c.open = false;
    c.failures = 0;
  }
  return c;
}

export function recordFailure(service) {
  const c = getCircuit(service);
  c.failures++;
  c.lastFailure = Date.now();
  if (c.failures >= c.threshold) {
    c.open = true;
    logWarn('circuit_breaker_open', { service, failures: c.failures });
  }
}

export function recordSuccess(service) {
  const c = getCircuit(service);
  c.failures = 0;
  c.open = false;
}

export function isCircuitOpen(service) {
  return getCircuit(service).open;
}
