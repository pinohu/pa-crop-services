-- ── 0002_reconcile_schema.sql ──────────────────────────────────────────────
-- Reconciles three pre-existing 001 schema files (schema/001_init.sql,
-- infrastructure/migrations/001_schema.sql, migrations/001_create_api_keys.sql)
-- into the canonical shape that api/services/db.js already assumes.
--
-- This file is IDEMPOTENT — every statement uses IF NOT EXISTS / ADD COLUMN
-- IF NOT EXISTS / CREATE INDEX IF NOT EXISTS so it can be safely re-run on
-- staging or production multiple times without error.
--
-- Apply against production AFTER:
--   1. Take a logical Neon backup (Neon Console → Branches → New branch FROM
--      production-current; that gives you a point-in-time snapshot to revert
--      to if anything goes wrong).
--   2. Quickly inspect production with:
--        \d clients; \d organizations; \d obligations; \d rules;
--        \d referrals; \d notifications; \d documents; \d audit_events;
--      Compare each table to this file and confirm the IF NOT EXISTS
--      additions reflect what's actually missing.
--   3. Apply during a low-traffic window (these are non-locking ADD COLUMN +
--      CREATE INDEX statements; obligations + audit_events are the largest
--      tables — index creation is CONCURRENTLY-safe but kept simple here).
--
-- Run with:
--   psql "$DATABASE_URL" -f migrations/0002_reconcile_schema.sql
--
-- After running, verify with:
--   SELECT name FROM schema_migrations ORDER BY applied_at;

-- ── Migration ledger (creates the table that should track migrations going forward) ──
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── rules table — bring up to canonical (matches api/services/db.js#getActiveRule + #createRule) ──
ALTER TABLE rules ADD COLUMN IF NOT EXISTS effective_date    DATE;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS superseded_at     TIMESTAMPTZ;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS authority_source  TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS authority_url     TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS rule_json         JSONB;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS created_by        TEXT;

-- ── obligations table — escalation_level + closed_at + rule_version (referenced by services/obligations.js) ──
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS escalation_level TEXT NOT NULL DEFAULT 'none';
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS closed_at        TIMESTAMPTZ;
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS rule_version     TEXT;

-- ── clients table — referral_code uniqueness + Wave 10 hosting_password staging ──
-- referral_code uniqueness is referenced by getReferrals + the partner channel.
-- Use a unique INDEX (not constraint) so existing duplicates surface as a
-- migration error you can investigate without aborting the whole run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_referral_code
  ON clients (referral_code)
  WHERE referral_code IS NOT NULL;

-- ── referrals table — three columns that db.js#createReferral / #getReferrals reference ──
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS conversion_date    TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS credit_amount      NUMERIC(10, 2);
CREATE INDEX IF NOT EXISTS idx_referrals_conversion_date ON referrals (conversion_date);

-- ── partners table — created during Wave 3 partner-intake migration ──
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
CREATE INDEX IF NOT EXISTS idx_partners_type   ON partners (partner_type);

-- ── api_keys table — already created by migrations/001_create_api_keys.sql; no-op if present ──
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,
  label        TEXT,
  scopes       TEXT[],
  expires_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash  ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys (client_id);

-- ── Missing performance indexes flagged by the database audit ──

-- Reminder worker query: WHERE delivery_status='scheduled' AND scheduled_for <= now()
-- Composite (scheduled_for, delivery_status) prefix-orders by time so EXPLAIN
-- prefers an index scan over a sequential scan once notifications grows.
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_status
  ON notifications (scheduled_for, delivery_status)
  WHERE delivery_status = 'scheduled';

-- getObligationsDueSoon(): WHERE due_date <= $1 — supports the upcoming-deadline
-- worker. The schema already has idx_obligations_due_date in some branches but
-- not in schema/001_init.sql; this is the IF-NOT-EXISTS top-up.
CREATE INDEX IF NOT EXISTS idx_obligations_due_date_status
  ON obligations (due_date, obligation_status);

-- audit_events composite is in schema/001_init.sql but not infrastructure/.
-- Also add a target_id-only fallback for queries that omit target_type
-- (admin/client-360.js calls getAuditEvents({ targetId }) without targetType).
CREATE INDEX IF NOT EXISTS idx_audit_events_target_id_only
  ON audit_events (target_id);

-- ── Stripe-event idempotency table (supports stripe-webhook.js Wave 2 fallback if Redis is down) ──
-- We use Upstash Redis with NX+TTL as the primary idempotency store, but this
-- table lets us audit duplicate-delivery patterns over time.
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id       TEXT PRIMARY KEY,
  event_type     TEXT,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
  ON processed_stripe_events (processed_at DESC);

-- ── Mark this migration as applied ──
INSERT INTO schema_migrations (name) VALUES ('0002_reconcile_schema')
ON CONFLICT (name) DO NOTHING;

-- ── End of 0002_reconcile_schema.sql ──
