# PA CROP Services — Product Specification

> **Build-ready pack: roadmap, wireframes, DB-to-UI mapping, prompt chains, build order.**
> Designed to turn the portal/admin into a value-stacked compliance operating system.
>
> One-sentence positioning:
> "A compliance operating system that helps business owners stay ahead of deadlines,
> understand documents, reduce risk, and centralize the services they need to stay
> in good standing."
>
> Last updated: 2026-03-24

---

## 1. Notion Product Roadmap

### Database schema

Create a Notion database `PA CROP Product Roadmap` with properties:

| Property | Type | Purpose |
|----------|------|---------|
| Feature | Title | Feature name |
| Area | Select: Core/Portal/Admin/AI | System area |
| User Type | Select: Client/Ops/Admin/Partner | Who uses it |
| Tier | Select: All/Starter+/Pro+/Empire | Plan gating |
| Outcome | Text | What value it delivers |
| Priority | Select: P0/P1/P2 | Execution priority |
| Status | Select: ✅ Done/🔧 Wiring/📐 Designed/🔲 Future | Current state |
| Sprint | Select: S1-S5 | Sprint assignment |
| Dependencies | Relation | Blocked by |
| Backend Services | Multi-select | API dependencies |
| KPI | Text | Success metric |
| Upgrade Leverage | Select: High/Medium/Low/Indirect | Revenue impact |
| Notes | Text | Implementation notes |

### Sprint 1 — Trust + truth foundation (✅ COMPLETE)

| Feature | Area | Tier | Status | Backend | KPI | Upgrade |
|---------|------|------|--------|---------|-----|---------|
| Canonical rules store | Core | All | ✅ | rules-service | rule coverage | high |
| Deadline engine | Core | All | ✅ | obligation-service | obligation accuracy | high |
| Assistant grounding | AI | All | ✅ | assistant-service | escalation rate | high |
| Audit event framework | Core | All | ✅ | audit-service | event coverage | medium |

### Sprint 2 — Portal value stack (✅ 90% COMPLETE)

| Feature | Area | Tier | Status | Backend | KPI | Upgrade |
|---------|------|------|--------|---------|-----|---------|
| Compliance Command Center | Portal | All | ✅ | obligation-service | login engagement | medium |
| Document Intelligence Center | Portal | Starter+ | 🔧 | document-service | doc actions | high |
| Guided Action Center | Portal | All | ✅ | workflow-service | tasks completed | medium |
| Communication Center | Portal | Starter+ | 🔧 | notification-service | reminder opens | medium |

### Sprint 3 — Admin control tower (✅ 95% COMPLETE)

| Feature | Area | Tier | Status | Backend | KPI | Upgrade |
|---------|------|------|--------|---------|-----|---------|
| Ops Command Center | Admin | Internal | ✅ | admin-service | time to action | indirect |
| Client 360 | Admin | Internal | ✅ | admin-service | support resolution | indirect |
| Rules Manager | Admin | Internal | ✅ | rules-service | publish errors | indirect |
| Workflow Failure Console | Admin | Internal | ✅ | workflow-service | failed unresolved | indirect |

### Sprint 4 — Upsell + premium layers (✅ 85% COMPLETE)

| Feature | Area | Tier | Status | Backend | KPI | Upgrade |
|---------|------|------|--------|---------|-----|---------|
| Filing Readiness Workspace | Portal | Pro+ | ✅ | obligation-service | upgrade conversion | high |
| Business Stack section | Portal | Starter+ | ✅ | billing-service | retention | high |
| Multi-Entity Portfolio | Portal | Pro+/Empire | 🔧 | entity-service | empire upgrades | very high |
| Billing + Retention Console | Admin | Internal | ✅ | billing-service | expansion MRR | high |

### Sprint 5 — Expansion + stickiness (✅ 80% COMPLETE)

| Feature | Area | Tier | Status | Backend | KPI | Upgrade |
|---------|------|------|--------|---------|-----|---------|
| Knowledge + Certification | Portal | Starter+ | ✅ | knowledge-service | module completion | medium |
| AI Quality Console | Admin | Internal | ✅ | assistant-service | bad answer rate | indirect |
| Partner Console | Admin | Internal | 🔧 | partner-service | referred revenue | very high |

### Suggested Notion views

1. **By Sprint** — default, shows progress
2. **Portal Only** — filter Area = Portal
3. **Admin Only** — filter Area = Admin
4. **P0 / P1** — urgency filter
5. **Upgrade Drivers** — filter Upgrade = High/Very High
6. **Dependencies Blocked** — filter has unresolved dependencies
7. **Internal Ops** — filter User Type = Ops
8. **Revenue Impact** — sort by Upgrade Leverage

---

## 2. Lovable.dev Prompt Chains

### Portal shell prompts

#### Prompt 1 — Portal IA and layout

```
Design a premium client portal for a compliance operating system serving
Pennsylvania business entities.

Goals:
- Feel like a compliance command center, not just an account area
- Prioritize clarity, trust, actionability, and calm
- Mobile-first, polished, premium, legally-adjacent tone
- Accessibility-conscious, strong hierarchy, clear status design

Primary sections:
1. Dashboard / Compliance Command Center
2. Documents / Document Intelligence Center
3. Guided Action Center
4. Compliance / Obligations
5. Filing Readiness Workspace
6. Communication Center
7. Business Stack / Services Included
8. Multi-Entity Portfolio
9. Knowledge + Certification
10. AI Copilot
11. Billing & Plan
12. Settings

Design the product shell, navigation, page hierarchy, card system,
status badges, empty states, loading states, and action patterns.
Focus on product architecture and UX hierarchy, not backend.
```

#### Prompt 2 — Dashboard details

```
Design the Dashboard / Compliance Command Center in detail.

Include:
- Entity status hero
- Upcoming obligations timeline
- Risk score + risk drivers
- Top 3 recommended actions
- What we are handling for you
- What is waiting on you
- Recent documents + notifications
- AI quick actions
- Value received this year
- Deadline calendar preview

For every module: purpose, empty state, loading skeleton,
success/warning/critical states, CTA behavior.
Use premium SaaS patterns with confidence-building design.
```

#### Prompt 3 — Documents center

```
Design a Document Intelligence Center.

Include: searchable inbox, filter chips, document cards, AI summary panel,
extracted deadlines/entities, linked obligation panel, "what should I do"
action card, escalation to human, original file preview, timeline/history.

Feel like a mix of executive inbox and compliance assistant.
```

#### Prompt 4 — Filing workspace

```
Design a Filing Readiness Workspace for annual reports.

Include: filing overview, due date/fee, readiness score, missing requirements
checklist, required documents, responsibility split (you/us), progress tracker,
upload area, notes/history, submit for review, "we handle this" premium lane.

Make users feel guided and protected.
```

#### Prompt 5 — Multi-entity portfolio

```
Design a Multi-Entity Portfolio view for users managing several entities.

Include: portfolio metrics, entity table, deadline heatmap, risk heatmap,
grouped documents, bulk actions, filters, side panel per entity.

Feel like an executive control panel and a strong upgrade reason.
```

### Admin shell prompts

#### Prompt 1 — Admin IA

```
Design an admin control tower for a compliance operating system.

Goals: immediate risk awareness, easy client/obligation/document inspection,
queue-based work, auditability, high-density without clutter.

Sections: Ops Command Center, Client 360, Obligation Console, Rules Manager,
Document Review Queue, Notification Console, Workflow Failures, Billing +
Retention, AI Quality, Audit Viewer, Partner Management.

Design shell, hierarchy, queues, tables, drill-down, filters, priority states.
```

#### Prompt 2 — Ops command center

```
Design the Ops Command Center in detail.

Include: clients at risk, overdue obligations, failed notifications,
urgent documents, AI escalations, payment failures, new signups,
queue summary, SLA timers, assign/reassign, quick filters.

Feel like a true control room.
```

#### Prompt 3 — Client 360

```
Design a Client 360 admin page.

Include: client header, entity profile, obligation summary, document timeline,
notification history, AI conversations, billing status, risk score + trend,
internal notes, audit history, actions panel.

Admin should understand the entire account without leaving this page.
```

#### Prompt 4 — Rules manager

```
Design a Rules Manager for compliance rules.

Include: rules table, filters, draft vs active versions, editor, change preview,
impacted entities count, publish flow, rollback, source citation, audit trail.

Must feel safe and controlled — legal truth depends on it.
```

---

## 3. UI Wireframes

### Portal dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ Nav: Dashboard | Documents | Compliance | Filings | AI | Billing │
├──────────────────────────────────────────────────────────────────┤
│ Entity Hero                                                      │
│ [Active] Acme Holdings LLC · PA LLC · DOS #7234819               │
│ Next deadline: Sep 30 | Risk: Low | Plan: Pro                    │
│ [View obligation] [Ask AI] [Upload document]                     │
├─────────────────────────────┬────────────────────────────────────┤
│ Upcoming Obligations        │ Top 3 Actions                      │
│ · Annual report: 186 days   │ 1. Verify principal address        │
│ · Address review pending    │ 2. Upload tax notice               │
│                             │ 3. Review annual report prep       │
│ Recent Documents            │                                    │
│ · Gov notice (AI summary)   │ What We're Handling                │
│ · Service of process        │ · Reminders active                 │
│ · Tax letter                │ · Entity monitoring                │
│                             │ · Filing lane prepared             │
│ Notifications               │                                    │
│ · Reminder sent 30d prior   │ Health Breakdown                   │
│ · New document alert        │ · Filing readiness: 82%            │
│                             │ · Contact completeness: 65%        │
├─────────────────────────────┴────────────────────────────────────┤
│ Value Received: office | scanning | reminders | portal | AI      │
│ Market value: $1,422–$3,659 → You pay: $349/yr (saves 90%)      │
├──────────────────────────────────────────────────────────────────┤
│ AI: [When is my filing?] [Summarize docs] [What should I do?]    │
└──────────────────────────────────────────────────────────────────┘
```

### Portal documents

```
┌──────────────────────────────────────────────────────────────────┐
│ Document Intelligence Center                                      │
├──────────────────────────────────────────────────────────────────┤
│ Search [________] Filters: All | Urgent | Gov | Tax | Legal       │
├─────────────────────┬────────────────────────────────────────────┤
│ Document List       │ Detail Panel                                │
│                     │                                             │
│ > IRS Notice        │ Title: IRS Notice                           │
│   HIGH · Mar 24     │ Received: Mar 24 · Type: Tax · HIGH        │
│                     │                                             │
│ > PA DOS Notice     │ AI Summary: "This document indicates..."    │
│   NORMAL · Mar 20   │                                             │
│                     │ Extracted: case #, response date             │
│ > Service of Process│                                             │
│   CRITICAL · Mar 19 │ Linked obligation: annual report            │
│                     │                                             │
│                     │ [Escalate] [Mark reviewed] [Ask AI]         │
└─────────────────────┴────────────────────────────────────────────┘
```

### Portal filing workspace

```
┌──────────────────────────────────────────────────────────────────┐
│ Filing Readiness Workspace                                        │
├──────────────────────────────────────────────────────────────────┤
│ PA Annual Report · Due Sep 30 · $7 · Readiness: 78%              │
│ [We handle this for you] [View rule] [Ask AI]                     │
├───────────────────────┬──────────────────────────────────────────┤
│ Checklist             │ Progress                                  │
│ [x] Entity verified   │ We handle: reminders, monitoring          │
│ [ ] Principal address │ You provide: final confirmation            │
│ [x] DOS number        │                                           │
│ [ ] Upload doc        │ Timeline                                  │
│                       │ · Rule applied                            │
│ Upload area           │ · Reminders scheduled                     │
│ [Drop files here]     │ · Filing not started                      │
│                       │                                           │
│ Notes/History         │ [Submit for review] [Remind me later]     │
└───────────────────────┴──────────────────────────────────────────┘
```

### Admin ops command center

```
┌──────────────────────────────────────────────────────────────────┐
│ Ops Command Center                                                │
├──────────────────────────────────────────────────────────────────┤
│ KPIs: At-Risk | Overdue | Failed Jobs | AI Escalations            │
├──────────────────────────┬───────────────────────────────────────┤
│ Priority Queues          │ Operational Signals                    │
│                          │                                        │
│ Clients at Risk          │ Failed Notifications (13 email, 4 SMS) │
│ · Acme LLC (high)        │                                        │
│ · Beta Corp (medium)     │ Workflow Failures                      │
│                          │ · doc classify timeout                 │
│ Overdue Obligations      │ · billing webhook retry                │
│ · annual report overdue  │                                        │
│ · entity verify pending  │ AI Escalations                         │
│                          │ · legal advice boundary                │
│ Urgent Documents         │ · no source found                      │
│ · service of process     │                                        │
├──────────────────────────┴───────────────────────────────────────┤
│ [Assign] [Escalate] [Retry] [Open Client 360]                    │
└──────────────────────────────────────────────────────────────────┘
```

### Admin client 360

```
┌──────────────────────────────────────────────────────────────────┐
│ Client 360: Acme Holdings LLC                                     │
├──────────────────────────────────────────────────────────────────┤
│ Header: name | plan | billing | risk grade | partner              │
├───────────────────────┬──────────────────────────────────────────┤
│ Entity Profile        │ Obligations                               │
│ · type, DOS#, juris   │ · due date, status, readiness             │
│                       │                                           │
│ Document Timeline     │ Notifications                             │
│ · uploads, urgent     │ · sent / failed                           │
│                       │                                           │
│ Internal Notes        │ AI Conversations                          │
│ · ops comments        │ · questions, confidence, escalations      │
│                       │                                           │
│ Audit History         │ Billing + Referrals                       │
│ · who changed what    │ · payment status, credits                 │
│                       │                                           │
│ Churn Signals         │ Upsell Opportunities                      │
└───────────────────────┴──────────────────────────────────────────┘
```

---

## 4. DB-to-UI Mapping

### Portal dashboard

| UI Block | Tables | API Endpoint | Status |
|----------|--------|-------------|--------|
| Entity hero | organizations, clients | `GET /clients/me` + `GET /organizations/:id` | ✅ |
| Obligations | obligations, rules | `GET /organizations/:id/obligations` | ✅ |
| Risk score | orgs, obls, docs, billing | `GET /organizations/:id/timeline` | ✅ |
| Risk summary | computed | `GET /portal/value?action=health` | ✅ |
| Actions | obls, docs, workflows | `GET /organizations/:id/timeline` (actions array) | ✅ |
| Recent docs | documents | `GET /organizations/:id/documents?limit=5` | ✅ |
| Notifications | notifications | `GET /organizations/:id/notifications?limit=5` | ✅ |
| Value received | billing, notifs, docs | `GET /portal/value?action=savings` | ✅ |
| Activity feed | audit_events, notifs | `GET /portal/value?action=activity` | ✅ |

### Portal documents center

| UI Block | Tables | API Endpoint | Status |
|----------|--------|-------------|--------|
| Document list | documents | `GET /organizations/:id/documents` | ✅ |
| Detail panel | documents, obligations | `GET /documents/:id` | ✅ |
| AI summary | documents, ai_conversations | `POST /assistant/summarize-document` | 🔧 needs OCR |
| "What should I do?" | computed | `POST /assistant/query` (contextual) | ✅ |
| Escalation | workflow_jobs, audit | `POST /documents/:id/escalate` | ✅ |

### Portal filing workspace

| UI Block | Tables | API Endpoint | Status |
|----------|--------|-------------|--------|
| Filing overview | obligations, rules | `GET /portal/value?action=filing-readiness` | ✅ |
| Readiness score | obls, docs, orgs | included in filing-readiness | ✅ |
| Missing checklist | computed | included in filing-readiness | ✅ |
| Submit for review | workflow_jobs, audit | `POST /obligations/:id/submit-review` | 📐 NEW |
| Upload docs | documents | `POST /documents/upload` | ✅ |

### Admin ops command center

| UI Block | Tables | API Endpoint | Status |
|----------|--------|-------------|--------|
| At-risk clients | orgs, clients, obls | `GET /admin/command-center` | ✅ |
| Overdue obligations | obligations | included in command-center | ✅ |
| Failed notifications | notifications | included in command-center | ✅ |
| Urgent documents | documents | `GET /admin/document-review` | ✅ |
| AI escalations | ai_conversations | `GET /admin/ai-review` | ✅ |
| Failed jobs | workflow_jobs | `GET /admin/workflow-failures` | ✅ |

### Admin client 360

| UI Block | Tables | API Endpoint | Status |
|----------|--------|-------------|--------|
| Client header | clients, orgs, billing | `GET /admin/client-360?email=x` | ✅ |
| Entity profile | organizations | included | ✅ |
| Obligations | obligations | included | ✅ |
| Documents | documents | included | ✅ |
| AI history | ai_conversations | included | ✅ |
| Audit log | audit_events | included | ✅ |
| Churn/upsell signals | computed | included | ✅ |
| Internal notes | client metadata | `PATCH /organizations/:id` | ✅ |

### Admin rules manager

| UI Block | Tables | API Endpoint | Status |
|----------|--------|-------------|--------|
| Rules table | rules | `GET /admin/rules` | ✅ |
| Rule detail | rules | per-rule in list | ✅ |
| Publish | rules, audit | `POST /admin/rules/publish` | ✅ |
| Impact preview | rules, obls, orgs | `POST /admin/rules/impact-preview` | 📐 NEW |
| Rollback | rules | supersede mechanism exists | 🔧 |

---

## 5. Missing Endpoints (from DB-to-UI mapping)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `POST /obligations/:id/submit-review` | Premium: submit filing for admin review | P1 |
| `POST /admin/rules/impact-preview` | Preview which entities affected by rule change | P1 |
| `GET /admin/risk-queue` | Dedicated risk-sorted client queue | P2 (covered by command-center) |
| `POST /admin/workflow-failures/:id/retry` | Retry a failed workflow job | P2 |

---

## 6. Build Order

### Phase 1 — Foundation (✅ COMPLETE)
- Compliance Command Center
- Ops Command Center
- Rules store + engine
- Assistant grounding
- Audit framework

### Phase 2 — Core value (✅ 90% COMPLETE)
- Document Intelligence Center
- Client 360
- Obligation console
- Workflow failure console

### Phase 3 — Premium layers (✅ 85% COMPLETE)
- Filing Readiness Workspace
- Communication Center
- Billing + Retention console
- Rules manager UI

### Phase 4 — Expansion (🔧 80% COMPLETE)
- Business Stack section
- Multi-Entity Portfolio
- AI Quality Console
- Partner Console
- Knowledge + Certification

### Phase 5 — Polish (📐 PLANNED)
- Lovable.dev frontend rebuild (React components)
- Document AI summarization (OCR integration)
- Health score trend (daily snapshot cron)
- Benchmark comparisons (needs 50+ clients)
- Full-text document search

---

## 7. Psychological Framework

The portal should repeatedly show:
- **What we're watching for you** → obligation timeline, monitoring badge
- **What we already handled** → activity feed, "handled for you" counter
- **What risk we reduced** → risk preview, penalty warnings, health score
- **What value you received** → savings calculator, services list
- **What you would have paid elsewhere** → market price comparison
- **What is included in your plan today** → business stack, entitlements

The admin should show:
- **What needs attention now** → risk queue, overdue, failures
- **Full client context** → Client 360, one page per client
- **Revenue opportunities** → churn risk, upsell candidates
- **System reliability** → notification delivery, workflow health
- **Legal accuracy** → rules versioning, audit trail

---

*This file is the canonical product specification.*
*Implementation status tracked in FEATURE-MATRIX.md.*
*Manual provisioning steps in MANUAL-ACTIONS.md.*
*Last updated: 2026-03-24*
