# PA CROP Services — Full Repo Audit Report
## Date: March 21, 2026 | Commit: 565bcea | Files: 72

---

## CRITICAL (breaks functionality)

### 1. ❌ Premium pricing button links to STARTER instead of PREMIUM
- **File:** `public/index.html` line 269
- **Bug:** Premium tier ($299) "Get started" button has `href="STRIPE_STARTER_LINK"` instead of `href="STRIPE_PREMIUM_LINK"`
- **Impact:** Premium customers would be charged $79 instead of $299
- **Status:** FIXED

---

## HIGH (stale/incorrect information)

### 2. ❌ Docs still reference Google Analytics (replaced by Plausible)
- `WHAT-EVERYTHING-MEANS.md` line 171 — lists GA_MEASUREMENT_ID as active placeholder
- `README.md` line 15 — lists GA_MEASUREMENT_ID
- `PA-CROP-Execution-Plan.md` section 8.4 — entire "Set Up Google Analytics" section
- `PA-CROP-AI-Agent-Orchestration-Guide.md` lines 331, 349 — Cursor prompts reference GA
- **Status:** FIXED

### 3. ❌ marketing/website/index.html is stale
- Original landing page (390 lines) is out of sync with deployed version in public/ (396 lines)
- public/ has: Stripe links, Plausible, fixed footer links, compliance quiz CTA
- marketing/website/ has: old mailto CTA, dead # links, GA placeholder
- **Status:** FIXED (synced or removed)

### 4. ❌ POWER-TOOLS-GITHUB.md is a duplicate
- POWER-TOOLS-GITHUB.md (197 lines) is an older version of POWER-TOOLS.md (326 lines)
- **Status:** FIXED (removed duplicate)

### 5. ❌ openclaw-config.json uses hardcoded /root/ paths
- openclaw-config.json: `/root/.openclaw/workspaces/...`
- openclaw-agents.json: `~/.openclaw/workspaces/...` (correct, portable)
- **Status:** FIXED

---

## MEDIUM (missing SEO/quality)

### 6. ⚠️ Homepage missing from sitemap
- sitemap.xml has `<loc>https://pacropservices.com/</loc>` — correct
- Actually: was present. Confirmed OK.
- **Status:** OK (false alarm — the / entry covers it)

### 7. ⚠️ Missing meta descriptions
- `public/404.html` — missing meta description
- `public/welcome.html` — missing meta description
- **Status:** FIXED

### 8. ⚠️ Missing canonical URLs
- `public/404.html` — missing (acceptable, it's an error page)
- `public/index.html` — missing
- `public/welcome.html` — missing (acceptable, noindex page)
- **Status:** FIXED (added to index.html)

### 9. ⚠️ SOUL.md files are stubs (2 lines each)
- Should contain full agent personas, responsibilities, and knowledge references
- **Status:** FIXED (expanded to full persona docs)

### 10. ⚠️ CROP n8n workflows have no error handling
- 01, 02, 10, 11, 12 — none connect to the failure handler (05)
- **Impact:** Errors fail silently instead of being captured
- **Status:** NOTED (requires n8n UI configuration — can't add error handlers via JSON import alone; documented in setup instructions)

### 11. ⚠️ .env.example missing variables used in workflows
- Missing: AITABLE_CLIENTS_SHEET, N8N_WEBHOOK_BASE, SMTP_FROM_EMAIL, SUITEDASH_PUBLIC_ID, SUITEDASH_SECRET_KEY, PAPERLESS_URL, PAPERLESS_API_TOKEN
- **Status:** FIXED

---

## LOW (expected placeholders — need real values at deploy time)

### 12. ✅ BUSINESS_PHONE — RESOLVED (814-480-0989 in all HTML and workflows)
- Replace with real phone number before launch. Expected.

### 13. ℹ️ STRIPE_*_LINK — in public/index.html (3 buttons)
- Replace with real Stripe Payment Links before launch. Expected.

### 14. ℹ️ STRIPE_PORTAL_ID — RESOLVED (bpc_1TDFLjLeZEBBH8L7WCL51yet)
- Replace after creating Stripe customer portal. Expected.

### 15. ℹ️ SMTP_CREDENTIAL_ID — in 5 n8n workflows
- Set in n8n UI after importing. Expected.

---

## CLEAN (no issues found)

- ✅ No API keys or secrets committed (except example values)
- ✅ .gitignore properly excludes .env files
- ✅ No broken internal links in public/ HTML
- ✅ No "Dynasty Compliance" remnants (old entity name)
- ✅ All HTML pages have Plausible analytics
- ✅ All HTML pages have <title> tags
- ✅ Docker Compose validates correctly (6 services, 6 volumes)
- ✅ Entity name consistent (PA Registered Office Services, LLC / PA CROP Services)
- ✅ sitemap.xml covers all indexable pages
- ✅ robots.txt properly configured
