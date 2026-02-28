-- Seed: feature_definitions + default platform roles + permissions
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
-- Run via: npm run seed

-- ─── Feature Definitions ───────────────────────────────────────────────────

INSERT INTO feature_definitions (key, display_name, description, category, default_enabled, default_config, available_plans)
VALUES
  (
    'checkin.basic',
    'Basic Check-in',
    'QR code check-in with attendance logging',
    'checkin',
    TRUE,
    '{"duplicate_window_minutes": 60}',
    ARRAY['starter','growth','enterprise']
  ),
  (
    'checkin.loyalty_points',
    'Loyalty Points on Check-in',
    'Award loyalty points to members each time they check in',
    'checkin',
    FALSE,
    '{"points_per_checkin": 10}',
    ARRAY['growth','enterprise']
  ),
  (
    'checkin.welcome_message',
    'Welcome Push Notification',
    'Send a personalized push notification when a member checks in',
    'checkin',
    FALSE,
    '{"message": "Welcome back, {first_name}! Great to see you today."}',
    ARRAY['growth','enterprise']
  ),
  (
    'checkin.active_members_board',
    'Active Members Board',
    'Display currently checked-in members (respects privacy settings)',
    'checkin',
    FALSE,
    '{"max_display": 20, "refresh_interval_seconds": 30}',
    ARRAY['starter','growth','enterprise']
  ),
  (
    'announcements.basic',
    'Announcements',
    'Staff can publish announcements visible to all members',
    'content',
    TRUE,
    '{"max_pinned": 3}',
    ARRAY['starter','growth','enterprise']
  ),
  (
    'chat.gym_public',
    'Gym Public Chat',
    'Gym-wide chat room where all members can talk',
    'chat',
    FALSE,
    '{"max_message_length": 500, "media_enabled": false}',
    ARRAY['growth','enterprise']
  ),
  (
    'analytics.basic',
    'Basic Analytics',
    'Check-in counts, peak hours, member retention',
    'analytics',
    TRUE,
    '{"retention_days": 90}',
    ARRAY['starter','growth','enterprise']
  )
ON CONFLICT (key) DO NOTHING;

-- ─── Platform Permissions ──────────────────────────────────────────────────

INSERT INTO permissions (key, category, description)
VALUES
  -- Members
  ('members:read',    'members', 'View member profiles and list'),
  ('members:write',   'members', 'Create and update members'),
  ('members:delete',  'members', 'Deactivate/remove members'),
  -- Check-ins
  ('checkins:read',   'checkins', 'View check-in history'),
  ('checkins:create', 'checkins', 'Perform check-ins (members + staff)'),
  -- Staff
  ('staff:read',      'staff', 'View staff list'),
  ('staff:write',     'staff', 'Invite and manage staff'),
  -- Features
  ('features:read',        'features', 'View feature configuration'),
  ('features:configure',   'features', 'Toggle features and edit overrides'),
  -- Announcements
  ('announcements:read',   'content', 'View announcements'),
  ('announcements:write',  'content', 'Create and manage announcements'),
  -- Analytics
  ('analytics:read',  'analytics', 'View gym analytics'),
  -- Gym settings
  ('gym:settings',    'admin', 'Edit gym profile and settings'),
  -- Audit
  ('audit:read',      'admin', 'View audit logs')
ON CONFLICT (key) DO NOTHING;

-- ─── Default Platform Roles ────────────────────────────────────────────────
-- These are "template" roles with client_id = NULL
-- During gym onboarding, these get cloned into gym-scoped roles

INSERT INTO roles (id, client_id, name, description, is_system)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'gym_owner',  'Full access to all gym features', TRUE),
  ('00000000-0000-0000-0000-000000000002', NULL, 'gym_admin',  'Manage members, staff, and settings', TRUE),
  ('00000000-0000-0000-0000-000000000003', NULL, 'front_desk', 'Check-in members and view basic info', TRUE),
  ('00000000-0000-0000-0000-000000000004', NULL, 'member',     'Member self-service access', TRUE),
  ('00000000-0000-0000-0000-000000000005', NULL, 'superadmin', 'Platform-level superadmin', TRUE)
ON CONFLICT (client_id, name) DO NOTHING;

-- ─── Role → Permission mappings ────────────────────────────────────────────

-- gym_owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- gym_admin: everything except audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE key != 'audit:read'
ON CONFLICT DO NOTHING;

-- front_desk: check-ins + member read + announcements read
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE key IN ('members:read', 'checkins:read', 'checkins:create', 'announcements:read')
ON CONFLICT DO NOTHING;

-- member: self-service
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE key IN ('checkins:create', 'announcements:read')
ON CONFLICT DO NOTHING;

-- superadmin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
ON CONFLICT DO NOTHING;