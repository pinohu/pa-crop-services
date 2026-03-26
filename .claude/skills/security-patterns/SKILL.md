---
name: PA CROP Security Patterns
description: Security patterns and anti-patterns specific to this codebase — auth, validation, CORS, rate limiting, error handling
version: 1.0.0
triggers:
  - security
  - auth
  - validation
  - cors
  - rate limit
  - admin key
  - jwt
  - access code
---

# PA CROP Security Patterns

## Authentication

### Admin Auth (ALWAYS use this pattern)
```js
import { isAdminRequest, setCors } from './services/auth.js';
// In handler:
setCors(req, res);
if (req.method === 'OPTIONS') return res.status(204).end();
if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'unauthorized' });
```

### Client JWT Auth
```js
import { authenticateRequest, setCors } from './services/auth.js';
// In handler:
setCors(req, res);
if (req.method === 'OPTIONS') return res.status(204).end();
const session = await authenticateRequest(req);
if (!session) return res.status(401).json({ success: false, error: 'unauthorized' });
```

## NEVER Do These
- Accept admin key from `req.query` or `req.body` — header only
- Use `adminKey !== process.env.ADMIN_SECRET_KEY` — use `isAdminRequest()` (timing-safe)
- Return `err.message` in HTTP responses — use generic error codes
- Use `console.error` — use `createLogger` from `_log.js`
- Use raw `fetch()` for external APIs — use `fetchWithTimeout()` from `_fetch.js`
- Use inline `const _rl = new Map()` rate limiters — use `checkRateLimit()` from `_ratelimit.js`
- Use inline CORS logic — use `setCors()` from `services/auth.js`
- Fall back to dev secrets when env vars are missing — throw in production

## Input Validation
```js
import { isValidEmail, isValidUUID, isValidString, isValidPlanCode, sanitize } from './_validate.js';
```

## Response Format (ALWAYS)
```js
// Success
res.status(200).json({ success: true, data: { ... } });
// Error
res.status(400).json({ success: false, error: 'error_code' });
// Partial success
res.status(207).json({ success: true, data: { ... }, errors: [...] });
```

## Rate Limiting
```js
import { checkRateLimit, getClientIp } from './_ratelimit.js';
const ip = getClientIp(req);
const limited = await checkRateLimit(ip, 'endpoint_name', 10, '60s');
if (limited) return res.status(429).json({ success: false, error: 'rate_limited' });
```
