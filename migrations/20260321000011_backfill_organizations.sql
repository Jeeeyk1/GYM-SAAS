-- Migration: 20260321000011_backfill_organizations
-- Phase 2 of the organization/branch refactor (revision: 2026-03-21_Organization_Revision.md)
-- Copies existing tenant data from the legacy tables into the new org model.
-- Legacy tables (clients, client_profiles) are NOT dropped here — that is Phase 6.
-- Idempotent: every INSERT uses ON CONFLICT DO NOTHING or WHERE NOT EXISTS.

-- ─── UP ────────────────────────────────────────────────────────────────────────
-- migrate:up

-- ─── Step 1: organizations ← clients ──────────────────────────────────────────
-- `plan` stays in clients for now; subscriptions are populated in Step 4.
-- `demo_expires_at` has no counterpart in organizations — intentionally dropped.

INSERT INTO organizations (id, slug, name, status, is_demo, created_at, updated_at)
SELECT
  id,
  slug,
  name,
  status,
  is_demo,
  created_at,
  updated_at
FROM clients
ON CONFLICT (id) DO NOTHING;

-- ─── Step 2: organization_profiles ← client_profiles ──────────────────────────
-- client_profiles.client_id maps directly to organizations.id (same UUID values).
-- Only insert profiles whose parent client was successfully migrated in Step 1.

INSERT INTO organization_profiles (
  organization_id,
  address,
  phone,
  email,
  logo_url,
  brand_color,
  timezone,
  operating_hours,
  metadata,
  created_at,
  updated_at
)
SELECT
  cp.client_id,   -- becomes organization_id; same UUID, no translation needed
  cp.address,
  cp.phone,
  cp.email,
  cp.logo_url,
  cp.brand_color,
  cp.timezone,
  cp.operating_hours,
  cp.metadata,
  cp.created_at,
  cp.updated_at
FROM client_profiles cp
WHERE EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = cp.client_id
)
ON CONFLICT (organization_id) DO NOTHING;

-- ─── Step 3: branches — one default "Main Branch" per organization ─────────────
-- The revision specifies: INSERT … SELECT gen_random_uuid(), id, name || ' — Main Branch' …
-- WHERE NOT EXISTS guard prevents duplicate branches if this migration is re-run.

INSERT INTO branches (id, organization_id, name, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  o.id,
  o.name || ' — Main Branch',
  TRUE,
  now(),
  now()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM branches b WHERE b.organization_id = o.id
);

-- ─── Step 4: subscriptions ← clients.plan ─────────────────────────────────────
-- Revision spec: INSERT INTO subscriptions (organization_id, plan, created_at)
--                SELECT id, plan, created_at FROM organizations;
-- We extend this with plan-appropriate capacity defaults so the new table is
-- immediately useful. These can be updated per-org by platform admins later.
--
-- Capacity defaults by plan:
--   starter    → 100 members,   1 branch, no AI tokens
--   growth     → 500 members,   5 branches, 100k AI tokens
--   enterprise → unlimited (-1) members/branches, 1M AI tokens

INSERT INTO subscriptions (
  organization_id,
  plan,
  max_members,
  max_branches,
  ai_token_limit,
  auto_renew,
  created_at
)
SELECT
  c.id,
  c.plan,
  CASE c.plan
    WHEN 'enterprise' THEN -1
    WHEN 'growth'     THEN 500
    ELSE                   100
  END  AS max_members,
  CASE c.plan
    WHEN 'enterprise' THEN -1
    WHEN 'growth'     THEN 5
    ELSE                   1
  END  AS max_branches,
  CASE c.plan
    WHEN 'enterprise' THEN 1000000
    WHEN 'growth'     THEN 100000
    ELSE                   0
  END  AS ai_token_limit,
  TRUE AS auto_renew,
  c.created_at
FROM clients c
WHERE EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = c.id
)
ON CONFLICT (organization_id) DO NOTHING;

