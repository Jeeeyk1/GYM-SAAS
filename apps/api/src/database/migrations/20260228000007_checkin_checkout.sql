-- Migration: 007_checkin_checkout
-- Adds checkout support, updates check-in method values, adds member QR token columns
-- Idempotent: all DDL uses IF NOT EXISTS / conditional blocks

-- ─── Add checked_out_at ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'check_ins' AND column_name = 'checked_out_at'
  ) THEN
    ALTER TABLE check_ins ADD COLUMN checked_out_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── Add checkout_method ─────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'check_ins' AND column_name = 'checkout_method'
  ) THEN
    ALTER TABLE check_ins ADD COLUMN checkout_method VARCHAR(50)
      CHECK (checkout_method IN ('manual', 'auto', 'staff'));
  END IF;
END $$;

-- ─── Update check-in method constraint ───────────────────────────────────────
-- Old values: 'qr', 'manual', 'kiosk', 'app'
-- New values: 'qr_staff_scan', 'qr_self_scan', 'manual'

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_ins_method_check'
  ) THEN
    ALTER TABLE check_ins DROP CONSTRAINT check_ins_method_check;
  END IF;
END $$;

ALTER TABLE check_ins ADD CONSTRAINT check_ins_method_check
  CHECK (method IN ('qr_staff_scan', 'qr_self_scan', 'manual'));

-- Update the column default to match new values
ALTER TABLE check_ins ALTER COLUMN method SET DEFAULT 'qr_staff_scan';

-- ─── Member QR token (30-day long-lived, works offline) ──────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'qr_token'
  ) THEN
    ALTER TABLE members ADD COLUMN qr_token TEXT;
    ALTER TABLE members ADD COLUMN qr_token_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── Partial index: fast "who is currently checked in" queries ────────────────

CREATE INDEX IF NOT EXISTS idx_checkins_client_open
  ON check_ins(client_id, checked_in_at DESC)
  WHERE checked_out_at IS NULL;
