# PA CROP Services — Manual Implementation Actions

> **Single checklist of every action that requires human execution.**
> Code is deployed. These are the provisioning, configuration, and operational steps
> that can't be done from within the repo.
>
> Last updated: 2026-03-24

---

## Architecture (current)

| Layer | Service | What it owns | Status |
|-------|---------|-------------|--------|
| CRM | **SuiteDash** (Pinnacle, 20k API calls/mo) | Contacts, companies, portal access, onboarding, invoicing, email marketing | ✅ LIVE — credentials in Vercel |
| Compliance Engine | **Neon Postgres** (free tier, serverless) | Organizations, obligations, rules, documents, notifications, AI conversations, audit events, workflow jobs | ❌ NEEDS PROVISIONING |
| Rate Limiting | **Upstash Redis** (free tier, 10k/day) | API rate limiting, durable counters | ❌ NEEDS PROVISIONING |
| Email | **Emailit** | Transactional email delivery (reminders, alerts, access codes) | ✅ LIVE |
| SMS | **SMS-iT** | Deadline alerts, document alerts (Pro/Empire plans) | 🔲 Credentials ready, not yet triggered |
| AI | **Groq** (Llama 3.3 70B) | LLM fallback for non-deterministic compliance questions | ✅ LIVE |
| Hosting | **20i** (reseller) | Client website hosting, domain, email boxes | ✅ LIVE |
| Payments | **Stripe** | Checkout, subscriptions, webhooks | ✅ LIVE (legacy links) |
| Workflows | **n8n** | Reminder schedules, escalation, weekly digest | ❌ NEEDS WORKFLOW IMPORT |

**Key architectural principle:** SuiteDash is CRM master. Neon is compliance engine. They sync via `neon_org_id` custom field in SuiteDash and `suitedash_uid` in Neon metadata. When either backend is unavailable, the system degrades gracefully — admin endpoints fall back to SuiteDash data, the compliance checker and AI assistant work from the JSON rules file without any database.

---

## 🔴 BLOCKING — System won't function fully without these

### 1. Provision Neon Postgres (free tier — activates the compliance engine)

**What:** The compliance engine's state machine, obligation tracking, rule management, document classification, AI conversation logging, and audit trail all write to Postgres. Without this, the portal shows empty panels and the admin queues have no data. The system still works — chatbot, compliance checker, rules API all function from the JSON rules file — but the per-client compliance tracking is dormant.

**Steps:**
1. Go to [neon.tech](https://neon.tech) → Sign up (GitHub login works)
2. Create a new project → Name: `pa-crop-services`
3. Region: `US East (Ohio)` — closest to Vercel
4. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
5. In the Neon SQL Editor, run these two files in order:
   - `infrastructure/migrations/001_schema.sql` — creates 12 tables, 30 indexes, 6 triggers, RLS
   - `infrastructure/migrations/002_seed_rules.sql` — seeds 12 PA entity type rules with full contracts
6. Set in Vercel: `DATABASE_URL = postgresql://...` (the connection string from step 4)
7. Redeploy (Vercel will auto-redeploy on env var change)

**Validates:**
```bash
# Should return rules from Postgres instead of empty array
curl -s "https://pacropservices.com/api/admin/rules" -H "X-Admin-Key: [ADMIN_SECRET_KEY from env]" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Rules: {len(d.get(\"items\",[]))}')"
# Should show 12 rules

# Command center should show mode: 'connected' instead of 'suitedash_only'
curl -s "https://pacropservices.com/api/admin/command-center" -H "X-Admin-Key: [ADMIN_SECRET_KEY from env]" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('mode','connected'))"
```

**Free tier limits:** 0.5 GB storage per project, 100 compute-hours/month, scale-to-zero. PA CROP will use a tiny fraction of this — 12 rules + a few hundred entities/obligations fit in megabytes.

**Time:** 10 minutes

---

### 2. Provision Upstash Redis (free tier)
**What:** API rate limiting and durable counters. Without this, rate limiting falls back to in-memory (resets on cold starts).

**Steps:**
1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (free tier: 10K commands/day)
3. Region: `us-east-1` (closest to Vercel)
4. Copy the REST URL and REST Token

**Then set in Vercel:**
```
UPSTASH_REDIS_REST_URL = https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = AXxx...
```

**Time:** 5 minutes

---

### 3. Fix DNS: Add SPF + DMARC records

**What:** During automated DNS updates via the 20i API, the old SPF and DMARC records were deleted but replacements failed to create. **The domain currently has NO root SPF record and NO DMARC record.** Every email from @pacropservices.com risks landing in spam.

**Steps:**
1. Log in to [my.20i.com](https://my.20i.com)
2. Go to Manage Hosting → pacropservices.com → Options → Manage → Manage DNS
3. **Add TXT record #1 (SPF):**
   - Name: `@` (or `pacropservices.com`)
   - Type: `TXT`
   - Value: `v=spf1 include:spf.stackmail.com include:_spf.emailit.com a mx ~all`
4. **Add TXT record #2 (DMARC):**
   - Name: `_dmarc`
   - Type: `TXT`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:polycarpohu@gmail.com; pct=100; adkim=r; aspf=r;`
5. Save

**Already correct (don't touch):** DKIM at `emailit._domainkey`, Emailit SPF subdomain, MX records.

**Time:** 2 minutes

---

### 4. Confirm CROP license is active with PA DOS
**What:** PA DOS File #0015295203 was filed for PA Registered Office Services, LLC. The $70 DSCB:15-109 must be confirmed as processed. **Cannot accept clients until confirmed.**

**Steps:**
1. Search at [file.dos.pa.gov/search/business](https://file.dos.pa.gov/search/business) for "PA Registered Office Services"
2. Confirm status shows Active with CROP designation
3. If pending, call PA DOS Bureau of Corporations: 717-787-1057

**Time:** 5 minutes to check

---

### 5. Apply for EIN
**What:** Federal tax ID for PA Registered Office Services, LLC. Required before bank account.

**Steps:**
1. Go to [irs.gov EIN application](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online)
2. Entity: PA Registered Office Services, LLC
3. Save the EIN letter immediately

**Time:** 10 minutes (instant approval online)

---

### 6. Open business bank account + connect to Stripe
**What:** Separate bank account for PA CROP revenue. Stripe is live with 3 products and 2 webhooks but payouts need a real bank account.

**Steps:**
1. Open business checking at Mercury, Relay, or local bank (needs EIN + formation docs)
2. In Stripe Dashboard → Settings → Bank accounts → Add the new account
3. Verify micro-deposits

**Depends on:** EIN (#5)
**Time:** 30 minutes (Mercury/Relay)

---

### 7. Bind E&O insurance ($1M/$2M)
**What:** Errors & Omissions / Professional Liability insurance. Protects against service-of-process delivery failures — the core liability risk of a CROP. **Should be in place before accepting live clients.**

**Steps:**
1. Get quotes from: Hartford, Hiscox, CoverWallet, or Next Insurance
2. Coverage: E&O / Professional Liability, $1M per occurrence / $2M aggregate
3. Named insured: PA Registered Office Services, LLC

**Time:** 1-3 days for binding

---

## 🟠 HIGH — Needed for compliance engine to be operational

### 8. Import n8n workflows (5 JSONs ready)

**What:** The compliance engine scheduler is built. These n8n workflows call it daily and execute email sends through Emailit.

**Workflow JSONs in `n8n-workflows/` directory:**

| File | Purpose | Schedule |
|------|---------|----------|
| `corp-reminder-cycle.json` | Corps (June 30 deadline) | Daily 8am ET |
| `llc-reminder-cycle.json` | LLCs (Sept 30 deadline) | Daily 8am ET |
| `other-reminder-cycle.json` | LPs/LLPs/trusts (Dec 31 deadline) | Daily 8am ET |
| `overdue-escalation.json` | Auto-escalate + alert Ike | Daily 8am ET |
| `weekly-compliance-digest.json` | Portfolio summary to Ike | Monday 9am ET |

**Steps:**
1. Read `n8n-workflows/README.md` for full import instructions
2. Create SuiteDash credential in n8n (Header Auth with X-Public-ID + X-Secret-Key)
3. Set `EMAILIT_API_KEY` in n8n environment variables
4. Import each JSON file → update credential reference → test → activate

**Depends on:** Neon Postgres (#1) for full functionality
**Time:** 30 minutes

---

### 9. Register first entities in the compliance engine

**What:** Existing SuiteDash clients need their organizations created in Neon so the obligation state machine can track them.

**Bulk registration script ready:** `scripts/bulk-register.js`

```bash
# Dry run first:
SUITEDASH_PUBLIC_ID=xxx SUITEDASH_SECRET_KEY=yyy DATABASE_URL=postgresql://... node scripts/bulk-register.js --dry-run

# Live run:
SUITEDASH_PUBLIC_ID=xxx SUITEDASH_SECRET_KEY=yyy DATABASE_URL=postgresql://... node scripts/bulk-register.js
```

The script reads SuiteDash contacts, creates matching organizations in Neon, computes initial obligations from the rules engine, and syncs the `neon_org_id` back to SuiteDash custom fields.

**Depends on:** Neon Postgres (#1), SuiteDash credentials (already set)
**Time:** 5 minutes

---

## 🟡 MEDIUM — Improves the system but not blocking launch

### 10. Set up log drain for observability

**Recommended:** Axiom (free tier: 500MB/month) or Betterstack (free tier)

**Steps:**
1. Create account at [axiom.co](https://axiom.co) or [betterstack.com](https://betterstack.com)
2. Create a dataset/source and get the ingest URL
3. In Vercel → Project Settings → Log Drains → Add drain

**Time:** 15 minutes

---

### 11. Configure SuiteDash custom fields

**What:** The SuiteDash API client (`api/services/suitedash.js`) syncs compliance data to custom fields on contacts and companies. These custom fields need to exist in SuiteDash before the sync works.

**Steps:**
1. In SuiteDash → Integrations → CRM Settings → Custom Fields
2. Create the following **Contact** custom fields:
   - `entity_type` (text)
   - `dos_number` (text)
   - `plan_code` (text)
   - `compliance_status` (text)
   - `risk_level` (text)
   - `next_deadline` (text)
   - `neon_org_id` (text)
   - `onboarding_status` (text)
3. Create the same fields for **Companies**
4. Verify field names via `GET /contact/meta` in the SuiteDash Swagger UI

**Validates:** Run the meta endpoint to confirm fields exist:
```bash
curl -s "https://app.suitedash.com/secure-api/contact/meta" \
  -H "X-Public-ID: YOUR_PUBLIC_ID" \
  -H "X-Secret-Key: YOUR_SECRET_KEY" | python3 -m json.tool
```

**Time:** 10 minutes

---

### 12. Configure Stripe price IDs for new billing endpoints

**What:** The new `/api/billing/checkout` endpoint creates Stripe Checkout sessions but needs the actual Stripe Price IDs configured.

**Steps:**
1. In Stripe Dashboard → Products → find or create products for each plan
2. Get the Price ID for each (looks like `price_xxx`)
3. Set in Vercel:
   ```
   STRIPE_PRICE_COMPLIANCE = price_xxx
   STRIPE_PRICE_STARTER = price_xxx
   STRIPE_PRICE_PRO = price_xxx
   STRIPE_PRICE_EMPIRE = price_xxx
   ```

**Note:** The existing Stripe payment links on the homepage continue to work. This is for the new API-driven checkout flow.

**Time:** 10 minutes

---

## ⚪ FUTURE — Not needed now, but documented

### 13. Google Business Profile + Search Console
Claim GBP for "PA CROP Services" at 924 W 23rd St, Erie, PA 16502. Verify Search Console and submit sitemap.

### 14. JWT_SECRET for production
The auth service uses a default dev secret. Set a real one before accepting clients:
```
JWT_SECRET = (generate a 64-char random string)
```

### 15. SMS-iT activation
SMS credentials are in memory (`SMSIT_API_KEY`). The `sendDeadlineAlert()` and `sendDocumentAlert()` functions in the notification service are built. Wire them into n8n workflows or the reminder scheduler for Pro/Empire plan clients.

---

## Quick reference: all Vercel env vars

### Currently set ✅
```
STRIPE_SECRET_KEY          ✅
TWENTY_I_TOKEN             ✅
TWENTY_I_GENERAL           ✅
TWENTY_I_OAUTH             ✅
TWENTY_I_RESELLER_ID       ✅
TWENTY_I_DEFAULT_TYPE_REF  ✅
ACUMBAMAIL_API_KEY         ✅
ADMIN_SECRET_KEY           ✅ ([ADMIN_SECRET_KEY from env])
DOCUMENTERO_API_KEY        ✅
SUITEDASH_PUBLIC_ID        ✅ → SuiteDash CRM API (live, returning data)
SUITEDASH_SECRET_KEY       ✅ → SuiteDash CRM API (live, returning data)
EMAILIT_API_KEY            ✅
STRIPE_WEBHOOK_SECRET      ✅
GROQ_API_KEY               ✅ (verified working)
```

### Need to add (BLOCKING)
```
DATABASE_URL               ❌ → Neon Postgres connection string (#1)
UPSTASH_REDIS_REST_URL     ❌ → Upstash Redis (#2)
UPSTASH_REDIS_REST_TOKEN   ❌ → Upstash Redis (#2)
```

### Need to add (HIGH)
```
JWT_SECRET                 🔲 → Production JWT signing key (#14)
STRIPE_PRICE_COMPLIANCE    🔲 → Stripe Price IDs (#12)
STRIPE_PRICE_STARTER       🔲
STRIPE_PRICE_PRO           🔲
STRIPE_PRICE_EMPIRE        🔲
```

### Future
```
SMSIT_API_KEY              🔲 → SMS-iT for SMS alerts (#15)
TWILIO_ACCOUNT_SID         🔲 → Alternative SMS provider
TWILIO_AUTH_TOKEN           🔲
TWILIO_PHONE               🔲
```

---

## Execution order (recommended)

| # | Action | Time | Blocking? |
|---|--------|------|-----------|
| 1 | **Provision Neon Postgres** + set DATABASE_URL | 10 min | Yes — engine needs this |
| 2 | **Provision Upstash Redis** + set env vars | 5 min | Yes — rate limiting needs this |
| 3 | **Fix SPF + DMARC** in 20i dashboard | 2 min | Yes — email deliverability |
| 4 | **Confirm CROP license** active with PA DOS | 5 min | Yes — legal requirement |
| 5 | **Apply for EIN** | 10 min | Yes — bank account prerequisite |
| 6 | **Open bank account** + connect Stripe | 30 min | Yes — needed for revenue |
| 7 | **Bind E&O insurance** | 1-3 days | Yes — needed before clients |
| 8 | Import n8n workflows (JSONs ready) | 30 min | For live reminders |
| 9 | Run bulk-register script | 5 min | For entity tracking |
| 10 | Configure SuiteDash custom fields | 10 min | For 2-way CRM sync |
| 11 | Set Stripe price IDs | 10 min | For new checkout flow |
| 12 | Set up log drain | 15 min | For observability |

**Items 1-7 are the critical path to accepting your first paid client.**
Items 8-9 activate the compliance engine for existing clients.
Items 10-12 are operational improvements.

**Fastest path to "system fully live":**
- Neon (10 min) + Upstash (5 min) + DNS (2 min) = 17 minutes of provisioning
- Then everything works — portal, admin, AI, reminders, audit trail

---

*This file is the definitive list. If something needs human hands, it belongs here.*
*Last updated: 2026-03-24 — post Neon+SuiteDash architecture swap*
