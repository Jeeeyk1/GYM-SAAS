export const PERMISSIONS = {
  MEMBERS_READ: 'members:read',
  MEMBERS_WRITE: 'members:write',
  MEMBERS_DELETE: 'members:delete',
  CHECKINS_READ: 'checkins:read',
  CHECKINS_CREATE: 'checkins:create',
  STAFF_READ: 'staff:read',
  STAFF_WRITE: 'staff:write',
  FEATURES_READ: 'features:read',
  FEATURES_CONFIGURE: 'features:configure',
  ANNOUNCEMENTS_READ: 'announcements:read',
  ANNOUNCEMENTS_WRITE: 'announcements:write',
  ANALYTICS_READ: 'analytics:read',
  GYM_SETTINGS: 'gym:settings',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];