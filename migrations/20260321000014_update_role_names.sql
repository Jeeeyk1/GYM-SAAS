-- Migration: 20260321000014_update_role_names
-- Updates gym-level role names to match the new role hierarchy.
-- Runs after migration 012, so roles.client_id is already organization_id.
--
-- Changes:
--   front_desk → staff
--   gym_admin (gym-scoped) → removed
--   org_owner              → added (org-wide owner, branch_id NULL after migration 015)
--
-- Idempotent: INSERT uses WHERE NOT EXISTS; DELETE is safe to re-run on empty sets.

-- migrate:up

-- ─── Step 1: front_desk → staff ──────────────────────────────────────────────

UPDATE roles
SET    name = 'staff'
WHERE  name = 'front_desk';

UPDATE invites
SET    role = 'staff'
WHERE  role = 'front_desk';

-- ─── Step 2: Add org_owner role for every organization ───────────────────────

INSERT INTO roles (organization_id, name, description, is_system)
SELECT DISTINCT r.organization_id, 'org_owner', 'Organization-wide owner', TRUE
FROM   roles r
WHERE  r.name = 'gym_owner'
  AND  r.organization_id IS NOT NULL
  AND  NOT EXISTS (
         SELECT 1 FROM roles r2
         WHERE  r2.organization_id = r.organization_id
           AND  r2.name = 'org_owner'
       );

-- ─── Step 3: Reassign existing gym_owner identity_roles → org_owner ──────────
-- Original gym creators become org-wide owners.
-- branch_id doesn't exist yet (added by migration 015); existing rows will get
-- NULL when the column is added, which correctly means org-wide scope.

UPDATE identity_roles
SET    role_id = org_role.id
FROM   roles org_role
JOIN   roles gyo_role
         ON  gyo_role.name            = 'gym_owner'
         AND gyo_role.organization_id = org_role.organization_id
WHERE  org_role.name              = 'org_owner'
  AND  identity_roles.role_id     = gyo_role.id;

-- ─── Step 4: Remove gym_admin as a gym-level role ────────────────────────────

DELETE FROM identity_roles
WHERE role_id IN (
  SELECT id FROM roles
  WHERE  name = 'gym_admin'
    AND  organization_id IS NOT NULL
);

DELETE FROM roles
WHERE  name = 'gym_admin'
  AND  organization_id IS NOT NULL;
