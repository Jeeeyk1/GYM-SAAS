-- Migration: 20260321000016_update_platform_role_enum
-- Renames platform-level role identifiers on the identities table.
--
-- Changes:
--   platform_role: super_admin | platform_support → gym_admin
--
-- Order: DROP constraint → UPDATE data → ADD new constraint
-- (same pattern as migration 013 — constraint must be dropped before data is updated)
-- Idempotent: constraint drops use IF EXISTS; UPDATE WHERE guard is safe to re-run.

-- migrate:up

-- ─── Drop old CHECK first so the UPDATE doesn't violate it ───────────────────

ALTER TABLE identities DROP CONSTRAINT IF EXISTS chk_identity_platform_role;

-- ─── Migrate existing platform role values ───────────────────────────────────

UPDATE identities
SET    platform_role = 'gym_admin'
WHERE  platform_role IN ('super_admin', 'platform_support');

-- ─── Add new CHECK constraint ─────────────────────────────────────────────────
-- NULL is always valid for gym_user accounts — PostgreSQL CHECK ignores NULL rows.

ALTER TABLE identities
  ADD CONSTRAINT chk_identity_platform_role
    CHECK (platform_role IN ('gym_admin'));
