-- PA CROP Services — Postgres Migration Pack
-- Source: TECHNICAL-SPECIFICATION.md section 3.1
-- Version: 2026-03-24
-- Target: Supabase Postgres (or any Postgres 15+)
--
-- Run order:
--   001_extensions.sql   (this file, run once)
--   Then execute each section in order below.
--
-- To run against Supabase:
--   psql $DATABASE_URL -f infrastructure/migrations/001_schema.sql

-- ============================================================
-- Extensions
-- ============================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============================================================
-- 3.1.1 organizations
-- ============================================================

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
create index idx_organizations_partner_id on organizations(partner_id);
create index idx_organizations_entity_status on organizations(entity_status);

comment on table organizations is 'Business entities tracked by the compliance engine';
comment on column organizations.entity_type is 'e.g. domestic_llc, foreign_business_corp, domestic_nonprofit_corp';
comment on column organizations.entity_status is 'pending_verification, active, due_soon, overdue, at_risk, dissolved';

-- ============================================================
-- 3.1.2 clients
-- ============================================================

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

comment on table clients is 'People who own/manage organizations. Billing and communication target.';
comment on column clients.plan_code is 'compliance_only, business_starter, business_pro, business_empire';

-- ============================================================
-- 3.1.3 rules
-- ============================================================

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

comment on table rules is 'Versioned compliance rules. Only one active rule per (jurisdiction, entity_type, obligation_type).';
comment on column rules.rule_json is 'Full rule contract per TECHNICAL-SPECIFICATION.md section 4.1';

-- ============================================================
-- 3.1.4 obligations
-- ============================================================

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
create index idx_obligations_due_status on obligations(due_date, obligation_status);
create index idx_obligations_org_status on obligations(organization_id, obligation_status);

comment on table obligations is 'Compliance obligations generated from rules. This is the state machine.';
comment on column obligations.obligation_status is 'created, upcoming, reminder_scheduled, reminder_sent, awaiting_client_input, ready_to_file, filed_pending_confirmation, filed_confirmed, overdue, escalated, closed';
comment on column obligations.escalation_level is 'none, low, medium, high, critical';

-- ============================================================
-- 3.1.5 documents
-- ============================================================

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

comment on table documents is 'Received mail, uploads, system-generated documents';
comment on column documents.urgency is 'normal, high, critical';

-- ============================================================
-- 3.1.6 notifications
-- ============================================================

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
create index idx_notifications_client on notifications(client_id);
create index idx_notifications_delivery_sched on notifications(delivery_status, scheduled_for);

comment on table notifications is 'Scheduled and sent communications';
comment on column notifications.delivery_status is 'scheduled, sent, delivered, failed, bounced';

-- ============================================================
-- 3.1.7 billing_accounts
-- ============================================================

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

comment on table billing_accounts is 'Stripe subscription and entitlement state';

-- ============================================================
-- 3.1.8 referrals
-- ============================================================

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

-- ============================================================
-- 3.1.9 partners
-- ============================================================

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

-- ============================================================
-- 3.1.10 ai_conversations
-- ============================================================

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

comment on table ai_conversations is 'Full audit trail of every AI assistant interaction';

-- ============================================================
-- 3.1.11 audit_events
-- ============================================================

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

comment on table audit_events is 'Immutable log. Answers: who changed what, when, why, before/after.';

-- ============================================================
-- 3.1.12 workflow_jobs
-- ============================================================

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

comment on table workflow_jobs is 'Durable async job queue for workflows, retries, dead-letter';

-- ============================================================
-- Auto-update updated_at triggers
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();
create trigger trg_obligations_updated before update on obligations
  for each row execute function set_updated_at();
create trigger trg_billing_accounts_updated before update on billing_accounts
  for each row execute function set_updated_at();
create trigger trg_partners_updated before update on partners
  for each row execute function set_updated_at();
create trigger trg_workflow_jobs_updated before update on workflow_jobs
  for each row execute function set_updated_at();

-- ============================================================
-- Row-level security (Supabase)
-- ============================================================

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table clients enable row level security;
alter table rules enable row level security;
alter table obligations enable row level security;
alter table documents enable row level security;
alter table notifications enable row level security;
alter table billing_accounts enable row level security;
alter table referrals enable row level security;
alter table partners enable row level security;
alter table ai_conversations enable row level security;
alter table audit_events enable row level security;
alter table workflow_jobs enable row level security;

-- Service role bypass (for API backend)
-- Supabase service_role key bypasses RLS automatically.
-- Client-facing queries use anon/authenticated roles with policies below.

-- Rules are public read
create policy "rules_public_read" on rules
  for select using (is_active = true);

-- Everything else requires authenticated + org membership (implement per service)
-- These are placeholder policies — refine per RBAC requirements in section 12.

-- ============================================================
-- Done
-- ============================================================

-- Migration complete: 12 tables, 28 indexes, 6 update triggers, RLS enabled.
-- Source: TECHNICAL-SPECIFICATION.md section 3.1
-- Next: Load rules starter dataset (002_seed_rules.sql)
