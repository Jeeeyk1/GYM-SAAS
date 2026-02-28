-- Migration: 007_add_account_type_to_identities
-- Adds account_type and platform_role columns to the identities table.
--
-- account_type: distinguishes platform admins from gym users (staff/members).
-- platform_role: only populated for platform_admin accounts.
--
-- All existing rows default to 'gym_user' — zero downtime, fully backwards-compatible.
-- Idempotent: wrapped in DO $$ blocks so running twice is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identities' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE identities
      ADD COLUMN account_type VARCHAR(30) NOT NULL DEFAULT 'gym_user'
        CONSTRAINT chk_identity_account_type
          CHECK (account_type IN ('platform_admin', 'gym_user'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identities' AND column_name = 'platform_role'
  ) THEN
    ALTER TABLE identities
      ADD COLUMN platform_role VARCHAR(30)
        CONSTRAINT chk_identity_platform_role
          CHECK (platform_role IN ('super_admin', 'platform_support'));
    -- NULL is valid for all gym_user accounts
  END IF;
END;
$$;

-- Index for fast lookup of platform admins (small set, but queried at login)
CREATE INDEX IF NOT EXISTS idx_identities_platform_admin
  ON identities(account_type)
  WHERE account_type = 'platform_admin';
