-- Migration: 006_create_invites
-- Invite tokens for owner, staff, and member onboarding
-- Idempotent: all DDL uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS invites (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token       VARCHAR(64)  UNIQUE NOT NULL,
  client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  identity_id UUID         NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  role        VARCHAR(100) NOT NULL,
  type        VARCHAR(50)  NOT NULL
                CHECK (type IN ('owner', 'staff', 'member')),
  invited_by  UUID         REFERENCES staff(id) ON DELETE SET NULL,
  status      VARCHAR(50)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at  TIMESTAMPTZ  NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token    ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_client   ON invites(client_id);
CREATE INDEX IF NOT EXISTS idx_invites_identity ON invites(identity_id);
