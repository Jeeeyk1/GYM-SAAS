-- Migration: 20260321000012_fk_client_id_to_organization_id
-- Phase 3 of the organization/branch refactor (revision: 2026-03-21_Organization_Revision.md)
--
-- Renames client_id → organization_id on every tenant-scoped table.
-- Adds nullable branch_id to members and staff, populated from the default
-- main branch created in migration 011.
--
-- Strategy: RENAME COLUMN is used instead of add+copy+drop because:
--   • PostgreSQL tracks constraints and indexes by column attnum, not name.
--     UNIQUE constraints, PKs, and composite indexes all follow the rename
--     automatically — no need to drop/recreate them.
--   • Only the FK constraints must be replaced because their TARGET table
--     changes from clients → organizations.
--
-- Tables altered (10):
--   client_features, client_feature_overrides, members, staff,
--   roles, identity_roles, check_ins, announcements, audit_logs, invites
--
-- Idempotent: all renames and constraint changes are wrapped in DO blocks
-- that check information_schema before acting.

-- ─── UP ─────────────────────────────────────────────────────────────────────
-- migrate:up

-- ── client_features ──────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_features' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE client_features RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

-- Drop old auto-named FK (pointed at clients); add new one pointing at organizations.
ALTER TABLE client_features
  DROP CONSTRAINT IF EXISTS client_features_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_features'
      AND constraint_name = 'fk_client_features_org'
  ) THEN
    ALTER TABLE client_features
      ADD CONSTRAINT fk_client_features_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── client_feature_overrides ──────────────────────────────────────────────────
-- Note: fk_cfo_updated_by (references staff.id) is unrelated — leave it alone.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_feature_overrides' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE client_feature_overrides RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE client_feature_overrides
  DROP CONSTRAINT IF EXISTS client_feature_overrides_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'client_feature_overrides'
      AND constraint_name = 'fk_client_feature_overrides_org'
  ) THEN
    ALTER TABLE client_feature_overrides
      ADD CONSTRAINT fk_client_feature_overrides_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── members ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE members RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'members'
      AND constraint_name = 'fk_members_org'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT fk_members_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- branch_id: nullable — members can exist org-wide before being assigned a branch.
-- ON DELETE SET NULL: deleting a branch does not delete the member.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE members
      ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_members_branch ON members(branch_id) WHERE branch_id IS NOT NULL;

-- ── staff ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE staff RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE staff
  DROP CONSTRAINT IF EXISTS staff_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'staff'
      AND constraint_name = 'fk_staff_org'
  ) THEN
    ALTER TABLE staff
      ADD CONSTRAINT fk_staff_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE staff
      ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff(branch_id) WHERE branch_id IS NOT NULL;

-- ── Populate branch_id for members and staff ──────────────────────────────────
-- Each org has exactly one branch at this point (the main branch from migration 011).
-- The subquery uses LIMIT 1 as a safety guard; it will always find exactly one row.

UPDATE members m
SET    branch_id = (
         SELECT b.id FROM branches b
         WHERE  b.organization_id = m.organization_id
         LIMIT  1
       )
WHERE  m.branch_id IS NULL;

UPDATE staff s
SET    branch_id = (
         SELECT b.id FROM branches b
         WHERE  b.organization_id = s.organization_id
         LIMIT  1
       )
WHERE  s.branch_id IS NULL;

-- ── roles ─────────────────────────────────────────────────────────────────────
-- client_id is nullable here (NULL = platform-level role). Preserve that semantic.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE roles RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE roles
  DROP CONSTRAINT IF EXISTS roles_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'roles'
      AND constraint_name = 'fk_roles_org'
  ) THEN
    ALTER TABLE roles
      ADD CONSTRAINT fk_roles_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── identity_roles ────────────────────────────────────────────────────────────
-- client_id is part of the composite PK (identity_id, role_id, client_id).
-- PostgreSQL tracks PK membership by column attnum — RENAME COLUMN propagates to
-- the PK definition automatically. No drop/recreate of the PK is needed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_roles' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE identity_roles RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE identity_roles
  DROP CONSTRAINT IF EXISTS identity_roles_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'identity_roles'
      AND constraint_name = 'fk_identity_roles_org'
  ) THEN
    ALTER TABLE identity_roles
      ADD CONSTRAINT fk_identity_roles_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── check_ins ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'check_ins' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE check_ins RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE check_ins
  DROP CONSTRAINT IF EXISTS check_ins_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'check_ins'
      AND constraint_name = 'fk_check_ins_org'
  ) THEN
    ALTER TABLE check_ins
      ADD CONSTRAINT fk_check_ins_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── announcements ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE announcements RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'announcements'
      AND constraint_name = 'fk_announcements_org'
  ) THEN
    ALTER TABLE announcements
      ADD CONSTRAINT fk_announcements_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── audit_logs ────────────────────────────────────────────────────────────────
-- Originally nullable with ON DELETE SET NULL — preserve that exactly.
-- Audit rows must never be hard-deleted; the org deletion just NULLs the FK.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'audit_logs'
      AND constraint_name = 'fk_audit_logs_org'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT fk_audit_logs_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- ── invites ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE invites RENAME COLUMN client_id TO organization_id;
  END IF;
END;
$$;

ALTER TABLE invites
  DROP CONSTRAINT IF EXISTS invites_client_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'invites'
      AND constraint_name = 'fk_invites_org'
  ) THEN
    ALTER TABLE invites
      ADD CONSTRAINT fk_invites_org
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

