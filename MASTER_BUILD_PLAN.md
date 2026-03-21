# PA CROP Services — Master Build Plan
**Document version:** March 21, 2026  
**Repo:** `pinohu/pa-crop-services`  
**Live site:** `pacropservices.com`  
**Vercel project:** `prj_MrCHRfSE1tdtaLy7Niwr7D4DlJ8c` | Team: `team_fuTLGjBMk3NAD32Bm5hA7wkr`  
**n8n:** `https://n8n.audreysplace.place`  
**GitHub token:** Stored in repo secrets. Generate at `github.com/settings/tokens` if expired.

---

## 1. Current State Audit

### 1.1 What Is Live and Working

| Asset | URL / Location | Status |
|-------|---------------|--------|
| Homepage | `pacropservices.com` | ✅ Live |
| Client portal | `pacropservices.com/portal` | ✅ Live |
| Auth API | `pacropservices.com/api/auth` | ✅ Live |
| Compliance check tool | `pacropservices.com/compliance-check` | ✅ Live |
| SEO article: CROP explainer | `/what-is-a-pennsylvania-crop` | ✅ Live |
| SEO article: Annual report guide | `/pa-annual-report-requirement-guide` | ✅ Live |
| SEO article: 2027 deadline | `/pa-2027-dissolution-deadline` | ✅ Live |
| SEO article: CROP vs agent | `/crop-vs-registered-agent-pennsylvania` | ✅ Live |
| SEO article: How to change office | `/how-to-change-registered-office-pennsylvania` | ✅ Live |
| Welcome page | `pacropservices.com/welcome` | ✅ Live (incomplete) |
| 404 page | `pacropservices.com/404` | ✅ Live |
| Plausible analytics | Installed on all pages | ✅ Active |
| SuiteDash auth | `SUITEDASH_PUBLIC_ID` + `SUITEDASH_SECRET_KEY` in Vercel env | ✅ Set |
| n8n CROP onboarding | `OkjdJx2bRqlgl1s7` | ✅ Active |
| n8n annual report reminders | `il9DOXSAK9hUo2Ru` | ✅ Active |
| n8n dunning | `xiOMdfSNEmWfqauo` | ✅ Active |
| n8n Acumbamail sync | `gE6dROHiqT2XAUiq` | ✅ Active |
| n8n service agreement | `8iz9Mjhkhpy0ArBv` | ✅ Active |
| n8n document router | `DpeDi1zt88ySTSOF` | ✅ Active |
| n8n DOS entity checker | `pDcxjzAkdtyfpHU2` | ✅ Active |
| n8n 20i provisioning | `Ov3nTuiJKarlRvhS` | ✅ Active |

### 1.2 What Is Broken (Revenue-Blocking)

| # | Issue | Impact | Root Cause |
|---|-------|--------|-----------|
| B1 | Stripe buy links use wrong products | Clients pay wrong tier | Homepage updated to 4-tier pricing ($99/$199/$349/$699) but Stripe still has old 3 products ($79/$179/$299). Buy links hardcoded to old payment link IDs. |
| B2 | Portal access code never delivered | Clients can't log into portal after paying | n8n onboarding workflow creates SuiteDash contact but never writes `portal_access_code` custom field and never emails it. |
| B3 | Tier detection in onboarding is wrong | Clients assigned wrong plan | `Extract Customer` node uses amount thresholds ($150 = Professional, $250 = Premium) based on old pricing. New prices are $99/$199/$349/$699. |
| B4 | Welcome page missing portal instructions | Post-payment confusion | `/welcome.html` says "portal login credentials on their way" but they never arrive (linked to B2). |
| B5 | Mobile navigation broken | ~60% of traffic has no nav | `@media(max-width:768px) { nav ul {display:none} }` — zero navigation on mobile. No hamburger menu. |
| B6 | n8n Stripe webhook not updated for new product IDs | Onboarding may not fire | Stripe webhook `we_1TDFTiLeZEBBH8L729KugfTx` points to n8n but product IDs on events have changed. Needs verification. |

### 1.3 What Exists But Is Inactive / Unconfigured

| Workflow / Asset | ID / Location | Missing Config |
|-----------------|--------------|----------------|
| n8n CROP-16 Domain Collection | `I7MR8kImjn9u2C8V` | Inactive — needs activation for Business Starter/Pro/Empire tiers |
| n8n CROP-17 Website Deployment | `r0kzjYaYEImPn5ED` | Inactive — needs questionnaire webhook + build trigger |
| n8n Portal Auth Lookup | `4wpcDFG7XkUNoI4Z` | Active but webhook not registering — redundant with `/api/auth` Vercel function |
| n8n Portal Auth (duplicate) | `UvjE2Z9kqUoYsnzV` | Active — purpose unclear, possible duplicate |
| n8n Dynasty Pack 3 (Renewal) | `wRLXTGXW60MDLUnI` | Inactive — renewal email sequence |
| n8n Dynasty Pack 4 (Win-Back) | `UGGH8LOU4AR3eXk` | Inactive — churned member recovery |
| n8n Dynasty Pack 5 (Failure Handler) | `Iqy2zQwE1ZebzpIb` | Inactive — DLQ handler |
| n8n Dynasty Pack 6 (SuiteDash↔AiTable) | `wVHfY1yDdx8dCijA` | Inactive — needs AiTable credentials |
| n8n Dynasty Master Event Router | `hQCnCyoEBAHz1wyy` | Inactive — central routing hub |
| TEMP: VM Shell Access | `NJ7u9oSWPqw9GhBV` | Inactive — delete this, it's a security risk |
| `/api/reset-code` endpoint | Not built | Access code recovery flow for portal |
| Google Business Profile | Not created | Missing local SEO entirely |
| Google Search Console | Not confirmed | Site may not be indexed or verified |
| SuiteDash custom fields | Probably not created | `portal_access_code`, `entity_name`, `crop_plan`, `crop_since`, `referral_code` must exist in SuiteDash for portal to work |
| Documentero template | Unknown | `8iz9Mjhkhpy0ArBv` fires but Documentero template ID may not be set |
| Legal templates in portal | Fake downloads | Portal `Legal Templates` tab shows "Downloaded" but serves nothing — `.docx` files exist in `/legal/` but not wired up |

### 1.4 SEO Audit

| Page | Word Count | Internal Cross-Links | Schema Types | Missing |
|------|-----------|---------------------|-------------|---------|
| Homepage | ~1,800 | — | LocalBusiness (basic) | FAQPage schema, LegalService type, OG tags |
| Annual report guide | ~624 | ✅ Has some | Article (bare) | FAQPage, BreadcrumbList, Person author, HowTo |
| CROP explainer | ~735 | ✅ Has some | Article (bare) | FAQPage, BreadcrumbList, Person author |
| 2027 deadline | ~504 | ✅ Has some | Article (bare) | FAQPage, BreadcrumbList, Person author |
| CROP vs agent | ~529 | ✅ Has some | Article (bare) | FAQPage, BreadcrumbList, Person author |
| How to change | ~467 | ✅ Has some | Article (bare) | HowTo schema (numbered steps exist!), BreadcrumbList, Person author |
| Compliance check | ~800 | Partial | WebPage only | Quiz/Assessment schema |
| Portal | noindex | — | None | noindex correct |

**Critical findings:**
- All articles are 500-735 words. Authority site standard is 1,500+ minimum, 3,000+ for pillar guides.
- No FAQPage schema anywhere — this is the single highest-ROI SEO fix (expands SERP footprint for free).
- HowTo schema missing from the how-to-change article — numbered steps are already written, just need the JSON-LD.
- All articles use `"@type": "Organization"` for author — should be `"@type": "Person"` with credentials.
- No Open Graph meta tags on any page — blank preview when shared on LinkedIn/Facebook/Twitter.
- `sitemap.xml` is static, missing: `/portal`, `/compliance-check` already there, missing new articles to be added.
- `robots.txt` allows all — correct, but should explicitly disallow `/api/`.
- Cross-links between articles exist in footer Related section but NOT in body text — no contextual internal linking.

### 1.5 Infrastructure Gaps

| Gap | Risk Level | Notes |
|-----|-----------|-------|
| E&O insurance | 🔴 Critical | Referenced in risk doc as existential. Must have before first client. $600-1,000/year. |
| SuiteDash custom fields not verified | 🔴 Critical | Portal reads `portal_access_code`, `entity_name`, `crop_plan`, `crop_since`, `referral_code` — if these don't exist in SuiteDash, login fails silently |
| AiTable credentials missing | 🟡 Medium | Onboarding tries to log to AiTable but `AITABLE_API_KEY` / `AITABLE_CLIENTS_SHEET` likely not set in n8n env |
| Documentero template ID | 🟡 Medium | Service agreement workflow fires but template ID needed |
| Business bank account | 🟡 Medium | Per risk doc, needed before Stripe payouts |
| EIN | 🟡 Medium | Per memory — PA LLC DOS #0015295203 filed, pending. EIN needed for bank account |
| Google Business Profile | 🟡 Medium | Missing "near me" and map pack search results |
| Google Search Console | 🟡 Medium | Cannot confirm indexing without it |
| CROP $70 filing fee | 🟡 Medium | Per memory notes — CROP mail filing with PA DOS pending |
| Dedicated business phone routed | 🟢 Low | 814-480-0989 is set up per memory |

---

## 2. Complete Build Plan

### PHASE 1 — Fix What's Broken
**Priority: CRITICAL — do before anything else**  
**Estimated effort: 3 hours**

#### 1A. Fix Stripe Products and Buy Links

**Problem:** Homepage shows 4-tier pricing but Stripe has old 3 products. Every buy button charges the wrong amount.

**Actions:**
1. In Stripe dashboard (`dashboard.stripe.com`), create 4 new products:
   - Compliance Only — $99/year — note the payment link
   - Business Starter — $199/year — note the payment link
   - Business Pro — $349/year — note the payment link
   - Business Empire — $699/year — note the payment link
2. Update `public/index.html` — replace the 4 `buy.stripe.com` hrefs with new payment link URLs
3. Update n8n `Extract Customer` node in workflow `OkjdJx2bRqlgl1s7` to use correct tier thresholds:
   ```javascript
   let tier = 'Compliance Only';
   if (amountPaid >= 600) tier = 'Business Empire';
   else if (amountPaid >= 300) tier = 'Business Pro';
   else if (amountPaid >= 150) tier = 'Business Starter';
   ```
4. Update Stripe webhook to point to correct n8n endpoint — verify in Stripe dashboard that `we_1TDFTiLeZEBBH8L729KugfTx` still points to n8n
5. Push `index.html` changes via GitHub API → Vercel auto-deploys

**Files changed:** `public/index.html`

---

#### 1B. Fix Portal Access Code — End-to-End Flow

**Problem:** Client pays → SuiteDash contact created → portal access code never generated or sent → client has no way to log in.

**Actions:**

**Step 1: Create SuiteDash Custom Fields** (manual in SuiteDash UI)
Go to SuiteDash → Settings → Custom Fields → Contacts. Create these fields if they don't exist:
- `portal_access_code` (text)
- `entity_name` (text)
- `crop_plan` (text)
- `crop_since` (date)
- `referral_code` (text)

**Step 2: Update n8n Onboarding Workflow** (`OkjdJx2bRqlgl1s7`)

After `Create SuiteDash Contact` node, add 3 new nodes:

**Node A: Generate Access Code + Referral Code**
```javascript
// Type: Code node
const email = $('Extract Customer').first().json.email;
const contactId = $input.first().json.data?.id || $input.first().json.id || '';
const local = email.split('@')[0].replace(/[^a-z0-9]/gi,'').toUpperCase();
const accessCode = 'CROP' + local.slice(-4) + Math.floor(1000 + Math.random() * 9000);
const refCode = 'CROP-' + String(contactId).slice(-6).toUpperCase();
const tier = $('Extract Customer').first().json.tier;
const signupDate = new Date().toISOString().split('T')[0];

return [{json: {
  ...($('Extract Customer').first().json),
  contactId,
  portal_access_code: accessCode,
  referral_code: refCode,
  crop_plan: tier.toLowerCase().replace(' ','_'),
  crop_since: signupDate
}}];
```

**Node B: Write Custom Fields to SuiteDash** (HTTP Request)
- Method: PUT
- URL: `https://app.suitedash.com/secure-api/contacts/{{$json.contactId}}`
- Headers: `X-Public-ID` + `X-Secret-Key` (use credential `5Ctj3H0g6upsTMgw`)
- Body (JSON):
```json
{
  "custom_fields": {
    "portal_access_code": "{{$json.portal_access_code}}",
    "referral_code": "{{$json.referral_code}}",
    "crop_plan": "{{$json.crop_plan}}",
    "crop_since": "{{$json.crop_since}}"
  },
  "tags": ["{{$json.crop_plan}}", "crop-active"]
}
```

**Node C: Send Portal Access Email** (Email Send via Emailit SMTP `qwwVH3KJASNbk93F`)
- Subject: `Your PA CROP Services client portal is ready`
- HTML body:
```html
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#0f1e3d">Your client portal is ready</h2>
  <p>Hi {{$json.firstName}},</p>
  <p>Your PA CROP Services client portal is now active. Use these credentials to log in:</p>
  <div style="background:#faf8f3;border:1px solid #d4cfc0;border-radius:8px;padding:20px;margin:20px 0">
    <p><strong>Portal URL:</strong> <a href="https://pacropservices.com/portal">pacropservices.com/portal</a></p>
    <p><strong>Email:</strong> {{$json.email}}</p>
    <p><strong>Access Code:</strong> <code style="font-size:18px;color:#c9a227">{{$json.portal_access_code}}</code></p>
  </div>
  <p>Your portal gives you access to: compliance timeline, legal templates, business credit guidance, entity formation, and our AI compliance assistant.</p>
  <p>Questions? Reply to this email or call 814-480-0989.</p>
  <p>— PA CROP Services Team</p>
</div>
```

**Connect nodes:** `Create SuiteDash Contact` → `Generate Access Code` → `Write to SuiteDash` → `Send Portal Access Email` → (existing) `Log to AiTable`

**Step 3: Update welcome.html**  
Add a section after the timeline with:
- "Check your email for your portal access code"
- Direct link to `pacropservices.com/portal`
- The access code format: "It looks like CROP + 4 letters + 4 numbers"

**Files changed:** `public/welcome.html`, n8n workflow `OkjdJx2bRqlgl1s7` (via n8n API)

---

#### 1C. Build `/api/reset-code` Serverless Function

**Problem:** Clients who lose their access code have no self-service recovery path.

**File to create:** `api/reset-code.js`

```javascript
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const cleanEmail = email.toLowerCase().trim();
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  // Rate limit: only allow once per 15 minutes per email
  // (implement via in-memory cache or Vercel KV if needed — for now, just allow)

  try {
    const sdRes = await fetch(
      `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(cleanEmail)}&limit=1`,
      { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET } }
    );
    const sdData = await sdRes.json();
    const contact = (sdData?.data || []).find(c => (c.email||'').toLowerCase() === cleanEmail);

    // Always return success to prevent email enumeration
    if (contact) {
      const code = contact.custom_fields?.portal_access_code;
      if (code) {
        // Trigger n8n webhook to send the code via email
        await fetch('https://n8n.audreysplace.place/webhook/crop-portal-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, code, firstName: contact.first_name || '' })
        }).catch(() => {}); // Fire and forget
      }
    }
    return res.status(200).json({ success: true, message: 'If this email is in our system, you will receive your access code shortly.' });
  } catch(err) {
    return res.status(500).json({ error: 'Internal error. Please call 814-480-0989.' });
  }
}
```

Also update `public/portal.html` login screen to add "Forgot access code?" link below the login button that calls this endpoint.

**Files to create/change:** `api/reset-code.js`, `public/portal.html`

---

#### 1D. Fix Mobile Navigation

**Problem:** `nav ul {display:none}` on mobile means zero navigation on phones (~60% of traffic).

**Solution:** Replace the dead `nav ul` with a responsive nav. Add hamburger button that toggles a mobile menu.

In `public/index.html`, update the `@media(max-width:768px)` CSS block and nav HTML:

```css
/* Add to existing styles */
.hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none}
.hamburger span{display:block;width:22px;height:2px;background:var(--dark);border-radius:2px;transition:.2s}
.mobile-menu{display:none;position:fixed;top:57px;left:0;right:0;background:#fff;border-bottom:1px solid #eee;padding:16px 24px;z-index:99;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.mobile-menu.open{display:block}
.mobile-menu a{display:block;padding:12px 0;font-size:16px;color:var(--dark);border-bottom:1px solid #f0f0f0;font-weight:500}
.mobile-menu a:last-child{border-bottom:none}
@media(max-width:768px){
  nav ul{display:none}
  .hamburger{display:flex}
  .partner-grid{grid-template-columns:1fr}
  .pricing-grid{grid-template-columns:1fr}
  .trust-stats{gap:24px}
}
```

Add to nav HTML (after the `ul`):
```html
<button class="hamburger" onclick="toggleMobileMenu()" aria-label="Menu">
  <span></span><span></span><span></span>
</button>
<div class="mobile-menu" id="mobile-menu">
  <a href="#features" onclick="closeMobileMenu()">Features</a>
  <a href="#pricing" onclick="closeMobileMenu()">Pricing</a>
  <a href="#partners" onclick="closeMobileMenu()">Partners</a>
  <a href="#faq" onclick="closeMobileMenu()">FAQ</a>
  <a href="/portal" onclick="closeMobileMenu()">Client Login</a>
  <a href="#pricing" onclick="closeMobileMenu()" style="color:var(--accent);font-weight:600">Get started →</a>
</div>
```

Add JS before `</body>`:
```javascript
function toggleMobileMenu(){document.getElementById('mobile-menu').classList.toggle('open')}
function closeMobileMenu(){document.getElementById('mobile-menu').classList.remove('open')}
```

**Files changed:** `public/index.html`

---

#### 1E. Delete Temp Security Risk Workflow

**Problem:** `NJ7u9oSWPqw9GhBV` (TEMP: VM Shell Access) is an active n8n workflow that accepts arbitrary shell commands via webhook. It was created during debugging and is now a live remote code execution endpoint.

**Action:** DELETE this workflow via n8n API:
```
DELETE https://n8n.audreysplace.place/api/v1/workflows/NJ7u9oSWPqw9GhBV
```

---

### PHASE 2 — SEO Foundation
**Priority: HIGH — do immediately after Phase 1**  
**Estimated effort: 3 hours**

#### 2A. Open Graph / Social Preview Tags on All Pages

**Problem:** Zero OG tags anywhere. When the site is shared on LinkedIn, Facebook, or Twitter/X, it shows a blank card. This kills partner outreach effectiveness.

**Add to `<head>` on ALL public pages:**
```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="PA CROP Services">
<meta property="og:title" content="[PAGE TITLE]">
<meta property="og:description" content="[META DESCRIPTION]">
<meta property="og:image" content="https://pacropservices.com/og-image.jpg">
<meta property="og:url" content="[CANONICAL URL]">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[PAGE TITLE]">
<meta name="twitter:description" content="[META DESCRIPTION]">
<meta name="twitter:image" content="https://pacropservices.com/og-image.jpg">
```

**Also create:** `public/og-image.jpg` — a 1200×630px branded image. Can be a simple HTML/CSS design with the PA CROP logo, tagline, and a navy background. Generate as a static file.

**Files changed:** `public/index.html`, all 5 SEO articles, `public/compliance-check.html`

---

#### 2B. FAQPage Schema on Homepage

**Problem:** 7 FAQs exist on homepage with zero schema. FAQPage JSON-LD makes them appear as expandable answers directly in Google search results, dramatically increasing SERP real estate.

**Add to `public/index.html` before `</head>`** (alongside existing LocalBusiness schema):
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a CROP?",
      "acceptedAnswer": {"@type": "Answer", "text": "A Commercial Registered Office Provider (CROP) is a Pennsylvania-specific service. Every PA business entity must have a registered office address on file with the Department of State. A CROP provides that address on your behalf, receiving legal and government documents so you don't have to use your home or personal address."}
    },
    {
      "@type": "Question",
      "name": "Is a CROP the same as a registered agent?",
      "acceptedAnswer": {"@type": "Answer", "text": "Functionally, yes. Most states use the term 'registered agent.' Pennsylvania uses 'registered office' and 'Commercial Registered Office Provider.' The service is the same: a reliable address where the state and courts can deliver official documents to your business."}
    },
    {
      "@type": "Question",
      "name": "What happens if I don't have a CROP?",
      "acceptedAnswer": {"@type": "Answer", "text": "Every PA business entity must have either its own physical registered office address or a CROP. Without one, you risk missing service of process, government notices, and starting in 2027, annual report reminders that could save your business from dissolution."}
    },
    {
      "@type": "Question",
      "name": "What is the PA annual report requirement?",
      "acceptedAnswer": {"@type": "Answer", "text": "Starting in 2025, all PA business entities must file an annual report with the Department of State. The fee is $7 for for-profit entities. Starting in 2027, failure to file will result in administrative dissolution of your business registration."}
    },
    {
      "@type": "Question",
      "name": "How quickly do you forward documents?",
      "acceptedAnswer": {"@type": "Answer", "text": "We scan documents the same day they are received and upload them to your secure portal. You get an immediate email notification with a direct link to view the document."}
    },
    {
      "@type": "Question",
      "name": "Can I switch from another CROP to you?",
      "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. You file a Change of Registered Office form with the PA Department of State (online at file.dos.pa.gov, $5 fee). We provide pre-populated forms and step-by-step instructions to make the switch seamless."}
    },
    {
      "@type": "Question",
      "name": "Do you file my annual report for me?",
      "acceptedAnswer": {"@type": "Answer", "text": "Business Pro and Empire tier clients get annual report filing included. All tiers receive automated deadline reminders at 90, 60, 30, 14, and 7 days before your due date."}
    }
  ]
}
```

**Files changed:** `public/index.html`

---

#### 2C. Upgrade LocalBusiness Schema on Homepage

**Problem:** Current schema uses `LocalBusiness` type with minimal fields. Should use `LegalService` type and include full business details for richer Google Knowledge Panel.

**Replace existing LocalBusiness JSON-LD with:**
```json
{
  "@context": "https://schema.org",
  "@type": ["LegalService", "LocalBusiness"],
  "name": "PA CROP Services",
  "legalName": "PA Registered Office Services, LLC",
  "description": "Licensed Pennsylvania Commercial Registered Office Provider (CROP). Registered office address, compliance monitoring, and annual report filing services for PA businesses.",
  "url": "https://pacropservices.com",
  "telephone": "+18144800989",
  "email": "hello@pacropservices.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "924 W 23rd St",
    "addressLocality": "Erie",
    "addressRegion": "PA",
    "postalCode": "16502",
    "addressCountry": "US"
  },
  "geo": {"@type": "GeoCoordinates", "latitude": 42.0987, "longitude": -80.0851},
  "areaServed": {"@type": "State", "name": "Pennsylvania"},
  "priceRange": "$99-$699/year",
  "openingHours": "Mo-Fr 09:00-17:00",
  "knowsAbout": ["Commercial Registered Office Provider", "PA annual report filing", "Pennsylvania LLC compliance", "Pennsylvania registered office", "business entity compliance"],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "CROP Service Plans",
    "itemListElement": [
      {"@type": "Offer", "name": "Compliance Only", "price": "99", "priceCurrency": "USD", "description": "PA registered office, mail forwarding, compliance monitoring"},
      {"@type": "Offer", "name": "Business Starter", "price": "199", "priceCurrency": "USD", "description": "Compliance plus domain, email, and website hosting"},
      {"@type": "Offer", "name": "Business Pro", "price": "349", "priceCurrency": "USD", "description": "Starter plus annual report filing and premium support"},
      {"@type": "Offer", "name": "Business Empire", "price": "699", "priceCurrency": "USD", "description": "Pro plus VPS hosting and multi-entity management"}
    ]
  },
  "founder": {
    "@type": "Person",
    "name": "Ikechukwu P.N. Ohu, PhD",
    "jobTitle": "Founder & President",
    "hasCredential": ["Pennsylvania Notary Public", "IRS Enrolled Agent", "PhD Engineering Science"]
  },
  "sameAs": ["https://www.facebook.com/pacropservices"]
}
```

**Files changed:** `public/index.html`

---

#### 2D. Author E-A-T on All 5 SEO Articles

**Problem:** All articles use `"@type": "Organization"` for author. Google's E-A-T framework for legal/compliance topics explicitly rewards named human experts with credentials. One missed service of process could produce a judgment — readers need to trust the author knows compliance.

**For each of the 5 articles, update the Article JSON-LD to:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[ARTICLE TITLE]",
  "datePublished": "2026-03-20",
  "dateModified": "2026-03-21",
  "author": {
    "@type": "Person",
    "name": "Ikechukwu P.N. Ohu, PhD",
    "description": "Full Professor of Industrial & Robotics Engineering, PA Notary Public, IRS Enrolled Agent (in progress). Founder of PA CROP Services.",
    "url": "https://pacropservices.com/about",
    "sameAs": "https://www.linkedin.com/in/[IKE-LINKEDIN-SLUG]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PA CROP Services",
    "logo": {"@type": "ImageObject", "url": "https://pacropservices.com/og-image.jpg"},
    "url": "https://pacropservices.com"
  },
  "mainEntityOfPage": {"@type": "WebPage", "@id": "[CANONICAL URL]"},
  "image": "https://pacropservices.com/og-image.jpg"
}
```

**Also add visible author byline** to each article's `article-meta` div:
```html
<div class="article-meta">
  <span>By <strong>Ikechukwu P.N. Ohu, PhD</strong> · PA Notary Public · IRS Enrolled Agent</span>
  &nbsp;·&nbsp;
  <span>Updated March 2026</span>
</div>
```

**Note:** Replace `[IKE-LINKEDIN-SLUG]` with actual LinkedIn URL before pushing.

**Files changed:** All 5 SEO article HTML files

---

#### 2E. HowTo Schema on Change-of-Office Article

**Problem:** `/how-to-change-registered-office-pennsylvania.html` already has numbered steps written. `HowTo` schema wraps those steps and generates a visual step-by-step rich snippet in Google — extremely rare in this niche.

**Add alongside Article schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Change Your Registered Office in Pennsylvania",
  "description": "Step-by-step guide to changing your registered office address with the PA Department of State, including CROP transfers.",
  "totalTime": "PT30M",
  "step": [
    {"@type": "HowToStep", "position": 1, "name": "Choose your new registered office or CROP", "text": "Decide whether to use a new physical address or a Commercial Registered Office Provider. A CROP protects your home address and ensures someone is always available to accept legal documents."},
    {"@type": "HowToStep", "position": 2, "name": "File a Change of Registered Office form with PA DOS", "text": "Log into the PA Business Filing Services portal at file.dos.pa.gov. Select your entity, navigate to 'Change of Registered Office,' and enter the new address. The filing fee is $5."},
    {"@type": "HowToStep", "position": 3, "name": "Get confirmation from PA DOS", "text": "The Department of State will confirm the change within 7-10 business days. You'll receive a stamped copy by mail or email."},
    {"@type": "HowToStep", "position": 4, "name": "Update your records and notify stakeholders", "text": "Update your registered address with your bank, IRS, vendors, and any contracts or agreements that reference the old address."},
    {"@type": "HowToStep", "position": 5, "name": "Confirm your compliance calendar", "text": "Annual reports go to your registered office address. Ensure your new CROP is aware of your annual report deadlines."}
  ]
}
```

**Files changed:** `public/how-to-change-registered-office-pennsylvania.html`

---

#### 2F. BreadcrumbList Schema on All Inner Pages

**Add to each article page** (after other JSON-LD scripts):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://pacropservices.com"},
    {"@type": "ListItem", "position": 2, "name": "[ARTICLE TITLE]", "item": "[CANONICAL URL]"}
  ]
}
```

Also add a visible breadcrumb nav bar to each article, before the `<article>` tag:
```html
<div class="breadcrumb" style="max-width:780px;margin:16px auto;padding:0 24px;font-size:13px;color:#6B7280">
  <a href="/" style="color:#534AB7">PA CROP Services</a> › [Article Short Title]
</div>
```

**Files changed:** All 5 SEO articles, `public/compliance-check.html`

---

#### 2G. Update robots.txt

**Problem:** `robots.txt` allows all including `/api/`. The auth endpoint should not be indexed.

**New content:**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /portal
Sitemap: https://pacropservices.com/sitemap.xml
```

Note: `/portal` is already `noindex` via meta tag, but robots.txt disallow adds a second layer.

**Files changed:** `public/robots.txt`

---

#### 2H. Update sitemap.xml

**Problem:** Sitemap is static and stale. Missing `compliance-check`, doesn't have real `lastmod` dates. Has `changefreq` but no priorities calibrated to authority.

**New `sitemap.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://pacropservices.com/</loc><lastmod>2026-03-21</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://pacropservices.com/what-is-a-pennsylvania-crop</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://pacropservices.com/pa-annual-report-requirement-guide</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://pacropservices.com/pa-2027-dissolution-deadline</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://pacropservices.com/how-to-change-registered-office-pennsylvania</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://pacropservices.com/crop-vs-registered-agent-pennsylvania</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://pacropservices.com/compliance-check</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <!-- New articles (Phase 3) — add when published: -->
  <!-- <url><loc>https://pacropservices.com/pennsylvania-llc-registered-office-requirements</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url> -->
  <!-- <url><loc>https://pacropservices.com/how-to-file-pa-annual-report-2026</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url> -->
  <!-- <url><loc>https://pacropservices.com/reinstate-dissolved-pennsylvania-llc</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url> -->
  <!-- <url><loc>https://pacropservices.com/pennsylvania-foreign-entity-annual-report</loc><lastmod>2026-03-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url> -->
</urlset>
```

**Files changed:** `public/sitemap.xml`

---

### PHASE 3 — Content Expansion
**Priority: HIGH**  
**Estimated effort: 6 hours**

All existing articles are 467–735 words. Authority site standard is 1,500+ minimum. All need expansion. Four new articles need to be created.

#### 3A. Expand All 5 Existing Articles to 1,500+ Words

Each article needs:
- A "Frequently Asked Questions" section at the bottom (3-5 Q&As, also enables per-article FAQPage schema)
- A visible "Last Updated: March 2026" date line in the `article-meta` div
- One additional substantive section (see per-article notes below)
- At least 2 contextual in-body links to other PA CROP articles (not just footer links)

**Annual Report Guide** (`pa-annual-report-requirement-guide.html`) — add:
- Table: Annual report deadlines by entity type (LLC vs Corp vs LP etc.)
- Section: "What the PA DOS sends you vs what your CROP handles"
- Section: "Consequences of missing the 2026 deadline"
- Add HowTo schema for the filing steps

**CROP Explainer** (`what-is-a-pennsylvania-crop.html`) — add:
- Section: "CROP vs PO Box: why the difference matters for courts"
- Section: "How to verify a CROP is licensed with PA DOS"
- Section: "What to look for in a CROP provider"

**2027 Deadline** (`pa-2027-dissolution-deadline.html`) — add:
- Section: "Foreign entity catastrophic rule — cannot reinstate, must re-register"
- Section: "Timeline: what happens after dissolution is issued"
- Table: Impact by entity type

**CROP vs Agent** (`crop-vs-registered-agent-pennsylvania.html`) — add:
- Section: "Cost comparison: national registered agents vs PA CROP"
- Section: "What national RAs don't tell you about PA specifically"
- Comparison table with specific feature columns

**How to Change** (`how-to-change-registered-office-pennsylvania.html`) — add:
- Section: "How to transfer from a national RA to a PA CROP"
- Section: "What happens to your mail during the transition"
- Section: "How long does the PA DOS change take?"

---

#### 3B. Four New High-Value Articles

**Article 1: Pennsylvania LLC Registered Office Requirements**
- File: `public/pennsylvania-llc-registered-office-requirements.html`
- Target keyword: "Pennsylvania LLC registered office" (transactional intent)
- Length: 1,800 words
- Sections: Legal requirement under 15 Pa. C.S. § 8825, what qualifies as a registered office, using a personal address (risks), using a CROP (how it works), changing your registered office, FAQ
- Schema: Article + FAQPage + BreadcrumbList + Person author
- Internal links: → CROP explainer, → how-to-change, → homepage pricing

**Article 2: How to File Your PA Annual Report Step by Step 2026**
- File: `public/how-to-file-pa-annual-report-2026.html`
- Target keyword: "how to file Pennsylvania annual report" (how-to intent)
- Length: 2,000 words
- Sections: What you need before you start, step-by-step PA DOS portal instructions, what fields to complete, $7 fee payment, what to do if your information is wrong, what CROP clients get automatically
- Schema: Article + HowTo (numbered steps) + FAQPage + BreadcrumbList + Person author
- Internal links: → annual report guide, → 2027 deadline, → homepage

**Article 3: How to Reinstate a Dissolved Pennsylvania LLC**
- File: `public/reinstate-dissolved-pennsylvania-llc.html`
- Target keyword: "reinstate dissolved Pennsylvania LLC" (urgency-driven)
- Length: 1,600 words
- Sections: What "administrative dissolution" means, can you still operate? (no), reinstatement process ($70 + $7 annual report), required documents, timeline, the 2027 catastrophic foreign entity rule, how to avoid dissolution with a CROP
- Schema: Article + FAQPage + BreadcrumbList + Person author
- Internal links: → 2027 deadline, → annual report guide, → homepage pricing

**Article 4: Pennsylvania Foreign Entity Registration and Compliance**
- File: `public/pennsylvania-foreign-entity-annual-report.html`
- Target keyword: "Pennsylvania foreign entity annual report" (underserved niche)
- Length: 1,800 words
- Sections: What is a foreign entity in PA, certificate of authority requirements, annual report requirements for foreign entities, the 2027 catastrophic rule (foreign entities CANNOT reinstate — must re-register under new name), why a CROP is critical for foreign entities, step-by-step compliance checklist
- Schema: Article + FAQPage + BreadcrumbList + Person author
- Internal links: → 2027 deadline, → CROP explainer, → homepage

---

#### 3C. Update Sitemap After Articles Are Published

After the 4 new articles are published, uncomment their entries in `public/sitemap.xml`.

---

### PHASE 4 — Portal Depth
**Priority: MEDIUM**  
**Estimated effort: 4 hours**

#### 4A. Wire Real Document Downloads

**Problem:** The Legal Templates tab in the portal shows "✓ Downloaded" with a fake delay. The actual `.docx` files exist in `/legal/` in the repo but aren't served publicly.

**Actions:**
1. Move the 3 most relevant `.docx` files to `public/downloads/`:
   - `legal/PA-CROP-Service-Agreement.docx` → `public/downloads/pa-crop-service-agreement.docx`
   - `legal/PA-CROP-Operating-Agreement.docx` → `public/downloads/pa-crop-operating-agreement.docx`  
   - `legal/CROP-03-Filing-Guide.docx` → `public/downloads/pa-crop-filing-guide.docx`
2. Create 4 additional template HTML files (Operating Agreement, Annual Meeting Resolution, Change of Office Form, NDA) as downloadable HTML → PDF or plain text files
3. Update `portal.html` `fakeDownload()` function to use real href links:
```javascript
function fakeDownload(btn, avail, filename) {
  if (!avail) { alert('Upgrade to unlock.'); return; }
  const a = document.createElement('a');
  a.href = '/downloads/' + filename;
  a.download = filename;
  a.click();
}
```
4. Update templates array in `buildTemplates()` to include filenames

**Files changed:** `public/portal.html`, add files to `public/downloads/`

---

#### 4B. Entity Formation → n8n Lead Flow

**Problem:** "Start Filing" buttons in New Entity tab show `alert()` dialogs.

**Solution:** Replace alerts with a modal form that fires an n8n webhook:

In `portal.html`, replace alert-based buttons with a proper modal:
```html
<!-- Entity Formation Modal -->
<div id="entity-modal" class="hidden" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:12px;padding:40px;width:480px;max-width:95vw">
    <h3 style="font-family:'Playfair Display',serif;margin-bottom:20px" id="entity-modal-title">Form a Pennsylvania LLC</h3>
    <div class="form-group"><label>Business Name</label><input type="text" id="entity-name" placeholder="Acme Holdings LLC"></div>
    <div class="form-group"><label>Your Email</label><input type="email" id="entity-email" value=""></div>
    <div class="form-group"><label>Phone Number</label><input type="tel" id="entity-phone" placeholder="814-555-0100"></div>
    <div class="form-group"><label>Notes (optional)</label><textarea id="entity-notes" rows="3" placeholder="Any specifics about the entity..."></textarea></div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn-gold" onclick="submitEntityForm()">Submit Request</button>
      <button class="btn-sm" onclick="document.getElementById('entity-modal').classList.add('hidden')">Cancel</button>
    </div>
  </div>
</div>
```

Add `submitEntityForm()` JS that POSTs to a new `/api/entity-request` endpoint which fires an n8n webhook to create a SuiteDash project for Ike to follow up.

**Files changed:** `public/portal.html`, create `api/entity-request.js`

---

#### 4C. Portal — Access Code Recovery Button

**Problem:** No self-service path for clients who lose their access code.

**Add below login button in `portal.html`:**
```html
<div style="text-align:center;margin-top:12px">
  <a onclick="resetCode()" style="font-size:12px;color:var(--muted);cursor:pointer">Forgot access code?</a>
</div>
```

Add `resetCode()` function:
```javascript
async function resetCode() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { alert('Enter your email address first.'); return; }
  const btn = event.target;
  btn.textContent = 'Sending...';
  await fetch('/api/reset-code', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email})
  });
  btn.textContent = 'Check your email';
}
```

**Files changed:** `public/portal.html`, `api/reset-code.js` (from Phase 1C)

---

#### 4D. About Page

**Problem:** No `/about` page exists. The author schema references `pacropservices.com/about` but the page 404s. Also, Google Business Profile and E-A-T signals need an authoritative about page.

**Create `public/about.html`** with:
- Ikechukwu's bio, PhD, Gannon professorship, PA Notary, Enrolled Agent credentials
- Photo (or placeholder)
- Dynasty Empire / PA Registered Office Services, LLC entity info
- 924 W 23rd St Erie PA address
- The "why we built this" story around the 2027 dissolution deadline
- Schema: `Person` + `AboutPage`

**Files to create:** `public/about.html`  
**Update:** `sitemap.xml`, homepage footer (add About link), all article author bylines (link to `/about`)

---

### PHASE 5 — CPA/Attorney Partner Program
**Priority: HIGH — identified as #1 revenue channel ($74K ARR from 10 firms)**  
**Estimated effort: 4 hours**

#### 5A. Partner Landing Page (`/partners`)

**Create `public/partners.html`** — dedicated page (not just the homepage section):

Content sections:
1. Hero: "Add PA CROP services to your practice — zero operational burden"
2. Revenue calculator widget: "10 clients × $99 = $990/yr passive income"
3. White-label explanation: their logo, their pricing, their clients — we handle everything
4. What we handle: document scanning, notifications, compliance monitoring, DOS liaison
5. What you do: refer clients, earn per referral or per managed account
6. Partner onboarding process: 3 steps, 3 days
7. Application form (name, firm, email, phone, approximate client count)
8. Schema: `ProfessionalService` + `Offer`

Application form submits to `/api/partner-apply` which fires an n8n webhook → SuiteDash lead + email to Ike.

**Files to create:** `public/partners.html`, `api/partner-apply.js`  
**Update:** Homepage "Become a partner →" button → point to `/partners` instead of `mailto:`

---

#### 5B. Partner Onboarding Email Sequence in n8n

Create new n8n workflow: **CROP — Partner Onboarding Sequence**

Triggered by partner application webhook. 5-email sequence via Emailit:

| Day | Email | Subject |
|-----|-------|---------|
| 0 | Application received | "We received your PA CROP partner application — here's what's next" |
| 1 | Partnership agreement | "Your PA CROP partnership agreement is ready to sign" (via Documentero) |
| 3 | White-label setup | "How to start referring clients to your white-label CROP service" |
| 7 | First client guide | "Onboarding your first CROP client — the complete guide" |
| 30 | Check-in | "How is your CROP partnership going? Let's optimize." |

---

#### 5C. Partner Portal Tab

In `portal.html`, add a "Partner" sidebar item visible only when `CLIENT.tier === 'Partner'` or SuiteDash tag includes `crop-partner`.

Tab content:
- Referred client count and credits earned
- Unique referral link generator
- White-label assets download (logo, one-pager, email templates)
- Commission tracking table

---

### PHASE 6 — Infrastructure and Compliance
**Priority: HIGH — business-level risks**  
**Estimated effort: Ongoing (some items require Ike action, not Claude)**

#### 6A. SuiteDash Custom Fields (Manual — Ike must do)

In SuiteDash → Settings → Custom Fields → Contacts, create these fields if they don't exist:

| Field Key | Type | Notes |
|-----------|------|-------|
| `portal_access_code` | Text | Generated at onboarding |
| `entity_name` | Text | PA entity name |
| `crop_plan` | Text | compliance_only / business_starter / business_pro / business_empire |
| `crop_since` | Date | Service start date |
| `referral_code` | Text | For referral tracking |

Until these exist, the portal login will fail for real clients even if the auth function runs correctly.

---

#### 6B. Google Search Console (Manual — Ike must do)

1. Go to `search.google.com/search-console`
2. Add property: `pacropservices.com`
3. Verify via HTML meta tag OR DNS TXT record
4. Submit sitemap: `https://pacropservices.com/sitemap.xml`
5. Monitor weekly: Coverage, Performance, Core Web Vitals

This is the only way to know if pages are indexed, what queries they rank for, and if there are crawl errors.

---

#### 6C. Google Business Profile (Manual — Ike must do)

1. Go to `business.google.com`
2. Create profile: PA CROP Services
3. Category: Registered Agent Services (or Notary Public as fallback)
4. Address: 924 W 23rd St, Erie, PA 16502
5. Phone: 814-480-0989
6. Website: pacropservices.com
7. Hours: Mon-Fri 9am-5pm

This captures "registered agent near me" searches and puts PA CROP in the Google Maps pack.

---

#### 6D. AiTable Credentials in n8n (Manual — Ike must do)

The onboarding workflow tries to log to AiTable but `AITABLE_API_KEY` and `AITABLE_CLIENTS_SHEET` are likely not set as n8n environment variables. Either:
- Set them in n8n → Settings → Environment Variables, OR
- Remove the AiTable node from the onboarding workflow to eliminate the error

---

#### 6E. Documentero Template ID (Manual — Ike must do)

Workflow `8iz9Mjhkhpy0ArBv` (Auto-Generate Service Agreement) fires but needs the Documentero template ID. Log into Documentero → find or create the PA CROP Service Agreement template → copy the template ID → set it in the workflow node.

---

#### 6F. E&O Insurance (Manual — Ike must do)

Per the risk document: this is existential. A missed service of process = default judgment = lawsuit against Ike personally. Required before the first paying client is accepted.

**Action:** Get quotes from:
- Hiscox (hiscox.com) — E&O for professional services, ~$600/year
- Next Insurance (nextinsurance.com) — instant quotes
- CNA (cna.com) — larger limits

Minimum: $1M per occurrence, $2M aggregate.

---

#### 6G. Business Bank Account (Manual — Ike must do)

Stripe payouts need a business bank account. Open business checking in the name of PA Registered Office Services, LLC using EIN (once received from IRS). Recommended: First National Bank of PA (local Erie) or Relay (online, small business friendly).

---

#### 6H. Clean Up n8n (Security + Hygiene)

Delete or deactivate:
- `NJ7u9oSWPqw9GhBV` — TEMP: VM Shell Access (SECURITY RISK — delete immediately)
- `UvjE2Z9kqUoYsnzV` — CROP - Portal Auth (superseded by `/api/auth` Vercel function — deactivate)
- `TaLThht57rOA4AUa` — Webhook Test Minimal (cleanup)

Activate when ready:
- `wRLXTGXW60MDLUnI` — Dynasty Pack 3: Renewal Sequence (once content is written)
- `hQCnCyoEBAHz1wyy` — Dynasty Master Event Router (once all workflows are stable)

---

### PHASE 7 — SEO Content Machine
**Priority: MEDIUM (ongoing)**  
**Estimated effort: Ongoing**

#### 7A. Topic Cluster Map

Three pillar pages, each supported by satellite articles. Implement as a content calendar.

**Pillar 1: PA Annual Report**
- Pillar: `/pa-annual-report-requirement-guide` (expand to 3,000 words)
- Satellite 1: `/how-to-file-pa-annual-report-2026` (Phase 3B)
- Satellite 2: `/pa-annual-report-fees-by-entity-type` (future)
- Satellite 3: `/what-happens-if-you-miss-pa-annual-report` (future)

**Pillar 2: PA Registered Office**
- Pillar: `/what-is-a-pennsylvania-crop` (expand to 3,000 words)
- Satellite 1: `/pennsylvania-llc-registered-office-requirements` (Phase 3B)
- Satellite 2: `/crop-vs-registered-agent-pennsylvania` (exists, expand)
- Satellite 3: `/how-to-change-registered-office-pennsylvania` (exists, expand)

**Pillar 3: PA Business Compliance**
- Pillar: `/pa-2027-dissolution-deadline` (expand to 3,000 words)
- Satellite 1: `/reinstate-dissolved-pennsylvania-llc` (Phase 3B)
- Satellite 2: `/pennsylvania-foreign-entity-annual-report` (Phase 3B)
- Satellite 3: `/pennsylvania-business-compliance-checklist` (future)

---

#### 7B. Content Freshness System

Monthly (can be a GitHub Actions cron or manual):
- Update `dateModified` in all Article schema to current month
- Update visible "Updated [Month Year]" in all article bylines
- Check all external links are still valid

---

#### 7C. Newsletter / Lead Magnet

**Currently:** No email capture on the homepage. The authoritysite repo mandates newsletter signup.

**Add to homepage** (above or below the urgency section):
```html
<section style="background:#f0f4ff;padding:48px 0;text-align:center">
  <div class="container" style="max-width:600px">
    <h2 style="font-family:'DM Serif Display',serif;font-size:28px;margin-bottom:8px">Free: PA 2027 Compliance Checklist</h2>
    <p style="color:#6B7280;margin-bottom:24px">15 things every PA business must do before 2027 to avoid dissolution. Sent instantly.</p>
    <form style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" onsubmit="subscribeNewsletter(event)">
      <input type="email" id="nl-email" placeholder="your@email.com" style="padding:12px 16px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;width:280px;outline:none">
      <button type="submit" class="btn-primary" style="width:auto;padding:12px 24px">Get the checklist →</button>
    </form>
  </div>
</section>
```

Newsletter submissions fire an n8n webhook → Acumbamail list `1267324` (All Clients).

---

### PHASE 8 — Dynasty State Replication
**Priority: STRATEGIC (future)**  
**Estimated effort: 2 hours per state**

#### 8A. The Pattern

PA CROP is the proof of concept for a replicable state-by-state model. Every state has:
- A registered agent/office requirement
- An annual report requirement with fees and deadlines
- Low competition for state-specific SERP terms
- Businesses who need the service

The technical stack is established: Vercel static site + `/api` serverless functions + SuiteDash + n8n + Stripe.

**Target states (in order of opportunity):**

| State | Service Name | Annual Report Deadline | Fee | Competition |
|-------|-------------|----------------------|-----|-------------|
| Ohio | Statutory Agent | Various by type | $99 | Low |
| New Jersey | Registered Agent | Annual (various) | $75 | Medium |
| Delaware | Registered Agent | March 1 (corps) | $50+ | High |
| New York | Registered Agent | Various | $9 | Medium |
| Maryland | Resident Agent | April 15 | $300 | Low |

**Replication process per state:**
1. Fork `pinohu/pa-crop-services` → `pinohu/[state]-crop-services`
2. Find/replace: "Pennsylvania" / "PA" / "924 W 23rd St Erie PA" / pricing / deadlines
3. New Vercel project → connect to new repo → new domain
4. New Stripe products for that state
5. Same SuiteDash instance (new tags: `oh-crop`, `nj-crop`, etc.)
6. Same n8n instance (duplicate workflows with new paths)
7. 5 new SEO articles targeting state-specific keywords

Each new state site takes ~2 hours to deploy from the PA template.

---

## 3. Implementation Sequence

```
WEEK 1 (Hours 1-8):
  Day 1: Phase 1A (Stripe fix) + Phase 1D (mobile nav) + Phase 1E (delete security risk)
  Day 2: Phase 1B (portal access code) + Phase 1C (/api/reset-code)
  Day 3: Phase 2A (OG tags) + Phase 2B (FAQPage schema) + Phase 2C (LocalBusiness schema)
  Day 4: Phase 2D (author E-A-T) + Phase 2E (HowTo schema) + Phase 2F (BreadcrumbList)
  Day 5: Phase 2G (robots.txt) + Phase 2H (sitemap) + Phase 6H (n8n cleanup)

WEEK 2 (Hours 9-20):
  Day 6-7: Phase 3A (expand 5 existing articles)
  Day 8-9: Phase 3B (write 4 new articles)
  Day 10: Phase 4A (real downloads) + Phase 4C (access code recovery UI) + Phase 4D (About page)

WEEK 3 (Hours 21-28):
  Day 11-12: Phase 5A (partners page) + Phase 5B (partner email sequence)
  Day 13: Phase 4B (entity formation modal) + Phase 5C (partner portal tab)
  Day 14: Phase 7C (newsletter/lead magnet) + connect Acumbamail

MANUAL (Ike must do — no specific week):
  Phase 6A: SuiteDash custom fields
  Phase 6B: Google Search Console
  Phase 6C: Google Business Profile
  Phase 6D: AiTable credentials in n8n
  Phase 6E: Documentero template ID
  Phase 6F: E&O insurance (DO BEFORE FIRST CLIENT)
  Phase 6G: Business bank account
```

---

## 4. How to Start Each Session

Every session working on this project:

1. **Check Flint outbox** (if VM is up):
   ```bash
   curl -H "Authorization: Bearer 1ed943c21ef9e2f60fe1189241a286d769e4191051ad2c0c035282722cb4b030" \
     https://claude-outbox.audreysplace.place/messages
   ```

2. **State which phase/task to execute** — this document is the source of truth

3. **GitHub token** for code pushes: `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`  
   *(Note: GitHub tokens expire. Regenerate at github.com/settings/tokens if expired.)*

4. **Vercel project:** `prj_MrCHRfSE1tdtaLy7Niwr7D4DlJ8c` | Team: `team_fuTLGjBMk3NAD32Bm5hA7wkr`

5. **n8n API key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzAyYjQzYS1lNjAyLTQ1NzgtOTgyYy1kNTI4YWVhMDY0ZDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMmEzMDU4Y2UtNTNmYS00MzRjLTg3NjEtNjU2ZGE3MmRiMzE4IiwiaWF0IjoxNzc0MDUwMTA1fQ.QZnjcP25xNNhJwABdyYhADGxmDGaQkb8OLoCLCvukHs
   ```

6. **SuiteDash env vars** are already set in Vercel. Do not re-add them.

7. **Push all code changes via GitHub API** — no local git, no SSH required:
   ```bash
   # Pattern for pushing a file:
   CONTENT=$(base64 -w0 /path/to/file)
   SHA=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
     "https://api.github.com/repos/pinohu/pa-crop-services/contents/path/to/file" | \
     python3 -c "import sys,json; print(json.load(sys.stdin).get('sha',''))")
   curl -s -X PUT \
     -H "Authorization: token $GITHUB_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"message\": \"commit message\", \"content\": \"$CONTENT\", \"sha\": \"$SHA\"}" \
     "https://api.github.com/repos/pinohu/pa-crop-services/contents/path/to/file"
   ```
   Vercel auto-deploys on every push. Allow 20-30 seconds for deployment.

---

## 5. Key Reference Data

| Item | Value |
|------|-------|
| Site | pacropservices.com |
| Repo | pinohu/pa-crop-services |
| Vercel project ID | prj_MrCHRfSE1tdtaLy7Niwr7D4DlJ8c |
| Vercel team ID | team_fuTLGjBMk3NAD32Bm5hA7wkr |
| n8n base URL | https://n8n.audreysplace.place |
| Stripe webhook ID | we_1TDFTiLeZEBBH8L729KugfTx |
| SuiteDash cred ID | 5Ctj3H0g6upsTMgw |
| Emailit SMTP cred ID | qwwVH3KJASNbk93F |
| Acumbamail list (All Clients) | 1267324 |
| Acumbamail list (CPA Partners) | 1267325 |
| n8n onboarding workflow | OkjdJx2bRqlgl1s7 |
| n8n reminders workflow | il9DOXSAK9hUo2Ru |
| n8n dunning workflow | xiOMdfSNEmWfqauo |
| n8n service agreement | 8iz9Mjhkhpy0ArBv |
| n8n DOS checker | pDcxjzAkdtyfpHU2 |
| n8n 20i provisioning | Ov3nTuiJKarlRvhS |
| Entity legal name | PA Registered Office Services, LLC |
| DOS file number | 0015295203 |
| EIN | 41-5024472 |
| Registered address | 924 W 23rd St, Erie, PA 16502 |
| Phone | 814-480-0989 |
| Email | hello@pacropservices.com |
| Partners email | partners@pacropservices.com |

---

*This document is the authoritative build plan for PA CROP Services. Update it as items are completed. Every session should check this document first.*
