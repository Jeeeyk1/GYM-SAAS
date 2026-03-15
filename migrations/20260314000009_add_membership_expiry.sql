-- Migration: 009_add_membership_expiry
-- Adds membership start/expiry tracking to the members table.
-- Nullable in DB (safe for existing data); required at application layer via DTO.
-- Idempotent: all DDL uses IF NOT EXISTS / IF EXISTS

ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_started_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;

-- Partial index optimised for cron expiry-reminder queries:
-- only active members that have an expiry date set
CREATE INDEX IF NOT EXISTS idx_members_client_expires
  ON members(client_id, membership_expires_at)
  WHERE membership_expires_at IS NOT NULL AND status = 'active';
