# Technical Specification Pack

## PA CROP Services Compliance Operating System

This specification operationalizes the architecture and resolves the current repo's biggest structural problems: duplicated compliance truth, prompt-based chatbot authority, and a portal layer that is too monolithic and partly simulated.

---

## 1. System scope

### 1.1 Core capabilities

The platform must support:
- organization and client onboarding
- entity profile management
- rules-driven obligation creation
- deadline tracking
- reminder scheduling
- document intake and classification
- client portal views backed by real state
- billing and entitlements
- AI assistant with grounded answers
- audit logging
- partner/referral workflows

### 1.2 Out of scope for initial version

Not in v1:
- direct automated filing to all states
- generalized legal advice
- freeform AI decisions without retrieval
- fully autonomous compliance actions without human review on high-risk items

---

## 2. Service map

### 2.1 Services

- web-public
- web-portal
- api-gateway
- auth-service
- client-service
- entity-service
- rules-service
- obligation-service
- document-service
- notification-service
- billing-service
- assistant-service
- referral-service
- partner-service
- audit-service
- workflow-service
- admin-service

### 2.2 Ownership

Each service owns only its bounded context.

| Service | Primary ownership |
|---------|------------------|
| auth-service | sessions, access, roles |
| client-service | client profile, onboarding, prefs |
| entity-service | organization/entity master record |
| rules-service | canonical compliance rules |
| obligation-service | deadlines, states, recalculation |
| document-service | uploads, classification, metadata |
| notification-service | scheduling, delivery, retries |
| billing-service | subscription and plan entitlements |
| assistant-service | grounded AI answers |
| referral-service | referral codes, conversions |
| partner-service | CPA/attorney/white-label partner accounts |
| audit-service | immutable audit log |
| workflow-service | async orchestration |
| admin-service | ops tooling and overrides |

---

## 3. Data model specification

### 3.1 Postgres schema

#### 3.1.1 organizations

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  entity_type text not null,
  jurisdiction text not null default 'PA',
  dos_number text,
  formation_date date,
  entity_status text not null default 'pending_verification',
  principal_address jsonb,
  registered_office_address jsonb,
  partner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_organizations_jurisdiction on organizations(jurisdiction);
create index idx_organizations_entity_type on organizations(entity_type);
create index idx_organizations_dos_number on organizations(dos_number);
```

#### 3.1.2 clients

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  owner_name text,
  email text not null unique,
  phone text,
  plan_code text not null default 'compliance_only',
  billing_status text not null default 'inactive',
  onboarding_status text not null default 'not_started',
  referral_code text unique,
  referred_by_client_id uuid references clients(id),
  communication_prefs jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_clients_org on clients(organization_id);
create index idx_clients_plan on clients(plan_code);
create index idx_clients_billing_status on clients(billing_status);
```

#### 3.1.3 rules

```sql
create table rules (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  entity_type text not null,
  obligation_type text not null,
  version text not null,
  effective_date date not null,
  superseded_at timestamptz,
  is_active boolean not null default true,
  authority_source text not null,
  authority_url text,
  rule_json jsonb not null,
  created_at timestamptz not null default now(),
  created_by text
);
create unique index uq_rules_version
  on rules(jurisdiction, entity_type, obligation_type, version);
create index idx_rules_active
  on rules(jurisdiction, entity_type, obligation_type, is_active);
```

#### 3.1.4 obligations

```sql
create table obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  obligation_type text not null,
  jurisdiction text not null,
  rule_id uuid not null references rules(id),
  rule_version text not null,
  due_date date not null,
  fee_usd numeric(10,2),
  obligation_status text not null default 'created',
  escalation_level text not null default 'none',
  filing_method text,
  source_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index idx_obligations_org on obligations(organization_id);
create index idx_obligations_due_date on obligations(due_date);
create index idx_obligations_status on obligations(obligation_status);
create index idx_obligations_escalation on obligations(escalation_level);
```

#### 3.1.5 documents

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  obligation_id uuid references obligations(id) on delete set null,
  document_type text,
  source_channel text not null,
  filename text not null,
  mime_type text not null,
  storage_key text not null,
  storage_url text,
  extracted_text text,
  extracted_entities jsonb not null default '[]'::jsonb,
  urgency text not null default 'normal',
  classifier_version text,
  review_status text not null default 'pending',
  received_at timestamptz not null,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_documents_org on documents(organization_id);
create index idx_documents_obligation on documents(obligation_id);
create index idx_documents_type on documents(document_type);
create index idx_documents_urgency on documents(urgency);
create index idx_documents_review on documents(review_status);
```

#### 3.1.6 notifications

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  obligation_id uuid references obligations(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  notification_type text not null,
  channel text not null,
  template_id text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  delivery_status text not null default 'scheduled',
  retry_count integer not null default 0,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_notifications_sched on notifications(scheduled_for);
create index idx_notifications_delivery on notifications(delivery_status);
create index idx_notifications_org on notifications(organization_id);
```

#### 3.1.7 billing_accounts

```sql
create table billing_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  billing_status text not null default 'inactive',
  plan_code text not null,
  entitlements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_billing_client on billing_accounts(client_id);
create index idx_billing_status on billing_accounts(billing_status);
```

#### 3.1.8 referrals

```sql
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_client_id uuid not null references clients(id) on delete cascade,
  referred_email text not null,
  referred_client_id uuid references clients(id) on delete set null,
  referral_status text not null default 'invited',
  conversion_date timestamptz,
  credit_amount numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_referrals_referrer on referrals(referrer_client_id);
create index idx_referrals_status on referrals(referral_status);
```

#### 3.1.9 partners

```sql
create table partners (
  id uuid primary key default gen_random_uuid(),
  partner_type text not null,
  name text not null,
  email text not null unique,
  payout_terms text,
  white_label_settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### 3.1.10 ai_conversations

```sql
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  channel text not null,
  user_message text not null,
  assistant_answer text not null,
  source_refs jsonb not null default '[]'::jsonb,
  confidence_score numeric(4,3),
  escalation_flag boolean not null default false,
  moderation_flag boolean not null default false,
  model_name text,
  created_at timestamptz not null default now()
);
create index idx_ai_conv_org on ai_conversations(organization_id);
create index idx_ai_conv_client on ai_conversations(client_id);
create index idx_ai_conv_created on ai_conversations(created_at);
```

#### 3.1.11 audit_events

```sql
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id text,
  event_type text not null,
  target_type text not null,
  target_id text not null,
  before_json jsonb,
  after_json jsonb,
  reason text,
  correlation_id text,
  created_at timestamptz not null default now()
);
create index idx_audit_target on audit_events(target_type, target_id);
create index idx_audit_event on audit_events(event_type);
create index idx_audit_created on audit_events(created_at);
```

#### 3.1.12 workflow_jobs

```sql
create table workflow_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  job_status text not null default 'queued',
  payload jsonb not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  scheduled_for timestamptz not null default now(),
  last_error text,
  correlation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_workflow_jobs_status on workflow_jobs(job_status, scheduled_for);
```

---

## 4. Rules JSON contract

### 4.1 Required structure

```json
{
  "jurisdiction": "PA",
  "entity_type": "LLC",
  "obligation_type": "annual_report",
  "effective_date": "2026-03-24",
  "due_date_rule": {
    "type": "fixed_annual",
    "month": 9,
    "day": 30
  },
  "fee": {
    "amount_usd": 7
  },
  "enforcement": {
    "type": "administrative_action_after_missed_due_date",
    "delay_months": 6
  },
  "filing": {
    "method": "online",
    "client_action_required": true
  },
  "reminders": [
    {"days_before": 90},
    {"days_before": 60},
    {"days_before": 30},
    {"days_before": 14},
    {"days_before": 7}
  ],
  "source": {
    "authority_name": "Pennsylvania Department of State",
    "citation_title": "Annual reports guidance",
    "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
  },
  "notes": [
    "For LLCs only",
    "Do not apply to corporations"
  ]
}
```

### 4.2 Validation rules

- jurisdiction, entity_type, obligation_type, effective_date, due_date_rule, source required
- only one active rule per (jurisdiction, entity_type, obligation_type)
- all superseded rules retained
- changes require admin publish action and audit entry

---

## 5. Event catalog

### 5.1 Standard envelope

```json
{
  "event_id": "uuid",
  "event_type": "obligation.created",
  "occurred_at": "2026-03-24T15:00:00Z",
  "correlation_id": "uuid",
  "actor": {
    "type": "system",
    "id": "workflow-service"
  },
  "subject": {
    "type": "obligation",
    "id": "uuid"
  },
  "payload": {}
}
```

### 5.2 Domain events

**Client lifecycle:** client.created, client.updated, client.onboarding_started, client.onboarding_completed

**Billing:** billing.checkout_started, billing.payment_succeeded, billing.payment_failed, billing.subscription_updated, billing.subscription_cancelled

**Entity:** entity.created, entity.updated, entity.verified, entity.status_changed

**Obligations:** obligation.created, obligation.recomputed, obligation.reminder_scheduled, obligation.reminder_sent, obligation.overdue, obligation.filed, obligation.closed

**Documents:** document.received, document.stored, document.classified, document.escalated, document.reviewed

**Notifications:** notification.queued, notification.sent, notification.delivered, notification.failed

**AI:** ai.answer_generated, ai.answer_escalated, ai.answer_blocked

**Referral/partner:** referral.created, referral.converted, partner.created

---

## 6. State machine specification

### 6.1 Obligation states

```
created
  -> upcoming
  -> reminder_scheduled
  -> reminder_sent
  -> awaiting_client_input
  -> ready_to_file
  -> filed_pending_confirmation
  -> filed_confirmed
  -> closed

upcoming
  -> overdue

overdue
  -> escalated
  -> filed_pending_confirmation

escalated
  -> resolved
  -> filed_pending_confirmation
```

### 6.2 Transition rules

- created -> upcoming when due date exists
- upcoming -> reminder_scheduled when reminder jobs created
- reminder_scheduled -> reminder_sent when at least one reminder delivered
- upcoming -> overdue when today > due_date
- overdue -> escalated when escalation threshold reached
- filed_pending_confirmation -> filed_confirmed after proof or confirmation
- filed_confirmed -> closed when no additional action remains

### 6.3 Escalation levels

- none
- low
- medium
- high
- critical

---

## 7. API contract definitions

### 7.1 Auth

**POST /api/auth/login**

Request:
```json
{
  "email": "owner@example.com",
  "access_code": "ABC123"
}
```

Response:
```json
{
  "success": true,
  "session": {
    "token": "jwt_or_session_token",
    "expires_at": "2026-03-25T15:00:00Z"
  },
  "client": {
    "id": "uuid",
    "organization_id": "uuid",
    "plan_code": "business_pro",
    "roles": ["client"]
  }
}
```

**POST /api/auth/reset-code**

Request: `{"email": "owner@example.com"}`
Response: `{"success": true}`

### 7.2 Organizations

**GET /api/organizations/:id**

Response:
```json
{
  "id": "uuid",
  "legal_name": "Acme Holdings LLC",
  "entity_type": "LLC",
  "jurisdiction": "PA",
  "dos_number": "7234819",
  "entity_status": "active",
  "registered_office_address": {
    "street": "924 W 23rd St",
    "city": "Erie",
    "state": "PA",
    "postal_code": "16502"
  }
}
```

**PATCH /api/organizations/:id**

Request:
```json
{
  "display_name": "Acme Holdings LLC",
  "principal_address": {
    "street": "123 Main St",
    "city": "Erie",
    "state": "PA",
    "postal_code": "16507"
  }
}
```

### 7.3 Obligations

**GET /api/organizations/:id/obligations**

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "obligation_type": "annual_report",
      "due_date": "2026-09-30",
      "status": "upcoming",
      "escalation_level": "none",
      "fee_usd": 7,
      "rule_version": "2026-03-24"
    }
  ]
}
```

**POST /api/organizations/:id/obligations/recompute**

Response: `{"success": true, "obligations_created": 1, "obligations_updated": 0}`

**POST /api/obligations/:id/mark-filed**

Request:
```json
{
  "proof_document_id": "uuid",
  "filing_reference": "state filing confirmation number"
}
```

Response: `{"success": true}`

### 7.4 Documents

**POST /api/documents/upload**

Request:
```json
{
  "organization_id": "uuid",
  "filename": "notice.pdf",
  "mime_type": "application/pdf",
  "source_channel": "portal_upload"
}
```

Response:
```json
{
  "success": true,
  "document_id": "uuid",
  "upload_url": "signed_url"
}
```

**GET /api/organizations/:id/documents**

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "document_type": "government_correspondence",
      "urgency": "high",
      "received_at": "2026-03-24T13:00:00Z",
      "review_status": "pending"
    }
  ]
}
```

**POST /api/documents/:id/classify**

Response:
```json
{
  "success": true,
  "classification": {
    "document_type": "service_of_process",
    "urgency": "critical",
    "extracted_entities": [
      {"type": "case_number", "value": "2026-CV-123"}
    ]
  }
}
```

### 7.5 Notifications

**POST /api/notifications/preferences**

Request:
```json
{
  "client_id": "uuid",
  "preferences": {
    "email_notifications": true,
    "sms_notifications": false,
    "marketing_emails": true
  }
}
```

Response: `{"success": true}`

### 7.6 Assistant

**POST /api/assistant/query**

Request:
```json
{
  "client_id": "uuid",
  "organization_id": "uuid",
  "question": "When is my annual report due?",
  "channel": "portal"
}
```

Response:
```json
{
  "success": true,
  "answer": "For your Pennsylvania LLC, your annual report is due on September 30.",
  "sources": [
    {
      "type": "rule",
      "id": "uuid",
      "label": "PA LLC annual report rule v2026-03-24"
    }
  ],
  "confidence": 0.984,
  "escalate": false,
  "next_actions": [
    {
      "type": "open_obligation",
      "label": "View my annual report obligation"
    }
  ]
}
```

Response requirements:
- must include sources
- must include confidence
- must include escalate
- if legal/tax advice boundary triggered, answer must defer

### 7.7 Billing

**POST /api/billing/upgrade**

Request:
```json
{
  "client_id": "uuid",
  "target_plan_code": "business_pro"
}
```

Response:
```json
{
  "success": true,
  "checkout_url": "https://checkout.provider/..."
}
```

---

## 8. Assistant service specification

### 8.1 Retrieval inputs

Assistant may retrieve only from: rules, organizations, clients, obligations, documents, approved KB store.

### 8.2 Prompt contract

System instructions must not contain hardcoded compliance rules except temporary emergency fallback.

### 8.3 Answer pipeline

1. classify intent
2. retrieve structured records
3. apply safety policy
4. compose answer with sources
5. log to ai_conversations
6. emit ai.answer_generated

### 8.4 Escalation rules

Escalate if:
- no authoritative rule found
- question asks for legal advice
- contradiction among sources
- confidence below threshold
- user disputes answer or asks "are you sure?"

---

## 9. Workflow specifications

### 9.1 Onboarding workflow

Trigger: billing.payment_succeeded

Steps:
1. create or update client
2. create billing_account
3. create default organization if absent
4. generate referral_code
5. create onboarding checklist
6. compute initial obligations
7. schedule reminders
8. send welcome email
9. write audit events

### 9.2 Reminder workflow

Trigger: daily scheduler

Steps:
1. find obligations with reminder offsets matching today
2. create notifications
3. send through provider
4. update delivery status
5. escalate failures after retry threshold

### 9.3 Document intake workflow

Trigger: document.received

Steps:
1. validate and store file
2. extract text if supported
3. classify document
4. assess urgency
5. attach to obligation if matched
6. notify client if needed
7. recalculate risk score
8. emit audit events

### 9.4 Upgrade workflow

Trigger: client request or qualification rule

Steps:
1. check current plan and entitlement gap
2. create checkout session
3. on successful payment, update entitlements
4. log plan change
5. notify client

---

## 10. Notification template matrix

| Notification type | Channel | Trigger | Required variables |
|------------------|---------|---------|-------------------|
| welcome | email | onboarding | client_name, org_name, plan |
| annual_report_90 | email/SMS | due_date - 90 | org_name, due_date |
| annual_report_30 | email/SMS | due_date - 30 | org_name, due_date |
| overdue_notice | email/SMS | after due_date | org_name, due_date, next_step |
| document_received | email | document intake | org_name, doc_type, urgency |
| payment_failed | email | billing webhook | client_name, retry_date |
| upgrade_confirmation | email | plan change | plan_name, effective_date |

---

## 11. Entitlement model

### 11.1 Plan contract

```json
{
  "compliance_only": {
    "registered_office": true,
    "dashboard": true,
    "ai_assistant": true,
    "hosting": false,
    "annual_report_filing": false,
    "multi_entity_limit": 1
  },
  "business_starter": {
    "registered_office": true,
    "dashboard": true,
    "ai_assistant": true,
    "hosting": true,
    "annual_report_filing": false,
    "multi_entity_limit": 1
  },
  "business_pro": {
    "registered_office": true,
    "dashboard": true,
    "ai_assistant": true,
    "hosting": true,
    "annual_report_filing": true,
    "multi_entity_limit": 3
  },
  "business_empire": {
    "registered_office": true,
    "dashboard": true,
    "ai_assistant": true,
    "hosting": true,
    "annual_report_filing": true,
    "multi_entity_limit": 10
  }
}
```

### 11.2 Enforcement

Portal UI and API both enforce entitlements. Frontend hiding alone is insufficient.

---

## 12. Security specification

### 12.1 Authentication
- signed JWT or opaque session token
- short-lived access tokens
- rotating refresh token or secure session cookie
- email reset with rate limits

### 12.2 Authorization

Roles: client, partner, ops_admin, super_admin

### 12.3 API protection
- no wildcard CORS in production
- durable rate limiting at gateway and per sensitive endpoint
- CSRF protection for browser cookie sessions
- signed webhooks
- upload size/type restrictions

### 12.4 Document security
- signed upload URLs
- malware scan
- private bucket
- signed download URLs
- audit every access

---

## 13. Observability specification

### 13.1 Structured logs

```json
{
  "timestamp": "2026-03-24T15:00:00Z",
  "service": "notification-service",
  "level": "info",
  "correlation_id": "uuid",
  "actor_type": "system",
  "event_type": "notification.sent",
  "target_id": "uuid",
  "latency_ms": 120,
  "status": "success"
}
```

### 13.2 Metrics

Track: login success rate, lead capture success rate, webhook success/failure, reminder send rate, overdue obligation count, AI escalation rate, document classification latency, upgrade conversion rate.

### 13.3 Alerts

Alert when: payment webhooks fail repeatedly, notification delivery fails above threshold, workflow queue backs up, AI confidence drops below threshold rate, document classification jobs stall.

---

## 14. Admin console requirements

### 14.1 Modules

- dashboard
- rule management
- obligation explorer
- workflow failures
- document review queue
- AI review queue
- client search
- audit viewer
- partner management

### 14.2 Rule publishing workflow

1. draft rule
2. validate JSON
3. preview affected entities
4. publish
5. write audit event
6. trigger obligation recomputation for impacted entities

---

## 15. Agent responsibilities by service boundary

### 15.1 Rules-watch agent
Owned by: rules-service. Monitors official rule changes, drafts rule updates, never auto-publishes.

### 15.2 Document-intake agent
Owned by: document-service. Classify docs, extract fields, mark urgency, propose linkage to obligations.

### 15.3 Client-risk agent
Owned by: obligation-service. Computes risk scores, flags high-risk clients, emits escalation events.

### 15.4 Concierge agent
Owned by: assistant-service. Answers grounded questions, explains obligations, hands off edge cases.

### 15.5 Filing-ops agent
Owned by: workflow-service. Assembles filing checklist, identifies missing data, prepares ops task packets.

---

## 16. Frontend module contracts

### 16.1 Portal dashboard module
Reads: client summary, organization summary, active obligations, recent documents, recent notifications.

### 16.2 Documents module
Reads: paginated document list, download URLs, review state, extracted metadata.
Actions: upload, filter, mark reviewed, escalate.

### 16.3 Compliance module
Reads: obligations, rule explanations, reminder schedule, filing state.

### 16.4 Assistant module
Writes: user question.
Reads: answer object with sources, escalation state.

---

## 17. Migration plan from current repo

### 17.1 Immediate
- extract all hardcoded compliance facts from UI/chatbot
- create rules table and loader
- replace prompt-embedded truth in chatbot
- fix portal script integrity
- separate portal into app modules

### 17.2 Near term
- replace simulated status with API-backed reads
- add durable queues and rate limits
- convert notification flows to auditable jobs
- add structured logging and alerts

### 17.3 Medium term
- build admin console
- build partner views
- add multistate rule support
- add document review workflows

---

## 18. File/package structure recommendation

```
/apps
  /web-public
  /web-portal
  /admin-console
/services
  /api-gateway
  /auth-service
  /client-service
  /entity-service
  /rules-service
  /obligation-service
  /document-service
  /notification-service
  /billing-service
  /assistant-service
  /referral-service
  /partner-service
  /audit-service
  /workflow-service
/packages
  /db-schema
  /shared-types
  /rules-contract
  /event-contracts
  /ui-components
  /observability
/infrastructure
  /terraform
  /migrations
  /queues
  /monitoring
```

---

## 19. Definition of done for production readiness

The platform is production-ready when:
- all compliance facts come from versioned rules
- obligations are generated and updated from the engine
- reminders are durable and auditable
- portal views read real API state
- assistant answers always include source refs
- silent business-critical failures are eliminated
- audit trail exists for state changes and AI outputs
- admin can inspect failures and overrides
- security protections are enforced at API and data layers

---

## 20. Recommended next deliverables

The best next three artifacts are:
1. OpenAPI spec for the APIs above
2. Postgres migration pack for the schema above
3. Rules starter dataset for Pennsylvania entity types and obligations

---

*Specification: Ike. PA CROP Services Technical Specification Pack v1.0. 2026-03-24.*
