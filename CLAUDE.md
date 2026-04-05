# CLAUDE.md — PA CROP Services (pacropservices.com)

This file configures Claude Code's behavior for the PA CROP Services project.
Read this file completely before writing any code.

---

## Project Overview

**PA CROP Services** is a Pennsylvania government compliance services platform with 146 API endpoints, a dual-surface design (light marketing + dark portal), and a full comms stack.

- **Stack**: Next.js (Vercel), Neon Postgres, 20i hosting (pkg 3630589), JWT auth
- **Repo**: `pinohu/pa-crop-services`
- **Vercel**: `prj_MrCHRfSE1tdtaLy7Niwr7D4DlJ8c`, team `team_fuTLGjBMk3NAD32Bm5hA7wkr`
- **Admin key**: `CROP-ADMIN-2026-IKE`
- **Domain**: www.pacropservices.com

---

## Design Rules (MANDATORY)

**Before generating any UI component, page, or layout, read `DESIGN.md` in this project root.**

The DESIGN.md defines a dual-surface system. Apply the correct surface:
- **Marketing / public pages**: Light surface (`#FAFAFA` background)
- **Portal / dashboard / admin**: Dark surface (`#171717` background)
- **Knowledge base (25 articles)**: Notion-style warm minimalism (`#F6F5F4` alternating sections)

### Colors — Never Guess
- Brand accent: `#3ECF8E` (CROP Green) — identity marker, used sparingly
- Interactive green: `#00C573` (for links, hover states)
- Light surface text: `#141413`
- Dark surface text: `#FAFAFA`
- Secondary light: `#615D59`
- Muted dark: `#898989`
- Borders light: `rgba(0,0,0,0.08)`
- Borders dark: `#2E2E2E`
- Premium: `#C9A84C` (Dynasty Gold) — plan tier markers only
- NEVER use Stripe purple (`#635BFF`) — that belongs to LeadOS-Gov

### Typography
- All text: Inter font (no Geist)
- Filing numbers, EINs, cert IDs, doc codes: Source Code Pro — this signals government-grade precision
- Letter-spacing tightens with font size (see DESIGN.md Section 3)

### Buttons
- Marketing surface: **pill shape** (9999px radius) for all primary CTAs
- Portal surface: **pill shape** (9999px radius) for all primary CTAs
- This matches Supabase's pill CTA convention
- Button secondary: ghost pill with border `rgba(0,0,0,0.12)` (light) or `#2E2E2E` (dark)

### Dark Portal Depth
- **No drop shadows on the dark surface** — use border hierarchy only
- Depth levels: `#2E2E2E` (standard) → `#363636` (emphasized) → `#3ECF8E` border (featured)
- Background levels: `#171717` (page) → `#242424` (panels) → `#0F0F0F` (sidebar)

### Status System (Compliance-Specific)
```
Compliant: bg rgba(62,207,142,0.15), text #059669, border rgba(62,207,142,0.3)
Pending Review: bg rgba(255,165,0,0.12), text #8B5A00, border rgba(255,165,0,0.3)
Due Soon: bg rgba(251,191,36,0.12), text #92400E, border rgba(251,191,36,0.3)
Overdue: bg rgba(229,62,62,0.12), text #B53333, border rgba(229,62,62,0.3)
Exempt: bg rgba(100,116,139,0.12), text #475569, border rgba(100,116,139,0.3)
Admin Note: bg rgba(121,40,202,0.12), text #6B21A8, border rgba(121,40,202,0.3)
```
**Status badges must always include a text label — never rely on color alone.**

### Required States
Every interactive component must have:
1. Default
2. Hover
3. Focus (`box-shadow: 0 0 0 2px #3ECF8E` — green focus ring)
4. Active/Pressed
5. Disabled
6. Loading

---

## Architecture Rules

### API Conventions (146 endpoints)
- REST pattern: `/api/v1/[resource]/[action]`
- Auth: JWT Bearer token (`CROP-ADMIN-2026-IKE` for admin routes)
- All responses: `{ success: boolean; data?: T; error?: string; message?: string }`
- Rate limiting on all public endpoints

### Database (Neon Postgres)
- Connection: `ep-small-pond-ajxunei4-pooler.c-3.us-east-2.aws.neon.tech`
- Use connection pooling — never direct connections from edge functions
- Transaction on all multi-table writes (client record + filing record + notification)

### 20i Hosting
- Package: `3630589`
- API keys (March 2026): general `c2387393b8125d868`, oauth `c0471cadcfe5a7837`
- Bearer = base64-encode general key
- ResellerId: `10455`

### Comms Stack (Do Not Modify Without Instruction)
- **Insighto**: Voice agent — API key `in-8sy7gCOBIkfcftX7SJ-0tNSeVHI1GKoR3u9LwGDvyLA`
- **CallScaler**: `120|ZPLZosyaRbCmkwTs01wRtYxtfJt1m9SUUTcBzz7K`, number: (814) 228-2822
- **SMS-iT**: `SMSIT_a1a5c935d1626fb1ad8d95de9455857d3225730e1b992f62c355c83158a4a7dc`
- **Trafft**: Client ID `380067799445b9b14ebbad232d7a8dbf`

### n8n Workflows (Active — Do Not Break)
- Lead Nurture: `ndDWaSmPO4290CgK`
- Hot Lead Alert: `RSibNfwSM9aw3vUW`
- Portal Reset: `l2495RxXLxkYzqcU`
- Partner Onboarding: `9j4pW3PmmYufMG8T`
- New Client Onboarding: `OkjdJx2bRqlgl1s7`
- Annual Report Reminders: `il9DOXSAK9hUo2Ru`

---

## Knowledge Base Rules

The 25 KB articles follow specific formatting:
- `.html` files, rendered inline on the portal — no external links or popups
- Callout blocks for compliance warnings: `border-left: 3px solid #3ECF8E`, `rgba(62,207,142,0.06)` bg
- Warning blocks: `border-left: 3px solid #FFA500`, `rgba(255,165,0,0.06)` bg
- Line-height: `1.70` for article body text
- All filing reference codes in Source Code Pro

---

## Git Rules

```bash
git config user.email "polycarpohu@gmail.com"
git config user.name "pinohu"
```

**Always set these before committing to this repo.**

Token: `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`

---

## Do Not

- Do not use purple (`#635BFF`) — that is LeadOS-Gov's color
- Do not use Geist font — Inter is PA CROP's font
- Do not add drop shadows to the dark portal — border hierarchy only
- Do not reduce KB body line-height below `1.60`
- Do not use color alone for status — always include a text label
- Do not create comms integrations without confirming with Ike — live stack in production
- Do not modify n8n workflow IDs — they're active in production
- Do not use raw database connections — always use the connection pooler URL
- Do not skip git config before committing — commits must be attributed to pinohu
