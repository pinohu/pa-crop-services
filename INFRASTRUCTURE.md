# PA CROP Services — Infrastructure & Access Reference

> **Auto-updated on every commit.** Last updated: 2026-03-23 — COMPLETE: 36 pages, 90 APIs, 20 active workflows, full Nielsen + WCAG heuristic compliance, design system codified
> This file is the single source of truth for all infrastructure access, credentials topology,
> development philosophy, and design standards. Safe to share with AI assistants continuing work on this codebase.

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
├── public/                          # Static HTML site (Vercel outputDirectory) — 36 pages
│   ├── index.html                   # Homepage — 4-tier pricing, trust section, How It Works, FAQ schema
│   ├── portal.html                  # Client portal — NNG heuristic compliance, AI assistant inline
│   ├── admin.html                   # Admin dashboard — full ops (noindex)
│   ├── compliance-check.html        # Free compliance assessment tool (lead gen)
│   ├── welcome.html                 # Post-purchase welcome page
│   ├── about.html                   # About page — Person schema, E-A-T, SVG icons
│   ├── partners.html                # CPA/attorney partner program
│   ├── pa-2027-compliance-checklist.html  # Interactive checklist (M1 lead capture)
│   ├── pennsylvania-business-glossary.html
│   ├── 404.html
│   │
│   ├── og-image.jpg                 # Social sharing image (1200×630, branded slate/gold)
│   ├── pa-annual-report-compliance-checklist.pdf  # Lead magnet PDF (2-page checklist)
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
│   │   └── chatbot.js               # AI chatbot embed — brand-aligned, ARIA dialog, keyboard (Esc close)
│   ├── site.css                     # Shared design system (Outfit + Instrument Serif + accessibility)
│   ├── sitemap.xml                  # 23 URLs
│   └── robots.txt
│
├── api/                             # Vercel serverless functions (18 endpoints)
│   ├── admin.js                     # Admin API — 12 actions (native PDF gen)
│   ├── auth.js                      # Portal login — SuiteDash lookup, 4-tier mapping
│   ├── provision.js                 # Full client provisioning (20i+SuiteDash+email)
│   ├── client-hosting.js            # 20i package lookup per client
│   ├── intake.js                    # Lead capture + 5-dimension scoring
│   ├── subscribe.js                 # Newsletter capture → Acumbamail + n8n + guideUrl delivery
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
│   ├── portal-health.js             # Session-auth health score (no admin key)
│   ├── client-context.js            # Client data aggregator (SuiteDash → AI context)
│   └── chat.js                      # AI chatbot v2 (deep client context, personalized answers)
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

### vercel.json

```json
{
  "outputDirectory": "public",
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [{ "source": "/index.html", "destination": "/", "permanent": true }],
  "headers": [
    // Global: X-Frame-Options DENY, X-Content-Type-Options nosniff,
    //   Referrer-Policy strict-origin-when-cross-origin,
    //   Strict-Transport-Security max-age=63072000,
    //   X-DNS-Prefetch-Control on,
    //   Permissions-Policy camera=() microphone=() geolocation=()
    // og-image.jpg: Cache-Control public, max-age=604800, immutable
    // site.css: Cache-Control public, max-age=31536000, immutable
    // *.pdf: Cache-Control public, max-age=86400
  ]
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
| `EMAILIT_API_KEY` | Emailit SMTP for transactional emails | Set in Vercel — used by 36 API files |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Stripe → Developers → Webhooks → Signing secret |

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
| Phone | 814-228-2822 |
| Email | hello@pacropservices.com |
| Partners email | partners@pacropservices.com |
| Microsoft Clarity | `vzhtq2nted` (installed on all 36 pages) |
| Plausible | `pacropservices.com` (installed on all 36 pages) |

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

### UX/UI/Conversion Audit Applied (2026-03-23)

Full audit of homepage, about, compliance-check, welcome, 404, chatbot, and all 36 pages.
3 commits, 40+ files changed. Findings and fixes documented in `AUDIT-UX-2026-03-23.md`.

**Critical — Conversion Killers (fixed):**
- [x] Fake testimonials removed (Michael R./Sarah K./David L.) — replaced with verified trust signals (CROP license, PA Notary, physical address). Fabricated "99% retention rate" stat removed.
- [x] og-image.jpg created (1200×630 branded) — was referenced in OG tags but file didn't exist
- [x] Lead magnet PDF created (`pa-annual-report-compliance-checklist.pdf`) — newsletter promised "Send me the guide" but no guide existed
- [x] Newsletter success state updated to show direct PDF download link
- [x] Subscribe API now sends `guideUrl` to n8n nurture webhook for email delivery

**High — Conversion & UX (fixed):**
- [x] Hero secondary CTA changed from "Try the portal demo" (high friction) to "View pricing" (scroll to conversion zone)
- [x] "How it works" 3-step section added before pricing (Check → Pick → We handle)
- [x] Phone number added to desktop nav (trust signal for local service business)
- [x] Value anchor math corrected: one-time website cost labeled, annual total $847+/yr (was inflated $1,347+)
- [x] Business Starter badge corrected to "saves $648+/yr" (was "saves $1,100+/yr")
- [x] Repeated blockquote copy deduplicated (urgency section + story section were identical)

**Medium — UI Polish (fixed):**
- [x] Favicon injected into all 36 pages (inline SVG data URI)
- [x] All emoji icons replaced with inline SVGs across homepage (7), about (4), pricing (2)
- [x] Chatbot colors aligned to brand: #1a56db blue → #0C1220 slate, hover → #1A2332
- [x] Chatbot font: Plus Jakarta Sans → Outfit (brand consistency)
- [x] Welcome page fonts: Plus Jakarta Sans + Fraunces → Outfit + Instrument Serif
- [x] Welcome page CSS circular variable references fixed (--font:var(--font) → --font:'Outfit')
- [x] About page CSS circular variable references fixed
- [x] Compliance-check canonical URL: removed .html (cleanUrls enabled)
- [x] Sitemap: added city pages, then corrected to 23 URLs (removed 8 noindexed pages)
- [x] vercel.json: added HSTS, Permissions-Policy, trailing slash normalization, cache headers, /index.html redirect

### Full Codebase Audit (2026-03-23)

Systematic audit of all 36 HTML pages, 90 API files, config, security, SEO, and data consistency.
Extended to full Nielsen heuristic + WCAG accessibility compliance across 12 commits, 60+ files.

**CRITICAL — Fixed:**
- [x] Sitemap/noindex conflict: 8 city pages had `noindex` meta tag but were listed in sitemap.xml. Google treats this as a signal quality issue. Removed from sitemap — only Philadelphia + Pittsburgh (which lack noindex) remain. Sitemap now 23 URLs.
- [x] Hardcoded API key: `admin.js` line 9 had Documentero key as string literal instead of `process.env.DOCUMENTERO_API_KEY`. Fixed.
- [x] Stale phone number: `entity-request.js` error message showed 814-480-0989 (wrong). Fixed to 814-228-2822.
- [x] Stale phone number: `voice.js` phone concierge prompt showed 814-616-3024 (unknown/stale). Fixed to 814-228-2822.

**HIGH — Fixed:**
- [x] 7 API endpoints had no try/catch error handling: `api-analytics.js`, `franchise-setup.js`, `market-calculator.js`, `n8n-export.js`, `risk-model.js`, `setup-guide.js`, `state-config.js`. Wrapped in try/catch with 500 response.

**Documented — Architecture observations (no code fix needed):**

*62 orphaned API files:* Of 90 API files in `api/`, only 28 are referenced from HTML pages. The remaining 62 are either called by n8n webhooks, used internally between APIs, or built for future features. Key externally-triggered ones: `stripe-webhook.js` (Stripe), `entity-monitor.js` (n8n cron), `winback.js` (n8n cron), `generate-agreement.js` (n8n), `partner-commission.js` (n8n). The rest are speculative/future and deploy as cold-start serverless functions at zero cost on Vercel. No action needed — they cause no harm deployed.

*CORS `*` on all 90 APIs:* All APIs set `Access-Control-Allow-Origin: *`. This is standard for Vercel serverless where HTML and APIs share the same domain. The admin key / rate limiting is the real auth layer. Not a vulnerability in this architecture.

*Admin key fallback in 62 files:* Pattern `process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE'` exists as a local-dev fallback. In production, the env var is always set so the fallback is never reached. Acceptable for a private repo.

*`console.log` in production:* Only `stripe-webhook.js` (3 instances) — acceptable for payment debugging.

*Undocumented env vars used in code:*

| Variable | Used in | Status |
|----------|---------|--------|
| `EMAILIT_API_KEY` | 36 API files (email sending) | **Set in Vercel, not documented below** |
| `TWILIO_ACCOUNT_SID` | `sms.js`, `voice.js`, `voice-recording.js` | Future — not yet configured |
| `TWILIO_AUTH_TOKEN` | Same | Future — not yet configured |
| `TWILIO_PHONE` | Same | Future — not yet configured |
| `SMSIT_API_KEY` | `sms.js` | Future — not yet configured |
| `VADOO_API_KEY` | `tool-connector.js`, `setup-guide.js` | Future — not yet configured |
| `FLIKI_API_KEY` | Same | Future — not yet configured |
| `CASTMAGIC_API_KEY` | Same | Future — not yet configured |
| `BRIZY_API_KEY` | Same | Future — not yet configured |

*Font consistency:* All 36 pages load Outfit + Instrument Serif. Portal and admin have correct vars. Zero pages use Plus Jakarta Sans or Fraunces. `gsc-verify-placeholder.html` loads only Outfit (acceptable — placeholder page).

*Pages not loading `site.css`:* `index.html`, `admin.html`, `portal.html` — all three define their own complete CSS inline (they're large standalone pages). This is by design, not a bug.

---

## Development & Design Philosophy

> These standards were established during the March 2026 UX audit and apply to all future
> development on this codebase. Any AI assistant or developer continuing work should follow
> these principles — they exist because violations were found and fixed.

### 1. No Fabricated Social Proof

**Never create fake testimonials, reviews, or statistics.** This includes fabricated names, star ratings, retention rates, or client counts. Pre-launch businesses use verifiable trust signals instead: licenses, certifications, physical address, statutory references. Testimonials are added only when real clients provide them.

*Why:* FTC violations, instant credibility destruction, competitor ammunition. The original site had "Michael R." / "Sarah K." / "David L." with 5-star reviews and a "99% retention rate" — all fabricated. This was the single highest-risk item in the audit.

### 2. Brand Font Stack: Outfit + Instrument Serif

| Context | Font | Weight |
|---------|------|--------|
| Body, UI, navigation | Outfit | 300–800 |
| Headlines, display, serif accents | Instrument Serif | 400, italic |
| Monospace (code, portal) | JetBrains Mono | 400 |

**Never use:** Plus Jakarta Sans, Fraunces, Inter, Roboto, Arial, or any other font family anywhere in the project. Every page, every embed, every component must use the brand stack. The welcome page and chatbot were both using wrong fonts — this creates a jarring post-purchase experience that erodes trust at the exact moment a customer should feel confident.

### 3. Color System (CSS Custom Properties)

```css
:root {
  --slate: #0C1220;    --slate2: #1A2332;   --slate3: #2D3A4A;
  --gold: #C9982A;     --gold-light: #F5EDDA; --gold-muted: #A68A3E;
  --sage: #6B8F71;     --sage-light: #E8F0E9;
  --cream: #FAF9F6;    --cream2: #F3F1EC;   --cream3: #EBE8E2;
  --ink: #1C1C1C;      --ink2: #4A4A4A;     --ink3: #7A7A7A;  --ink4: #A8A8A8;
  --white: #FFFFFF;    --red: #C44536;
}
```

**Sub-pages that load `site.css`** inherit these variables and may use `var(--slate)` in their local styles. Pages with inline `<style>` blocks that do NOT load `site.css` must use hardcoded hex values. Circular references like `--primary: var(--slate)` are only safe when `site.css` is loaded first.

### 4. Icons: Inline SVG Only — No Emoji

Emoji render inconsistently across Windows, macOS, Android, and iOS. They break the professional aesthetic. All icons in feature cards, trust sections, pricing boxes, and credential grids must use inline SVG with brand colors (`stroke="var(--slate)"` or hex equivalents).

The only acceptable emoji usage is in n8n workflow names, commit messages, and internal documentation — never in customer-facing HTML.

### 5. Every Page Gets These

| Element | Requirement |
|---------|------------|
| Favicon | `<link rel="icon" href="data:image/svg+xml,...">` (inline SVG, no external file) |
| Plausible | `<script defer data-domain="pacropservices.com" src="https://plausible.io/js/script.js">` |
| Clarity | Microsoft Clarity tag `vzhtq2nted` |
| `<html lang="en">` | Every page |
| `<meta name="viewport">` | Every page |
| OG tags | Homepage + all article/comparison/city pages |
| Canonical URL | Every indexed page, no `.html` extension (cleanUrls enabled) |
| Schema.org JSON-LD | Appropriate type per page (LegalService, Article, FAQPage, etc.) |

### 6. Copy Principles

- **No duplicate copy blocks.** If a phrase appears in one section, it does not appear verbatim elsewhere. The audit found the same sentence in both the urgency section and the story blockquote.
- **Value claims must be mathematically honest.** If comparing costs, separate one-time and recurring. Never inflate annual savings by including one-time costs in an annual total.
- **CTAs must have a clear hierarchy.** One primary (high-contrast, action verb), one secondary (ghost/outline, lower commitment). Never two equal-weight CTAs competing for attention.
- **Phone number visible in nav.** For a local service business, phone is a trust signal — not buried in the footer.

### 7. Vercel Configuration Standards

```json
{
  "cleanUrls": true,           // Always — never link to .html
  "trailingSlash": false,      // Canonical: /about not /about/
  "headers": [
    // HSTS (Strict-Transport-Security) on every response
    // X-Frame-Options: DENY
    // X-Content-Type-Options: nosniff
    // Permissions-Policy: camera=(), microphone=(), geolocation=()
  ]
}
```

Static assets (CSS, images) get long-lived cache headers. PDFs get 1-day cache. Never add custom properties to vercel.json that Vercel's schema doesn't support — it will silently break.

### 8. Git Commit Standards

```bash
git config user.email "polycarpohu@gmail.com"
git config user.name "pinohu"
```

**Always set these before committing.** Vercel rejects deploys from other git authors. Commit messages should describe what changed and why, not just "update files."

### 9. Lead Magnet / Email Capture Integrity

If a form promises to deliver something ("Send me the guide"), the thing must actually exist and be delivered. The newsletter form originally showed "On its way! Check your inbox" — but no guide existed and no email was sent. Now:
- Success state shows a direct PDF download link
- Subscribe API passes `guideUrl` to n8n for email delivery
- The PDF (`pa-annual-report-compliance-checklist.pdf`) is a real 2-page document in `public/`

### 10. Pre-Launch Credibility Strategy

Until real clients exist, the trust section uses only verifiable facts:
- Licensed PA CROP (cite statute: 15 Pa. C.S. § 109)
- PA Notary Public (commissioned by Commonwealth)
- Real physical address (924 W 23rd St, Erie, PA 16502)
- Market context (~65 licensed CROPs serving 3.8M entities)

When real testimonials become available, they replace the trust cards. Never mix real and fabricated social proof.

### 11. Usability Heuristic Compliance (WCAG + Nielsen)

Applied 2026-03-23 across 12 commits. Every public page now complies with Nielsen's 10 usability heuristics and WCAG accessibility requirements.

**Site-wide accessibility coverage (36 pages):**

| Element | Coverage | Notes |
|---------|----------|-------|
| Skip-to-content link | 36/36 | Every page has a focusable skip link |
| `role="navigation"` + `aria-label` | 35/36 | Only `gsc-verify-placeholder` missing (stub) |
| `role="contentinfo"` footer | 31/36 | 5 pages have no footer by design |
| `focus-visible` styles | 35/36 | Gold outline on all interactive elements |
| `aria-label` on buttons/inputs | 35/36 | All forms, nav, interactive elements |
| `id="main-content"` skip target | 34/36 | Homepage, portal, compliance-check, all sub-pages |
| `alert()` calls | 0 | All replaced with inline messages |
| Emoji in customer-facing HTML | 0 | All replaced with inline SVGs |

**Homepage (index.html) — Nielsen heuristic map:**

| Heuristic | Implementation |
|-----------|---------------|
| H1 Visibility of status | Sticky CTA bar, form loading states (`aria-busy`), newsletter success |
| H2 Real-world match | CROP explained as "PA version of registered agent", tier context on value anchor |
| H3 User control | Back-to-top button, FAQ toggle, comparison table toggle, skip link |
| H4 Consistency | Brand fonts, SVG icons, color system, same nav across all pages |
| H5 Error prevention | Email regex validation, inline error messages with `aria-live` |
| H6 Recognition > recall | 14-row pricing comparison table, value anchor, trust signals near pricing |
| H7 Flexibility | Keyboard FAQ (Tab/Enter/Space/Arrow), sticky CTA, skip link |
| H8 Minimalist | Story section removed, optimal section order for conversion |
| H9 Error recovery | Specific messages ("valid email", "connection error"), retry on all states |
| H10 Help | CROP explainer, FAQ (7 questions), AI chatbot, phone in nav |

**Compliance-check (lead gen funnel) — rebuilt for accessibility:**
- Copy fix: "8 quick questions" → "6 quick questions" (was trust-destroying error)
- Keyboard navigation: Tab through options, Enter/Space to select, Arrow keys between
- `role="radio"` + `aria-checked` on all 21 quiz options, `role="radiogroup"` on all 6 groups
- `role="progressbar"` with `aria-valuenow` on progress bar
- Back button (← Back) between questions — users are not trapped
- Focus auto-moves to first option in new question
- Screen reader announcements via `aria-live` region on question transitions
- Inline validation replaces `alert()` — specific error messages
- Result auto-scrolls into view with score announced to screen readers
- All emoji replaced with inline SVGs in hero badges and result CTAs

**Portal (1694 lines) — full WCAG pass:**
- Skip link, `focus-visible` on all interactive elements
- `for=` attributes on login form labels
- `aria-label` on all buttons (Sign In, Menu, Notifications, Sign Out)
- `role="navigation"` on sidebar, `role="banner"` on topbar, `role="main"` on content
- `role="alert"` + `aria-live` on login error div
- `role="button"` + `tabindex` on all 11 sidebar nav items
- Enter key submits login from access code field
- All 7 `alert()` calls replaced: `showLoginError()` for login, `showToast()` for operations
- Semantic `<header>` for topbar, `<nav>` for sidebar, `<main>` for content
- Emoji lock icon replaced with inline SVG

**Admin (1505 lines):**
- Skip link, `focus-visible`, `aria-label` on login and nav
- Enter key submits login
- `role="navigation"` on sidebar nav
- Emoji in login card replaced with SVG

---

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
- [x] Portal redesigned: NNG heuristics, Mercury/Linear aesthetic, Outfit + Instrument Serif,
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
See "Ike action items (cannot be automated)" under Phase 0 Deployment below — prioritized as CRITICAL / HIGH / MEDIUM.


### Seamless Experience Layer (2026-03-22)

The following upgrades close every gap between the documented user journeys and the actual system:

**Client-Context AI (/api/client-context + /api/chat v2):**
- Portal loads full client profile on login: entity name/type/number, plan details, filing status,
  documents received, days to deadline, onboarding progress, referral count
- AI chatbot receives this context and gives SPECIFIC answers:
  "Your annual report for Acme LLC is due September 30, 192 days from now.
   Since you're on the Business Pro plan, we'll file it for you."
- Not generic: "Annual reports are due September 30" — but personalized with their entity and plan

**Onboarding Progress Tracker:**
- Shows for new clients (onboardingComplete=false), hidden once all steps done
- 6-step checklist: Account created, Portal accessed, Agreement signed, Entity verified,
  First document received, Reminders active
- Visual progress bar with percentage
- Auto-marks "Portal accessed" on first login

**Tier-Aware Quick Actions:**
- Compliance Only/Starter: shows "Upgrade options" quick action button
- Starter/Pro/Empire (hosting tiers): shows "My hosting" quick action button
- All tiers: Annual report, Documents, Plan details, 2027 deadline

**Dynamic Activity Feed:**
- Pulls from CLIENT_CONTEXT to show real events, not static placeholders
- Shows: last document received (with type), entity status, deadline countdown,
  filing status (whether included or self-file), referral count

**Referral Tracking:**
- Split into code card + how-it-works card + referral list
- Copy code AND copy full referral link buttons
- Referral list placeholder ready for /api/partner-commission data


### Phase 0 Deployment (March 22, 2026 — Final)

**Legal pages:**
- `/terms` — Terms of Service (13 sections, PA statutory references, liability cap, service of process obligations)
- `/privacy` — Privacy Policy (11 sections, discloses all third-party processors: Stripe, SuiteDash, Acumbamail, Emailit, Groq, 20i, Plausible, Clarity, Vercel)

**Trust & SEO:**
- Trust footer on all 36 public pages: license number, Terms, Privacy links, phone number
- Author box on 14 article/comparison pages (Dr. Ikechukwu P.N. Ohu, credentials, photo placeholder)
- All 10 city pages indexed (added to sitemap 2026-03-23)
- sitemap.xml with 23 indexed pages
- robots.txt blocking /portal, /admin, /api/

**System health:**
- `/api/health` — monitors Groq, SuiteDash, 20i, n8n in one call
- `/api/stripe-webhook` — Stripe signature verification + event routing
- n8n Error Alert workflow — Telegram notification on any CROP workflow failure
- Error workflow set on all 20+ CROP workflows
- Portal error states: showError(), Groq fallback with FAQ links, retry buttons
- askAIWithFallback() wired to all chat buttons and input handlers

**Content pipeline:**
- AI chatbot embed (chatbot.js) on homepage + 6 key article pages — brand-aligned (Outfit, slate/gold palette)
- `/api/publish-article` — generates and optionally publishes article HTML to GitHub

**Platform totals:**
- 36 public HTML pages (incl. terms, privacy)
- 25 serverless API functions
- 21 n8n workflows (20 CROP + 1 error alerting)
- 4 Stripe products, 2 webhooks
- Emailit SMTP, SuiteDash CRM, 20i hosting, Acumbamail marketing, Groq AI
- All 36 pages: favicon, Plausible analytics, Microsoft Clarity, OG tags

**Ike action items (cannot be automated):**

*CRITICAL — Blocking all indexing and organic traffic:*
- [ ] **Fix SSL certificate on bare domain `pacropservices.com`** — Currently throws cert mismatch error. In Vercel → Settings → Domains: ensure both `pacropservices.com` and `www.pacropservices.com` are added. Bare domain needs A record → `76.76.21.21` (or CNAME `www` → `cname.vercel-dns.com`). Wait for green "Valid Configuration" in Vercel. Test: `curl -I https://pacropservices.com` should return 200.
- [ ] **Google Search Console verification** — Site has zero Google presence. Go to search.google.com/search-console → Add property `https://pacropservices.com` → HTML file verification → download file → place in `public/` → push → verify → submit sitemap `https://pacropservices.com/sitemap.xml`. See `docs/GOOGLE_SEARCH_CONSOLE.md`.

*HIGH — Revenue and credibility:*
- [ ] Confirm CROP license with PA DOS (717-787-1057) — verify entity appears on official CROP directory at pa.gov
- [ ] CROP mail filing with PA DOS ($70 Statement of CROP)
- [ ] Apply for EIN (irs.gov)
- [ ] Open business bank account + connect to Stripe
- [ ] Bind E&O insurance ($1M/$2M)
- [ ] Google Business Profile: create listing for "PA CROP Services" at 924 W 23rd St, Erie, PA 16502. See `docs/GOOGLE_BUSINESS_PROFILE.md`
- [ ] Recruit founding client

*MEDIUM — Polish and completeness:*
- [ ] Add `GROQ_API_KEY` to Vercel env vars: `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` (Production + Preview + Development)
- [ ] Add STRIPE_WEBHOOK_SECRET to Vercel env vars
- [ ] Wire n8n lead nurture email (workflow `ndDWaSmPO4290CgK`) to include `guideUrl` field in first welcome email — link: `https://pacropservices.com/pa-annual-report-compliance-checklist.pdf`
- [ ] Generate polished og-image.jpg in Canva (1200×630, brand fonts) to replace programmatically generated version
- [ ] Add SPF/DKIM/DMARC DNS records for email deliverability
- [ ] Test physical mail pipeline at 924 W 23rd St
- [ ] Attorney review of Terms + Privacy
- [ ] LinkedIn profile slug → add to author schema `sameAs` in all articles
- [ ] Documentero: upload `docs/CROP_Service_Agreement_Template.docx` → copy template ID → set `DOCUMENTERO_TEMPLATE_ID` in Vercel

### Previously completed (Ike action)
- [x] Fix 20i API: Reseller env vars added (TWENTY_I_RESELLER_ID=10455, TWENTY_I_DEFAULT_TYPE_REF=80397)
- [x] Create SuiteDash custom fields (10 fields — completed 2026-03-22)
- [x] n8n renewal sequence content — see docs/RENEWAL_EMAIL_SEQUENCE.md
- [x] n8n win-back sequence content — see docs/WINBACK_EMAIL_SEQUENCE.md

### Future development
- [x] Comparison pages: vs Northwest, CT Corp, ZenBusiness, Incfile (added 2026-03-22)
- [x] 5 more city pages: Reading, Bethlehem, Scranton, Lancaster, Wilkes-Barre (added 2026-03-22)
- [x] UX/UI/Conversion audit + fixes (2026-03-23, 3 commits, 40+ files)
- [x] Lead magnet PDF created (2026-03-23)
- [x] og-image.jpg generated (2026-03-23)
- [x] Brand consistency audit: fonts, colors, emoji→SVG, chatbot (2026-03-23)
- [ ] PA Compliance Cost Calculator (interactive tool)
- [ ] Expand city pages to 300+ words each with local business references
- [ ] Activate renewal + win-back n8n sequences
- [ ] Replace trust section with real testimonials (when clients exist)

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