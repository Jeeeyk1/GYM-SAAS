"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ROUTES = void 0;
const BASE = '/api/v1';
exports.API_ROUTES = {
    AUTH: {
        LOGIN: `${BASE}/auth/login`,
        REFRESH: `${BASE}/auth/refresh`,
        LOGOUT: `${BASE}/auth/logout`,
    },
    MEMBERS: {
        LIST: `${BASE}/members`,
        CREATE: `${BASE}/members`,
        GET: (id) => `${BASE}/members/${id}`,
        UPDATE: (id) => `${BASE}/members/${id}`,
        DELETE: (id) => `${BASE}/members/${id}`,
        QR: (id) => `${BASE}/members/${id}/qr`,
    },
    CHECKINS: {
        CREATE: `${BASE}/checkins`,
        LIST: `${BASE}/checkins`,
    },
    FEATURES: {
        LIST: `${BASE}/features`,
        UPDATE: (featureId) => `${BASE}/features/${featureId}`,
    },
    STAFF: {
        LIST: `${BASE}/staff`,
        INVITE: `${BASE}/staff/invite`,
    },
};
//# sourceMappingURL=api-route.js.map