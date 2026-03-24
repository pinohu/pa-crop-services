# PA CROP Services — Compliance Engine Architecture

> **Status:** Blueprint (v1.0) — 2026-03-24
> **Author:** Claude (CEO, Dynasty Empire) + Ike (Owner audit)
> **Purpose:** Transform PA CROP from a marketing shell into a self-operating compliance system

---

## The Problem

PA CROP Services currently has:

- A strong marketing site (36 pages, 10 city pages, 9 SEO articles)
- A UI portal that *looks* like a compliance dashboard
- A chatbot that *sounds* authoritative
- Real SuiteDash integrations for CRM

PA CROP Services does **not** have:

- A compliance engine that enforces correctness
- Entity-type-aware deadline logic tied to actual filings
- A state machine tracking filing status transitions
- A single source of truth for compliance rules
- Guardrails preventing the chatbot from hallucinating legal guidance
- Audit trails for AI outputs or system decisions
- Observability into conversion, errors, or system behavior

**The gap:** Users think they are managing compliance. They are interacting with a front-end simulation layer. For a compliance product, the backstage is everything.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
│  pacropservices.com  │  Portal  │  Chatbot  │  Partner Widget   │
└──────────┬──────────────┬──────────┬──────────────┬─────────────┘
           │              │          │              │
           ▼              ▼          ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                             │
│  Vercel Serverless  │  Rate Limiting (Upstash)  │  CORS         │
└──────────┬──────────────┬──────────┬──────────────┬─────────────┘
           │              │          │              │
           ▼              ▼          ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLIANCE ENGINE (NEW)                    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Rules Engine  │  │ State Machine│  │  Event Scheduler      │  │
│  │ (entity-type  │  │ (filing      │  │  (deadline reminders, │  │
│  │  deadlines,   │  │  lifecycle)  │  │   status checks,      │  │
│  │  fees, reqs)  │  │              │  │   filing triggers)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              SINGLE SOURCE OF TRUTH (Upstash Redis)         │ │
│  │  compliance-rules  │  entity-states  │  event-log           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────┬──────────────┬──────────┬──────────────┬─────────────┘
           │              │          │              │
           ▼              ▼          ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                          │
│  SuiteDash (CRM)  │  Stripe  │  n8n  │  Emailit  │  20i  │ DOS│
└─────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Single Source of Truth

### The Problem

Compliance facts (deadlines, fees, penalties, entity types, dissolution rules) are currently scattered across 30+ HTML files, API knowledge bases, FAQ schemas, and chatbot prompts. We already fixed 60+ instances of wrong deadlines. That will happen again unless there is one canonical source.

### The Solution

A machine-readable rules file that everything else reads from.

**File:** `data/compliance-rules.json`

```json
{
  "version": "2026.1",
  "lastVerified": "2026-03-24",
  "source": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports",
  "act": "Act 122 of 2022 (15 Pa.C.S. § 146)",

  "annualReport": {
    "startYear": 2025,
    "gracePeriodEnd": 2026,
    "enforcementStartYear": 2027,
    "filingUrl": "https://file.dos.pa.gov",
    "form": "DSCB:15-146"
  },

  "entityTypes": {
    "domestic_business_corp":    { "label": "Domestic Business Corporation",    "deadline": "06-30", "fee": 7,  "dissolutionTerm": "administrative dissolution" },
    "foreign_business_corp":     { "label": "Foreign Business Corporation",     "deadline": "06-30", "fee": 7,  "dissolutionTerm": "administrative termination" },
    "domestic_nonprofit_corp":   { "label": "Domestic Nonprofit Corporation",   "deadline": "06-30", "fee": 0,  "dissolutionTerm": "administrative dissolution" },
    "foreign_nonprofit_corp":    { "label": "Foreign Nonprofit Corporation",    "deadline": "06-30", "fee": 0,  "dissolutionTerm": "administrative termination" },
    "domestic_llc":              { "label": "Domestic LLC",                     "deadline": "09-30", "fee": 7,  "dissolutionTerm": "administrative dissolution" },
    "foreign_llc":               { "label": "Foreign LLC",                     "deadline": "09-30", "fee": 7,  "dissolutionTerm": "administrative termination" },
    "domestic_lp":               { "label": "Domestic Limited Partnership",     "deadline": "12-31", "fee": 7,  "dissolutionTerm": "administrative dissolution" },
    "foreign_lp":                { "label": "Foreign Limited Partnership",      "deadline": "12-31", "fee": 7,  "dissolutionTerm": "administrative termination" },
    "domestic_llp":              { "label": "Domestic LLP",                     "deadline": "12-31", "fee": 7,  "dissolutionTerm": "administrative dissolution" },
    "foreign_llp":               { "label": "Foreign LLP",                     "deadline": "12-31", "fee": 7,  "dissolutionTerm": "administrative termination" },
    "business_trust":            { "label": "Business Trust",                   "deadline": "12-31", "fee": 7,  "dissolutionTerm": "administrative dissolution" },
    "professional_association":  { "label": "Professional Association",         "deadline": "12-31", "fee": 7,  "dissolutionTerm": "administrative dissolution" }
  },

  "deadlineGroups": {
    "corporations":  { "deadline": "06-30", "types": ["domestic_business_corp", "foreign_business_corp", "domestic_nonprofit_corp", "foreign_nonprofit_corp"] },
    "llcs":          { "deadline": "09-30", "types": ["domestic_llc", "foreign_llc"] },
    "others":        { "deadline": "12-31", "types": ["domestic_lp", "foreign_lp", "domestic_llp", "foreign_llp", "business_trust", "professional_association"] }
  },

  "enforcement": {
    "dissolutionDelay": "6 months after entity-type due date",
    "domesticReinstatement": true,
    "domesticReinstatementFee": 35,
    "domesticReinstatementPerReport": 15,
    "foreignReinstatement": false,
    "foreignMustReregister": true,
    "nameProtectionLostOnDissolution": true
  },

  "reminderSchedule": [90, 60, 30, 14, 7],

  "changeRegisteredOffice": {
    "form": "DSCB:15-108",
    "fee": 5
  }
}
```

### How Everything Reads From It

| Consumer | How it reads |
|----------|-------------|
| `api/chat.js` | Imports rules, injects entity-specific facts into system prompt |
| `api/client-context.js` | Looks up `entityTypes[type].deadline` instead of hardcoding |
| Portal UI | Fetches from `/api/compliance-rules` endpoint |
| Chatbot widget | Receives rules via client context |
| Static HTML build | CI/CD step validates all content against rules file |
| n8n workflows | Read rules via webhook or file |

### Drift Prevention

A CI check on every push:
```bash
# scripts/validate-content.js
# Scans all HTML files for deadline/fee/penalty claims
# Compares against data/compliance-rules.json
# Fails the build if any claim contradicts the source of truth
```

---

## Component 2: Compliance State Machine

### The Problem

There is no concept of "filing state" in the system. A client's entity is either "active" or unknown. There is no tracking of whether they actually filed, when, or what happens next.

### Entity Lifecycle States

```
                    ┌──────────┐
          ┌────────►│  ACTIVE  │◄────────────────────┐
          │         └────┬─────┘                      │
          │              │ deadline approaching        │ filed successfully
          │              ▼                             │
          │         ┌──────────┐                 ┌────┴─────┐
          │         │ DUE_SOON │────────────────►│  FILED   │
          │         └────┬─────┘  files report   └──────────┘
          │              │ deadline passes
          │              ▼
          │         ┌──────────┐
          │         │ OVERDUE  │
          │         └────┬─────┘
          │              │ 2027+ and 6 months pass
          │              ▼
          │         ┌──────────┐
    reinstates      │ AT_RISK  │ (dissolution notice sent by DOS)
    (domestic)      └────┬─────┘
          │              │ fails to cure
          │              ▼
          │         ┌──────────┐
          └─────────┤DISSOLVED │ (domestic can reinstate, foreign cannot)
                    └──────────┘
```

### Data Model (Upstash Redis)

```
Key: entity:{suitedash_id}
Value: {
  "id": "sd_abc123",
  "name": "Acme LLC",
  "type": "domestic_llc",
  "dosNumber": "7654321",
  "jurisdiction": "PA",
  "registeredOffice": "924 W 23rd St, Erie, PA 16502",
  "plan": "business_pro",
  "clientEmail": "owner@acme.com",
  "state": "ACTIVE",
  "filings": {
    "2025": { "status": "filed", "filedAt": "2025-08-15", "confirmationNumber": "AR2025-123456" },
    "2026": { "status": "not_yet_due", "deadline": "2026-09-30", "remindersSent": [90, 60] }
  },
  "events": [
    { "ts": "2025-08-15T14:30:00Z", "type": "filing_completed", "year": 2025, "by": "system" },
    { "ts": "2026-07-02T09:00:00Z", "type": "reminder_sent", "daysBeforeDeadline": 90, "channel": "email" }
  ],
  "lastStateChange": "2025-08-15T14:30:00Z",
  "createdAt": "2025-01-10T00:00:00Z"
}
```

### State Transition Rules

| Current State | Trigger | New State | Action |
|---------------|---------|-----------|--------|
| ACTIVE | `days_until_deadline <= 90` | DUE_SOON | Start reminder sequence |
| DUE_SOON | Filing confirmed | FILED | Log event, reset state to ACTIVE for next year |
| DUE_SOON | Deadline passes without filing | OVERDUE | Alert owner + admin, escalate reminders |
| OVERDUE | Filing completed late | FILED | Log event, reset |
| OVERDUE | 2027+ year and 6 months after deadline | AT_RISK | Critical alert, dissolution warning |
| AT_RISK | Filing + reinstatement | ACTIVE | Log reinstatement event |
| AT_RISK | No action | DISSOLVED | Log, alert, flag for manual intervention |

---

## Component 3: Event Scheduler

### The Problem

Reminders are currently a concept in the marketing copy ("5 reminders before your deadline"). There is no actual scheduler sending entity-type-aware reminders at the right times.

### Architecture

n8n cron workflows, one per deadline group:

| Workflow | Trigger | Entities | Actions |
|----------|---------|----------|---------|
| `corp-reminder-cycle` | Daily at 8am ET | All corps | Check days_until June 30, fire reminders at 90/60/30/14/7 |
| `llc-reminder-cycle` | Daily at 8am ET | All LLCs | Check days_until Sept 30, fire reminders at 90/60/30/14/7 |
| `other-reminder-cycle` | Daily at 8am ET | All LPs/LLPs/etc | Check days_until Dec 31, fire reminders at 90/60/30/14/7 |
| `overdue-escalation` | Daily at 8am ET | All OVERDUE entities | Escalate: daily for 7 days, then weekly |
| `filing-verification` | Daily at 2pm ET | All DUE_SOON/OVERDUE | Check PA DOS for filing confirmation (scrape or API) |
| `state-reconciliation` | Weekly Sunday | All entities | Verify SuiteDash + Redis + PA DOS states align |

Each reminder:
1. Reads entity from Redis
2. Checks rules engine for deadline
3. Sends email via Emailit (personalized: entity name, type, deadline, plan tier)
4. Logs event to entity record
5. Updates `remindersSent` array

For Pro/Empire clients, the filing-verification workflow additionally:
1. Auto-files via PA DOS (when API available) or flags for manual filing
2. Confirms filing and updates state to FILED
3. Sends confirmation email with receipt

---

## Component 4: Controlled Chatbot

### The Problem

The chatbot injects a static knowledge block, then lets Groq Llama 3.3 respond freely. It can hallucinate, contradict the knowledge base, give wrong legal guidance, and there is no way to audit what it said or why.

### Architecture: Retrieval + Guardrails + Audit

```
User message
    │
    ▼
┌──────────────┐
│ Intent        │  Classify: compliance_fact | general_question | legal_question | action_request
│ Classifier    │
└──────┬───────┘
       │
       ├── compliance_fact ──► Rules Engine lookup ──► Deterministic answer (no LLM needed)
       │                       "Your LLC deadline is September 30, 189 days away."
       │
       ├── general_question ──► RAG over knowledge base ──► LLM generates with citations
       │                        Source: compliance-rules.json + article content index
       │
       ├── legal_question ──► REFUSE ──► "That's a question for your attorney. Want me to
       │                                   connect you with one of our partner attorneys?"
       │
       └── action_request ──► Route to portal action
                              "Let me pull up your entity status..."
```

### Guardrails

1. **Intent gate:** Classify before generating. Compliance facts get deterministic answers from the rules engine — never generated.

2. **Citation requirement:** Every factual claim must reference a source (rules file section, PA statute, article URL). If the LLM cannot cite a source, it must say "I'm not certain about that."

3. **Confidence threshold:** If the LLM's response confidence is below threshold, append: "I'd recommend confirming this with PA DOS directly at 717-787-1057 or your attorney."

4. **Legal boundary:** Hard block on anything that could be construed as legal advice. Pattern-match for "should I", "is it legal", "can I sue", "will I be liable" → always defer.

5. **Audit log:** Every interaction logged:
```json
{
  "ts": "2026-03-24T15:30:00Z",
  "sessionId": "abc123",
  "clientEmail": "owner@acme.com",
  "entityType": "domestic_llc",
  "userMessage": "When is my annual report due?",
  "intent": "compliance_fact",
  "sources": ["compliance-rules.json#entityTypes.domestic_llc"],
  "response": "Your LLC annual report is due September 30. You're on Business Pro, so we'll file it for you. You have 189 days.",
  "confidence": 1.0,
  "escalated": false
}
```

---

## Component 5: Observability

### What to measure

| Layer | Metric | Tool | Alert threshold |
|-------|--------|------|-----------------|
| Conversion | Homepage → pricing scroll | Plausible + Clarity | < 20% scroll rate |
| Conversion | Pricing → Stripe checkout | Plausible events | < 2% conversion |
| Conversion | Email capture success rate | Vercel logs + Acumbamail | `warnings` in subscribe response |
| Chatbot | Questions asked per session | Redis counter | — |
| Chatbot | Intent distribution | Audit log aggregation | > 30% legal_question = content gap |
| Chatbot | Escalation rate | Audit log | > 15% = knowledge base gap |
| Compliance | Entities in OVERDUE state | Redis scan | Any = immediate alert |
| Compliance | Filing confirmation rate | State machine events | < 95% for Pro/Empire = ops failure |
| System | API error rate | Vercel function logs | > 1% on any endpoint |
| System | Rate limit triggers | Upstash analytics | Spike = potential abuse |
| System | SuiteDash API failures | Structured logs | Any = CRM disconnected |

### Structured Logging

Replace all `console.log` / `console.error` with structured JSON:
```javascript
function log(level, event, data) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data
  }));
}

// Usage:
log('info', 'filing_reminder_sent', { entityId: 'sd_abc123', entityType: 'domestic_llc', daysUntilDeadline: 30 });
log('error', 'suitedash_lookup_failed', { email: 'owner@acme.com', status: 503, message: err.message });
```

Vercel's log drain can forward these to Axiom (free tier) or Betterstack for querying and alerting.

---

## Component 6: Database Layer

### Why Upstash Redis

- Already integrated (rate limiting)
- Serverless-native (works with Vercel edge + serverless)
- Free tier: 10K commands/day (sufficient for early stage)
- JSON support via RedisJSON
- No cold-start latency penalty
- Scales to paid tier seamlessly

### Key Schema

| Pattern | Example | Contents |
|---------|---------|----------|
| `entity:{sd_id}` | `entity:sd_abc123` | Full entity record with state + filings + events |
| `rules:current` | `rules:current` | Cached compliance-rules.json (TTL 24h) |
| `session:{id}` | `session:chat_xyz` | Chatbot conversation for audit log |
| `metric:{name}:{date}` | `metric:chat_questions:2026-03-24` | Daily counters |
| `reminder:{entity_id}:{year}` | `reminder:sd_abc123:2026` | Reminder tracking per entity per year |
| `filing:{entity_id}:{year}` | `filing:sd_abc123:2026` | Filing status + confirmation |

### Migration Path

Phase 1 (now): SuiteDash remains primary CRM. Redis is read-through cache + state machine + event log.
Phase 2 (scale): Redis becomes authoritative for compliance state. SuiteDash remains for CRM/billing only.
Phase 3 (enterprise): Migrate to Supabase/Postgres if relational queries become necessary.

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Single source of truth + durable state

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `data/compliance-rules.json` | P0 | 2h | None |
| Create `api/compliance-rules.js` endpoint | P0 | 1h | Rules file |
| Refactor `api/chat.js` to read from rules | P0 | 3h | Rules endpoint |
| Refactor `api/client-context.js` to read from rules | P0 | 2h | Rules endpoint |
| Create content validation CI script | P1 | 4h | Rules file |
| Provision Upstash Redis (free tier) | P0 | 30m | Upstash account |
| Set UPSTASH env vars in Vercel | P0 | 10m | Redis provisioned |
| Create `api/_db.js` shared Redis client | P0 | 2h | Upstash provisioned |
| Create entity data model in Redis | P1 | 3h | Redis client |
| Structured logging module | P1 | 2h | None |

### Phase 2: Compliance Engine (Week 3-4)

**Goal:** Real state machine + event-driven reminders

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement state machine transitions | P0 | 4h | Entity data model |
| Build `api/entity-status.js` (state read/write) | P0 | 3h | State machine |
| Build n8n reminder workflows (3 deadline groups) | P0 | 6h | Entity data model + Emailit |
| Build n8n overdue escalation workflow | P1 | 3h | State machine |
| Connect portal to real entity state | P0 | 4h | Entity status API |
| PA DOS entity verification (scrape/check) | P1 | 6h | Research DOS site |
| Filing tracking (manual → semi-auto) | P1 | 4h | State machine |

### Phase 3: Controlled Chatbot (Week 5-6)

**Goal:** Deterministic compliance answers + audit trail

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Build intent classifier (rules-based first, ML later) | P0 | 4h | Rules engine |
| Implement deterministic lookup path | P0 | 3h | Rules engine |
| Add citation requirement to LLM prompt | P0 | 2h | Knowledge index |
| Build audit log (Redis) | P0 | 3h | Redis client |
| Implement legal boundary guardrails | P0 | 2h | Intent classifier |
| Build confidence threshold + escalation | P1 | 3h | Audit log |
| Chatbot analytics dashboard (admin) | P2 | 4h | Audit log |

### Phase 4: Observability + Conversion (Week 7-8)

**Goal:** Know what is working and what is breaking

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Vercel log drain → Axiom/Betterstack | P1 | 2h | Structured logging |
| Conversion funnel tracking (Plausible goals) | P1 | 2h | None |
| Chatbot usage dashboard | P1 | 4h | Audit log |
| Error alerting (Slack/email on failures) | P1 | 3h | Structured logging |
| Filing confirmation rate monitoring | P1 | 2h | State machine |
| Weekly compliance status digest email (for Ike) | P2 | 3h | All metrics |

### Phase 5: Monetization Alignment (Week 9-10)

**Goal:** Make the product worth paying for before asking for money

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Free compliance check → real entity lookup from PA DOS | P0 | 6h | DOS integration |
| Show real filing status in free tier (read-only) | P0 | 3h | State machine |
| Premium boundary: auto-filing + reminders = paid | P0 | 2h | Reminder system |
| Risk score calculator with real entity data | P1 | 4h | DOS integration |
| "Here's what you'd miss without us" proof in portal | P1 | 3h | State machine history |
| Partner dashboard with real client compliance stats | P2 | 6h | State machine |

---

## How This Maps to Dynasty Empire

This compliance engine becomes a **template** for every vertical:

| PA CROP Concept | Dynasty Empire Pattern |
|-----------------|----------------------|
| compliance-rules.json | Niche rules file (reusable across 100+ directories) |
| Entity state machine | Client lifecycle state machine |
| Event scheduler (n8n) | Automated engagement engine |
| Controlled chatbot | Niche-specific AI assistant with guardrails |
| Audit log | Decision traceability for any regulated domain |
| Upstash Redis | Shared serverless state layer |
| Content validation CI | Automated accuracy enforcement |

Every future directory (ImmigrationSmarts, trades directories, etc.) benefits from this infrastructure once it exists here.

---

## What This Changes About the Product

| Before | After |
|--------|-------|
| "We inform you about deadlines" | "We track your deadline, remind you, and file for you" |
| Chatbot generates compliance answers | Chatbot looks up compliance facts deterministically |
| Portal shows estimated state | Portal shows verified state from PA DOS |
| No one knows if reminders sent | Every reminder logged with delivery confirmation |
| Content can drift from reality | CI blocks deployment if content contradicts rules |
| "Trust us" as value prop | "Here's your filing history and what we prevented" as proof |
| If something goes wrong: "what happened?" | Full audit trail: who/what/when/why |

---

## First Three Actions (Today)

1. **Create `data/compliance-rules.json`** — this is the keystone. Everything else reads from it.
2. **Provision Upstash Redis** — free tier, 5 minutes, enables durable state for everything.
3. **Build `api/compliance-rules.js`** — endpoint that serves the rules. Chat, portal, and all future consumers read from this instead of hardcoding.

These three actions take ~4 hours and create the foundation for every other component.

---

*This architecture was designed to be built incrementally. Each phase delivers user-visible value. No phase requires throwing away work from a previous phase. The system gets smarter and more reliable with each addition.*
