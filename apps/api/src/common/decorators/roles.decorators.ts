import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ROLE_KEY = 'platform_role';
export const GYM_ROLES_KEY = 'gym_roles';

/**
 * Restricts an endpoint to platform admins with the given platform role.
 * Must be combined with JwtAuthGuard + PlatformRoleGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, PlatformRoleGuard)
 * @PlatformRole('super_admin')
 */
export const PlatformRole = (role: string) => SetMetadata(PLATFORM_ROLE_KEY, role);

/**
 * Restricts an endpoint to gym users that hold at least one of the specified
 * roles at the current gym (resolved from tenantContext.clientId).
 * Must be combined with JwtAuthGuard + GymRoleGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, GymRoleGuard)
 * @GymRoles('gym_owner', 'gym_admin')
 */
export const GymRoles = (...roles: string[]) => SetMetadata(GYM_ROLES_KEY, roles);
