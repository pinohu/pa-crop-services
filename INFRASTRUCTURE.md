# PA CROP Services — Infrastructure & Access Reference

> **Auto-updated on every commit.** Last updated: 2026-03-22 — COMPLETE: 34 pages, 18 APIs, 20 active workflows, portal redesign (NNG/Mercury aesthetic), 8 AI automations live-tested
> This file is the single source of truth for all infrastructure access, credentials topology,
> and development context. Safe to share with AI assistants continuing work on this codebase.

---

## Quick Links

| Resource | URL | Notes |
|----------|-----|-------|
| Live site | https://pacropservices.com | Production |
| Admin dashboard | https://pacropservices.com/admin | Key: `CROP-ADMIN-2026-IKE` |
| Client portal | https://pacropservices.com/portal | Email + access code |
| GitHub repo | https://github.com/pinohu/pa-crop-services | Private |
| Vercel project | https://vercel.com/polycarpohu-gmailcoms-projects/pa-crop-services | Auto-deploys on push to main |
| n8n | https://n8n.audreysplace.place | Dynasty Empire automation |
| SuiteDash CRM | https://app.suitedash.com | polycarpohu@gmail.com |
| 20i hosting | https://my.20i.com | Hosting + domain management |
| Stripe | https://dashboard.stripe.com | PA CROP live account |
| Acumbamail | https://dashboard.acumbamail.com | Email lists |
| Documentero | https://app.documentero.com | Service agreement PDFs |
| Flint outbox | https://claude-outbox.audreysplace.place/messages | AI agent messages |

---

## Repository Structure

```
pa-crop-services/
├── public/                          # Static HTML site (Vercel outputDirectory) — 34 pages
│   ├── index.html                   # Homepage — 4-tier pricing, A/B test, FAQ schema
│   ├── portal.html                  # Client portal — redesigned (Plus Jakarta Sans + Fraunces)
│   │                                #   NNG heuristic compliance, AI assistant inline,
│   │                                #   entity status hero, health score KPI, keyboard shortcuts
│   ├── admin.html                   # Admin dashboard — full ops (noindex)
│   ├── compliance-check.html        # Free compliance assessment tool (lead gen)
│   ├── welcome.html                 # Post-purchase welcome page
│   ├── about.html                   # About page — Person schema, E-A-T
│   ├── partners.html                # CPA/attorney partner program
│   ├── pa-2027-compliance-checklist.html  # Interactive checklist (M1 lead capture)
│   ├── pennsylvania-business-glossary.html
│   ├── 404.html
│   │
│   ├── pa-annual-report-requirement-guide.html    # SEO articles (9)
│   ├── what-is-a-pennsylvania-crop.html
│   ├── pa-2027-dissolution-deadline.html
│   ├── crop-vs-registered-agent-pennsylvania.html
│   ├── how-to-change-registered-office-pennsylvania.html
│   ├── pennsylvania-llc-registered-office-requirements.html
│   ├── how-to-file-pa-annual-report-2026.html
│   ├── reinstate-dissolved-pennsylvania-llc.html
│   ├── pennsylvania-foreign-entity-annual-report.html
│   │
│   ├── pa-crop-services-vs-northwest-registered-agent.html  # Comparison pages (4)
│   ├── pa-crop-services-vs-ct-corporation.html
│   ├── pa-crop-services-vs-zenbusiness.html
│   ├── pa-crop-services-vs-incfile.html
│   │
│   ├── registered-office-philadelphia-pa.html   # City pages (10)
│   ├── registered-office-pittsburgh-pa.html
│   ├── registered-office-harrisburg-pa.html
│   ├── registered-office-allentown-pa.html
│   ├── registered-office-erie-pa.html
│   ├── registered-office-reading-pa.html
│   ├── registered-office-bethlehem-pa.html
│   ├── registered-office-scranton-pa.html
│   ├── registered-office-lancaster-pa.html
│   ├── registered-office-wilkes-barre-pa.html
│   │
│   ├── embed/
│   │   ├── crop-widget.js           # Partner embeddable compliance widget
│   │   └── chatbot.js               # Standalone AI chatbot embed (any page)
│   ├── sitemap.xml
│   └── robots.txt
│
├── api/                             # Vercel serverless functions (18 endpoints)
│   ├── admin.js                     # Admin API — 12 actions (native PDF gen)
│   ├── auth.js                      # Portal login — SuiteDash lookup, 4-tier mapping
│   ├── provision.js                 # Full client provisioning (20i+SuiteDash+email)
│   ├── client-hosting.js            # 20i package lookup per client
│   ├── intake.js                    # Lead capture + 5-dimension scoring
│   ├── subscribe.js                 # Newsletter capture → Acumbamail + n8n
│   ├── reset-code.js                # Portal access code recovery
│   ├── partner-intake.js            # CPA/attorney partner applications
│   ├── entity-request.js            # Entity formation leads
│   ├── generate-agreement.js        # Native PDF service agreement (pdf-lib)
│   ├── chat.js                      # AI compliance chatbot (Groq llama-3.3-70b)
│   ├── entity-monitor.js            # PA DOS entity status checker
│   ├── email-triage.js              # AI email classifier + draft responder
│   ├── qualify-lead.js              # AI 5-dimension lead scorer
│   ├── classify-document.js         # AI document OCR classifier + summarizer
│   ├── client-health.js             # 5-dimension client health + churn predictor
│   ├── generate-article.js          # AI SEO article generator (brand voice)
│   ├── partner-commission.js        # Referral tracking + commission calculator
│   └── portal-health.js             # Session-auth health score (no admin key)
│
├── context/                         # dynasty-seomachine brand voice
│   ├── brand-voice.md
│   ├── niche-config.md
│   ├── internal-links-map.md
│   └── style-guide.md
│
├── docs/                            # Setup guides + email sequences
│   ├── SUITEDASH_CUSTOM_FIELDS.md
│   ├── GOOGLE_SEARCH_CONSOLE.md
│   ├── GOOGLE_BUSINESS_PROFILE.md
│   ├── RENEWAL_EMAIL_SEQUENCE.md
│   ├── WINBACK_EMAIL_SEQUENCE.md
│   └── CROP_Service_Agreement_Template.docx
│
├── package.json                     # Dependencies: pdf-lib
├── vercel.json                      # outputDirectory: public, cleanUrls: true
├── INFRASTRUCTURE.md                # This file
└── MASTER_BUILD_PLAN_V2.md          # Original build plan
```

---

## Vercel Configuration

**Project:** `pa-crop-services`  
**Project ID:** `prj_MrCHRfSE1tdtaLy7Niwr7D4DlJ8c`  
**Team ID:** `team_fuTLGjBMk3NAD32Bm5hA7wkr`  
**Team slug:** `polycarpohu-gmailcoms-projects`  
**Framework:** None (static HTML + serverless functions)  
**Output directory:** `public/`  
**Node.js version:** 24.x  
**Deployment:** Auto on push to `main` branch  

### How to Deploy

```bash
# Any commit to main triggers auto-deploy via GitHub integration
git add . && git commit -m "your message" && git push origin main

# Via GitHub API (no local git required):
python3 push_to_github.py  # uses token from INFRASTRUCTURE.md
```

### vercel.json (do NOT add custom properties — schema validates strictly)

```json
{
  "outputDirectory": "public",
  "cleanUrls": true,
  "headers": [{ "source": "/(.*)", "headers": [security headers] }]
}
```

### Environment Variables (all set in Vercel dashboard, All Environments)

| Key | Purpose | Value source |
|-----|---------|--------------|
| `SUITEDASH_PUBLIC_ID` | SuiteDash API auth | SuiteDash Settings → API |
| `SUITEDASH_SECRET_KEY` | SuiteDash API auth | SuiteDash Settings → API |
| `STRIPE_SECRET_KEY` | Stripe API | Stripe → Developers → API Keys |
| `TWENTY_I_TOKEN` | 20i (combined, legacy) | `c2387393b8125d868+c0471cadcfe5a7837` |
| `TWENTY_I_GENERAL` | 20i general key (base64 → bearer) | `c2387393b8125d868` |
| `TWENTY_I_OAUTH` | 20i OAuth key | `c0471cadcfe5a7837` |
| `ACUMBAMAIL_API_KEY` | Acumbamail email lists | `0cdbad074aa140a5bf7274027a53f780` |
| `ADMIN_SECRET_KEY` | Admin dashboard auth | `CROP-ADMIN-2026-IKE` |
| `GROQ_API_KEY` | AI chatbot + email triage + lead scoring | `gsk_4Rns...` (set in code, add to env for security) |
| `DOCUMENTERO_API_KEY` | PDF agreement generation (replaced by native) | `R6OL3LQ-HSKETSA-RSNQ3TA-77PJH3A` |
| `DOCUMENTERO_TEMPLATE_ID` | Service agreement template | Set after Documentero template created |
| `TWENTY_I_RESELLER_ID` | 20i reseller account ID | `10455` |
| `TWENTY_I_DEFAULT_TYPE_REF` | Default package type for new hosting | `80397` (Linux Elevate) |

> ⚠️ **20i Note:** The `TWENTY_I_TOKEN` returns 401 from `/reseller/web`. Root cause: these are
> StackCP sub-account keys. Fix by going to `my.20i.com → Reseller → API` and generating
> reseller-level bearer token, then updating `TWENTY_I_TOKEN` in Vercel.

---

## GitHub Access

**Repo:** `pinohu/pa-crop-services` (private)  
**Branch:** `main`  
**Token:** `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`  
**Token scope:** repo (full), workflow  

### Push pattern (no local git needed)

```python
import urllib.request, json, base64

TOKEN = "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"

def push_file(remote_path, content_str, message):
    url = f"https://api.github.com/repos/pinohu/pa-crop-services/contents/{remote_path}"
    # Get SHA of existing file
    req = urllib.request.Request(url, headers={"Authorization": f"token {TOKEN}"})
    try:
        with urllib.request.urlopen(req) as r:
            sha = json.load(r).get("sha", "")
    except:
        sha = ""
    # Push
    body = {"message": message, "content": base64.b64encode(content_str.encode()).decode()}
    if sha:
        body["sha"] = sha
    req2 = urllib.request.Request(url, data=json.dumps(body).encode(), method="PUT",
        headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req2) as r:
        return json.load(r).get("commit", {}).get("sha", "")[:10]
```

---

## n8n Automation

**URL:** `https://n8n.audreysplace.place`  
**API key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzAyYjQzYS1lNjAyLTQ1NzgtOTgyYy1kNTI4YWVhMDY0ZDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMmEzMDU4Y2UtNTNmYS00MzRjLTg3NjEtNjU2ZGE3MmRiMzE4IiwiaWF0IjoxNzc0MDUwMTA1fQ.QZnjcP25xNNhJwABdyYhADGxmDGaQkb8OLoCLCvukHs`  
**Webhook base:** `https://n8n.audreysplace.place/webhook/`  

### Active Workflows (20 active, 2 inactive)

| ID | Name | Trigger | Status |
|----|------|---------|--------|
| `OkjdJx2bRqlgl1s7` | CROP — New Client Onboarding | Stripe webhook | ✅ Active |
| `WzLsTyevzy2HdY26` | CROP — Renewal Sequence | Daily 7AM cron | ✅ Active |
| `VroBVEpWgOgCTAF3` | CROP — Win-Back Sequence | Weekly Mon 8AM | ✅ Active |
| `cEC0aLvV4CMEUYHn` | CROP — Daily Entity Status Monitor | Daily 6AM cron | ✅ Active |
| `EfsC4jvIcS9j4RK0` | CROP — Weekly Client Health Score | Weekly Mon 7AM | ✅ Active |
| `4RV1ZzWSkR4KkUjS` | CROP — AI Email Triage | Webhook `crop-email-triage` | ✅ Active |
| `9MNIDxWss0ew6Ngx` | CROP — SEO Content Pipeline | Webhook `crop-generate-article` | ✅ Active |
| `8iz9Mjhkhpy0ArBv` | CROP — Auto-Generate Service Agreement | Webhook `crop-gen-agreement` | ✅ Active |
| `il9DOXSAK9hUo2Ru` | CROP — Annual Report Reminders | Scheduled | ✅ Active |
| `xiOMdfSNEmWfqauo` | CROP — Payment Failed Dunning | Stripe webhook | ✅ Active |
| `Ov3nTuiJKarlRvhS` | PA CROP — 20i Infrastructure Provisioning | Stripe webhook | ✅ Active |
| `DpeDi1zt88ySTSOF` | CROP — Paperless Document Router | Webhook | ✅ Active |
| `pDcxjzAkdtyfpHU2` | CROP — PA DOS Entity Status Checker | Webhook `crop-dos-entity-checker` | ✅ Active |
| `gE6dROHiqT2XAUiq` | CROP — Sync Client to Acumbamail | Webhook `crop-acumbamail-sync` | ✅ Active |
| `ndDWaSmPO4290CgK` | CROP — Lead Nurture Start | Webhook `crop-lead-nurture-start` | ✅ Active |
| `RSibNfwSM9aw3vUW` | CROP — Hot Lead Alert | Webhook `crop-hot-lead-alert` | ✅ Active |
| `l2495RxXLxkYzqcU` | CROP — Portal Access Code Reset | Webhook `crop-portal-reset` | ✅ Active |
| `9j4pW3PmmYufMG8T` | CROP — Partner Onboarding | Webhook `crop-partner-onboarding` | ✅ Active |
| `4wpcDFG7XkUNoI4Z` | CROP — Portal Auth Lookup | Internal | ✅ Active |
| `UvjE2Z9kqUoYsnzV` | CROP — Portal Auth | Internal | ✅ Active |


### n8n Credential IDs (referenced in workflows)

| ID | Name | Type |
|----|------|------|
| `fdJIhgn9ERaHDtv4` | 20i Reseller API (Bearer) | httpBearerAuth |
| `Hr76P6m9H6FfDggx` | Stripe CROP | httpHeaderAuth |
| `qwwVH3KJASNbk93F` | Emailit CROP SMTP | smtp |
| `5Ctj3H0g6upsTMgw` | SuiteDash CROP | httpHeaderAuth |
| `1iwHVJxga79OqoMk` | Documentero CROP | httpHeaderAuth |
| `2mITH7BGZDpaPLeu` | Acumbamail CROP | httpHeaderAuth |
| `u6ns4mSDtGL353CK` | Flint Telegram Bot | telegramApi |

---

## SuiteDash CRM

**URL:** `https://app.suitedash.com`  
**Login:** `polycarpohu@gmail.com`  
**API base:** `https://app.suitedash.com/secure-api`  
**Auth headers:** `X-Public-ID` + `X-Secret-Key` (values in Vercel env)  
**YourDeputy instance:** `https://portal.yourdeputy.com/api/v1/`  

### Required Custom Fields (create in SuiteDash → Settings → CRM → Custom Fields → Contacts)

| Field Key | Label | Type |
|-----------|-------|------|
| `portal_access_code` | Portal Access Code | Text |
| `crop_plan` | CROP Plan | Text |
| `crop_since` | CROP Service Since | Date |
| `lead_score` | Lead Score | Number |
| `lead_tier` | Lead Tier | Text (cold/warm/hot) |
| `lead_source` | Lead Source | Text |
| `entity_type` | Entity Type | Text |
| `mobile_phone` | Mobile Phone | Phone |
| `referral_code` | Referral Code | Text |
| `has_foreign_entity` | Has Foreign Entity? | Text (yes/no) |

---

## 20i Hosting

**Dashboard:** `https://my.20i.com`  
**API base:** `https://api.20i.com`  
**General key:** `c2387393b8125d868`  
**OAuth key:** `c0471cadcfe5a7837`  
**Combined bearer:** `c2387393b8125d868+c0471cadcfe5a7837` (new keys, March 22 2026)  

> ✅ **Auth resolved (March 22 2026):** 20i requires base64-encoding the general key.
> `Authorization: Bearer <base64(general_key)>` — e.g. `Bearer YzIzODczOTNiODEyNWQ4Njg=`
> All API files updated. Reseller ID: `10455`. 137 packages confirmed via GET /package.
> ⚠️ Package creation endpoint still needs correct type-ref — use `GET /reseller/10455` → webTypes

### Key API endpoints used

```
GET  /reseller/web              → list all hosting packages
POST /reseller/web              → create new hosting package
POST /package/{id}/ssl          → enable SSL
POST /package/{id}/turbo        → enable turbo
POST /package/{id}/backup       → enable backups
POST /package/{id}/email/mailbox → create mailbox
POST /reseller/user             → create StackCP user
GET  /reseller/domain-search    → check domain availability
```

---

## Stripe

**Dashboard:** `https://dashboard.stripe.com`  
**Mode:** Live  
**Products & Prices:**

| Plan | Price | Stripe Link ID |
|------|-------|---------------|
| Compliance Only $99 | `price_...` | `6oU9AUcheaD173I2Ys6sw0c` |
| Business Starter $199 | `price_...` | `28E7sM80YdPdewa42w6sw09` |
| Business Pro $349 | `price_...` | `7sY4gAepm12rbjYaqU6sw0a` |
| Business Empire $699 | `price_...` | `cNi4gAgxueTh9bQaqU6sw0b` |

**Webhooks → n8n:**
- `checkout.session.completed` → 20i provisioning workflow
- `invoice.payment_failed` → dunning workflow

---

## Acumbamail

**Dashboard:** `https://dashboard.acumbamail.com`  
**Auth token:** `0cdbad074aa140a5bf7274027a53f780`  
**API base:** `https://acumbamail.com/api/1/`  

| List ID | Name | Purpose |
|---------|------|---------|
| `1267324` | All Clients | Primary client list |
| `1267325` | CPA Partners | Partner program list |

---

## Documentero

**Dashboard:** `https://app.documentero.com`  
**API key:** `R6OL3LQ-HSKETSA-RSNQ3TA-77PJH3A`  
**API endpoint:** `POST https://app.documentero.com/api`  
**Auth header:** `Authorization: R6OL3LQ-HSKETSA-RSNQ3TA-77PJH3A`  
**Template ID:** Set `DOCUMENTERO_TEMPLATE_ID` env var once template is created  

### Service Agreement fields

`client_name`, `entity_name`, `entity_number`, `entity_type`, `client_address`,
`client_email`, `service_tier`, `annual_fee`, `effective_date`,
`provider_name` (PA Registered Office Services, LLC), `provider_address`, `provider_phone`, `provider_email`

---

## Business Details

| Field | Value |
|-------|-------|
| Entity | PA Registered Office Services, LLC |
| PA DOS File # | 0015295203 |
| EIN | 41-5024472 |
| Address | 924 W 23rd St, Erie, PA 16502 |
| Phone | 814-480-0989 |
| Email | hello@pacropservices.com |
| Partners email | partners@pacropservices.com |
| Microsoft Clarity | `vzhtq2nted` (installed on all 23 pages) |
| Plausible | `pacropservices.com` (installed on all pages) |

---

## Admin Dashboard

**URL:** `https://pacropservices.com/admin`  
**Auth key:** `CROP-ADMIN-2026-IKE` (or `ADMIN_SECRET_KEY` env var)  
**API:** `POST /api/admin` with header `X-Admin-Key: CROP-ADMIN-2026-IKE`  

### Available actions

```json
{ "action": "dashboard" }          // SuiteDash clients + Stripe MRR/ARR + 20i packages
{ "action": "clients" }            // Searchable client list with all custom fields
{ "action": "client_detail", "payload": { "clientId": 123 } }
{ "action": "update_client", "payload": { "clientId": 123, "fields": {} } }
{ "action": "hosting" }            // 20i hosting packages inventory
{ "action": "provision_hosting", "payload": { ... } }
{ "action": "revenue" }            // Stripe MRR, ARR, recent invoices
{ "action": "leads" }              // Lead pipeline by tier (hot/warm/cold)
{ "action": "generate_agreement", "payload": { ... } }  // Documentero PDF
{ "action": "email_stats" }        // Acumbamail list stats
{ "action": "check_domain", "payload": { "domain": "example.com" } }
{ "action": "check_entity", "payload": { "entityName": "...", "entityNumber": "..." } }
```

### Provision API

```bash
POST /api/provision
X-Admin-Key: CROP-ADMIN-2026-IKE

{
  "email": "client@example.com",
  "name": "Jane Smith",
  "tier": "business_starter",
  "includesHosting": true,
  "includesTurbo": false,
  "includesBackups": false,
  "suggestedDomain": "businessname.com",
  "accountSlug": "janesmith-a1b2",
  "hostingPassword": "auto-generated"
}
```

Executes in sequence: access code generation → SuiteDash contact → 20i hosting → SSL → mailbox → StackCP user → portal welcome email → Acumbamail add.

---

## SEO Content Map

### Articles (all with Article + FAQPage/HowTo schema, author E-A-T)

| URL | Title | Word Count |
|-----|-------|-----------|
| `/what-is-a-pennsylvania-crop` | What Is a PA CROP? | ~2,100 |
| `/pa-annual-report-requirement-guide` | PA Annual Report Guide | ~2,000 |
| `/pa-2027-dissolution-deadline` | PA 2027 Dissolution Deadline | ~1,900 |
| `/crop-vs-registered-agent-pennsylvania` | CROP vs Registered Agent | ~1,600 |
| `/how-to-change-registered-office-pennsylvania` | How to Change Registered Office | ~1,700 |
| `/pennsylvania-llc-registered-office-requirements` | PA LLC Registered Office Requirements | ~1,400 |
| `/how-to-file-pa-annual-report-2026` | How to File PA Annual Report | ~1,200 |
| `/reinstate-dissolved-pennsylvania-llc` | How to Reinstate Dissolved PA LLC | ~1,400 |
| `/pennsylvania-foreign-entity-annual-report` | PA Foreign Entity Annual Report | ~1,400 |
| `/pennsylvania-business-glossary` | PA Business Glossary (15 terms) | — |

### Comparison pages (Article + FAQPage schema, author E-A-T)

| URL | Title | Word Count |
|-----|-------|-----------|
| `/pa-crop-services-vs-northwest-registered-agent` | vs Northwest Registered Agent | ~1,800 |
| `/pa-crop-services-vs-ct-corporation` | vs CT Corporation | ~1,800 |
| `/pa-crop-services-vs-zenbusiness` | vs ZenBusiness | ~1,800 |
| `/pa-crop-services-vs-incfile` | vs Incfile | ~1,800 |

### City pages (LegalService + areaServed schema)

Philadelphia, Pittsburgh, Harrisburg, Allentown, Erie, Reading, Bethlehem, Scranton, Lancaster, Wilkes-Barre

---

## Outstanding Items

### Completed (this session — 2026-03-22)
- [x] SuiteDash custom fields (10 fields created)
- [x] 20i env vars: TWENTY_I_RESELLER_ID + TWENTY_I_DEFAULT_TYPE_REF added to Vercel
- [x] Onboarding workflow fixed: correct tier mapping ($99/$199/$349/$699), access code generation
- [x] Portal auth API: correct 4-tier mapping, returns tierLabel/includesHosting
- [x] Documentero replaced with native PDF generation (pdf-lib, zero external deps)
- [x] Renewal email sequence: 6 stages, CROP-specific content, Emailit SMTP
- [x] Win-Back email sequence: 5 stages, CROP-specific content, Emailit SMTP
- [x] 5 new city pages: Reading, Bethlehem, Scranton, Lancaster, Wilkes-Barre
- [x] 4 competitor comparison pages: vs Northwest, CT Corp, ZenBusiness, Incfile
- [x] Sitemap updated (28 URLs)
- [x] Cross-links updated across all 10 city pages
- [x] 8 AI automation systems built and tested (all 8/8 pass):
    1. AI Compliance Chatbot (/api/chat) — Groq llama-3.3-70b, embedded in portal
    2. PA DOS Entity Status Monitor (/api/entity-monitor) — daily n8n cron
    3. AI Email Triage (/api/email-triage) — classify + draft + route
    4. Smart Lead Qualifier (/api/qualify-lead) — 5-dimension AI scoring
    5. Document Auto-Router (/api/classify-document) — OCR → type + summary
    6. Client Health Score (/api/client-health) — churn prediction, weekly cron
    7. SEO Content Pipeline (/api/generate-article) — AI articles in brand voice
    8. Partner Commission Engine (/api/partner-commission) — 20% referral tracking
- [x] Portal redesigned: NNG heuristics, Mercury/Linear aesthetic, Plus Jakarta Sans + Fraunces,
      AI assistant inline on dashboard, entity status hero, health score KPI, keyboard shortcuts
- [x] All n8n workflows activated (20 active)
- [x] Renewal + Win-Back workflows rebuilt from scratch (clean n8n v2 format)


### Post-Audit Fixes Applied (2026-03-22)

**P0 Security (RESOLVED):**
- Created `/api/portal-health.js` — calculates health score using email verification, no admin key
- Removed `CROP-ADMIN-2026-IKE` from portal.html — was exposed in client-side JS
- Portal now calls `/api/portal-health` instead of `/api/client-health`
- Unverified emails rejected with HTTP 403 when SuiteDash is configured

**P1 SEO (RESOLVED):**
- Trimmed titles to ≤70ch on 12 pages (articles, comparisons, city pages)
- Trimmed meta descriptions to ≤160ch on 14 pages
- Added OG tags to compliance-check.html
- Added canonical + noindex to portal.html

**P2 Ops (RESOLVED):**
- Deleted stale CROP-16 and CROP-17 inactive workflows
- 20 active, 0 inactive CROP workflows remain

**Remaining (Ike action):**
- [ ] Add `GROQ_API_KEY` to Vercel: Settings → Environment Variables
  - Key: `GROQ_API_KEY`
  - Value: `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`
  - Environments: Production + Preview + Development

### Needs Ike action
- [x] Fix 20i API: Reseller env vars added (TWENTY_I_RESELLER_ID=10455, TWENTY_I_DEFAULT_TYPE_REF=80397)
- [x] Create SuiteDash custom fields (10 fields — completed 2026-03-22)
- [ ] Google Search Console: add property, verify via DNS TXT, submit sitemap (see `docs/GOOGLE_SEARCH_CONSOLE.md`)
- [ ] Google Business Profile: create listing (see `docs/GOOGLE_BUSINESS_PROFILE.md`)
- [ ] Documentero: upload `docs/CROP_Service_Agreement_Template.docx` → copy template ID → set `DOCUMENTERO_TEMPLATE_ID` in Vercel
- [x] n8n renewal sequence content (`wRLXTGXW60MDLUnI`) — see docs/RENEWAL_EMAIL_SEQUENCE.md
- [x] n8n win-back sequence content (`UGGH8LOU4AR3eXk`) — see docs/WINBACK_EMAIL_SEQUENCE.md
- [ ] LinkedIn profile slug → add to author schema `sameAs` in all articles
- [ ] E&O insurance
- [ ] Business bank account
- [ ] CROP mail filing with PA DOS ($70)

### Future development
- [x] Comparison pages: vs Northwest, CT Corp, ZenBusiness, Incfile (added 2026-03-22)
- [x] 5 more city pages: Reading, Bethlehem, Scranton, Lancaster, Wilkes-Barre (added 2026-03-22)
- [ ] PA Compliance Cost Calculator (interactive tool)
- [ ] Expand city pages to 300+ words each with local business references
- [ ] Activate renewal + win-back n8n sequences

---

## Flint Agent Bridge

**Outbox (Flint → Claude):** `GET https://claude-outbox.audreysplace.place/messages`  
**Inbox (Claude → Flint):** `POST https://claude-inbox.audreysplace.place/message`  
**Token:** `1ed943c21ef9e2f60fe1189241a286d769e4191051ad2c0c035282722cb4b030`  

Check at start of every session:
```bash
curl -H "Authorization: Bearer 1ed943c21ef9e2f60fe1189241a286d769e4191051ad2c0c035282722cb4b030"   https://claude-outbox.audreysplace.place/messages
```

---

*This file is automatically updated with every commit to this repository.*
*Last updated by automated push — see commit history for change log.*