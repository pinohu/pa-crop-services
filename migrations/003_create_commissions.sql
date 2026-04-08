-- Migration: Create commissions table for durable partner commission tracking
-- Run against Neon Postgres: psql $DATABASE_URL -f migrations/003_create_commissions.sql

-- ── Commissions ───────────────────────────────────────────
-- Tracks individual commission events (one row per referral conversion).
-- Source of truth for payouts — SuiteDash custom fields are synced secondarily.

CREATE TABLE IF NOT EXISTS commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES partners(id),
  referral_id         UUID REFERENCES referrals(id),
  client_id           UUID REFERENCES clients(id),
  organization_id     UUID REFERENCES organizations(id),
  plan_code           TEXT NOT NULL DEFAULT 'compliance_only',
  plan_amount_usd     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_rate     DECIMAL(5, 4) NOT NULL DEFAULT 0.2000,
  commission_usd      DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_status   TEXT NOT NULL DEFAULT 'pending',
  period_start        DATE,
  period_end          DATE,
  paid_at             TIMESTAMPTZ,
  payout_reference    TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions (partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_client ON commissions (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions (commission_status);
CREATE INDEX IF NOT EXISTS idx_commissions_created ON commissions (created_at);

-- Add partner_id to referrals table for direct partner->referral linkage
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_client_id UUID REFERENCES clients(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS credit_amount DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_referrals_partner ON referrals (partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_referred_client ON referrals (referred_client_id) WHERE referred_client_id IS NOT NULL;

-- Apply updated_at trigger to commissions
CREATE TRIGGER set_updated_at BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
