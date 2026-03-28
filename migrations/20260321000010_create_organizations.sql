-- Migration: 20260321000010_create_organizations
-- Phase 1 of the organization/branch refactor (revision: 2026-03-21_Organization_Revision.md)
-- Creates new tenant model: organizations, organization_profiles, branches, subscriptions
-- Does NOT drop or alter legacy clients/* tables — that happens in a later migration
-- Idempotent: all DDL uses IF NOT EXISTS

-- ─── UP ────────────────────────────────────────────────────────────────────────
-- migrate:up

-- ─── Organizations (replaces clients as the top-level tenant) ─────────────────
-- `plan` is intentionally absent — plan data lives in subscriptions

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR(100) UNIQUE NOT NULL,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(50)  NOT NULL DEFAULT 'onboarding'
               CHECK (status IN ('onboarding', 'active', 'suspended', 'demo', 'churned')),
  is_demo    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug   ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ─── Organization Profiles (gym-level contact/branding details) ────────────────

CREATE TABLE IF NOT EXISTS organization_profiles (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address         TEXT,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  logo_url        TEXT,
  brand_color     VARCHAR(7),
  timezone        VARCHAR(100) NOT NULL DEFAULT 'UTC',
  -- { mon: { open: "06:00", close: "22:00" }, ... }
  operating_hours JSONB        NOT NULL DEFAULT '{}',
  -- escape hatch for org-specific fields without schema changes
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_organization_profiles_org UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_profiles_org ON organization_profiles(organization_id);

-- ─── Branches (physical locations belonging to an organization) ─────────────────

CREATE TABLE IF NOT EXISTS branches (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  address         TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active       ON branches(organization_id, is_active);

-- ─── Subscriptions (plan + limits per organization, one row per org) ────────────
-- UNIQUE constraint on organization_id enforces the one-subscription-per-org rule

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL DEFAULT 'starter'
                    CHECK (plan IN ('starter', 'growth', 'enterprise')),
  max_members     INTEGER     NOT NULL DEFAULT 100,
  max_branches    INTEGER     NOT NULL DEFAULT 1,
  ai_token_limit  INTEGER     NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  auto_renew      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_org UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org        ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan       ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── Updated_at triggers ────────────────────────────────────────────────────────
-- set_updated_at() function is defined in migration 001; safe to reuse here

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organizations_updated_at'
  ) THEN
    CREATE TRIGGER trg_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organization_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_organization_profiles_updated_at
      BEFORE UPDATE ON organization_profiles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_branches_updated_at'
  ) THEN
    CREATE TRIGGER trg_branches_updated_at
      BEFORE UPDATE ON branches
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

