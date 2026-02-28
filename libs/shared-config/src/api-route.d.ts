export declare const API_ROUTES: {
    readonly AUTH: {
        readonly LOGIN: "/api/v1/auth/login";
        readonly REFRESH: "/api/v1/auth/refresh";
        readonly LOGOUT: "/api/v1/auth/logout";
    };
    readonly MEMBERS: {
        readonly LIST: "/api/v1/members";
        readonly CREATE: "/api/v1/members";
        readonly GET: (id: string) => string;
        readonly UPDATE: (id: string) => string;
        readonly DELETE: (id: string) => string;
        readonly QR: (id: string) => string;
    };
    readonly CHECKINS: {
        readonly CREATE: "/api/v1/checkins";
        readonly LIST: "/api/v1/checkins";
    };
    readonly FEATURES: {
        readonly LIST: "/api/v1/features";
        readonly UPDATE: (featureId: string) => string;
    };
    readonly STAFF: {
        readonly LIST: "/api/v1/staff";
        readonly INVITE: "/api/v1/staff/invite";
    };
};
