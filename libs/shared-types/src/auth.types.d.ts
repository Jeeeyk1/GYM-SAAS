import { AccountType, PlatformRole } from './enums';
export interface GymUserJwtPayload {
    sub: string;
    email: string;
    accountType: AccountType.GYM_USER;
    type: 'access';
}
export interface PlatformAdminJwtPayload {
    sub: string;
    email: string;
    accountType: AccountType.PLATFORM_ADMIN;
    platformRole: PlatformRole;
    type: 'access';
}
export type JwtAccessPayload = GymUserJwtPayload | PlatformAdminJwtPayload;
export interface AuthLoginRequest {
    email: string;
    password: string;
}
export interface AuthLoginResponse {
    accessToken: string;
}
