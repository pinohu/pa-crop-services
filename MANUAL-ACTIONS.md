# PA CROP Services — Manual Implementation Actions

> **Single checklist of every action that requires human execution.**
> Code is deployed. These are the provisioning, configuration, and operational steps
> that can't be done from within the repo.
>
> Last updated: 2026-03-24

---

## 🔴 BLOCKING — System won't function fully without these

### 1. Provision Upstash Redis (free tier)
**What:** The compliance engine, rate limiter, state machine, audit log, and dashboard all write to Redis.
Without this, everything falls back to in-memory (resets on cold starts — no durability).

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
Set for: Production + Preview + Development

**Vercel path:** [vercel.com](https://vercel.com) → pa-crop-services → Settings → Environment Variables

**Validates:** Visit `https://pacropservices.com/api/compliance-dashboard?adminKey=CROP-ADMIN-2026-IKE` — `systemHealth.upstashConnected` should be `true`.

**Time:** ~5 minutes

---

### 2. Confirm CROP license is active with PA DOS
**What:** PA DOS File #0015295203 was filed for PA Registered Office Services, LLC.
The $70 Statement of Commercial Registered Office Provider (DSCB:15-109) must be confirmed as processed.
This is what makes the CROP license legally active. **Cannot accept clients until confirmed.**

**Steps:**
1. Check status at [file.dos.pa.gov/search/business](https://file.dos.pa.gov/search/business)
2. Search for "PA Registered Office Services"
3. Confirm status shows as Active with CROP designation
4. If still pending, call PA DOS Bureau of Corporations: 717-787-1057

**Time:** 5 minutes to check, potentially days if still processing

---

### 3. Apply for EIN
**What:** Federal tax ID for PA Registered Office Services, LLC. Required before opening a bank account.

**Steps:**
1. Go to [irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online)
2. Entity: PA Registered Office Services, LLC
3. Responsible party: Ike
4. Type: LLC treated as disregarded entity (or S-Corp if elected)
5. Save the EIN letter immediately

**Time:** 10 minutes (instant approval online)

---

### 4. Open business bank account + connect to Stripe
**What:** Separate bank account for PA CROP revenue. Connect to Stripe for payment processing.
Currently Stripe is live with 3 products and 2 webhooks → n8n, but payouts need a real bank account.

**Steps:**
1. Open business checking at Mercury, Relay, or local bank (needs EIN + formation docs)
2. In Stripe Dashboard → Settings → Bank accounts → Add the new account
3. Verify micro-deposits

**Depends on:** EIN (#3 above)
**Time:** 30 minutes (Mercury/Relay) to a few days (traditional bank)

---

### 5. Bind E&O insurance ($1M/$2M)
**What:** Errors & Omissions / Professional Liability insurance.
Protects against service-of-process delivery failures — the core liability risk of a CROP.
**Should be in place before accepting live clients.**

**Steps:**
1. Get quotes from: Hartford, Hiscox, CoverWallet, or Next Insurance
2. Coverage: E&O / Professional Liability, $1M per occurrence / $2M aggregate
3. Named insured: PA Registered Office Services, LLC
4. Activity: Registered office / compliance services

**Time:** 1-3 days for binding

---

## 🟠 HIGH — Needed for compliance engine to be operational

### 6. Create n8n scheduler workflows (3 deadline groups + escalation)
**What:** The compliance engine (`api/scheduler.js`) is built. It needs n8n cron workflows
to call it daily with entity ID batches. The scheduler evaluates each entity and returns
which reminders need to be sent — n8n then executes the sends via Emailit.

**✅ Workflow JSONs are ready for import** — see `n8n-workflows/` directory:

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

---

### 7. Register first entities in the compliance engine
**What:** The engine is built but empty. Existing SuiteDash clients need to be registered.

**✅ Bulk registration script is ready** — see `scripts/bulk-register.js`:

```bash
# Dry run first (shows what would be registered, no changes):
SUITEDASH_PUBLIC_ID=xxx SUITEDASH_SECRET_KEY=yyy node scripts/bulk-register.js --dry-run

# Live run:
SUITEDASH_PUBLIC_ID=xxx SUITEDASH_SECRET_KEY=yyy node scripts/bulk-register.js
```

Or register a single entity manually:
```bash
curl -X POST https://pacropservices.com/api/entity-status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: CROP-ADMIN-2026-IKE" \
  -d '{
    "action": "register",
    "name": "Client Entity Name LLC",
    "entityType": "LLC",
    "dosNumber": "1234567890",
    "email": "client@example.com",
    "plan": "business_pro"
  }'
```

**Or automate:** Create an n8n workflow that reads all contacts from SuiteDash and bulk-registers them via the entity-status API.

**Depends on:** Upstash Redis provisioned (#1)
**Time:** 5 minutes per client (manual), or 1 hour to build the bulk-registration n8n workflow

---

## 🟡 MEDIUM — Improves the system but not blocking launch

### 8. Provision Supabase Postgres (future — when scaling past Redis)
**What:** The Prisma schema (`schema/schema.prisma`) defines 7 domain models.
Redis handles early-stage state. When relational queries become necessary (reporting,
multi-entity joins, complex obligation queries), migrate to Postgres.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Copy the connection string
3. Set in Vercel: `DATABASE_URL = postgresql://...`
4. Run: `npx prisma db push` from local clone

**Not needed until:** 50+ entities or reporting requirements
**Time:** 15 minutes

---

### 9. Set up log drain for observability
**What:** All API endpoints now emit structured JSON logs. Vercel captures them but they
rotate quickly. A log drain sends them to a queryable system for alerting and dashboards.

**Recommended:** Axiom (free tier: 500MB/month) or Betterstack (free tier)

**Steps:**
1. Create account at [axiom.co](https://axiom.co) or [betterstack.com](https://betterstack.com)
2. Create a dataset/source and get the ingest URL
3. In Vercel → Project Settings → Log Drains → Add drain
4. Select the project, paste the ingest URL

**What you can then query:**
- `event:subscribe_complete` → conversion tracking
- `event:ai_conversation` with `escalated:true` → chatbot failures
- `event:obligation_state_change` → compliance engine activity
- `event:acumbamail_failed` → lead capture failures
- `level:error` → all system errors

**Time:** 15 minutes

---

### 10. CROP mail filing confirmation ($70)
**What:** The DSCB:15-109 filing ($70) that registers PA CROP Services as a licensed
Commercial Registered Office Provider. Filed but needs confirmation of processing.

**Same as #2 above — check PA DOS for active status.**

---

### 11. ~~Set GROQ_API_KEY in Vercel~~ ✅ DONE
**Verified 2026-03-24:** GROQ_API_KEY is set and working. Chatbot returns compliance-engine-backed
answers with guardrail citations. Deterministic answers for compliance facts bypass LLM entirely.

---

## ⚪ FUTURE — Not needed now, but documented for when they are

### 12. Vercel environment variables — future services

These env vars are referenced in code but not yet needed:

| Variable | Used in | When needed |
|----------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | sms.js, voice.js, voice-recording.js | When SMS/voice features launch |
| `TWILIO_AUTH_TOKEN` | Same | Same |
| `TWILIO_PHONE` | Same | Same |
| `SMSIT_API_KEY` | sms.js | Alternative to Twilio |
| `VADOO_API_KEY` | tool-connector.js, setup-guide.js | Video content features |
| `FLIKI_API_KEY` | Same | Same |
| `CASTMAGIC_API_KEY` | Same | Same |
| `BRIZY_API_KEY` | Same | Same |
| `DATABASE_URL` | schema/schema.prisma | Postgres migration (#8) |

---

### 13. Google Business Profile setup
**What:** Claim and optimize GBP for "PA CROP Services" at 924 W 23rd St, Erie, PA 16502.
Guide at `docs/GOOGLE_BUSINESS_PROFILE.md`.

---

### 14. Google Search Console verification
**What:** Verify site ownership and submit sitemap.
Placeholder page exists at `public/gsc-verify-placeholder.html`.
Guide at `docs/GOOGLE_SEARCH_CONSOLE.md`.

---

## Quick reference: all Vercel env vars

### Currently set (per memory)
```
STRIPE_SECRET_KEY          ✅
TWENTY_I_TOKEN             ✅
TWENTY_I_GENERAL           ✅
TWENTY_I_OAUTH             ✅
TWENTY_I_RESELLER_ID       ✅
TWENTY_I_DEFAULT_TYPE_REF  ✅
ACUMBAMAIL_API_KEY         ✅
ADMIN_SECRET_KEY           ✅
DOCUMENTERO_API_KEY        ✅
SUITEDASH_PUBLIC_ID        ✅
SUITEDASH_SECRET_KEY       ✅
EMAILIT_API_KEY            ✅ (documented in INFRASTRUCTURE.md as set but not listed)
STRIPE_WEBHOOK_SECRET      ✅ (from Stripe webhook config)
GROQ_API_KEY               ✅ (verified working 2026-03-24)
```

### Need to add
```
UPSTASH_REDIS_REST_URL     ❌ BLOCKING — provision first (#1)
UPSTASH_REDIS_REST_TOKEN   ❌ BLOCKING — provision first (#1)
```

### Future (not needed yet)
```
DATABASE_URL               🔲 When Postgres needed (#8)
TWILIO_ACCOUNT_SID         🔲 When SMS/voice launches (#12)
TWILIO_AUTH_TOKEN           🔲
TWILIO_PHONE               🔲
SMSIT_API_KEY              🔲
VADOO_API_KEY              🔲
FLIKI_API_KEY              🔲
CASTMAGIC_API_KEY          🔲
BRIZY_API_KEY              🔲
```

---

## Execution order (recommended)

| # | Action | Time | Blocking? |
|---|--------|------|-----------|
| 1 | Provision Upstash Redis + set env vars | 5 min | Yes — engine needs this |
| 2 | Confirm CROP license active | 5 min check | Yes — legal requirement |
| 3 | Apply for EIN | 10 min | Yes — needed for bank account |
| 4 | Open bank account + connect Stripe | 30 min–days | Yes — needed for revenue |
| 5 | Bind E&O insurance | 1–3 days | Yes — needed before clients |
| 6 | ~~Verify GROQ_API_KEY~~ | ~~2 min~~ | ✅ Done |
| 7 | Import n8n workflows (JSONs ready) | 30 min | Needed for live reminders |
| 8 | Run bulk-register script | 5 min | Needed for scheduler |
| 9 | Set up log drain (Axiom/Betterstack) | 15 min | Improves ops visibility |
| 10 | Google Business Profile | 30 min | Improves local SEO |
| 11 | Google Search Console | 15 min | Improves search indexing |

**Items 1–6 are the critical path to accepting your first paid client.**
Items 7–8 make the compliance engine actually run.
Items 9–11 are operational improvements.

---

*This file is the definitive list. If something needs human hands, it belongs here.*
*Last updated: 2026-03-24*

---

## 🔴🔴 URGENT DNS FIX NEEDED (2026-03-24)

During automated DNS updates via the 20i API, the old SPF and DMARC records were
successfully deleted but the replacement records failed to create. **The domain currently
has NO root SPF record and NO DMARC record.**

### Fix immediately in 20i dashboard:

1. Log in to [my.20i.com](https://my.20i.com)
2. Go to Manage Hosting → pacropservices.com → Options → Manage → Manage DNS
3. **Add TXT record #1 (SPF):**
   - Name: `pacropservices.com` (or `@`)
   - Type: `TXT`
   - Value: `v=spf1 include:spf.stackmail.com include:_spf.emailit.com a mx ~all`
4. **Add TXT record #2 (DMARC):**
   - Name: `_dmarc.pacropservices.com` (or `_dmarc`)
   - Type: `TXT`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:polycarpohu@gmail.com; pct=100; adkim=r; aspf=r;`
5. Click "Update DNS" / Save

**Why this matters:** Without SPF, every email sent from @pacropservices.com via Emailit
will fail sender authentication and likely land in spam. Without DMARC, you have no
policy enforcement or reporting.

**What was already correct (don't touch):**
- DKIM: `emailit._domainkey.pacropservices.com` ✅ (Emailit public key present)
- Emailit SPF subdomain: `emailit.pacropservices.com` TXT ✅
- Emailit MX: `emailit.pacropservices.com` → `feedback-smtp.ffdc-1.emailit.com` ✅
- Inbound MX: `inbound.pacropservices.com` → `inbound.emailitmail.com` ✅
- Root MX: `pacropservices.com` → `mx.stackmail.com` ✅
