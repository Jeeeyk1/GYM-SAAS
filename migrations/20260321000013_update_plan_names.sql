-- Migration: 20260321000013_update_plan_names
-- Renames subscription plan values: starter → basic, growth → advanced
-- Applies to:
--   • clients.plan        (legacy table, already applied in DB)
--   • subscriptions.plan  (created by migration 010)
--
-- Order: DROP constraint → UPDATE data → ADD new constraint → SET DEFAULT
-- (constraint must be dropped before data is updated, not after)
-- Idempotent: constraint drops use IF EXISTS; data updates use WHERE guards.

-- migrate:up

-- ─── clients.plan ────────────────────────────────────────────────────────────

-- Drop old CHECK first so the UPDATE doesn't violate it
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_check;

UPDATE clients SET plan = 'basic'    WHERE plan = 'starter';
UPDATE clients SET plan = 'advanced' WHERE plan = 'growth';

ALTER TABLE clients
  ADD CONSTRAINT clients_plan_check
    CHECK (plan IN ('basic', 'advanced', 'enterprise'));

ALTER TABLE clients ALTER COLUMN plan SET DEFAULT 'basic';

-- ─── subscriptions.plan ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'subscriptions'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

    UPDATE subscriptions SET plan = 'basic'    WHERE plan = 'starter';
    UPDATE subscriptions SET plan = 'advanced' WHERE plan = 'growth';

    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_plan_check
        CHECK (plan IN ('basic', 'advanced', 'enterprise'));

    ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'basic';
  END IF;
END;
$$;
