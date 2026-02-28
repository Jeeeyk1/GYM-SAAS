const BASE = '/api/v1';

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${BASE}/auth/login`,
    REFRESH: `${BASE}/auth/refresh`,
    LOGOUT: `${BASE}/auth/logout`,
  },
  MEMBERS: {
    LIST: `${BASE}/members`,
    CREATE: `${BASE}/members`,
    GET: (id: string) => `${BASE}/members/${id}`,
    UPDATE: (id: string) => `${BASE}/members/${id}`,
    DELETE: (id: string) => `${BASE}/members/${id}`,
    QR: (id: string) => `${BASE}/members/${id}/qr`,
  },
  CHECKINS: {
    CREATE: `${BASE}/checkins`,
    LIST: `${BASE}/checkins`,
  },
  FEATURES: {
    LIST: `${BASE}/features`,
    UPDATE: (featureId: string) => `${BASE}/features/${featureId}`,
  },
  STAFF: {
    LIST: `${BASE}/staff`,
    INVITE: `${BASE}/staff/invite`,
  },
} as const;