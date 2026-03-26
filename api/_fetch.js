// PA CROP Services — Resilient fetch wrapper
// Adds timeout, structured error logging, and circuit breaker.

import { logError, logWarn } from './_log.js';

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fetch with timeout. Throws on timeout or network error.
 */
export async function fetchWithTimeout(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
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
