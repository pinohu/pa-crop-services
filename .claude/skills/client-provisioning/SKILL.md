---
name: Client Provisioning Pipeline
description: End-to-end knowledge of the PA CROP client provisioning system — Stripe payment → Neon DB → SuiteDash → 20i hosting → WordPress → email → compliance package
version: 1.0.0
triggers:
  - provision
  - onboarding
  - new client
  - stripe webhook
  - hosting setup
  - wordpress
  - welcome email
---

# Client Provisioning Pipeline

You are an expert on PA CROP Services' 15-step automated provisioning pipeline. When working on provisioning code, follow this architecture:

## Pipeline Steps (api/provision.js)

| Step | Action | Gated On |
|------|--------|----------|
| 1 | Create Neon organization record | Always |
| 2 | Create Neon client record | Always |
| 3 | Create SuiteDash company | Always |
| 4 | Create SuiteDash contact | Always |
| 5 | Send welcome email via Emailit | Always |
| 6 | Provision 20i hosting package | `includesHosting` |
| 7 | Add domain to hosting | `includesHosting && domain` |
| 8 | Install WordPress | `includesHosting` |
| 9 | Provision SSL certificate | `includesHosting && domain` |
| 10 | Create StackCP user | `includesHosting` |
| 11 | WordPress starter content | `websitePages > 0` |
| 12 | Generate compliance PDF package | Always |
| 13 | Pre-fill annual report obligation | `includesFiling && neonOrgId` |
| 14 | Assign dedicated phone extension | `tier in [pro, empire]` |
| 15 | Allocate notary credits | `includesNotary` |

## Tier Configuration

| Tier | Price | Hosting | Pages | Filing | Notary | Phone Ext |
|------|-------|---------|-------|--------|--------|-----------|
| compliance_only | $99/yr | No | 0 | No | No | No |
| business_starter | $199/yr | Yes | 1 | Yes | No | No |
| business_pro | $349/yr | Yes | 5 | Yes | Yes | Yes |
| business_empire | $699/yr | Yes | 5x3 | Yes | Yes | Yes |

## Key Integration Points
- **Stripe** → `api/stripe-webhook.js` receives `checkout.session.completed`, calls `/api/provision`
- **Neon** → `api/services/db.js` for all database operations
- **SuiteDash** → `api/services/suitedash.js` for CRM operations
- **20i** → `api/hosting-manage.js` for hosting management
- **WordPress** → `api/website-builder.js` for content generation
- **Emailit** → `api/services/notifications.js` for transactional email

## Error Handling
- Each step is independently try/caught — partial success is expected
- Results are tracked in `results.steps[]` array
- Failed steps log structured errors via `logError()` from `api/_log.js`
- The provision endpoint returns HTTP 207 for partial success

## When Writing Code
- Always use `isAdminRequest(req)` for auth (timing-safe, header-only)
- Always use `fetchWithTimeout()` from `api/_fetch.js` for external API calls
- Always use `checkRateLimit()` from `api/_ratelimit.js` for rate limiting
- Never accept admin keys from query parameters or request body
- Never return `err.message` in HTTP responses — use generic error codes
