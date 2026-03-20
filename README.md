# PA CROP Services

**Complete business-in-a-box for a Pennsylvania Commercial Registered Office Provider**

A Dynasty Empire venture targeting $600K+ ARR through compliance automation.

---

## What's Inside

| Directory | Contents | Description |
|-----------|----------|-------------|
| `business-plan/` | Business Plan (.docx) + generator | 10-section plan with market analysis, financials, operations, exit strategy |
| `financial-model/` | Excel Model (.xlsx) + generator | 4-sheet model: Assumptions, 24-Month P&L, Unit Economics, Scenario Analysis |
| `operations/` | Operations Bible (.md) | Every SOP, email sequence (word-for-word), sales script, workflow spec, KPI dashboard |
| `legal/` | Service Agreement (.docx) + generator | 9-section CROP service agreement template with Exhibit A fee schedule |
| `partner-deck/` | Partner Pitch Deck (.pptx) + generator | 9-slide deck for CPA/Attorney white-label partner program |
| `marketing/website/` | Landing Page (index.html) | Complete marketing website with pricing, FAQ, Schema.org markup |
| `marketing/seo-articles/` | SEO Article Pack (.md) | 5 foundational articles targeting high-intent PA compliance keywords |

## The Opportunity

- **3.8M+** business entities registered in Pennsylvania
- **170K** new filings per year
- **~65** total CROPs on the state list (massively undersupplied)
- **2027** dissolution deadline creates urgency-driven demand
- **$79-$299/year** per client, 85-92% gross margins

## Technology Stack (Zero Marginal Cost)

All leveraging existing Dynasty Empire infrastructure:

- **SuiteDash** (136 licenses) — Client portal, CRM, billing, e-signatures
- **Brilliant Directories** (100 licenses) — SEO directory layer
- **Vercel + Dynasty Developer** — Marketing website deployment
- **n8n** (self-hosted) — Workflow automation
- **Stripe** — Payment processing
- **Flint** — AI operations agent

## Revenue Model

| Stream | Clients | Price | ARR |
|--------|---------|-------|-----|
| Direct (Starter) | 1,200 | $79/yr | $94,800 |
| Direct (Professional) | 1,200 | $179/yr | $214,800 |
| Direct (Premium) | 400 | $299/yr | $119,600 |
| Partner (White-label) | 2,000 | $99/yr | $198,000 |
| Add-on services | 1,500 | $50 avg | $75,000 |
| **Total** | | | **$702,200** |

## Quick Start

1. Register domain: `pacropservices.com`
2. File CROP Statement of Address with PA DOS (~$70)
3. Have service agreement reviewed by PA business attorney
4. Deploy `marketing/website/index.html` to Vercel
5. Configure SuiteDash per `operations/PA-CROP-Operations-Bible.md`
6. Publish SEO articles from `marketing/seo-articles/`
7. Begin CPA/Attorney partner outreach using `partner-deck/`

## Regenerating Documents

The `.js` and `.py` generator scripts can regenerate the documents if edits are needed:

```bash
# Business Plan (requires: npm install -g docx)
node business-plan/generate-business-plan.js

# Financial Model (requires: pip install openpyxl)
python financial-model/generate-financial-model.py

# Service Agreement (requires: npm install -g docx)
node legal/generate-service-agreement.js

# Partner Deck (requires: npm install -g pptxgenjs)
node partner-deck/generate-partner-deck.js
```

## Entity Structure

```
Dynasty Empire Holdings (SD Dynasty Trust)
  └── Wyoming Holding Company
       └── Dynasty Compliance Services, LLC (PA)
            └── DBA: PA CROP Services
```

---

**Dynasty Empire** — Building generational wealth through compliance automation.

*Confidential — Internal Use Only*
