---
name: security-scan
description: Quick security scan of all API endpoints for common vulnerabilities
---

# Security Scan

Run a targeted security scan:

1. Grep for `adminKey !== ` (should use isAdminRequest instead)
2. Grep for `req.query?.key` or `req.body?.adminKey` (admin key in query/body)
3. Grep for `err.message` in HTTP responses (information disclosure)
4. Grep for `console.error` instead of structured logger
5. Grep for `new Map()` rate limiters (should use shared checkRateLimit)
6. Grep for inline CORS that doesn't use setCors()
7. Grep for `'dev-` or `'CHANGE-ME'` secret fallbacks
8. Check that all endpoints return `{ success: false }` on errors
9. Fix any issues found
10. Report counts per category
