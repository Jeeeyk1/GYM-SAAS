-- Migration: 001_create_clients
-- Creates the core tenant tables: clients + client_profiles
-- All CREATE TABLE use IF NOT EXISTS — safe to re-run
-- All indexes use IF NOT EXISTS — safe to re-run

-- ─── Clients (Tenants / Gyms) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  status          VARCHAR(50)  NOT NULL DEFAULT 'onboarding'
                    CHECK (status IN ('onboarding', 'active', 'suspended', 'demo', 'churned')),
  plan            VARCHAR(50)  NOT NULL DEFAULT 'starter'
                    CHECK (plan IN ('starter', 'growth', 'enterprise')),
  is_demo         BOOLEAN      NOT NULL DEFAULT FALSE,
  demo_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_slug   ON clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- ─── Client Profiles (Gym Details) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_profiles (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  address         TEXT,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  timezone        VARCHAR(100) NOT NULL DEFAULT 'UTC',
  logo_url        TEXT,
  brand_color     VARCHAR(7),
  -- { mon: { open: "06:00", close: "22:00" }, tue: { ... }, ... }
  operating_hours JSONB   NOT NULL DEFAULT '{}',
  -- escape hatch for gym-specific fields without schema changes
  metadata        JSONB   NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_profiles_client UNIQUE (client_id)
);

-- ─── Updated_at trigger (reusable function) ────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger only if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_clients_updated_at'
  ) THEN
    CREATE TRIGGER trg_clients_updated_at
      BEFORE UPDATE ON clients
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_client_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_client_profiles_updated_at
      BEFORE UPDATE ON client_profiles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;