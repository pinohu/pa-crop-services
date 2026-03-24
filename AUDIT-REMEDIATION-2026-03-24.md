# PA CROP Services — Audit Remediation Plan
**Date:** March 24, 2026  
**Auditor:** Ike (Owner)  
**Executor:** Claude (CEO, Dynasty Empire)

---

## Severity 1 — CRITICAL: Legal/Compliance Accuracy

### Finding 1A: Annual report deadlines hardcoded as "September 30" across all entity types

**Official PA DOS rule (Act 122 of 2022):**
- Corporations (business + nonprofit, domestic + foreign): **June 30**
- LLCs (domestic + foreign): **September 30**
- All others (LPs, LLPs, business trusts, professional associations): **December 31**

| File | Line(s) | Current Text | Fix |
|------|---------|-------------|-----|
| `api/chat.js` | 89 | "Annual reports due September 30, $7 online" | Replace with entity-type deadline table |
| `public/index.html` | 140 | "Annual report due Sept 30" | Change to "Annual report deadline varies by entity type" |
| `public/index.html` | 379 (FAQ schema) | "Starting 2027, failure to file results in administrative dissolution" — OK but generic | Add entity-type deadlines |
| `public/index.html` | 23 (FAQ schema JSON-LD) | "Starting 2025, all PA entities must file annually. Starting 2027, failure means administrative dissolution." | Add deadline-by-type detail |
| `public/portal.html` | 491 | "Days until Sept 30" | Make dynamic based on entity type, or say "your deadline" |
| `public/portal.html` | 584 | "Next: 90 days before Sept 30" | Same fix |
| `public/portal.html` | 856 | "Annual report deadline: Sept 30" | Entity-type aware |
| `public/portal.html` | 1139 | "September 30 (X days away)" | Entity-type aware |
| `public/admin.html` | 300 | "September 30, 2026 deadline" | Show all three deadlines |
| `public/registered-office-*.html` (10 files) | ~74 | "90, 60, 30, 14, and 7 days before the September 30 deadline" | "before your entity-type deadline (June 30 for corps, Sept 30 for LLCs, Dec 31 for all others)" |
| `public/reinstate-dissolved-pennsylvania-llc.html` | 50 | "file annual reports by September 30 each year" | OK for LLC-specific page, but add qualifier |
| `public/pa-2027-dissolution-deadline.html` | 26 (FAQ schema) | "You must then continue filing annual reports each September 30" | Fix: "each year by your entity-type deadline" |

### Finding 1B: Dissolution timeline stated as "Dec 31, 2027" universal cutoff

**Official PA DOS rule:**
Starting with 2027 reports, dissolution/termination/cancellation occurs **six months after the entity-type-specific due date:**
- Corps miss June 30, 2027 → dissolution ~January 1, 2028
- LLCs miss Sept 30, 2027 → dissolution ~April 1, 2028
- Others miss Dec 31, 2027 → dissolution ~July 1, 2028

| File | Line(s) | Current Text | Fix |
|------|---------|-------------|-----|
| `api/chat.js` | 90 | "Late reports → dissolution after Dec 31, 2027" | "Late reports → dissolution six months after entity-type due date, starting with 2027 reports" |
| `public/admin.html` | 300 | "2027 enforcement deadline: Dec 31" | "2027 enforcement: dissolution 6 months after missed due date" |
| `public/admin.html` | 304 | "Clients who have not filed any PA annual report by Dec 31, 2027 face administrative dissolution" | Fix to reflect 6-month-after-deadline rule by entity type |
| `public/registered-office-*.html` (10 files) | ~81 | "businesses that have not filed any annual reports by December 31, 2027 face administrative dissolution" | "face administrative dissolution six months after their entity-type filing deadline, beginning with 2027 reports" |
| `public/pa-2027-dissolution-deadline.html` | 92, 100, 138 (FAQ) | Multiple references to "December 31, 2027" as a single hard deadline | Rewrite to explain 6-month-after-deadline mechanics |
| `public/compliance-check.html` | 315, 318 | "Starting in 2027, this could lead to administrative dissolution" | Add "six months after your deadline" |

### Finding 1C: Foreign entity reinstatement language

**Current wording is directionally correct but too blunt.** The official rule: foreign associations that are administratively terminated must submit a new Foreign Registration Statement. They cannot reinstate. They may need to use a different name if their original name was taken during dissolution.

Files already largely correct on this — just needs softening in a few places to avoid implying it happens universally at one date.

---

## Severity 2 — HIGH: Portal Code Integrity Bug

### Finding 2A: Stray catch block with undefined `lessonsEl` in loadEntities()

| File | Line(s) | Issue | Fix |
|------|---------|-------|-----|
| `public/portal.html` | 1418 | `} catch(e) { lessonsEl.innerHTML = '...' }` — `lessonsEl` is undefined in loadEntities scope. This is a copy-paste artifact from `loadCourse()` (~line 1555). Also, line 1419 (`list.innerHTML += ...`) falls outside the inner try-catch, so if the entity list renders but the stray catch fires, it would throw a ReferenceError. | Remove the stray inner catch block on line 1418. Fold line 1419 back inside the main try block. |

---

## Severity 3 — HIGH: Silent Subscription/Webhook Failures

### Finding 3A: `.catch(() => {})` swallows all errors

| File | Line(s) | Issue | Fix |
|------|---------|-------|-----|
| `api/subscribe.js` | 52 | Acumbamail `.catch(() => {})` | Log error, set flag, return partial success with warning |
| `api/subscribe.js` | 60 | n8n webhook `.catch(() => {})` | Same |
| `api/subscribe.js` | 62 | Returns `{ success: true }` regardless | Return `{ success: true, warnings: [...] }` if either call failed |

---

## Severity 4 — MEDIUM: Rate Limiting + CORS

### Finding 4A: In-memory rate limiting on serverless

| File | Line(s) | Issue | Fix (deferred) |
|------|---------|-------|-----|
| `api/subscribe.js` | 7-17 | `new Map()` rate limiter resets per cold start | Recommend Vercel KV or Upstash Redis. Not blocking for launch but needs roadmap. |
| `api/chat.js` | 11-20 | Same pattern | Same recommendation |

### Finding 4B: Wildcard CORS

| File | Line(s) | Issue | Fix |
|------|---------|-------|-----|
| `api/subscribe.js` | 20 | `Access-Control-Allow-Origin: *` | Restrict to `pacropservices.com` and `www.pacropservices.com` |
| `api/chat.js` | 26, 35, 52, 169, 175, 190, 195 | Same | Same |

---

## Severity 5 — MEDIUM: Privacy Policy vs Actual Tracking

### Finding 5A: Clarity disclosure needs strengthening

| File | Line(s) | Issue | Fix |
|------|---------|-------|-----|
| `public/privacy.html` | 60-61, 84-85 | Policy says Clarity collects "anonymized interaction data" but doesn't explain session replay, heatmaps, or what "anonymized" means in Clarity's context | Add explicit disclosure: Clarity records mouse movements, clicks, scrolls, and page interactions as anonymized session replays. No personal data is collected. Masking is enabled for sensitive fields. |
| `public/privacy.html` | 99 | Cookie section doesn't mention Clarity cookies | Clarify Clarity's cookie/storage behavior |

---

## Severity 6 — LOW: Product-Reality Gap / API Audit

Deferred to next sprint. The portal references ~20+ API endpoints. Need systematic audit of which exist and return real data vs. mock/demo responses.

---

## Execution Order

1. ✅ Fix all deadline/dissolution language (Severity 1A, 1B, 1C)
2. ✅ Fix portal.html loadEntities bug (Severity 2A)
3. ✅ Fix subscribe.js silent failures (Severity 3A)
4. ✅ Restrict CORS (Severity 4B)
5. ✅ Update privacy disclosures (Severity 5A)
6. 🔲 Rate limiting upgrade (Severity 4A — roadmap)
7. 🔲 Portal API endpoint audit (Severity 6 — next sprint)
