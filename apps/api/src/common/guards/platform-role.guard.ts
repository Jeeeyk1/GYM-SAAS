import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType, PlatformAdminJwtPayload } from '@gym-saas/shared-types';
import { PLATFORM_ROLE_KEY } from '../decorators/roles.decorators';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

/**
 * Enforces platform-level role access.
 * Must run AFTER JwtAuthGuard so req.user is populated.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, PlatformRoleGuard)
 *   @PlatformRole('super_admin')
 */
@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PLATFORM_ROLE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No @PlatformRole() set — guard is a no-op
    if (!required) return true;

    const user = ctx.switchToHttp().getRequest().user as JwtPayload;

    if (!user || user.accountType !== AccountType.PLATFORM_ADMIN) {
      throw new ForbiddenException();
    }

    const { platformRole } = user as PlatformAdminJwtPayload;
    if (platformRole !== required) {
      throw new ForbiddenException();
    }

    return true;
  }
}
