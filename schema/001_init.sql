-- PA CROP Services — Initial Database Migration
-- Target: Neon Postgres (serverless)
-- Run: psql $DATABASE_URL < schema/001_init.sql
-- This creates all tables matching schema.prisma definitions.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Organizations ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name                TEXT NOT NULL,
  display_name              TEXT,
  entity_type               TEXT NOT NULL DEFAULT 'domestic_llc',
  jurisdiction              TEXT NOT NULL DEFAULT 'PA',
  dos_number                TEXT,
  formation_date            TEXT,
  entity_status             TEXT NOT NULL DEFAULT 'pending_verification',
  risk_level                TEXT NOT NULL DEFAULT 'unknown',
  principal_address         JSONB DEFAULT '{}',
  registered_office_address JSONB DEFAULT '{}',
  partner_id                UUID,
  metadata                  JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_entity_status ON organizations (entity_status);
CREATE INDEX IF NOT EXISTS idx_organizations_jurisdiction ON organizations (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_organizations_dos_number ON organizations (dos_number) WHERE dos_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_partner_id ON organizations (partner_id) WHERE partner_id IS NOT NULL;

-- ── Clients ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id),
  owner_name            TEXT,
  email                 TEXT NOT NULL UNIQUE,
  phone                 TEXT,
  plan_code             TEXT NOT NULL DEFAULT 'compliance_only',
  billing_status        TEXT NOT NULL DEFAULT 'inactive',
  onboarding_status     TEXT NOT NULL DEFAULT 'not_started',
  referral_code         TEXT,
  referred_by_client_id UUID,
  communication_prefs   JSONB DEFAULT '{}',
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_plan_code ON clients (plan_code);
CREATE INDEX IF NOT EXISTS idx_clients_billing_status ON clients (billing_status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);

-- ── Obligations ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS obligations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  rule_id           UUID,
  rule_version      INT,
  obligation_type   TEXT NOT NULL DEFAULT 'annual_report',
  obligation_status TEXT NOT NULL DEFAULT 'detected',
  jurisdiction      TEXT NOT NULL DEFAULT 'PA',
  due_date          TIMESTAMPTZ,
  fee_usd           DECIMAL(10, 2),
  filing_method     TEXT,
  source_reason     TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obligations_organization_id ON obligations (organization_id);
CREATE INDEX IF NOT EXISTS idx_obligations_due_date ON obligations (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_obligations_status ON obligations (obligation_status);
CREATE INDEX IF NOT EXISTS idx_obligations_type ON obligations (obligation_type);

-- ── Documents ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID REFERENCES organizations(id),
  obligation_id      UUID REFERENCES obligations(id),
  document_type      TEXT NOT NULL DEFAULT 'general_mail',
  source_channel     TEXT,
  filename           TEXT,
  mime_type          TEXT,
  storage_key        TEXT,
  storage_url        TEXT,
  urgency            TEXT NOT NULL DEFAULT 'normal',
  review_status      TEXT NOT NULL DEFAULT 'pending',
  extracted_text     TEXT,
  extracted_entities JSONB DEFAULT '[]',
  classifier_version TEXT,
  processed_at       TIMESTAMPTZ,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_obligation_id ON documents (obligation_id) WHERE obligation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON documents (review_status);
CREATE INDEX IF NOT EXISTS idx_documents_urgency ON documents (urgency);

-- ── Notifications ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id),
  obligation_id       UUID,
  client_id           UUID REFERENCES clients(id),
  notification_type   TEXT,
  channel             TEXT NOT NULL DEFAULT 'email',
  template_id         TEXT,
  scheduled_for       TIMESTAMPTZ,
  delivery_status     TEXT NOT NULL DEFAULT 'scheduled',
  sent_at             TIMESTAMPTZ,
  retry_count         INT NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications (delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications (scheduled_for) WHERE scheduled_for IS NOT NULL;

-- ── AI Conversations ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID,
  client_id        UUID,
  channel          TEXT,
  user_message     TEXT,
  assistant_answer TEXT,
  source_refs      JSONB DEFAULT '[]',
  confidence_score DOUBLE PRECISION,
  escalation_flag  BOOLEAN NOT NULL DEFAULT false,
  moderation_flag  BOOLEAN NOT NULL DEFAULT false,
  model_name       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_organization_id ON ai_conversations (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_escalation ON ai_conversations (escalation_flag) WHERE escalation_flag = true;

-- ── Audit Events ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type     TEXT,
  actor_id       TEXT,
  event_type     TEXT NOT NULL,
  target_type    TEXT,
  target_id      TEXT,
  before_json    JSONB,
  after_json     JSONB,
  reason         TEXT,
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation ON audit_events (correlation_id) WHERE correlation_id IS NOT NULL;

-- ── Workflow Jobs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type       TEXT NOT NULL,
  job_status     TEXT NOT NULL DEFAULT 'queued',
  payload        JSONB DEFAULT '{}',
  max_attempts   INT NOT NULL DEFAULT 5,
  attempt_count  INT NOT NULL DEFAULT 0,
  last_error     TEXT,
  scheduled_for  TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_jobs_status ON workflow_jobs (job_status);
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_type ON workflow_jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_scheduled ON workflow_jobs (scheduled_for) WHERE scheduled_for IS NOT NULL AND job_status = 'queued';

-- ── Billing Accounts ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL UNIQUE REFERENCES clients(id),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  current_period_end      TIMESTAMPTZ,
  billing_status          TEXT NOT NULL DEFAULT 'inactive',
  plan_code               TEXT NOT NULL DEFAULT 'compliance_only',
  entitlements            JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_accounts_client_id ON billing_accounts (client_id);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_stripe_customer ON billing_accounts (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_accounts_status ON billing_accounts (billing_status);

-- ── Rules ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  jurisdiction    TEXT NOT NULL DEFAULT 'PA',
  obligation_type TEXT NOT NULL DEFAULT 'annual_report',
  version         INT NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  due_month       INT,
  due_day         INT,
  fee_usd         DECIMAL(10, 2),
  filing_method   TEXT,
  enforcement     JSONB DEFAULT '{}',
  source_citation TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rules_active ON rules (is_active, jurisdiction, entity_type);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules (obligation_type);

-- ── Referrals ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referrals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id  UUID NOT NULL,
  referred_email      TEXT NOT NULL,
  referral_status     TEXT NOT NULL DEFAULT 'invited',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (referral_status);

-- ── Partners ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  partner_type    TEXT NOT NULL DEFAULT 'cpa',
  commission_rate DECIMAL(5, 2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_active ON partners (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners (partner_type);

-- ── Client-Organization Link (multi-entity support) ────────

CREATE TABLE IF NOT EXISTS client_organizations (
  client_id       UUID NOT NULL REFERENCES clients(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role            TEXT NOT NULL DEFAULT 'owner',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_client_orgs_client ON client_organizations (client_id);
CREATE INDEX IF NOT EXISTS idx_client_orgs_org ON client_organizations (organization_id);

-- ── Seed PA Compliance Rules ───────────────────────────────

INSERT INTO rules (entity_type, jurisdiction, obligation_type, version, is_active, due_month, due_day, fee_usd, filing_method, enforcement, source_citation)
VALUES
  ('domestic_corp', 'PA', 'annual_report', 1, true, 6, 30, 7.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6}', '15 Pa. C.S. § 111'),
  ('domestic_llc', 'PA', 'annual_report', 1, true, 9, 30, 7.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6}', '15 Pa. C.S. § 111'),
  ('foreign_corp', 'PA', 'annual_report', 1, true, 6, 30, 7.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6, "no_reinstatement": true}', '15 Pa. C.S. § 111'),
  ('foreign_llc', 'PA', 'annual_report', 1, true, 9, 30, 7.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6, "no_reinstatement": true}', '15 Pa. C.S. § 111'),
  ('lp', 'PA', 'annual_report', 1, true, 12, 31, 7.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6}', '15 Pa. C.S. § 111'),
  ('llp', 'PA', 'annual_report', 1, true, 12, 31, 7.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6}', '15 Pa. C.S. § 111'),
  ('nonprofit', 'PA', 'annual_report', 1, true, 12, 31, 0.00, 'online_or_mail', '{"dissolution_risk": true, "grace_period_months": 6}', '15 Pa. C.S. § 111')
ON CONFLICT DO NOTHING;

-- ── Updated_at trigger function ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['organizations', 'clients', 'obligations', 'workflow_jobs', 'billing_accounts', 'rules', 'partners'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl);
  END LOOP;
END;
$$;
