-- Migration: Add IP address and user agent columns to audit_events for security forensics
-- Run against Neon Postgres: psql $DATABASE_URL -f migrations/002_audit_events_add_ip_and_ua.sql

ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_events_ip ON audit_events (ip_address) WHERE ip_address IS NOT NULL;
