import { AccountType, PlatformRole } from './enums';

// ─── JWT Access Token Payloads ────────────────────────────────────────────────
//
// Discriminated union on accountType.
// Gym-level roles are NOT embedded in the JWT — resolved per-request by
// GymRoleGuard, since one identity can hold different roles at different gyms.

export interface GymUserJwtPayload {
  sub: string;           // identity.id
  email: string;
  accountType: AccountType.GYM_USER;
  type: 'access';
}

export interface PlatformAdminJwtPayload {
  sub: string;           // identity.id
  email: string;
  accountType: AccountType.PLATFORM_ADMIN;
  platformRole: PlatformRole;
  type: 'access';
}

export type JwtAccessPayload = GymUserJwtPayload | PlatformAdminJwtPayload;

// ─── Auth Request / Response DTOs ────────────────────────────────────────────

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  accessToken: string;
}
