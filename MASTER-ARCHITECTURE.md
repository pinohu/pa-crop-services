# Master Architecture Document

## PA CROP Services → Compliance Operating System

This turns the current repo from a marketing-led shell into a real compliance platform. The need for this is visible in the current codebase: legal/compliance truth is duplicated across the homepage, chatbot, portal, and supporting pages, and parts of the portal are monolithic and fragile.

---

## 1. Executive summary

### Target outcome

Build a production-grade compliance platform that:
- tracks entity obligations correctly
- personalizes deadlines by entity type and jurisdiction
- ingests and classifies documents
- triggers reminders and actions reliably
- gives safe, source-backed AI assistance
- creates an auditable trail for every important system action

### Core shift

Move from:

> website + chatbot + portal UI

to:

> compliance engine + workflow system + trusted client experience

### Strategic product identity

The platform should become:

> A compliance operating system for small entities, firms, and partner channels

not just:

> A Pennsylvania registered office website

---

## 2. Current-state diagnosis

### What exists now

The repo shows:
- a polished static marketing site with plan/pricing structure and SEO basics
- Vercel configuration and basic security headers
- a newsletter capture endpoint and workflow handoff path
- a streaming chatbot endpoint driven by prompt instructions
- a large portal page simulating dashboard, documents, settings, referrals, hosting, AI assistant, and more

### Primary weaknesses
- duplicated business truth across multiple surfaces
- legal deadline logic currently overgeneralized
- AI answers not source-enforced
- portal state partly simulated and front-end heavy
- silent failure patterns in automation
- no evident durable compliance engine
- no audit-grade system-of-record model

---

## 3. Design principles

### 3.1 Single source of truth

All compliance facts must originate from a canonical rules store.
No hardcoded deadlines in:
- homepage copy
- chatbot prompts
- portal UI
- article text snippets

### 3.2 State over prose

Compliance is a state machine, not a content problem.

### 3.3 AI must be bounded

AI explains and assists. It does not define law or invent compliance obligations.

### 3.4 Every important action must be auditable

You must be able to answer:
- what happened
- why it happened
- what the system knew at the time
- what the AI told the client
- which rule version drove the decision

### 3.5 Events drive automation

Notifications, reminders, escalations, and ops tasks should be event-driven.

### 3.6 Client experience must read from real state

The portal cannot continue to behave like a simulation layer.

---

## 4. Target architecture overview

```
                    ┌──────────────────────────────┐
                    │      Experience Layer        │
                    │ public site / portal / admin │
                    │ partner portal / AI chat     │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │      Application Layer       │
                    │ auth / billing / CRM / docs  │
                    │ notifications / referrals    │
                    │ KB / reporting / APIs        │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │      Compliance Engine       │
                    │ rules / obligations / risk   │
                    │ deadlines / filing states    │
                    │ scheduler / audit            │
                    └──────────────┬───────────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
┌────────────▼────────────┐ ┌──────▼─────────┐ ┌────────▼──────────┐
│       Data Layer        │ │ Intelligence   │ │ Integration Layer │
│ postgres / object store │ │ retrieval / AI │ │ stripe / email /  │
│ vector index / analytics│ │ guardrails     │ │ sms / n8n / CRM   │
└─────────────────────────┘ └────────────────┘ └───────────────────┘
```

---

## 5. Logical service boundaries

### 5.1 Experience layer

**Public website**

Responsibilities:
- acquisition
- education
- plan selection
- legal/FAQ content
- partner landing pages
- conversion flows

Must not own compliance truth directly.

**Client portal**

Responsibilities:
- show obligations
- show documents
- show reminders
- show account/billing/plan state
- invoke AI assistant
- expose audit-relevant history

**Admin console**

Responsibilities:
- review escalations
- manage rules
- review AI responses
- monitor workflow failures
- override entity states
- manage partner and ops workflows

**Partner portal**

Responsibilities:
- referral tracking
- white-label/CPA-attorney partner workflows
- portfolio-level view for referred clients

### 5.2 Application layer

**Auth service** — login, session management, RBAC, reset/access code, client/admin/partner role separation

**Client service** — client profile, plan, onboarding state, partner attribution, communication preferences

**Entity service** — legal entity profile, jurisdiction, entity type, state status, registration metadata, registered office relationship

**Obligation service** — annual reports, filings, state deadlines, due dates, statuses, recalculation based on rule versions

**Document service** — upload, intake, storage, classification, metadata extraction, linkage to entities and obligations

**Notification service** — email/SMS reminders, delivery state, template selection, retries, escalation triggers

**Billing service** — plan checkout, renewals, upgrades, dunning, entitlement mapping

**Referral service** — referral code generation, partner attribution, conversion linkage, payout/credit logic

**Knowledge service** — approved articles, FAQs, policy snippets, versioned answer sources

**Reporting service** — funnel analytics, delivery metrics, compliance outcomes, client risk trends, AI accuracy monitoring

### 5.3 Compliance engine

This is the core platform.

**Rules service**

Stores structured rules, versioned. Example object:

```json
{
  "jurisdiction": "PA",
  "entity_type": "LLC",
  "obligation_type": "annual_report",
  "due_date_rule": "yearly:09-30",
  "fee_usd": 7,
  "penalty_rule": "administrative action six months after missed due date",
  "authority_source": "PA Department of State annual reports guidance",
  "version": "2026-03-24",
  "is_active": true
}
```

**Deadline engine** — computes due date, days to deadline, grace/escalation windows, next action, filing requirements, special handling by entity type and jurisdiction

**Obligation state machine** — canonical states: created, upcoming, reminder_scheduled, reminder_sent, awaiting_client_input, ready_to_file, filed_pending_confirmation, filed_confirmed, overdue, escalated, closed

**Risk engine** — scores each entity/client using: overdue obligations, entity verification completeness, document urgency, onboarding completeness, missed notifications, payment issues, support signals

**Audit engine** — writes durable events for: obligation creation, rule recalculation, notification scheduling/sending, AI answers, manual overrides, document classification, billing changes

---

## 6. Data architecture

### 6.1 Core relational schema

**organizations** — id, legal_name, display_name, entity_type, jurisdiction, dos_number, formation_date, status, principal_address, registered_office_address, created_at, updated_at

**clients** — id, organization_id, owner_name, email, phone, plan_code, billing_status, onboarding_status, partner_id, referral_code, created_at, updated_at

**obligations** — id, organization_id, obligation_type, jurisdiction, rule_version, due_date, fee_usd, status, escalation_level, filing_method, created_at, updated_at

**documents** — id, organization_id, obligation_id (nullable), document_type, source_channel, filename, mime_type, storage_url, extracted_text, urgency, classifier_version, received_at, processed_at, review_status

**notifications** — id, organization_id, obligation_id (nullable), notification_type, channel, template_id, scheduled_for, sent_at, delivery_status, retry_count

**ai_conversations** — id, organization_id (nullable), client_id (nullable), channel, user_message, answer_text, source_refs_json, confidence_score, escalation_flag, created_at

**audit_events** — id, actor_type, actor_id, event_type, target_type, target_id, before_json, after_json, reason, created_at

**rules** — id, jurisdiction, entity_type, obligation_type, rule_json, authority_source, version, effective_date, superseded_at (nullable), is_active

**referrals** — id, referrer_client_id, referred_email, status, conversion_date, credit_amount, created_at

**partners** — id, partner_type, name, email, payout_terms, white_label_settings_json, created_at

### 6.2 Object storage

Use for: scanned legal documents, uploaded files, PDFs, signed agreements, generated certificates, exported reports.

Rules: immutable file objects, versioned keys, malware scan before final persistence, signed URLs only for client access.

### 6.3 Search / vector layer

Use for: knowledge base search, policy/article retrieval, document semantic lookup, conversation grounding.

Do not use it as the legal source of truth. It is for retrieval, not authority.

### 6.4 Analytics layer

Capture: page conversion, lead funnel, subscription success/failure, AI usage, document intake volumes, notification delivery performance, overdue rates, upgrade triggers.

---

## 7. Event architecture

### 7.1 Core events

client.created, client.onboarding_completed, entity.created, entity.updated, entity.verified, obligation.created, obligation.updated, obligation.overdue, document.received, document.classified, notification.scheduled, notification.sent, billing.payment_succeeded, billing.payment_failed, referral.converted, ai.answer_generated, ai.answer_escalated

### 7.2 Event routing

Each event should: be written to the audit/event log, update system state if needed, trigger workflows, generate ops tasks if exceptions occur.

### 7.3 Example: new client event flow

```
billing.payment_succeeded
  → client.created
  → entity.initialized
  → onboarding.checklist_created
  → obligation.created
  → reminder.schedule_generated
  → welcome.email_sent
  → audit.event_written
```

### 7.4 Example: document flow

```
document.received
  → file.stored
  → document.classified
  → urgency.assessed
  → linked_to_org
  → risk.recomputed
  → client.notified
  → audit.event_written
```

---

## 8. AI architecture

### 8.1 AI roles

AI should perform: explanation, summarization, triage, drafting, escalation support, next-step guidance.

AI should not: invent deadlines, override rules, provide legal advice, independently define filing consequences.

### 8.2 AI pipeline

**Step 1: Intent classification** — deadline question, document question, plan question, filing status question, legal advice boundary case, support escalation

**Step 2: Retrieval** — pull from: rules table, organization context, obligations table, approved KB articles, document metadata/summaries

**Step 3: Policy check** — decide: answer directly, answer with disclaimer, defer to attorney/CPA, escalate to human ops

**Step 4: Response generation** — generate: answer text, cited source refs, confidence score, next best action

**Step 5: Logging** — write: prompt class, sources used, answer text, confidence, escalation flag

### 8.3 AI answer contract

```json
{
  "answer": "For your Pennsylvania LLC, the annual report is due on September 30.",
  "sources": [
    {"type": "rule", "id": "pa-llc-annual-report-v2026-03-24"},
    {"type": "organization_context", "id": "org_123"}
  ],
  "confidence": 0.98,
  "escalate": false,
  "next_action": "Would you like me to show your current filing status?"
}
```

### 8.4 Agent layer

Recommended specialized agents: rules-watch, document-intake, client-risk, concierge, filing-ops, retention/revenue.

---

## 9. API design

### 9.1 Auth
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/reset-code
- GET /api/auth/session

### 9.2 Client + organization
- GET /api/clients/me
- GET /api/organizations/:id
- PATCH /api/organizations/:id
- POST /api/organizations/:id/verify

### 9.3 Obligations
- GET /api/organizations/:id/obligations
- POST /api/organizations/:id/obligations/recompute
- POST /api/obligations/:id/acknowledge
- POST /api/obligations/:id/mark-filed

### 9.4 Documents
- POST /api/documents/upload
- GET /api/organizations/:id/documents
- GET /api/documents/:id
- POST /api/documents/:id/classify
- POST /api/documents/:id/escalate

### 9.5 Notifications
- GET /api/organizations/:id/notifications
- POST /api/notifications/preferences
- POST /api/notifications/test

### 9.6 Assistant
- POST /api/assistant/query
- POST /api/assistant/explain-obligation
- POST /api/assistant/summarize-document
- POST /api/assistant/escalate

### 9.7 Billing
- POST /api/billing/checkout
- POST /api/billing/upgrade
- POST /api/billing/cancel
- GET /api/billing/plan

### 9.8 Referral / partner
- GET /api/referrals/me
- POST /api/referrals/share
- GET /api/partners/me/clients

### 9.9 Admin / rules
- GET /api/admin/rules
- POST /api/admin/rules
- POST /api/admin/rules/publish
- GET /api/admin/audit
- GET /api/admin/workflow-failures

---

## 10. Frontend architecture

### 10.1 Public site

Replace hardcoded truth with: CMS-backed or rules-backed content blocks, reusable pricing/legal components, source-aware FAQ rendering.

Modules: marketing pages, article pages, compliance checker, partner pages, checkout flows.

### 10.2 Client portal

Refactor portal.html into a modular app.

Modules: dashboard, obligations center, document timeline, notifications center, assistant panel, account/billing, referrals, settings, audit/history.

**UI state model:** The front end should read only from APIs and local transient state, not simulate business truth.

---

## 11. Security architecture

### 11.1 Required controls

Signed session tokens, RBAC for client/admin/partner, origin-restricted CORS, durable rate limiting, CSRF protection, webhook signature verification, secret rotation and vault storage, malware scanning for uploaded documents, signed document URLs, structured security logging.

### 11.2 Data protection

Encrypt sensitive data at rest, minimal PII storage, retention policy enforcement, access audit trail, role-based document visibility, human escalation and override logging.

---

## 12. Reliability architecture

### 12.1 Required controls

No silent catch for business-critical actions. Retry policies for webhooks and outbound notifications. Dead-letter queue for failed jobs. Workflow failure dashboard. Alerting for: failed payment webhooks, failed email sends, failed reminder scheduling, failed document classification, failed AI escalation routes.

### 12.2 Logging

Each service should emit: request id, actor, organization id, outcome, latency, error class, retry state.

---

## 13. Integration architecture

**Stripe** — checkout, subscriptions, upgrades, dunning, webhook-driven entitlement updates.

**CRM** — SuiteDash can remain an integration, but should not be the system of record for compliance state.

**Workflow engine** — n8n can orchestrate onboarding, reminder sequencing, renewal campaigns, escalation emails, partner workflows. But the compliance state itself should live in the app DB, not only in n8n.

**Email/SMS** — use providers with delivery status callbacks, bounce tracking, retry support, templating.

**Hosting** — hosting integrations should be entitlement-aware and isolated from core compliance logic.

---

## 14. Service responsibility matrix

| Service | Owns truth? | Reads truth? | Writes audit? |
|---------|------------|-------------|--------------|
| Rules service | Yes | Yes | Yes |
| Entity service | Yes | Yes | Yes |
| Obligation service | Yes | Yes | Yes |
| Document service | Yes | Yes | Yes |
| Notification service | No | Yes | Yes |
| Billing service | Yes (billing) | Yes | Yes |
| Assistant service | No | Yes | Yes |
| Portal frontend | No | Yes | No |
| Public website | No | Yes | No |

---

## 15. Recommended implementation stack

**Frontend** — Next.js, TypeScript, component library, shared typed API contracts, SSR for public site, authenticated SPA-like portal modules.

**Backend** — Node.js/TypeScript, Postgres, Prisma, Redis for rate limits/queues/caching, S3-compatible object storage, n8n and/or queue workers.

**AI** — retrieval layer over rules + KB + org context, guarded answer composer, embeddings only for search and retrieval, conversation/audit storage.

**Observability** — Sentry, structured log pipeline, analytics event ingestion, uptime/queue monitors, workflow alerts.

---

## 16. Build roadmap

**Phase 1 — Truth stabilization** — rules schema/DB, fix all compliance copy, remove duplicated logic, centralize FAQs

**Phase 2 — Compliance engine** — organizations, obligations, deadline calculator, state machine, audit engine

**Phase 3 — API and portal rebuild** — modular portal, API-backed dashboard, obligations/document views, notification center, plan entitlements

**Phase 4 — Reliability + security** — durable rate limiting, structured logs, no silent failures, retries, dead-letter queues, restricted CORS, webhook verification

**Phase 5 — AI hardening** — retrieval-backed assistant, source citations, answer confidence, escalation routing, AI audit review tools

**Phase 6 — Partner and scale** — partner portal, multistate rules, white-label mode, portfolio dashboards, advanced retention/upgrade automation

---

## 17. Immediate repo remediation tasks

**High priority** — correct annual report logic, fix portal script integrity, remove silent failures from subscribe, replace in-memory rate limiting, lock down CORS on public APIs.

**Medium priority** — move chatbot knowledge into managed KB/rules source, separate analytics/tracking policy, add workflow failure monitoring, verify every portal API endpoint.

---

## 18. Final target state

When complete, the system should be able to do this reliably:

1. A client signs up.
2. The system identifies entity type and jurisdiction.
3. The engine computes obligations from versioned rules.
4. Reminders are scheduled automatically.
5. Documents are ingested and classified.
6. The portal shows real status, not simulated status.
7. The assistant answers from approved sources and client context.
8. Every action is logged and reviewable.
9. Ops can intervene cleanly.
10. Partner channels and multistate expansion plug into the same engine.

That is the architecture that turns this from a promising repo into a durable business platform.

---
---

## Appendix A: Implementation Status

> Maps the architecture above to what currently exists in the repo.
> Updated: 2026-03-24

### Phase 1 — Truth stabilization: ✅ COMPLETE

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Canonical rules store | `data/compliance-rules.json` — 12 entity types, 3 deadline groups, enforcement, fees, reminders, exemptions | ✅ Live |
| Rules runtime module | `api/_compliance.js` — getRules, resolveEntityType, getEntityConfig, getEntityDeadline, computeDaysUntil, buildChatbotKnowledge | ✅ Live |
| Rules public API | `api/compliance-rules.js` — entity lookups, full rules, field queries | ✅ Live |
| Fix duplicated deadline logic | 60+ changes across 30+ files | ✅ Done |
| Content drift prevention | `scripts/validate-content.js` — 138 files scanned against rules | ✅ Passing |
| Chatbot reads from rules | `api/chat.js` — KB generated by buildChatbotKnowledge() | ✅ Live |
| Client context reads from rules | `api/client-context.js` — imports from _compliance.js | ✅ Live |

### Phase 2 — Compliance engine: ✅ MOSTLY COMPLETE

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Obligation state machine | `api/_obligations.js` — 10 states, validated transitions, risk scoring | ✅ Live |
| Deadline calculator | getEntityDeadline(), computeDaysUntil() in _compliance.js | ✅ Live |
| Redis persistence | `api/_db.js` — entity/obligation CRUD, event log, metrics | ✅ Live (needs Upstash) |
| Entity status API | `api/entity-status.js` — register, transition, file, evaluate | ✅ Live |
| Scheduler webhook | `api/scheduler.js` — process_reminders, evaluate_all, overdue_check | ✅ Live |
| Dashboard | `api/compliance-dashboard.js` — posture, metrics, events | ✅ Live |
| n8n workflows | `n8n-workflows/` — 5 JSONs ready for import | ✅ Ready |
| Bulk registration | `scripts/bulk-register.js` | ✅ Ready |
| Domain model | `schema/schema.prisma` — 7 models | ✅ Schema ready |
| **Activate Upstash** | Set UPSTASH_REDIS_REST_URL + TOKEN in Vercel | ❌ Manual |
| **Import n8n workflows** | Import JSONs, set credentials, activate | ❌ Manual |

### Phase 3/4 — Reliability + security: ✅ PARTIALLY COMPLETE

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Durable rate limiting | `api/_ratelimit.js` — Upstash + fallback | ✅ Live |
| Structured logging | `api/_log.js` — JSON, scoped loggers, audit | ✅ Live |
| No silent failures | `api/subscribe.js` rewritten with error visibility | ✅ Fixed |
| CORS restriction | chat.js + subscribe.js → pacropservices.com only | ✅ Live |
| Chatbot guardrails | `api/_guardrails.js` — 6 intents, deterministic answers, legal boundary | ✅ Live |
| Privacy disclosure | Clarity session replay explicitly disclosed | ✅ Fixed |
| Portal bug | loadEntities() stray catch removed | ✅ Fixed |
| **SPF + DMARC** | Deleted via API, need manual re-add in 20i | 🔴 URGENT |
| Signed session auth | Not yet — currently access code + localStorage | ❌ Phase 4 |
| RBAC | Not yet — currently admin-key only | ❌ Phase 4 |

### Phase 5 — AI: ✅ PARTIALLY COMPLETE

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Intent classification | classifyIntent() — 6 intents, 40+ patterns | ✅ Live |
| Deterministic compliance answers | tryDeterministicAnswer() — rules engine, 1.0 confidence | ✅ Live |
| Legal boundary | shouldRefuse() + buildRefusalResponse() | ✅ Live |
| LLM guardrail injection | buildGuardrailInstructions() — citation, uncertainty, deference | ✅ Live |
| AI answer contract (8.3) | Partial — deterministic path returns {answer, sources, confidence} | ⚠️ Partial |
| KB article retrieval | Not yet — rules retrieval done, article retrieval not yet | ⚠️ Partial |

### Phase 6 — Partner/scale: NOT STARTED

---

## Appendix B: Module Inventory

| Module | Arch section | Purpose | Status |
|--------|-------------|---------|--------|
| `_compliance.js` | 5.3 | Rules engine | ✅ |
| `_obligations.js` | 5.3 | State machine | ✅ |
| `_guardrails.js` | 8.2 | AI pipeline control | ✅ |
| `_db.js` | 6.1 | Redis persistence | ✅ |
| `_log.js` | 12.2 | Structured logging | ✅ |
| `_ratelimit.js` | 11.1 | Rate limiting | ✅ |
| `compliance-rules.js` | 5.3 | Public rules API | ✅ |
| `entity-status.js` | 5.2 | Entity + obligation API | ✅ |
| `scheduler.js` | 5.3 | Batch processing | ✅ |
| `compliance-dashboard.js` | 5.2 | Admin dashboard | ✅ |
| `chat.js` | 8.2 | Chatbot with guardrails | ✅ |
| `client-context.js` | 5.2 | Client data aggregator | ✅ |
| `data/compliance-rules.json` | 5.3 | Canonical rules | ✅ |
| `schema/schema.prisma` | 6.1 | Domain model | ✅ schema |
| `scripts/validate-content.js` | 3.1 | Content validation CI | ✅ |
| `scripts/bulk-register.js` | 5.2 | Migration script | ✅ |
| `n8n-workflows/*.json` | 5.3 | 5 scheduler workflows | ✅ |

---

## Appendix C: Activation Checklist

| # | Action | Time | Blocks |
|---|--------|------|--------|
| 1 | Add SPF + DMARC in 20i dashboard | 2 min | Email deliverability |
| 2 | Provision Upstash Redis + set Vercel env vars | 5 min | Engine persistence |
| 3 | Import 5 n8n workflows + configure | 30 min | Live reminders |
| 4 | Run bulk-register script | 5 min | Scheduler entities |
| 5 | Confirm CROP license (call 717-787-1057) | 5 min | Legal authority |
| 6 | Apply for EIN at irs.gov | 10 min | Bank account |
| 7 | Open bank account + connect Stripe | 30 min–days | Revenue |
| 8 | Bind E&O insurance | 1–3 days | Before clients |

Full details: `MANUAL-ACTIONS.md`

---

*Canonical specification for PA CROP Services system architecture.*
*Sections 1–18: target architecture (Ike). Appendices A–C: implementation status (Claude).*
*All development references this document. Last updated: 2026-03-24.*
