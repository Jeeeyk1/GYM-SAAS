export declare const PERMISSIONS: {
    readonly MEMBERS_READ: "members:read";
    readonly MEMBERS_WRITE: "members:write";
    readonly MEMBERS_DELETE: "members:delete";
    readonly CHECKINS_READ: "checkins:read";
    readonly CHECKINS_CREATE: "checkins:create";
    readonly STAFF_READ: "staff:read";
    readonly STAFF_WRITE: "staff:write";
    readonly FEATURES_READ: "features:read";
    readonly FEATURES_CONFIGURE: "features:configure";
    readonly ANNOUNCEMENTS_READ: "announcements:read";
    readonly ANNOUNCEMENTS_WRITE: "announcements:write";
    readonly ANALYTICS_READ: "analytics:read";
    readonly GYM_SETTINGS: "gym:settings";
    readonly AUDIT_READ: "audit:read";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
