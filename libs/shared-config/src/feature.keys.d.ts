export declare const FEATURE_KEYS: {
    readonly CHECKIN_BASIC: "checkin.basic";
    readonly CHECKIN_LOYALTY_POINTS: "checkin.loyalty_points";
    readonly CHECKIN_WELCOME_MESSAGE: "checkin.welcome_message";
    readonly CHECKIN_ACTIVE_MEMBERS_BOARD: "checkin.active_members_board";
    readonly ANNOUNCEMENTS_BASIC: "announcements.basic";
    readonly CHAT_GYM_PUBLIC: "chat.gym_public";
    readonly ANALYTICS_BASIC: "analytics.basic";
};
export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
