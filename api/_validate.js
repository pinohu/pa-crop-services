// PA CROP Services — Shared Input Validation Utilities

// Email validation (RFC 5322 simplified)
export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// UUID v4 validation
export function isValidUUID(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// String length validation
export function isValidString(str, { minLength = 1, maxLength = 1000 } = {}) {
  return typeof str === 'string' && str.trim().length >= minLength && str.length <= maxLength;
}

// Plan code validation
const VALID_PLANS = ['compliance_only', 'business_starter', 'business_pro', 'business_empire'];
export function isValidPlanCode(code) {
  return VALID_PLANS.includes(code);
}

// Sanitize string (strip HTML/script tags for XSS prevention)
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// Generate X-Request-ID
export function requestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Enforce Content-Type: application/json on POST/PUT/PATCH requests.
// Returns true and sends a 415 response if the check fails.
export function requireJson(req, res) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return false;
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    res.status(415).json({ success: false, error: 'Content-Type must be application/json' });
    return true;
  }
  return false;
}

// Reject request if Content-Length exceeds maxBytes (default 1 MB).
// Vercel enforces a 4.5 MB hard cap; this adds a tighter per-endpoint guard.
// Returns true and sends a 413 response if the check fails.
export function rejectOversizedBody(req, res, maxBytes = 1_048_576) {
  const len = parseInt(req.headers['content-length'] || '0', 10);
  if (len > maxBytes) {
    res.status(413).json({ success: false, error: 'Request body too large' });
    return true;
  }
  return false;
}
