-- Migration: 004_create_operations
-- Check-ins, announcements, audit logs
-- Idempotent: all DDL uses IF NOT EXISTS

-- ─── Check-ins ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS check_ins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  member_id     UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method        VARCHAR(50) NOT NULL DEFAULT 'qr'
                  CHECK (method IN ('qr', 'manual', 'kiosk', 'app')),
  station       VARCHAR(100),
  -- stores behavior outcomes: loyalty points awarded, messages sent, etc.
  -- populated by CheckInBehaviorRegistry after all handlers run
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant-scoped queries are the most common pattern
CREATE INDEX IF NOT EXISTS idx_checkins_client_member
  ON check_ins(client_id, member_id);

CREATE INDEX IF NOT EXISTS idx_checkins_client_date
  ON check_ins(client_id, checked_in_at DESC);

-- For duplicate check-in prevention: find recent check-in for a member
CREATE INDEX IF NOT EXISTS idx_checkins_member_date
  ON check_ins(member_id, checked_in_at DESC);

-- ─── Announcements ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id    UUID         REFERENCES staff(id) ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT         NOT NULL,
  is_pinned    BOOLEAN      NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_client_published
  ON announcements(client_id, published_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_announcements_updated_at') THEN
    CREATE TRIGGER trg_announcements_updated_at
      BEFORE UPDATE ON announcements
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- ─── Audit Logs ────────────────────────────────────────────────────────────
-- Append-only. Never update or delete rows here.
-- Use BIGSERIAL for fast sequential inserts and range queries.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL   PRIMARY KEY,
  client_id   UUID        REFERENCES clients(id) ON DELETE SET NULL,
  actor_id    UUID        REFERENCES identities(id) ON DELETE SET NULL,
  actor_type  VARCHAR(50) CHECK (actor_type IN ('member', 'staff', 'system', 'superadmin')),
  -- dot-namespaced action: 'member.checkin', 'feature.override.update', 'member.suspend'
  action      VARCHAR(200) NOT NULL,
  target_type VARCHAR(100),
  target_id   UUID,
  -- full before/after snapshot for sensitive mutations
  payload     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most queries: show audit trail for a specific gym, newest first
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_created
  ON audit_logs(client_id, created_at DESC);

-- Action-type filtering within a gym
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_action
  ON audit_logs(client_id, action);