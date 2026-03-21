# PA CROP Services — Improved Master Build Plan v2
**Supersedes:** `MASTER_BUILD_PLAN.md` (v1, March 21, 2026)  
**Version:** 2.0 — March 21, 2026  
**Audited against:** `pinohu/authoritysite`, `pinohu/dynasty-seomachine`, `pinohu/lead-os-hosted-runtime`, `pinohu/lead-os`

---

## Foreword: What the Repo Audit Revealed

The original plan was a solid execution checklist. The four reference repos expose a different picture: PA CROP is currently operating at **Layer 3 of 12** in the LeadOS architecture (lead capture only), writing content without the dynasty-seomachine pipeline, missing the Three-Visit Milestone Framework entirely, and lacking the trust engineering system that makes high-ticket compliance services convert.

This document supersedes v1. Every task from v1 is preserved and either carried forward, upgraded, or marked as superseded by a better approach.

---

## Part 1 — Critical Gaps Not in v1

These were absent from the original plan. They represent the biggest leverage points identified from the four repos.

---

### GAP-01: No Brand Voice Context (dynasty-seomachine)

**Problem:** The dynasty-seomachine requires `context/brand-voice.md`, `context/writing-examples.md`, `context/style-guide.md`, `context/internal-links-map.md`, and `context/target-keywords.md` BEFORE any content is written. All PA CROP content has been written without these context files. The result: generic AI-sounding prose that lacks a distinctive voice.

**What the repo says:** "The AI learns your voice and requirements from these files. Without them, AI output will match competitors instead of beating them."

**Fix:** Create the following context files for PA CROP in the dynasty-seomachine repo (and store copies in pa-crop-services repo under `context/`):

**`context/brand-voice.md` for PA CROP:**
```markdown
# PA CROP Services — Brand Voice

## Voice Pillars

### 1. Earned Authority (not claimed)
We are the ONLY licensed CROP in Erie County. The founder holds a PhD, PA Notary, and is an IRS Enrolled Agent.
Don't say "trusted" — show credentials. Don't say "experienced" — cite the specific qualification.
Example: "Licensed by the PA Department of State under 15 Pa. C.S. § 109."

### 2. Deadline Urgency (without panic)
The 2027 dissolution deadline is real. Foreign entities that miss it CANNOT reinstate.
Be direct about consequences. Never alarmist. Never vague.
Example: "Foreign entities that miss the 2027 deadline cannot reinstate — they must re-register under a new name."

### 3. Local-First (Erie, PA is our address, Pennsylvania is our jurisdiction)
We receive mail at 924 W 23rd St, Erie, PA. This is not a virtual address. We know PA DOS procedures.
Reference PA-specific details, Erie geography, and state statutes. National RAs don't know PA like we do.

### 4. Regulatory Precision
This is a legal/compliance service. Vague language erodes trust. Use statute numbers, exact deadlines, specific fees.
Example: "File DSCB:15-108 to change your registered office ($5 fee, processed in 7-10 business days)."

### 5. Zero-Pressure Conversion
CROP is not an emergency service — it's annual infrastructure. Never pressure. Lead with education.
CTAs: "Get protected" not "Act now." "View plans" not "Limited time offer."

## What to Never Write
- "Industry-leading" without citation
- "Trusted by thousands" (we don't have thousands yet)
- "Easy as 1-2-3" (compliance isn't trivial — respect the reader's intelligence)
- Any claim a national RA could also make
- Generic definitions as article openers ("What is a CROP? A CROP is...")

## Hook Types (from dynasty-seomachine)
Choose one per article:
- Provocative Question: "Does your PA LLC actually have a registered office — or just an address?"
- Specific Scenario: "In October 2026, a Philadelphia attorney called to serve a lawsuit on your business. Nobody answered."
- Surprising Statistic: "As of 2025, 3.8 million registered business entities in Pennsylvania must file annual reports — and most don't know it."
- Bold Statement: "Your home address on your PA LLC filing is a mistake."
- Counterintuitive Claim: "The cheapest registered agent option could cost your business its legal standing."
```

**`context/niche-config.md` for PA CROP** (add as a preset in dynasty-seomachine):
```markdown
### PA CROP Services (Compliance Services)
**Brand Name**: PA CROP Services
**Brand Tagline**: Pennsylvania's Registered Office, Handled
**Niche Label**: PA Business Compliance / CROP
**Professional Type**: Pennsylvania commercial registered office providers
**Consumer Pain Point**: discovering your PA business is at risk of dissolution or missing legal documents
**Service Category**: professional services / legal compliance
**Average Annual Value**: $199 (Starter) to $699 (Empire)
**Cost Range**: $99 - $699/year
**Urgency Level**: MEDIUM-HIGH (2027 deadline creates urgency; also service-of-process risk)
**Formality Level**: Formal, authoritative, precise
**Licensing Body**: PA Department of State, Bureau of Corporations
**Key Credentials**: Licensed CROP, PA Notary Public, PhD, IRS Enrolled Agent
**Buying Cycle**: 1-30 days (varies by trigger: new LLC formation = immediate; 2027 awareness = 1-4 weeks)
**Target Audience**: PA LLC owners, PA corporation officers, CPA firms, business attorneys, foreign entities registered in PA
**Site URL**: https://pacropservices.com
**Registered Address**: 924 W 23rd St, Erie, PA 16502
**Phone**: 814-480-0989
**Competitors**: Northwest Registered Agent, CT Corporation, Registered Agents Inc, ZenBusiness, Incfile
**Content Angles**: 2027 dissolution deadline, home address privacy, service of process risks, PA DOS compliance requirements
```

**Files to create:** `context/brand-voice.md`, `context/niche-config.md` entry, `context/writing-examples.md` (with 3 best current articles), `context/internal-links-map.md`, `context/target-keywords.md`, `context/style-guide.md`

---

### GAP-02: Content Written Without SERP Research (dynasty-seomachine)

**Problem:** Every article in the current PA CROP site was written without running the dynasty-seomachine `/article` command pipeline: SERP analysis → social research → article planning → section writing. The command explicitly says: "You MUST research before writing. No exceptions. This prevents the 'AI knows everything' trap that produces generic content matching competitors instead of beating them."

Current articles average 500-735 words. The dynasty-seomachine SEO guidelines mandate:
- Standard blog post: 2,000–2,500 words (target), 3,000 (max)
- Pillar guide: 3,000–4,000 words (target), 5,000 (max)
- How-to guide: 1,500–2,500 words (target)

Every existing article is at roughly 25-35% of its required length.

**Fix for all new articles:** Before writing, run through the `/article` pipeline:
1. WebSearch the target keyword — analyze top 5 results
2. Document: structure, word count, gaps, missing angles, outdated info
3. Build Competitor Gap Blueprint
4. Plan section-by-section
5. Write each section individually

**Fix for existing articles:** Use `/rewrite` command with the SERP blueprint approach. Priority order:
1. Annual report guide (624 words → 2,500 target)
2. CROP explainer (735 words → 3,000 target — pillar)
3. 2027 deadline (504 words → 2,500 target)
4. CROP vs agent (529 words → 2,000 target)
5. How to change (467 words → 1,800 target)

**Every article hook must follow the dynasty-seomachine rule:** Choose ONE hook type from: Provocative Question, Specific Scenario, Surprising Statistic, Bold Statement, Counterintuitive Claim. Never open with a definition.

---

### GAP-03: Three-Visit Milestone Framework Missing (lead-os-hosted-runtime)

**Problem:** The lead-os-hosted-runtime Three-Visit Milestone Framework states: "first touch creates identity, second touch creates trust, third touch creates momentum." PA CROP currently has NO second or third touch designed into the funnel.

Current funnel:
```
Homepage → Stripe → Welcome page → [silence]
```

Required funnel:
```
M1 (Identity):   Homepage → Compliance check → Email captured
M2 (Trust):      Day 2 email → Content asset → Portal demo
M3 (Momentum):   Day 7 → Consultation offer OR direct purchase
```

**Fix — redesign all three funnels:**

**Funnel A: New LLC Formation (Transactional)**
- M1: Person searches "Pennsylvania LLC registered office" → lands on article → clicks "Check if you're compliant" → compliance-check tool → email captured
- M2: Day 2 email — "Your PA registered office checklist" (the lead magnet) + link to portal demo
- M3: Day 7 email — "Your first year with PA CROP Services" + Starter plan offer ($99)

**Funnel B: 2027 Awareness (Urgency)**
- M1: Person searches "2027 PA dissolution deadline" → deadline article → "Is my business protected?" → compliance-check → email
- M2: Day 2 email — "What happens if you miss the 2027 deadline" (specific case scenarios)
- M3: Day 5 email — "636 days left. Here's exactly what to do." + Pro plan offer ($199+)

**Funnel C: CPA Partner (B2B)**
- M1: CPA lands on /partners → reads value prop → fills out partner application
- M2: Day 1 — "Your PA CROP partnership overview" + partner deck PDF download
- M3: Day 3 — Phone/Zoom consultation booking link

---

### GAP-04: Lead Nurture Sequence Not Built (lead-os)

**Problem:** The lead-os nurture engine defines a 7-stage, multi-day journey:
- Day 0: Intake (welcome)
- Day 2: Value Delivery (industry insight + resource)
- Day 5: Micro-Engage (quick question + helpful tip)
- Day 10: Positioning (case study + ROI preview)
- Day 14: Consultation invitation
- Day 21: Final touch + last offer
- Day 30+: Monthly check-in

PA CROP currently has: Day 0 welcome email → nothing. A paying client who doesn't engage with the portal after signup receives zero follow-up.

**Fix — build two nurture sequences in n8n:**

**Sequence 1: Post-Purchase Client Nurture** (already a customer, not engaging with portal)
- Day 2: "Have you set up your portal yet?" + access code reminder + direct portal link
- Day 7: "Your PA annual report is due September 30 — here's what to do" (relevant content)
- Day 14: "How to use your registered office address to build business credit" (value content from portal)
- Day 30: "Your first month with PA CROP Services — what's been done for you"
- Day 60: "60 days to annual report season — are you ready?"

**Sequence 2: Pre-Purchase Lead Nurture** (email captured, did not purchase)
- Day 2: Value delivery — "PA 2027 Compliance Checklist" (PDF or HTML) — the lead magnet
- Day 5: Micro-engage — "Quick question: how did you hear about the 2027 deadline?"
- Day 10: Positioning — "How Erie accountant firm [X] uses PA CROP Services for all 47 of their business clients"
- Day 14: Consultation — "15-minute call to review your PA compliance needs — no charge"
- Day 21: Final — "Last note: your 2027 protection offer"

**n8n implementation:** Create two new workflows. Trigger: Acumbamail tag applied (`lead-captured` vs `client-active`). Sequence via n8n Wait nodes. Emails via Emailit SMTP.

---

### GAP-05: Lead Capture Widget (lead-os-hosted-runtime)

**Problem:** The lead-os-hosted-runtime ships an embeddable widget (`public/embed/lead-os-embed.js`, 25KB) that can be placed on partner websites. CPA firms and attorneys could embed a PA CROP lead capture widget on their client portals or websites. Currently there is no way for a CPA to add PA CROP lead capture to their site.

**The architecture:**
```
CPA firm website
  → loads pa-crop-embed.js (hosted on pacropservices.com)
  → opens lead capture widget
  → posts to /api/intake
  → SuiteDash record created with tag: crop-partner-referral + partner-id
  → partner credited for the referral
```

**Fix:**
1. Create `public/embed/crop-widget.js` — a lightweight embed script (~5KB) that injects a small "Check PA Compliance" button and modal form onto any page
2. Create `/api/intake` Vercel serverless function — receives widget submissions, creates SuiteDash contact, attributes to partner
3. Partner dashboard shows referral count + credits
4. Each CPA partner gets a unique embed code with their partner ID baked in

**Files to create:** `public/embed/crop-widget.js`, `api/intake.js`, update `public/partners.html` with embed code generator

---

### GAP-06: Visitor Intelligence Missing (lead-os)

**Problem:** The LeadOS 12-layer architecture identifies Layer 2 as "Visitor Intelligence — tracks anonymous behavior before capture." PA CROP has zero anonymous visitor tracking. We don't know which articles drove conversions, which sections of the pricing page people read before bouncing, or which CTAs get hover-but-no-click.

**What the repos recommend:**
- Plerdy (heatmaps + session recording)
- Happierleads (company identification — reveals what businesses are visiting before form fill)
- Salespanel (company identification + intent scoring)

For PA CROP's scale (early stage), the pragmatic approach:
1. **Plausible is already installed** — extend it with custom event tracking (it supports `plausible.trackEvent`)
2. Track: CTA clicks, pricing tier hovers, compliance-check starts vs completions, article scroll depth
3. Add Microsoft Clarity (free, GDPR-compliant, heatmaps + session recordings) as `<script>` tag

**Fix:**
Add to all public pages:
```javascript
// Microsoft Clarity (free visitor intelligence)
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "[CLARITY_PROJECT_ID]");
```

Also add Plausible custom events to all CTAs:
```javascript
// Track CTA clicks
document.querySelectorAll('.price-cta, .btn-primary').forEach(btn => {
  btn.addEventListener('click', () => {
    plausible('CTA Click', {props: {label: btn.textContent.trim(), page: location.pathname}});
  });
});
```

**Action required:** Create Microsoft Clarity account → add project → paste ID into all pages.

---

### GAP-07: Lead Scoring Not Implemented (lead-os)

**Problem:** The lead-os V11 pipeline scores every lead on 5 dimensions: intent, fit, engagement, urgency, priority. PA CROP has zero scoring — all leads are treated identically.

**Scoring model for PA CROP:**

| Signal | Score | How to detect |
|--------|-------|---------------|
| Visited 2027 deadline article | +20 | Plausible referrer |
| Completed compliance check tool | +30 | `/api/intake` flag |
| Clicked pricing page | +15 | Plausible event |
| Foreign entity type mentioned | +25 | Compliance check answer |
| Multiple visits (3+) | +20 | Plausible |
| CPA/attorney job title | +30 | Partner application field |
| Has existing annual report due | +25 | Compliance check answer |

Total score → tag in SuiteDash:
- 0-30: `lead-cold` → long-cycle nurture
- 31-60: `lead-warm` → 14-day sequence
- 61-100: `lead-hot` → immediate personal outreach trigger (n8n → email Ike)

**Fix:** Add scoring logic to `/api/intake` and the compliance-check submission handler. Write score to SuiteDash custom field `lead_score`. Trigger n8n hot-lead alert when score ≥ 70.

---

### GAP-08: Missing Content Types (authoritysite)

**Problem:** The authoritysite BRD specifies 100+ pages covering: blogs, guides, comparisons, reviews, how-tos, tutorials, FAQs, glossaries, tools, calculators, quizzes, case studies. PA CROP has 7 content pages total and is missing entire categories.

**Missing content types for PA CROP:**

**1. Comparison pages** (authoritysite `ComparisonPageTemplate`)
- `/pa-crop-services-vs-northwest-registered-agent` — most searched competitor comparison
- `/pa-crop-services-vs-ct-corporation` — large enterprise competitor
- `/pa-crop-services-vs-zenbusiness` — popular LLC formation service
- `/pa-crop-services-vs-incfile` — popular low-cost competitor
- Format: side-by-side table, price comparison, PA-specific advantages

**2. Glossary page** (authoritysite `GlossaryPageTemplate`)
- `/pennsylvania-business-glossary`
- Terms: CROP, administrative dissolution, certificate of authority, registered office, service of process, annual report, foreign entity, domestic entity, DSCB, DOS file number, EIN, operating agreement, dissolution, reinstatement, Paydex score
- Schema: `DefinedTermSet` + `DefinedTerm` for each entry
- Excellent for long-tail "what is [term]" queries

**3. Cost calculator tool** (authoritysite `ROICalculator` + lead-os-hosted-runtime `/calculator`)
- "PA Business Compliance Cost Calculator"
- Inputs: entity type, state (domestic/foreign), # of entities, filing assistance needed
- Output: estimated annual compliance cost + comparison to alternatives
- Captures email before showing results → lead magnet

**4. Case study pages** (authoritysite `CaseStudyPageTemplate`)
- Once first 3-5 clients are established: "How [Business Type] in [City] avoided dissolution with PA CROP Services"
- Schema: `Article` + `Review` + real outcome data
- Partner program case studies: "How [CPA Firm] added $4,800/year by white-labeling PA CROP Services"

**5. Checklist page** (authoritysite `ChecklistPageTemplate`)
- `/pa-2027-compliance-checklist` — interactive, downloadable
- 20-item checklist covering: registered office, annual report, EIN, operating agreement, etc.
- Also the lead magnet for email capture

**6. About page** — currently 404s despite being referenced in all Article schema author blocks
- `/about` — Ikechukwu's bio, credentials, mission, PA DOS registration
- Schema: `Person` + `AboutPage`

---

### GAP-09: A/B Testing Framework Missing (dynasty-seomachine + lead-os)

**Problem:** Both repos implement experimentation. dynasty-seomachine has the `ab-test-setup` skill. lead-os-hosted-runtime has an experiment promotion endpoint (`/api/experiments/promote`). PA CROP has no testing whatsoever.

**Highest-value tests for PA CROP:**

| Test | Control | Variant | Hypothesis |
|------|---------|---------|-----------|
| Homepage hero CTA | "View plans →" | "Check if you're at risk →" | Risk-framing drives compliance-check completions |
| Pricing page CTA | "Get started →" | "Protect my business →" | Ownership language increases conversion |
| Nav CTA | "Get started" | "Free compliance check" | Low-friction offer drives more first touches |
| Article CTAs | Generic "View plans" | Contextual (annual report article → "Get reminders") | Contextual CTAs outperform generic |
| Compliance check | Results shown immediately | Results + email gate | Gated results drives email capture |

**Fix:** Start with the simplest possible A/B test infrastructure:
1. Generate random assignment in JavaScript (50/50 cookie-based)
2. Track variant in Plausible custom events
3. Measure: compliance-check completions, pricing page scrolls, Stripe conversions
4. After 100 sessions per variant, evaluate

No complex framework needed at this stage. Simple JS + Plausible events = actionable data.

---

### GAP-10: Portal Missing Nielsen Norman Compliance (authoritysite)

**Problem:** The authoritysite repo achieved 100% Nielsen Norman compliance score. It specifically calls out as fixed: confirmation dialogs for destructive actions, skip-to-main-content link, keyboard shortcuts (H=home, B=blog, L=legal, C=contact, Shift+?=help), Escape key support, error prevention via validation.

Current PA CROP portal fails on multiple NN heuristics:
- No skip-to-main link for keyboard/screen reader users
- No keyboard shortcuts
- No confirmation for "Sign Out" action
- Login error shows generic message without suggesting next step ("Forgot access code?" link)
- Mobile sidebar is hidden (display:none) with no alternative navigation
- No loading state on tab switches

**Fix in `portal.html`:**
```javascript
// Keyboard shortcuts (authoritysite pattern)
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.shiftKey && e.key === '?') { showShortcutsHelp(); return; }
  if (e.key === 'Escape') { closeModals(); return; }
  const shortcuts = { d:'dashboard', o:'onboarding', c:'credit', t:'templates', e:'entity', n:'notifications', r:'referral', a:'ai' };
  if (shortcuts[e.key.toLowerCase()]) setTab(shortcuts[e.key.toLowerCase()], null);
});
```

Also add skip link at top of portal:
```html
<a href="#main-content" class="skip-link" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">Skip to main content</a>
```

And add mobile sidebar toggle button (the current portal hides it on mobile with no fallback).

---

### GAP-11: n8n Workflows Need Activation and Content (lead-os)

**Problem:** The original plan noted several inactive n8n workflows without providing the actual email content or activation criteria. The lead-os nurture engine shows exactly how these sequences should be structured.

**Inactive workflows that need content written and activation:**

**`wRLXTGXW60MDLUnI` — Dynasty Pack 3: Renewal Sequence**
Triggers 30 days before CROP service renewal date. Sequence:
- Day -30: "Your PA CROP Service renews in 30 days — here's your renewal summary"
- Day -14: "2 weeks until renewal — confirm your business details are up to date"
- Day -7: "Your renewal is in 7 days — one action required"
- Day -1: "Renewing tomorrow — your compliance year in review"
- Day 0: "Your PA CROP Service has renewed — thank you"

**`UGGH8LOU4AR3eXk` — Dynasty Pack 4: Win-Back**
Triggers when Stripe subscription cancelled or payment fails after 3 retries. Sequence:
- Day 1: "We noticed you left — here's what you'll lose without a registered office"
- Day 7: "One last thing about your PA business compliance"
- Day 14: "We're removing your registered office listing from PA DOS on [date]"

**`hQCnCyoEBAHz1wyy` — Dynasty Master Event Router**
The central routing hub. Every event (payment, cancellation, document received, annual report due) should flow through this. It should route to the correct workflow based on event type. Needs to be activated once all downstream workflows have content.

---

### GAP-12: SMS / Multi-Channel Not Built (lead-os)

**Problem:** The lead-os nurture engine uses email + WhatsApp + Discord + Telegram simultaneously. PA CROP uses only email for all client communications.

For a compliance service with a critical deadline (2027), a missed email could mean a client loses their business. Multi-channel redundancy is not optional — it's the service promise.

**Fix:** Add SMS backup for all critical notifications:
1. Annual report reminder series — primary email, SMS backup 3 days later if no open
2. Document received — email + optional SMS (client opt-in at onboarding)
3. Access code delivery — email + SMS backup

**Tools available (from lead-os .env.example):**
- WbizTool (WhatsApp) — already credentialed in Dynasty system
- EasyTextMarketing — available in n8n
- SMSIt — available in n8n

**Minimum viable:** Add SMS opt-in field to portal onboarding checklist. If number provided, add to Acumbamail contact. Configure n8n to send SMS for annual report reminders when phone number is present.

---

### GAP-13: DataForSEO Integration Not Referenced (dynasty-seomachine)

**Problem:** The dynasty-seomachine integrates DataForSEO for real keyword volume data, competitor SERP analysis, and content gap identification. Every `/cluster` and `/article` command uses DataForSEO to get actual search volumes. The current plan writes articles without knowing actual search volumes.

**What needs DataForSEO:**
- Keyword volume for: "Pennsylvania CROP", "PA registered office", "PA annual report", "Pennsylvania LLC registered agent", "how to change registered office Pennsylvania"
- Competitor SERP analysis: which national RAs rank for PA-specific terms, and what their content looks like
- Topic cluster discovery: what questions PA business owners are asking that no one is answering

**Fix:** The DataForSEO credentials should be configured in dynasty-seomachine's `data_sources/config/.env`. Before writing any of the 4 new articles in Phase 3 or expanding existing articles, run:
```bash
python3 data_sources/modules/keyword_analyzer.py --keyword "Pennsylvania CROP"
python3 research_topic_clusters.py --niche "PA business compliance"
python3 research_competitor_gaps.py --keyword "Pennsylvania registered agent"
```

This is a pre-content-writing step that should happen before Phase 3.

---

### GAP-14: No Programmatic SEO Layer (dynasty-seomachine + authoritysite)

**Problem:** The dynasty-seomachine `target-keywords.md` template identifies "Cluster 1: Service + City (Programmatic SEO)" as the highest-volume cluster: "[niche service] in [city], [state]" — high per-city, massive aggregate.

For PA CROP, this translates to:
- "registered office Pennsylvania LLC"
- "CROP provider Philadelphia PA"
- "commercial registered office Erie PA"
- "registered agent Lancaster PA"
- "Pennsylvania registered office Pittsburgh"

The authoritysite `Locations.tsx` and `LocationPage.tsx` implement programmatic city pages. The dynasty-seomachine recommends a city landing page template.

**PA CROP programmatic SEO opportunity:**
PA has 67 counties and dozens of major cities. A CPA in Philadelphia would rather find a "Philadelphia-area registered office provider" than a generic national service. The key insight: we only have ONE physical address (Erie, PA 16502), but we serve ALL of Pennsylvania. The content angle is "Serving Pennsylvania businesses from Erie — your registered office at a real Erie address."

**Fix (Medium term):**
Create 10-15 city/region landing pages:
- `/registered-office-philadelphia-pa` — "PA CROP Services for Philadelphia Businesses"
- `/registered-office-pittsburgh-pa`
- `/registered-office-harrisburg-pa`
- `/registered-office-allentown-pa`
- `/registered-office-erie-pa` (hometown advantage)

Each page: 800-1,200 words, city-specific details (local business stats, county requirements, regional attorneys), schema `LegalService` + `areaServed` for that city. All link to the homepage for plan purchase.

---

### GAP-15: The Compliance-Productized Partner API Pattern (lead-os)

**Problem:** The lead-os `neatcircle-beta` repo contains `src/app/api/automations/compliance-productized/route.ts` — an automation route specifically for compliance service resellers. This is directly applicable to the CPA partner program and is more architecturally sound than the manual webhook approach in v1.

The pattern uses `createServiceAutomationRoute` which standardizes:
- Partner intake (resellerName, contactInfo, targetMarket, clientCount, pricingModel)
- SuiteDash contact creation
- Tag application
- Background info capture

**Fix:** Create `/api/partner-intake.js` following this exact pattern:
```javascript
// Partner intake - mirrors compliance-productized pattern from lead-os
export default async function handler(req, res) {
  const { firmName, firstName, lastName, email, phone, clientCount, pricingPreference } = req.body;

  // Build SuiteDash contact
  const tags = [
    'crop-partner-applicant',
    clientCount > 20 ? 'high-value-partner' : 'standard-partner',
    pricingPreference ? `pricing-${pricingPreference}` : ''
  ].filter(Boolean);

  // POST to SuiteDash
  // Trigger n8n partner onboarding webhook
  // Send partner welcome email
  // Notify Ike via Emailit
}
```

---

## Part 2 — Complete Phase Plan (v2)

All phases from v1 are preserved. New phases and tasks are added. Phase numbers are retained from v1 for continuity; new phases are added at the end.

---

### PHASE 0 — Context Setup (NEW — must precede all content work)
**Priority: CRITICAL — must be done before Phase 3**  
**Estimated effort: 2 hours**

Phase 0 is entirely new. The dynasty-seomachine cannot produce quality content without these context files.

#### 0A. Create Brand Voice Context Files
Create in `pa-crop-services` repo under `context/` (and mirror into `dynasty-seomachine/context/` when writing content):
- `context/brand-voice.md` — see GAP-01 for full content
- `context/style-guide.md` — sentence structure, paragraph length, PA-specific terminology
- `context/writing-examples.md` — paste the 3 best existing articles as style references
- `context/internal-links-map.md` — map all 7+ published pages with when/how to link to each
- `context/target-keywords.md` — populate after GAP-13 DataForSEO research

#### 0B. Run DataForSEO Keyword Research
Before writing any article, run:
```bash
python3 research_topic_clusters.py --niche "Pennsylvania CROP business compliance"
python3 research_competitor_gaps.py --keyword "Pennsylvania registered office"
python3 data_sources/modules/keyword_analyzer.py --keyword "PA CROP"
```
Export results to `context/target-keywords.md`.

#### 0C. Add PA CROP Niche Preset to dynasty-seomachine
Add the niche config block from GAP-01 to `dynasty-seomachine/context/niche-config.md` under Niche Presets. This allows any future session to run `/write` or `/article` with the correct PA CROP context loaded.

---

### PHASE 1 — Fix What's Broken
*Unchanged from v1 with one addition.*

#### 1A. Fix Stripe Products and Buy Links
*(unchanged from v1)*

#### 1B. Fix Portal Access Code — End-to-End Flow
*(unchanged from v1, but upgrade: also add lead_score field write to SuiteDash — see GAP-07)*

#### 1C. Build `/api/reset-code` Serverless Function
*(unchanged from v1)*

#### 1D. Fix Mobile Navigation
*(unchanged from v1)*

#### 1E. Delete TEMP: VM Shell Access Workflow
*(unchanged from v1 — security risk, delete `NJ7u9oSWPqw9GhBV`)*

#### 1F. NEW: Add Microsoft Clarity to All Pages
*(from GAP-06 — visitor intelligence)*
Create Clarity account → add project ID to all public pages. This provides free heatmaps and session recordings immediately.

---

### PHASE 2 — SEO Foundation
*Upgraded from v1. All schema tasks remain. New additions from the repo audit.*

#### 2A–2H. Schema, OG Tags, robots.txt, sitemap
*(all unchanged from v1)*

#### 2I. NEW: Add Plausible Custom Event Tracking
*(from GAP-06)*  
Track CTA clicks, pricing tier views, compliance-check funnel starts/completions, article scroll depth (50%, 75%, 100%), portal logins.

```javascript
// Add to index.html and all article pages
function trackCTA(label) {
  if (window.plausible) plausible('CTA Click', {props: {label, page: location.pathname}});
}
// Add onclick="trackCTA('[button label]')" to all CTAs
```

#### 2J. NEW: Portal Nielsen Norman Compliance Fixes
*(from GAP-10)*  
Add skip-to-main link, keyboard shortcuts, mobile sidebar toggle, improved error messages, Escape key support.

---

### PHASE 3 — Content Expansion
*Significantly upgraded. Now uses the dynasty-seomachine pipeline.*

**IMPORTANT:** All content in Phase 3 must be written using the `/article` or `/write` command in dynasty-seomachine with the PA CROP niche config active. No content should be written and pushed without first completing a SERP analysis per the `/article` pipeline.

#### 3A. Rewrite All 5 Existing Articles
*(targets from v1 are correct, but now using /rewrite command with SERP pipeline)*  
Each article must reach its dynasty-seomachine target length with proper hook, keyword placement, and structure.

The hook for each existing article must be rewritten to follow one of the five hook types. Current openers are all definition-style ("X is...") — this is explicitly banned by the dynasty-seomachine write command.

#### 3B. Four New Core Articles
*(unchanged from v1 — these four articles, using /article pipeline with SERP research)*

#### 3C. NEW: Comparison Pages (4 pages)
*(from GAP-08)*  
- `public/pa-crop-services-vs-northwest-registered-agent.html`
- `public/pa-crop-services-vs-ct-corporation.html`
- `public/pa-crop-services-vs-zenbusiness.html`
- `public/pa-crop-services-vs-incfile.html`

Each: ~1,500 words, side-by-side comparison table, PA-specific advantages column. Schema: `Article` + `FAQPage`. High commercial intent — people choosing between options.

#### 3D. NEW: Pennsylvania Business Glossary
*(from GAP-08)*  
`public/pennsylvania-business-glossary.html` — 20+ terms. Schema: `DefinedTermSet`. Low competition, high topical authority signal.

#### 3E. NEW: About Page
*(from GAP-08 — currently 404s despite being in author schema)*  
`public/about.html` — Ikechukwu's bio, credentials, PA DOS registration, Dynasty Empire background. Schema: `Person` + `AboutPage`.

#### 3F. NEW: Programmatic City Pages (10 pages)
*(from GAP-14)*  
10 PA city pages targeting "registered office [city] PA". Template-based, 1,000 words each. Link back to homepage and annual report guide.

#### 3G. Update sitemap.xml
After all new content is published, update sitemap to include all new pages.

---

### PHASE 4 — Portal Depth
*Unchanged from v1 with one upgrade.*

#### 4A. Real Document Downloads *(unchanged)*
#### 4B. Entity Formation Modal → n8n *(unchanged)*
#### 4C. Access Code Recovery Button *(unchanged — connects to /api/reset-code)*
#### 4D. About Page *(moved to Phase 3E — same deliverable)*

#### 4E. NEW: Lead Score Display in Portal
*(from GAP-07)*  
Show clients their "Compliance Health Score" in the portal dashboard. This repurposes the lead_score field as an engagement metric that encourages upsell.

#### 4F. NEW: Portal Behavioral Tracking
*(from GAP-06 + GAP-07)*  
Track which portal tabs a client visits and when. Write events to SuiteDash custom fields (`last_portal_visit`, `portal_tabs_visited`). Use to trigger n8n "inactive client" workflow if no portal visit in 30 days.

---

### PHASE 5 — CPA/Attorney Partner Program
*Significantly upgraded from v1.*

#### 5A. Partner Landing Page (`/partners`)
*Upgraded: now includes embeddable widget section and ROI calculator*

New section in `/partners.html`:
```html
<!-- Lead capture widget section -->
<div class="widget-section">
  <h3>Embed PA CROP on your client portal</h3>
  <p>Add a "Check PA Compliance" button to your website in one line of code.</p>
  <div class="code-block">
    <code>&lt;script src="https://pacropservices.com/embed/crop-widget.js" data-partner="YOUR_ID"&gt;&lt;/script&gt;</code>
  </div>
</div>
```

#### 5B. Partner Email Sequence *(upgraded to 7-day nurture from v1's 5-email sequence)*
*(see GAP-04 Funnel C for full sequence structure)*

#### 5C. Partner Portal Tab *(unchanged from v1)*

#### 5D. NEW: Embeddable Lead Capture Widget
*(from GAP-05)*  
`public/embed/crop-widget.js` — 5KB script that injects a "Check PA Compliance" button onto any page. On click: modal with 3-question compliance assessment → email capture → POST to `/api/intake` → SuiteDash lead with partner attribution.

#### 5E. NEW: Partner Intake API (Compliance-Productized Pattern)
*(from GAP-15)*  
`api/partner-intake.js` — follows the neatcircle compliance-productized route pattern exactly.

#### 5F. NEW: Partner White-Label Kit
Downloadable ZIP containing:
- PA CROP Services one-pager (PDF, rebrandable)
- Email template for CPA to introduce CROP to clients
- Social post templates
- FAQ document for partner to answer client questions

---

### PHASE 6 — Three-Visit Milestone Funnels (NEW PHASE)
**Priority: HIGH — currently missing entirely**  
**Estimated effort: 4 hours**  
*(from GAP-03 + GAP-04)*

#### 6A. Lead Magnet: PA 2027 Compliance Checklist
Create `public/pa-2027-compliance-checklist.html` — an interactive, downloadable checklist. 20 items covering everything a PA business must do before 2027.

The gate: to download the PDF version, user must enter email. POST to `/api/subscribe` → Acumbamail list `1267324` → tag `lead-checklist-download` → triggers 7-stage nurture sequence.

#### 6B. Build Cost Calculator Tool
*(from GAP-08)*  
`public/pa-compliance-cost-calculator.html` — inputs: entity type, domestic/foreign, number of entities, filing assistance needed. Output: estimated annual compliance cost + comparison to national RAs (showing PA CROP is cheaper). Email gate before showing results.

#### 6C. Build Pre-Purchase Nurture Sequence in n8n
*(from GAP-04 — Sequence 2)*  
New n8n workflow triggered by Acumbamail tag `lead-captured`. 7 stages, Day 0/2/5/10/14/21/30. All emails via Emailit SMTP. Sequence stops when `client-active` tag is applied (purchase detected).

#### 6D. Build Post-Purchase Client Nurture Sequence in n8n
*(from GAP-04 — Sequence 1)*  
New n8n workflow triggered by `client-active` tag. 5 stages focused on portal adoption, value delivery, and annual report prep.

#### 6E. A/B Test Infrastructure
*(from GAP-09)*  
Add a/b test cookie assignment to `index.html`. Track variants in Plausible. Start with one test: homepage hero CTA text ("View plans →" vs "Check if you're at risk →"). Review after 200 sessions per variant.

---

### PHASE 7 — Multi-Channel Notifications (NEW PHASE)
**Priority: MEDIUM**  
**Estimated effort: 2 hours**  
*(from GAP-12)*

#### 7A. SMS Opt-In in Portal Onboarding
Add phone number field to onboarding checklist step 6. When provided, save to SuiteDash contact `mobile_phone` field.

#### 7B. SMS Backup for Annual Report Reminders
In the annual report reminders n8n workflow (`il9DOXSAK9hUo2Ru`), add a branch: if `mobile_phone` is set AND email was opened within 48 hours, skip SMS. Otherwise, send SMS via EasyTextMarketing or WbizTool.

Message template: "PA CROP reminder: your PA annual report is due [DATE]. File at dos.pa.gov ($7 fee). Questions? Call 814-480-0989."

#### 7C. Document Received SMS Notification
For service of process and legal documents, SMS is critical. Update `DpeDi1zt88ySTSOF` (Paperless Document Router): when a legal document arrives, send SMS if phone on file. Email alone is insufficient for legal process.

---

### PHASE 8 — Lead Scoring and Behavioral Intelligence (NEW PHASE)
**Priority: MEDIUM**  
**Estimated effort: 3 hours**  
*(from GAP-07)*

#### 8A. Lead Scoring in `/api/intake`
Add scoring logic to the compliance-check and widget intake endpoints. Score = sum of signals (see GAP-07 model). Write to SuiteDash `lead_score` field.

#### 8B. Hot Lead Alert Workflow in n8n
When `lead_score` ≥ 70, trigger immediate n8n workflow:
- Send email to `hello@pacropservices.com` with lead details + score
- Post to Discord/Telegram (if configured)
- Create a SuiteDash "hot lead" task assigned to Ike

#### 8C. Portal Behavioral Scoring
Track tab visits in portal. If client hasn't visited portal in 30 days, trigger n8n workflow that sends "We noticed you haven't logged in" email with access code reminder.

---

### PHASE 9 — Infrastructure Compliance
*Same as Phase 6 from v1 — items only Ike can do. Unchanged.*

(6A through 6H from v1, renumbered 9A through 9H)

---

### PHASE 10 — SEO Content Machine
*Same as Phase 7 from v1, upgraded.*

#### 10A. Topic Cluster Map *(unchanged from v1)*

#### 10B. Content Freshness System (Upgraded)
*(automated via n8n + GitHub API)*  
Create n8n workflow: monthly cron → updates `dateModified` in all Article JSON-LD via GitHub API commit. Automatically keeps freshness signals current without manual work.

```javascript
// n8n Code node: Update dateModified in all SEO articles
const TODAY = new Date().toISOString().split('T')[0];
// For each article, GET file from GitHub, replace dateModified, PUT back
```

#### 10C. Google Search Console Setup *(unchanged from v1 — Ike must do)*

#### 10D. NEW: Competitor Tracking via dynasty-seomachine
Monthly: run `python3 seo_competitor_analysis.py` against the top 3 national RA competitors for PA keywords. Track their content additions and find gaps to fill.

---

### PHASE 11 — Dynasty State Replication
*Same as Phase 8 from v1, upgraded with niche config pattern.*

For each new state, create a niche config entry in dynasty-seomachine following the PA CROP preset from GAP-01:
- Update: brand name, state name, PA DOS → [state] equivalent, specific statute numbers, deadlines, fees
- Reuse: all technical infrastructure (Vercel, SuiteDash, n8n, Stripe, portal)
- New: 5 state-specific SEO articles written using /article pipeline

State priority order: Ohio, New Jersey, Maryland, New York, Delaware (ordered by competition/opportunity).

---

## Part 3 — Complete Implementation Sequence (v2)

```
WEEK 1 (Hours 1-10):
  Phase 0:  Context files, DataForSEO research, niche config
  Phase 1:  All 6 Phase 1 tasks (broken fixes + Clarity setup)

WEEK 2 (Hours 11-20):
  Phase 2:  All SEO schema + OG tags + robots + sitemap + NN compliance
  Phase 3A: Rewrite 5 existing articles with /rewrite pipeline

WEEK 3 (Hours 21-30):
  Phase 3B: 4 new core articles with /article pipeline
  Phase 3C: 4 comparison pages
  Phase 3D/E: Glossary + About page

WEEK 4 (Hours 31-38):
  Phase 4:  Portal depth (real downloads, entity modal, recovery)
  Phase 5A-C: Partner page, email sequence, portal tab

WEEK 5 (Hours 39-46):
  Phase 5D-F: Embeddable widget, partner API, white-label kit
  Phase 6A-B: Lead magnet + cost calculator

WEEK 6 (Hours 47-54):
  Phase 6C-D: Pre-purchase + post-purchase nurture sequences
  Phase 6E:   A/B test infrastructure
  Phase 7:    Multi-channel SMS

WEEK 7-8 (Hours 55-68):
  Phase 8:    Lead scoring + behavioral intelligence
  Phase 3F:   10 programmatic city pages
  Phase 10:   Content freshness automation

ONGOING (Each month):
  Phase 10D:  Competitor tracking
  New content per topic cluster calendar
  A/B test reviews
  Content freshness updates via n8n

MANUAL (Ike — no specific week):
  Phase 9A:  SuiteDash custom fields
  Phase 9B:  Google Search Console
  Phase 9C:  Google Business Profile
  Phase 9D:  AiTable credentials
  Phase 9E:  Documentero template ID
  Phase 9F:  E&O insurance (DO BEFORE FIRST CLIENT)
  Phase 9G:  Business bank account
  Phase 9H:  n8n cleanup (delete security risks)
```

---

## Part 4 — Summary of New Gaps vs v1

| Gap ID | Description | Source Repo | Phase |
|--------|-------------|-------------|-------|
| GAP-01 | Brand voice context files missing | dynasty-seomachine | Phase 0 |
| GAP-02 | Content written without SERP research | dynasty-seomachine | Phase 3 (upgrade) |
| GAP-03 | Three-Visit Milestone Framework missing | lead-os-hosted-runtime | Phase 6 |
| GAP-04 | 7-stage lead nurture sequence missing | lead-os | Phase 6 |
| GAP-05 | No embeddable lead capture widget | lead-os-hosted-runtime | Phase 5D |
| GAP-06 | No visitor intelligence / anonymous tracking | lead-os | Phase 1F, 2I |
| GAP-07 | No lead scoring | lead-os | Phase 8 |
| GAP-08 | Missing content types (comparison, glossary, tools, case studies) | authoritysite | Phase 3C-F |
| GAP-09 | No A/B testing | dynasty-seomachine + lead-os | Phase 6E |
| GAP-10 | Portal not Nielsen Norman compliant | authoritysite | Phase 2J |
| GAP-11 | Inactive n8n workflows have no content | lead-os | Phase 6 |
| GAP-12 | Single-channel (email only) for compliance notifications | lead-os | Phase 7 |
| GAP-13 | No DataForSEO keyword research before writing | dynasty-seomachine | Phase 0B |
| GAP-14 | No programmatic city/location SEO pages | dynasty-seomachine + authoritysite | Phase 3F |
| GAP-15 | Partner intake not using compliance-productized pattern | lead-os | Phase 5E |

---

## Part 5 — Reference Data (unchanged from v1)

| Item | Value |
|------|-------|
| Site | pacropservices.com |
| Repo | pinohu/pa-crop-services |
| SEO Machine | pinohu/dynasty-seomachine |
| Lead OS Runtime | pinohu/lead-os-hosted-runtime |
| Lead OS Funnels | pinohu/lead-os |
| Authority Site | pinohu/authoritysite |
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

---

## Part 6 — How to Start Each Session

1. Check Flint outbox (if VM is up):
   ```bash
   curl -H "Authorization: Bearer 1ed943c21ef9e2f60fe1189241a286d769e4191051ad2c0c035282722cb4b030" \
     https://claude-outbox.audreysplace.place/messages
   ```

2. State which phase/gap to execute — this document is the source of truth

3. GitHub token: `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`  
   *(regenerate at github.com/settings/tokens if expired)*

4. For content work: open dynasty-seomachine repo in Claude Code, set niche config to PA CROP, run `/article` or `/rewrite` command

5. For code pushes: use GitHub API pattern from v1 (base64 encode, PUT to contents endpoint)

6. Vercel auto-deploys on every push. Allow 20-30 seconds.

---

*This document supersedes MASTER_BUILD_PLAN.md (v1). Both files are retained in the repo for reference. When in doubt, use v2.*
