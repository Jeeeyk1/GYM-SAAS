-- Migration: 20260321000015_add_branch_id_to_identity_roles
-- Adds branch_id to identity_roles to enable branch-scoped role assignments.
--
-- Role scoping rules enforced by this schema:
--   org_owner  → branch_id IS NULL  (org-wide)
--   gym_owner  → branch_id = <uuid> (specific branch)
--   staff      → branch_id = <uuid> (specific branch)
--   member     → branch_id IS NULL  (org-wide, checks in at any branch)
--
-- Primary key change:
--   Old PK: (identity_id, role_id, organization_id)     — 3-column composite
--   New PK: surrogate UUID id column
--   New unique constraint: UNIQUE NULLS NOT DISTINCT (identity_id, role_id, organization_id, branch_id)
--
-- NULLS NOT DISTINCT is available in PostgreSQL 15+. This project runs PostgreSQL 16.
--
-- Idempotent: all DDL is wrapped in IF NOT EXISTS / conditional DO blocks.

-- migrate:up

-- ─── Step 1: Add surrogate primary key ───────────────────────────────────────
-- Allows branch_id (nullable) to participate in the uniqueness guarantee
-- without requiring NULL in a PK column (which PostgreSQL forbids).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_roles' AND column_name = 'id'
  ) THEN
    ALTER TABLE identity_roles ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END;
$$;

-- Drop the old composite PK before adding the new surrogate PK
ALTER TABLE identity_roles DROP CONSTRAINT IF EXISTS identity_roles_pkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'identity_roles' AND constraint_name = 'identity_roles_pkey'
  ) THEN
    ALTER TABLE identity_roles ADD PRIMARY KEY (id);
  END IF;
END;
$$;

-- ─── Step 2: Add branch_id column ────────────────────────────────────────────
-- ON DELETE CASCADE: if a branch is deleted, remove its staff/gym_owner role assignments.
-- Existing rows (org_owner, member) correctly default to NULL (org-wide scope).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_roles' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE identity_roles
      ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ─── Step 3: Unique constraint with NULLS NOT DISTINCT ───────────────────────
-- Ensures an identity cannot hold the same role at the same org+branch twice.
-- NULLS NOT DISTINCT means two NULLs ARE considered equal (org-wide roles are unique).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'identity_roles'
      AND constraint_name = 'uq_identity_roles_assignment'
  ) THEN
    ALTER TABLE identity_roles
      ADD CONSTRAINT uq_identity_roles_assignment
        UNIQUE NULLS NOT DISTINCT (identity_id, role_id, organization_id, branch_id);
  END IF;
END;
$$;

-- ─── Step 4: Index for the most common guard query ───────────────────────────
-- GymRoleGuard queries: SELECT * FROM identity_roles WHERE identity_id = $1 AND organization_id = $2
-- branch_id is then filtered in application code.

CREATE INDEX IF NOT EXISTS idx_identity_roles_identity_org
  ON identity_roles(identity_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_identity_roles_branch
  ON identity_roles(branch_id)
  WHERE branch_id IS NOT NULL;

