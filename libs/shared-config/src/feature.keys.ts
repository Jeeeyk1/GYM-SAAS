/**
 * Single source of truth for feature flag keys.
 * Used by API (feature resolver), web (hide/show UI), mobile (gate features).
 */
export const FEATURE_KEYS = {
  CHECKIN_BASIC: 'checkin.basic',
  CHECKIN_LOYALTY_POINTS: 'checkin.loyalty_points',
  CHECKIN_WELCOME_MESSAGE: 'checkin.welcome_message',
  CHECKIN_ACTIVE_MEMBERS_BOARD: 'checkin.active_members_board',
  ANNOUNCEMENTS_BASIC: 'announcements.basic',
  CHAT_GYM_PUBLIC: 'chat.gym_public',
  ANALYTICS_BASIC: 'analytics.basic',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];