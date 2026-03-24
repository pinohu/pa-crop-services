# PA CROP Services — Master System Architecture

> **Version:** 2.0 — 2026-03-24
> **Status:** Canonical specification. All development references this document.
> **Supersedes:** `COMPLIANCE-ENGINE-ARCHITECTURE.md` (v1.0, retained for history)

---

## 1. System Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPERIENCE LAYER                                │
│  Public Website  │  Client Portal  │  Partner Portal  │  Admin Console  │
│  Chat Assistant  │  Partner Widget │  Email Templates │  PDF Reports    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                        APPLICATION LAYER                                │
│  Auth+Identity │ Billing │ CRM/Client Mgmt │ Doc Intake+Classification │
│  Notification Orchestration │ Referral Program │ Knowledge Base │ Reports│
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                        COMPLIANCE ENGINE                                │
│  Entity Registry │ Jurisdiction Rules │ Deadline Calculator             │
│  Obligation State Machine │ Reminder Scheduler │ Filing Workflow Mgr    │
│  Risk Scoring │ Audit Log                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                       INTELLIGENCE LAYER                                │
│  Retrieval-Based Assistant │ Knowledge Validation │ Templated Workflows │
│  Ops Copilots │ Triage/Classification Models                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                           DATA LAYER                                    │
│  Postgres (relational) │ Redis (state/cache/queue) │ Object Storage     │
│  Search Index / Vector Store │ Event Log │ Analytics Warehouse          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                       INTEGRATION LAYER                                 │
│  Stripe │ Emailit/SMS │ SuiteDash CRM │ PA DOS │ n8n │ Plausible       │
│  e-sign / forms / notarization │ 20i Hosting │ Upstash Redis            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why this matters:** The current repo duplicates business truth across homepage, FAQ, chatbot, and portal UI. That duplication is why deadline drift already appeared. This architecture eliminates it — every layer reads from the compliance engine, never from hardcoded content.

---

## 2. Domain Model

Seven core objects. Every feature in the system reads from or writes to these.

### 2.1 Organization

The business entity. The core compliance subject.

```
Organization
├── id                  CUID
├── legal_name          String        "Acme LLC"
├── entity_type         Enum          domestic_llc | foreign_business_corp | ...
├── jurisdiction        String        "PA"
├── dos_number          String?       PA DOS entity number (unique)
├── formation_date      DateTime?
├── status              Enum          ACTIVE | DUE_SOON | OVERDUE | AT_RISK | DISSOLVED | ...
├── risk_level          Enum          LOW | MEDIUM | HIGH | CRITICAL
├── registered_office   String?       Physical PA address
├── principal_office    String?
├── created_at          DateTime
├── updated_at          DateTime
│
├── → clients[]         Client
├── → obligations[]     Obligation
├── → documents[]       Document
├── → notifications[]   Notification
├── → conversations[]   Conversation
└── → audit_events[]    AuditEvent
```

### 2.2 Client

A person who owns/manages an Organization. Billing and communication target.

```
Client
├── id                  CUID
├── org_id              FK → Organization
├── owner_name          String
├── email               String (unique)
├── phone               String?
├── plan                Enum          COMPLIANCE_ONLY | BUSINESS_STARTER | BUSINESS_PRO | BUSINESS_EMPIRE
├── billing_status      Enum          ACTIVE | PAST_DUE | CANCELLED | TRIAL
├── onboarding_status   Enum          PENDING | IN_PROGRESS | COMPLETE
├── stripe_customer_id  String?
├── suitedash_id        String?
├── referral_code       String? (unique)
├── referred_by         String?       referral_code of referrer
├── created_at          DateTime
└── updated_at          DateTime
```

### 2.3 Obligation

A compliance obligation for an Organization. **This is the state machine.**

```
Obligation
├── id                  CUID
├── org_id              FK → Organization
├── obligation_type     Enum          ANNUAL_REPORT | REINSTATEMENT | CHANGE_RO | FOREIGN_REG
├── jurisdiction        String        "PA"
├── year                Int           The compliance year (2026)
├── due_date            DateTime
├── status              Enum          DETECTED | UPCOMING | REMINDER_SENT | AWAITING_CLIENT |
│                                     READY_TO_FILE | FILED | CONFIRMED | OVERDUE |
│                                     ESCALATED | RESOLVED
├── filing_method       Enum          SELF | MANAGED | AUTO
├── fee                 Int           7 (dollars)
├── confirmation_num    String?
├── filed_at            DateTime?
├── filed_by            String?       "system" | "client" | "admin:ike"
├── source_rule_version String        "2026.1" from compliance-rules.json
├── reminders_sent      Int[]         [90, 60, 30, 14, 7]
├── escalation_level    Int           0, 1, 2, ...
├── created_at          DateTime
└── updated_at          DateTime

Unique constraint: (org_id, obligation_type, year)
```

### 2.4 Document

Received mail, uploads, or system-generated documents.

```
Document
├── id                  CUID
├── org_id              FK → Organization
├── document_type       Enum          SERVICE_OF_PROCESS | GOVT_CORRESPONDENCE | ANNUAL_REPORT_NOTICE |
│                                     TAX_NOTICE | FILING_CONFIRMATION | LEGAL_NOTICE | GENERAL_MAIL |
│                                     CLIENT_UPLOAD | GENERATED_AGREEMENT | OTHER
├── file_name           String
├── storage_url         String?       S3/R2/Supabase Storage
├── received_at         DateTime
├── source              Enum          MAIL | EMAIL | UPLOAD | SCAN | SYSTEM
├── urgency             Enum          CRITICAL | HIGH | NORMAL | LOW
├── extracted_entities  JSON?         AI-extracted metadata
├── review_status       Enum          PENDING | REVIEWED | ESCALATED | ARCHIVED
├── reviewed_by         String?
├── reviewed_at         DateTime?
├── notes               String?
└── created_at          DateTime
```

### 2.5 Notification

Sent or scheduled communications about obligations or events.

```
Notification
├── id                  CUID
├── org_id              FK → Organization
├── obligation_id       FK → Obligation?
├── channel             Enum          EMAIL | SMS | PORTAL | PUSH
├── template_id         String        "reminder_90" | "overdue_escalation" | ...
├── scheduled_for       DateTime
├── sent_at             DateTime?
├── delivery_status     Enum          PENDING | SENT | DELIVERED | FAILED | BOUNCED
├── delivery_error      String?
├── recipient_email     String?
├── recipient_phone     String?
└── created_at          DateTime
```

### 2.6 Conversation

Full audit trail of every AI assistant interaction.

```
Conversation
├── id                  CUID
├── org_id              FK → Organization?
├── client_id           FK → Client?
├── session_id          String        Groups messages in a chat session
├── user_message        String
├── assistant_response  String
├── intent              Enum          COMPLIANCE_FACT | GENERAL_QUESTION | LEGAL_QUESTION |
│                                     ACTION_REQUEST | ONBOARDING_HELP | BILLING_QUESTION | ESCALATION
├── answer_source_refs  String[]      ["compliance-rules.json#entityTypes.domestic_llc"]
├── confidence          Float?        0.0 – 1.0
├── escalated           Boolean
├── escalation_reason   String?
└── created_at          DateTime
```

### 2.7 Audit Event

Immutable log. Answers: who changed what, when, why, before/after.

```
AuditEvent
├── id                  CUID
├── actor               String        "system" | "client:abc" | "admin:ike" | "agent:filing_ops"
├── event_type          String        "obligation_state_change" | "filing_completed" | "ai_response"
├── target_type         String        "organization" | "obligation" | "document" | "conversation"
├── target_id           String
├── org_id              FK → Organization?
├── before_state        JSON?
├── after_state         JSON?
├── reason              String?
├── metadata            JSON?
└── created_at          DateTime
```

### 2.8 Relationships

```
Organization 1──∞ Client
Organization 1──∞ Obligation
Organization 1──∞ Document
Organization 1──∞ Notification
Organization 1──∞ Conversation
Organization 1──∞ AuditEvent
Obligation    1──∞ Notification
Client        1──∞ Conversation
```

---

## 3. Compliance Engine Design

### 3.1 Rules Service

Canonical source: `data/compliance-rules.json` (version-tracked, PA DOS source-linked).
Runtime module: `api/_compliance.js` — all consumers import from here.

**What the rules contain:**
- 12 entity types with deadlines, fees, dissolution terms, reinstatement rules
- 3 deadline groups (corps June 30, LLCs Sept 30, others Dec 31)
- Enforcement mechanics (6-month delay, 2027 start, domestic vs foreign consequences)
- Reminder schedule (90/60/30/14/7 days)
- Registered office requirements (statute refs, forms, fees)
- Exemption list
- Filing URL and form number

**Drift prevention:** `scripts/validate-content.js` scans all 138+ files on every commit. Catches unqualified deadline claims, universal 2027 cutoff language, wrong fee amounts.

**Already built:** `data/compliance-rules.json`, `api/_compliance.js`, `api/compliance-rules.js` (public endpoint), `scripts/validate-content.js`.

### 3.2 Deadline Calculator

```
Input:
  entity_type     "domestic_llc"
  jurisdiction    "PA"
  formation_date  "2024-06-15"
  current_status  "ACTIVE"

Output:
  next_due_date       "2026-09-30"
  days_remaining      190
  deadline_label      "September 30"
  escalation_level    0 (none)
  filing_available    true
  enforcement_year    false (2026 < 2027)
  reinstatement       true (domestic)
  fee                 7
```

**Already built:** `getEntityDeadline()`, `computeDaysUntil()`, `getEntityConfig()` in `api/_compliance.js`.

### 3.3 Obligation State Machine

```
                    ┌──────────┐
          ┌────────►│  ACTIVE  │◄──────────────────────┐
          │         └────┬─────┘                        │
          │              │ within reminder window        │ filed
          │              ▼                               │
          │         ┌──────────┐                   ┌────┴─────┐
          │         │ UPCOMING │──────────────────►│  FILED   │
          │         └────┬─────┘                   └────┬─────┘
          │              │ reminder sent                 │ confirmed
          │              ▼                               ▼
          │         ┌──────────────┐              ┌──────────┐
          │         │REMINDER_SENT │              │CONFIRMED │──► RESOLVED
          │         └────┬─────────┘              └──────────┘
          │              │ client action needed
          │              ▼
          │         ┌──────────────────┐
          │         │ AWAITING_CLIENT  │
          │         └────┬─────────────┘
          │              │ ready
          │              ▼
          │         ┌──────────────┐
          │         │READY_TO_FILE │──────────────────► FILED
          │         └──────────────┘
          │
          │    (if deadline passes without filing at any above state)
          │              │
          │              ▼
          │         ┌──────────┐
    reinstate       │ OVERDUE  │
    (domestic)      └────┬─────┘
          │              │ enforcement year + 6 months
          │              ▼
          │         ┌──────────┐
          └─────────┤ESCALATED │──────► FILED (if cured)
                    └────┬─────┘
                         │ no action
                         ▼
                    ┌──────────┐
                    │DISSOLVED │  (terminal for foreign entities)
                    └──────────┘
```

**Valid transitions:**

| From | To |
|------|----|
| DETECTED | UPCOMING |
| UPCOMING | REMINDER_SENT, FILED, OVERDUE |
| REMINDER_SENT | AWAITING_CLIENT, FILED, OVERDUE |
| AWAITING_CLIENT | READY_TO_FILE, FILED, OVERDUE |
| READY_TO_FILE | FILED, OVERDUE |
| FILED | CONFIRMED, RESOLVED |
| CONFIRMED | RESOLVED |
| OVERDUE | ESCALATED, FILED, RESOLVED |
| ESCALATED | FILED, RESOLVED |
| RESOLVED | *(terminal)* |

**Already built:** `api/_obligations.js` — `computeForEntity()`, `transition()`, `evaluate()`, `computeRisk()`.

### 3.4 Scheduler

**Architecture:** n8n cron workflows call `api/scheduler.js`, which evaluates entity batches and returns action recommendations. n8n executes the actions (send emails, log deliveries).

| Workflow | Schedule | Endpoint Call | Purpose |
|----------|----------|---------------|---------|
| Corp Reminder | Daily 8am ET | `scheduler { action: 'process_reminders', deadlineGroup: 'corporations' }` | June 30 entities |
| LLC Reminder | Daily 8am ET | `scheduler { action: 'process_reminders', deadlineGroup: 'llcs' }` | Sept 30 entities |
| Other Reminder | Daily 8am ET | `scheduler { action: 'process_reminders', deadlineGroup: 'others' }` | Dec 31 entities |
| Overdue Escalation | Daily 8am ET | `scheduler { action: 'overdue_check' }` | Auto-escalate |
| Compliance Digest | Monday 9am ET | `scheduler { action: 'evaluate_all' }` | Summary to Ike |

**Already built:** `api/scheduler.js`, `api/entity-status.js`, 5 n8n workflow JSONs in `n8n-workflows/`.

---

## 4. AI Architecture

### The Problem

`api/chat.js` uses a prompt-based approach: static knowledge block injected, then LLM responds freely. This means it can override the knowledge, confidently give wrong compliance answers, and there's no citation trail.

### 3-Layer Stack

```
User message
    │
    ▼
┌──────────────────────────────────────────────────┐
│ Layer 1: RETRIEVAL                                │
│                                                   │
│ Pull only from:                                   │
│ • compliance-rules.json (canonical rules)         │
│ • client/org context (SuiteDash + Redis)          │
│ • approved knowledge base (articles, glossary)    │
│ • relevant documents (entity-specific)            │
└───────────────────────┬──────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────┐
│ Layer 2: GUARDRAILS                               │
│                                                   │
│ • Classify intent (6 types)                       │
│ • COMPLIANCE_FACT → deterministic answer (no LLM) │
│ • LEGAL_QUESTION → refuse, offer attorney referral│
│ • Cite exact rule or source for every claim       │
│ • Escalate uncertain answers                      │
│ • Never invent compliance facts                   │
└───────────────────────┬──────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────┐
│ Layer 3: ACTION ORCHESTRATION                     │
│                                                   │
│ AI can:                                           │
│ • Summarize a document                            │
│ • Explain a deadline                              │
│ • Prepare a reminder                              │
│ • Draft an email                                  │
│ • Suggest an upgrade                              │
│ • Escalate to human ops                           │
│                                                   │
│ AI cannot:                                        │
│ • Invent compliance facts                         │
│ • Give legal or tax advice                        │
│ • Make filing decisions without confirmation      │
└──────────────────────────────────────────────────┘
```

**Intent types and routing:**

| Intent | Route | LLM? | Citation? |
|--------|-------|------|-----------|
| COMPLIANCE_FACT | Rules engine lookup → deterministic | No | Auto (rule ref) |
| GENERAL_QUESTION | RAG over KB → LLM with guardrails | Yes | Required |
| LEGAL_QUESTION | Refuse → attorney referral | No | N/A |
| ACTION_REQUEST | Route to portal action | No | N/A |
| BILLING_QUESTION | Plan comparison / Stripe link | Maybe | N/A |
| ONBOARDING_HELP | Guided flow | Maybe | N/A |

**Already built:** `api/_guardrails.js` — `classifyIntent()`, `tryDeterministicAnswer()`, `shouldRefuse()`, `buildRefusalResponse()`, `buildGuardrailInstructions()`. Wired into `api/chat.js`.

**Every conversation logged:** `api/_log.js` → `logConversation()` with sessionId, intent, sources, confidence, escalated flag.

---

## 5. Agent Map

Six specialized agents, not one monolith.

### 5.1 Compliance Rules Agent

| | |
|-|-|
| **Purpose** | Monitor regulatory updates, propose rule changes, flag human review |
| **Inputs** | PA DOS official sources, internal rules store |
| **Outputs** | Candidate rule updates, change explanations, risk alerts |
| **Trigger** | Weekly cron + manual |
| **Tool access** | Web scraper (PA DOS), `data/compliance-rules.json` read/write |

### 5.2 Client Risk Agent

| | |
|-|-|
| **Purpose** | Score each entity daily, flag at-risk, prioritize intervention |
| **Inputs** | Obligation states, missed reminders, document urgency, onboarding completeness, billing status |
| **Outputs** | Risk score (LOW/MED/HIGH/CRITICAL), escalation queue, retention suggestions |
| **Trigger** | Daily via scheduler, on-demand via admin |
| **Tool access** | Redis entity state, obligation state machine |

**Already built (partial):** `computeRisk()` in `api/_obligations.js`, risk scoring in `api/entity-status.js`.

### 5.3 Document Intake Agent

| | |
|-|-|
| **Purpose** | Classify incoming mail/docs, extract key facts, assign urgency, create tasks |
| **Inputs** | Uploaded docs, scanned mail, email attachments |
| **Outputs** | Document type, extracted metadata, compliance implications, queue assignment |
| **Trigger** | On document_received event |
| **Tool access** | Groq LLM (classification), OCR, Redis, entity context |

**Already built (partial):** `api/classify-document.js`, `api/document-upload.js`.

### 5.4 Client Concierge Agent

| | |
|-|-|
| **Purpose** | Answer questions safely, guide onboarding, explain deadlines, escalate edge cases |
| **Inputs** | Rules DB, client context, approved KB, org obligations |
| **Outputs** | Cited answers, next best actions, handoff tickets |
| **Trigger** | On user message in chat |
| **Tool access** | `_compliance.js`, `_guardrails.js`, client context API, Redis |

**Already built:** `api/chat.js` with guardrails, `api/_guardrails.js`, `api/_compliance.js`.

### 5.5 Filing Ops Agent

| | |
|-|-|
| **Purpose** | Prepare filing packages, gather missing info, assemble tasks for human review |
| **Inputs** | Org profile, obligations, document set, form templates |
| **Outputs** | Filing-ready checklist, missing data requests, filing task bundles |
| **Trigger** | When obligation reaches READY_TO_FILE state |
| **Tool access** | Entity status API, document store, PA DOS filing portal |

### 5.6 Revenue/Retention Agent

| | |
|-|-|
| **Purpose** | Spot upgrade moments, trigger save campaigns, optimize lifecycle nudges |
| **Inputs** | Client usage, plan gaps, entity complexity, support interactions |
| **Outputs** | Upgrade prompts, churn risk actions, referral asks |
| **Trigger** | Daily via scheduler, on billing events |
| **Tool access** | Client context, obligation state, Stripe data, conversation audit |

**Already built (partial):** `api/client-health.js`, `api/churn-check.js`, `api/upsell.js`, `api/winback.js`.

---

## 6. Event-Driven Automation

### 6.1 Key Events

Every event is logged, triggers eligible workflows, updates state, and notifies interested services.

| Event | Source | Triggers |
|-------|--------|----------|
| `client_created` | Stripe webhook | CRM record, portal access, onboarding email, compliance profile init, first obligation, reminder schedule, audit log |
| `payment_succeeded` | Stripe webhook | Plan activation/renewal, receipt email |
| `payment_failed` | Stripe webhook | Dunning email, billing status update, risk score bump |
| `onboarding_completed` | Portal | Status update, welcome complete email |
| `entity_verified` | Admin/agent | Status update, obligation recompute |
| `document_received` | Mail scan / upload | Classify, extract, urgency check, entity timeline update, risk score update |
| `obligation_created` | Compliance engine | Reminder schedule generation |
| `reminder_due` | Scheduler | Email/SMS send, delivery tracking |
| `filing_overdue` | Scheduler | Escalation, urgent email, admin alert |
| `ai_conversation_escalated` | Chat guardrails | Human ops notification, ticket creation |
| `referral_converted` | Stripe webhook | Commission calculation, thank-you email |

### 6.2 Example Flow: New Client

```
1. Stripe checkout completes
2. POST /api/stripe-webhook → payment_succeeded
3. → client_created event
4. → SuiteDash contact created (CRM)
5. → Portal access code generated + emailed (Emailit)
6. → Entity registered in compliance engine (Redis)
7. → First obligation computed (annual report for entity type)
8. → Reminder schedule generated (90/60/30/14/7 before deadline)
9. → Audit event: "entity_registered" with full state snapshot
```

### 6.3 Example Flow: Document Received

```
1. Mail scanned at registered office
2. POST /api/document-upload → document_received
3. → Document Intake Agent classifies (SERVICE_OF_PROCESS? TAX_NOTICE?)
4. → Urgency assigned (CRITICAL if service of process)
5. → If CRITICAL: immediate email + SMS to client + admin alert
6. → Document attached to entity timeline in Redis
7. → Portal notification created
8. → Risk score updated
9. → Audit event: "document_received" with classification metadata
```

---

## 7. API Blueprint

### 7.1 Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Email + access code → session token |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/reset-code` | Email access code recovery |

### 7.2 Clients / Organizations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/clients/:id` | Client profile |
| GET | `/orgs/:id` | Organization profile + status |
| PATCH | `/orgs/:id` | Update org details |
| POST | `/orgs/:id/register` | Register entity in compliance engine |

### 7.3 Obligations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/orgs/:id/obligations` | All obligations for org |
| POST | `/orgs/:id/obligations/recompute` | Recalculate from rules engine |
| POST | `/obligations/:id/acknowledge` | Client acknowledges obligation |
| POST | `/obligations/:id/filed` | Record filing + confirmation number |
| GET | `/obligations/:id/history` | State change history |

### 7.4 Documents

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/documents/upload` | Upload + auto-classify |
| GET | `/orgs/:id/documents` | All documents for org |
| POST | `/documents/:id/classify` | Re-classify a document |
| POST | `/documents/:id/escalate` | Mark urgent + notify |

### 7.5 Notifications

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/orgs/:id/notifications` | Notification history |
| POST | `/notifications/test` | Send test notification |
| POST | `/notifications/preferences` | Update notification preferences |

### 7.6 Assistant

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/assistant/query` | Chat with guardrails + audit |
| POST | `/assistant/explain-obligation` | Explain a specific obligation |
| POST | `/assistant/summarize-document` | Summarize a document |
| POST | `/assistant/escalate` | Hand off to human ops |

### 7.7 Billing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/billing/upgrade` | Generate upgrade Stripe link |
| POST | `/billing/cancel` | Cancel subscription |
| GET | `/billing/plan` | Current plan details |

### 7.8 Referral

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/referrals/me` | My referral stats |
| POST | `/referrals/share` | Generate referral link |
| GET | `/referrals/status` | Referral conversion status |

### 7.9 Compliance Engine (internal)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/compliance-rules` | Canonical rules (public) |
| GET/POST | `/entity-status` | Entity + obligation state CRUD |
| POST | `/scheduler` | Batch compliance processing (n8n) |
| GET | `/compliance-dashboard` | Real-time posture (admin) |

---

## 8. Implementation Stack

### Frontend (Phase 4+)
- **Next.js** — server-rendered public pages, authenticated portal/admin
- **Componentized design system** — Outfit + Instrument Serif, slate/gold palette
- **Typed API client** — generated from API contracts
- **Loading/error states** — real status from compliance engine
- **Feature flags** — progressive rollout

### Backend (current + evolution)
- **Node.js / ESM** — Vercel serverless (current)
- **Postgres** — Supabase (domain model) via **Prisma**
- **Redis** — Upstash (state/cache/queue/rate-limiting)
- **Object storage** — Supabase Storage or Cloudflare R2 (documents)
- **n8n** — workflow orchestration (scheduler, event processing)

### AI
- **Groq Llama 3.3** — LLM for general questions (current)
- **Rules engine** — deterministic answers for compliance facts (no LLM)
- **Guardrails** — intent classification, citation enforcement, legal boundary
- **Audit table** — every AI answer logged with sources + confidence

### Ops
- **Structured JSON logs** — `api/_log.js` → Vercel log drain → Axiom/Betterstack
- **Upstash Redis metrics** — daily counters for chat, subscriptions, escalations
- **Compliance dashboard** — `api/compliance-dashboard.js` (admin)
- **Alerting** — overdue escalation emails to Ike, n8n failure notifications

---

## 9. Security & Trust

### Already implemented
- [x] CORS restricted to `pacropservices.com` on chat + subscribe endpoints
- [x] Durable rate limiting via Upstash Redis (`api/_ratelimit.js`)
- [x] Admin key authentication on all write endpoints
- [x] HSTS, X-Frame-Options: DENY, nosniff, Permissions-Policy in `vercel.json`
- [x] Structured logging with actor tracking
- [x] Immutable audit events (append-only in Redis)
- [x] Chatbot guardrails (intent classification, legal boundary, citation requirement)

### Needed for production
- [ ] Signed session auth (JWT or cookie-based, replace access code + localStorage)
- [ ] RBAC: admin / partner / client role separation
- [ ] Stripe webhook signature verification (`STRIPE_WEBHOOK_SECRET` env var)
- [ ] Encrypted secret storage (Vercel env vars are sufficient for now)
- [ ] Incident alerting (Slack/email on error spikes)
- [ ] SPF + DMARC on root domain (URGENT — see MANUAL-ACTIONS.md)

---

## 10. Build Sequence

### Phase 1 — Stabilize Truth ✅ COMPLETE

- [x] `data/compliance-rules.json` — canonical rules store
- [x] `api/_compliance.js` — shared rules engine
- [x] Fix all legal/date copy (60+ changes across 30+ files)
- [x] `scripts/validate-content.js` — CI drift prevention
- [x] Chatbot reads from rules engine, not hardcoded KB
- [x] Citation requirement in LLM system prompt
- [x] Deterministic answers for compliance facts (no LLM)

### Phase 2 — Build the Engine ✅ COMPLETE

- [x] `schema/schema.prisma` — 7-model domain schema
- [x] `api/_obligations.js` — state machine with 10 states
- [x] `api/_db.js` — Redis persistence layer
- [x] `api/entity-status.js` — entity + obligation CRUD
- [x] `api/scheduler.js` — batch compliance processing
- [x] `api/compliance-dashboard.js` — real-time posture
- [x] 5 n8n workflow JSONs ready for import
- [x] `scripts/bulk-register.js` — SuiteDash → engine migration
- [ ] **Activate:** Provision Upstash Redis + import n8n workflows

### Phase 3 — Harden Operations ✅ MOSTLY COMPLETE

- [x] Durable rate limiting (`api/_ratelimit.js`)
- [x] Structured logging (`api/_log.js`)
- [x] Subscribe error visibility (no more `.catch(() => {})`)
- [x] CORS restriction on public endpoints
- [x] Chatbot guardrails + audit trail
- [ ] SPF + DMARC DNS fix (URGENT — manual, see MANUAL-ACTIONS.md)
- [ ] Stripe webhook signature verification
- [ ] Log drain setup (Axiom/Betterstack)

### Phase 4 — Rebuild Portal on Real State

- [ ] Portal reads entity status from compliance engine API
- [ ] Obligation feed (real state, not mock)
- [ ] Document timeline (real uploads, not localStorage)
- [ ] Audit trail visible to client ("what happened and when")
- [ ] Action center ("file now", "confirm details", "upgrade plan")
- [ ] Split `portal.html` into React/Next.js component system

### Phase 5 — Agentify

- [ ] Document Intake Agent (classify + extract + urgency + task creation)
- [ ] Client Risk Agent (daily scoring, escalation queue)
- [ ] Filing Ops Agent (prepare packages, gather missing info)
- [ ] Revenue/Retention Agent (upgrade moments, save campaigns)
- [ ] Compliance Rules Agent (monitor PA DOS for changes)

### Phase 6 — Scale

- [ ] Partner portal (white-label CPA/attorney dashboard)
- [ ] Multi-state rules engine (NJ, DE, NY — same architecture)
- [ ] White-label mode (partner branding)
- [ ] Compliance command center (aggregate view across all entities)

---

## 11. What This Becomes

If built correctly, this stops being a Pennsylvania CROP website and becomes a **compliance operating system for small entities**.

The long-term value is not just serving as a CROP. It is owning:

| Capability | Current State | Target State |
|-----------|---------------|-------------|
| Deadline intelligence | Hardcoded in HTML | Rules engine + state machine |
| Entity health | Unknown | Real-time risk scoring |
| Compliance workflow | Marketing copy | Event-driven automation |
| Partner distribution | Static page | API-backed partner portal |
| Multi-state expansion | PA only | Jurisdiction-agnostic rules engine |

**The compliance engine is the product.** The website is just one of its interfaces.

---

## 12. Current Module Inventory

### Compliance Engine Core (`api/`)

| Module | Purpose | Status |
|--------|---------|--------|
| `_compliance.js` | Rules engine — all deadline/fee/penalty logic | ✅ Live |
| `_obligations.js` | State machine — 10 states, transitions, risk | ✅ Live |
| `_guardrails.js` | Chatbot control — intent, citations, legal boundary | ✅ Live |
| `_db.js` | Redis — entity/obligation CRUD, events, metrics | ✅ Live (needs Upstash) |
| `_log.js` | Structured JSON logging | ✅ Live |
| `_ratelimit.js` | Upstash Redis + in-memory fallback | ✅ Live |
| `compliance-rules.js` | Public rules API | ✅ Live |
| `entity-status.js` | Entity + obligation management | ✅ Live |
| `scheduler.js` | Batch compliance processing | ✅ Live |
| `compliance-dashboard.js` | Admin dashboard API | ✅ Live |
| `chat.js` | Chatbot with guardrails pipeline | ✅ Live |
| `client-context.js` | Client data aggregator | ✅ Live |

### Data

| File | Purpose | Status |
|------|---------|--------|
| `data/compliance-rules.json` | Canonical PA compliance rules | ✅ Source of truth |
| `data/compliance-rules.js` | JS module export (Edge compatible) | ✅ Runtime import |
| `schema/schema.prisma` | 7-model domain schema | ✅ Ready (needs DB) |

### Tooling

| File | Purpose | Status |
|------|---------|--------|
| `scripts/validate-content.js` | CI content validation (138 files) | ✅ Passing |
| `scripts/bulk-register.js` | SuiteDash → engine migration | ✅ Ready |
| `n8n-workflows/*.json` | 5 scheduler workflows | ✅ Ready for import |

---

*This document is the single specification for PA CROP Services system architecture.
All development, agent work, and infrastructure decisions reference this document.
Updated: 2026-03-24*
