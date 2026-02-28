-- Migration: 005_create_chat_structure
-- Chat tables for future WebSocket phase.
-- Tables exist now so foreign keys and seeds can reference them.
-- Service layer is NOT implemented yet — these are structure-only.
-- Idempotent: all DDL uses IF NOT EXISTS

-- ─── Chat Rooms ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_rooms (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type        VARCHAR(50)  NOT NULL DEFAULT 'gym_public'
                CHECK (type IN ('gym_public', 'member_dm', 'group')),
  name        VARCHAR(255),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_client ON chat_rooms(client_id);

-- ─── Chat Room Members ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id      UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  member_id    UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (room_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_member ON chat_room_members(member_id);

-- ─── Chat Messages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body       TEXT,
  type       VARCHAR(50) NOT NULL DEFAULT 'text'
               CHECK (type IN ('text', 'image', 'system', 'gif')),
  metadata   JSONB       NOT NULL DEFAULT '{}',
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- soft delete, body nulled on delete
);

-- Cursor-based pagination: fetch messages before a given sent_at
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_sent
  ON chat_messages(room_id, sent_at DESC);

-- Soft-delete filter
CREATE INDEX IF NOT EXISTS idx_chat_messages_active
  ON chat_messages(room_id, sent_at DESC)
  WHERE deleted_at IS NULL;