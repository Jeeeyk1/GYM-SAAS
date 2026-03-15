-- ============================================================
-- GymSaaS — Create Platform Admin Account
-- ============================================================
--
-- STEP 1: Generate a bcrypt hash for your chosen password.
--         Run this from the monorepo root:
--
--   node -e "require('bcryptjs').hash('Admin@2026!', 10).then(console.log)"
--
--         Or from apps/api (uses bcrypt):
--
--   cd apps/api && node -e "require('bcrypt').hash('Admin@2026!', 10).then(console.log)"
--
-- STEP 2: Copy the output and replace REPLACE_WITH_BCRYPT_HASH below.
--
-- STEP 3: Run against your dev database:
--
--   psql postgresql://gymsaas:gymsaas_secret@localhost:5432/gymsaas -f docs/seed-admin.sql
--
-- This script is idempotent — safe to run multiple times.
-- If the email already exists, it upgrades it to PLATFORM_ADMIN.
-- ============================================================

DO $$
DECLARE
  v_hash TEXT := '$2b$10$LIA92m94HsUYzDKaNE7aN.GG0ybHyflQKdUniIJyfiHJxnQziF15G';
  v_email TEXT := 'admin@gymsaas.dev';
BEGIN
  IF v_hash = 'REPLACE_WITH_BCRYPT_HASH' THEN
    RAISE EXCEPTION 'You must replace REPLACE_WITH_BCRYPT_HASH with a real bcrypt hash before running this script.';
  END IF;

  INSERT INTO identities (
    id,
    email,
    password_hash,
    provider,
    is_verified,
    account_type,
    platform_role,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_email,
    v_hash,
    'local',
    TRUE,
    'PLATFORM_ADMIN',
    'super_admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
    SET password_hash  = EXCLUDED.password_hash,
        account_type   = 'PLATFORM_ADMIN',
        platform_role  = 'super_admin',
        is_verified    = TRUE,
        updated_at     = NOW();

  RAISE NOTICE 'Platform admin ready: %', v_email;
END $$;
