# PA CROP Services

**PA Registered Office Services, LLC** — Licensed Pennsylvania Commercial Registered Office Provider (CROP).

Deployed at [pacropservices.com](https://pacropservices.com) via Vercel. Provides compliance management, AI-powered chatbot, client portal, and billing for Pennsylvania business entities.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, no build step |
| API | Vercel Edge Functions (Node.js ESM) |
| Database | Neon Postgres (serverless) |
| Cache / Rate Limiting | Upstash Redis |
| Auth | JWT via `jose` |
| AI / LLM | Groq API |
| Payments | Stripe |
| CRM | SuiteDash |
| Email | Emailit (transactional), Acumbamail (newsletter) |
| SMS / Voice | Twilio |

## Prerequisites

- Node.js 18 or later
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- Accounts for all external services (see `.env.sample`)

## Local Setup

```bash
git clone https://github.com/pinohu/pa-crop-services.git
cd pa-crop-services
npm install
cp .env.sample .env.local   # fill in all required values
vercel dev                  # starts local dev server on :3000
```

The frontend is served from `public/`. API routes are auto-discovered from `api/` by Vercel.

## Environment Variables

Copy `.env.sample` and populate every `REQUIRED` field before running locally or deploying. See `.env.sample` for the full list with descriptions. Key categories:

- **Database** — `DATABASE_URL` (Neon Postgres connection string)
- **Auth** — `JWT_SECRET`, `ADMIN_SECRET_KEY`, `ACCESS_CODE_HASH`
- **AI** — `GROQ_API_KEY`, `GROQ_MODEL`
- **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Redis** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Email** — `EMAILIT_API_KEY`, `ACUMBAMAIL_API_KEY`
- **Twilio** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

## Development

```bash
npm run lint        # ESLint all api/ and scripts/
npm run validate    # Check compliance claims in content
npm run check       # lint + validate
npm test            # Run unit tests (node --test)
```

Unit tests live in `tests/` and use Node.js built-in `node:test`. Run a specific suite:

```bash
node --test tests/compliance.test.js
node --test tests/validate.test.js
node --test tests/guardrails.test.js
```

## API Structure

All API handlers live in `api/`. Shared utilities are prefixed with `_`:

| File | Purpose |
|---|---|
| `_compliance.js` | Rules engine — deadlines, fees, entity types |
| `_guardrails.js` | Chatbot intent classification and legal boundary enforcement |
| `_validate.js` | Input validation utilities (email, UUID, string, plan code) |
| `_fetch.js` | Resilient fetch — timeout, retry, circuit breaker |
| `_ratelimit.js` | Upstash Redis sliding window rate limiting |
| `_log.js` | Structured JSON logger |
| `_db.js` | Neon Postgres query wrapper |
| `_obligations.js` | Client obligation tracking |

Service wrappers live in `api/services/`:

| File | Purpose |
|---|---|
| `db.js` | Parameterized query builder with allowlist protection |
| `auth.js` | JWT encode/decode and access code verification |
| `entitlements.js` | Plan-based feature gating |
| `suitedash.js` | CRM integration |
| `notifications.js` | Multi-channel notification dispatch |

## Compliance Engine

PA annual report deadlines enforced by the rules engine:

| Entity Type | Deadline | Fee |
|---|---|---|
| LLCs (domestic & foreign) | September 30 | $7 |
| Corporations (domestic & foreign, nonprofit) | June 30 | $7 ($0 nonprofit) |
| LPs, LLPs, Business Trusts, Professional Associations | December 31 | $7 |

Grace period: 2025–2026 filings. Enforcement (dissolution risk) starts with **2027 reports**.

Rules data lives in `data/compliance-rules.js`. Never hardcode deadline or fee values in handlers — always import from `_compliance.js`.

## Chatbot Guardrails

The chatbot (`api/chat.js`) runs intent classification before every LLM call:

- `COMPLIANCE_FACT` — answered deterministically from the rules engine, no LLM
- `LEGAL_QUESTION` — always refused; directs user to attorney or CPA
- `ACTION_REQUEST`, `BILLING_QUESTION`, `ONBOARDING_HELP` — passed to LLM with guardrail instructions
- `GENERAL_QUESTION` — LLM fallback

Misclassifying `LEGAL_QUESTION` as `COMPLIANCE_FACT` would result in unqualified legal advice. The classifier is tested in `tests/guardrails.test.js`.

## Deployment

```bash
vercel --prod
```

The repo connects to Vercel. Merging to `main` triggers a production deploy automatically. See `vercel.json` for route configuration and security headers.

Content validation runs as a pre-commit hook (`scripts/validate-content.js`) to catch inaccurate compliance claims before they reach production.

## Project Layout

```
api/              Vercel API handlers (ESM, .js)
  services/       Shared service wrappers
  admin/          Admin-only endpoints
  auth/           Authentication endpoints
  billing/        Stripe billing endpoints
public/           Static frontend
  *.html          All site pages
  site.css        Global design system
  app.js          Portal client JS
data/             Compliance rules and static data
scripts/          Build and validation scripts
tests/            Unit tests (node:test)
docs/             ADRs and technical documentation
```

---

PA Registered Office Services, LLC — Erie, PA | Licensed CROP under 15 Pa.C.S. § 109
