-- Migration: 002_create_feature_system
-- Feature definitions, client feature flags, and behavior overrides
-- Idempotent: all DDL uses IF NOT EXISTS

-- ─── Feature Definitions (Global Catalog) ─────────────────────────────────
-- Platform-level catalog of every feature that exists.
-- Seeded by the application, not by gyms.

CREATE TABLE IF NOT EXISTS feature_definitions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key             VARCHAR(100) UNIQUE NOT NULL,  -- e.g. 'checkin.loyalty_points'
  display_name    VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),                  -- 'checkin' | 'chat' | 'analytics'
  default_enabled BOOLEAN      NOT NULL DEFAULT FALSE,
  -- JSON schema for config values this feature supports
  default_config  JSONB        NOT NULL DEFAULT '{}',
  -- which plans can access this feature
  available_plans TEXT[]       NOT NULL DEFAULT ARRAY['starter','growth','enterprise'],
  is_beta         BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,  -- soft-disable platform-wide
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_definitions_key      ON feature_definitions(key);
CREATE INDEX IF NOT EXISTS idx_feature_definitions_category ON feature_definitions(category);

-- ─── Client Features (Enabled Flags Per Gym) ──────────────────────────────
-- Controls whether a specific feature is ON or OFF for a gym.
-- Seeded automatically during gym onboarding.

CREATE TABLE IF NOT EXISTS client_features (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_id  UUID    NOT NULL REFERENCES feature_definitions(id) ON DELETE CASCADE,
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_at  TIMESTAMPTZ,
  CONSTRAINT uq_client_features UNIQUE (client_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_client_features_client ON client_features(client_id);

-- ─── Client Feature Overrides (Gym-Specific Behavior Config) ──────────────
-- Stores per-gym config that is deep-merged over feature_definitions.default_config
-- at runtime. If no override exists, the default_config is used as-is.

CREATE TABLE IF NOT EXISTS client_feature_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_id  UUID NOT NULL REFERENCES feature_definitions(id) ON DELETE CASCADE,
  -- Only store keys the gym has customized — deep-merged at read time
  config      JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- track who changed the config for audit purposes
  updated_by  UUID,  -- references staff(id), added as FK in staff migration
  CONSTRAINT uq_client_feature_overrides UNIQUE (client_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_client_feature_overrides_client ON client_feature_overrides(client_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_client_feature_overrides_updated_at'
  ) THEN
    CREATE TRIGGER trg_client_feature_overrides_updated_at
      BEFORE UPDATE ON client_feature_overrides
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;