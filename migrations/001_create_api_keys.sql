-- Migration: Create api_keys table for API key authentication
-- Run against Neon Postgres: psql $DATABASE_URL -f migrations/001_create_api_keys.sql

CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash      TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL DEFAULT 'default',
  scopes        JSONB NOT NULL DEFAULT '["read"]',
  rate_limit    INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_client ON api_keys (client_id);
