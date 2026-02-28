-- Migration: 003_create_identity_and_members
-- Identities (auth), members, staff, roles, permissions
-- Idempotent: all DDL uses IF NOT EXISTS

-- ─── Identities (Auth Layer) ───────────────────────────────────────────────
-- Decoupled from domain entities. One identity can be a member at Gym A
-- and staff at Gym B — linked via separate join records.

CREATE TABLE IF NOT EXISTS identities (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(50)  UNIQUE,
  password_hash TEXT,
  provider      VARCHAR(50)  NOT NULL DEFAULT 'local'
                  CHECK (provider IN ('local', 'google', 'apple')),
  provider_id   TEXT,
  is_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Must have at least one of email or phone
  CONSTRAINT chk_identity_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_identities_email ON identities(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_identities_phone ON identities(phone) WHERE phone IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_identities_updated_at') THEN
    CREATE TRIGGER trg_identities_updated_at
      BEFORE UPDATE ON identities
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- ─── Members ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS members (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  identity_id     UUID         REFERENCES identities(id) ON DELETE SET NULL,
  member_number   VARCHAR(100),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  status          VARCHAR(50)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  membership_type VARCHAR(100),  -- monthly | annual | drop-in | etc.
  joined_at       DATE,
  loyalty_points  INT          NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_members_client_number UNIQUE (client_id, member_number)
);

-- Most queries are scoped to a gym first — composite index is critical
CREATE INDEX IF NOT EXISTS idx_members_client         ON members(client_id);
CREATE INDEX IF NOT EXISTS idx_members_client_status  ON members(client_id, status);
CREATE INDEX IF NOT EXISTS idx_members_identity       ON members(identity_id) WHERE identity_id IS NOT NULL;
-- trgm index for name search within a gym
CREATE INDEX IF NOT EXISTS idx_members_name_trgm
  ON members USING gin((first_name || ' ' || last_name) gin_trgm_ops);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_members_updated_at') THEN
    CREATE TRIGGER trg_members_updated_at
      BEFORE UPDATE ON members
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- ─── Member Privacy Settings ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_privacy_settings (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id               UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  show_in_active_members  BOOLEAN NOT NULL DEFAULT TRUE,
  show_checkin_history    BOOLEAN NOT NULL DEFAULT FALSE,
  allow_member_messaging  BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_member_privacy UNIQUE (member_id)
);

-- ─── Staff ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  identity_id UUID         NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  title       VARCHAR(100),    -- "Front Desk", "Trainer", "Manager"
  status      VARCHAR(50)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'invited')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_client_identity UNIQUE (client_id, identity_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_client   ON staff(client_id);
CREATE INDEX IF NOT EXISTS idx_staff_identity ON staff(identity_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_staff_updated_at') THEN
    CREATE TRIGGER trg_staff_updated_at
      BEFORE UPDATE ON staff
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- Add FK for client_feature_overrides.updated_by now that staff table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cfo_updated_by'
  ) THEN
    ALTER TABLE client_feature_overrides
      ADD CONSTRAINT fk_cfo_updated_by
      FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- ─── Roles & Permissions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         REFERENCES clients(id) ON DELETE CASCADE,  -- NULL = platform role
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,  -- system roles can't be deleted
  CONSTRAINT uq_roles_client_name UNIQUE (client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_client ON roles(client_id) WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS permissions (
  id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key      VARCHAR(150) UNIQUE NOT NULL,  -- e.g. 'members:write', 'features:configure'
  category VARCHAR(100),
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ─── Identity Roles (Who has what role, at which gym) ─────────────────────

CREATE TABLE IF NOT EXISTS identity_roles (
  identity_id UUID        NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID        REFERENCES staff(id) ON DELETE SET NULL,
  PRIMARY KEY (identity_id, role_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_roles_identity_client
  ON identity_roles(identity_id, client_id);