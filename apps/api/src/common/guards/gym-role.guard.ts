import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountType } from '@gym-saas/shared-types';
import { GYM_ROLES_KEY } from '../decorators/roles.decorators';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';
import { TenantContext } from '../middleware/tenant-context.middleware';

/**
 * Enforces gym-level role access.
 * Resolves the current user's roles from identity_roles for the active gym
 * (tenantContext.clientId) on each request — NOT from the JWT, because one
 * identity can hold different roles at different gyms.
 *
 * Must run AFTER JwtAuthGuard (req.user) and TenantContextMiddleware (req.tenantContext).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, GymRoleGuard)
 *   @GymRoles('gym_owner', 'gym_admin')
 */
@Injectable()
export class GymRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(GYM_ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No @GymRoles() set — guard is a no-op
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest<{
      user: JwtPayload;
      tenantContext?: TenantContext;
    }>();

    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new BadRequestException('Gym context required — include the x-gym-slug header');
    }

    // Platform admin tokens are not valid for gym-scoped endpoints
    if (req.user.accountType !== AccountType.GYM_USER) {
      throw new ForbiddenException();
    }

    const rows: Array<{ name: string }> = await this.dataSource.query(
      `SELECT r.name
       FROM identity_roles ir
       JOIN roles r ON r.id = ir.role_id
       WHERE ir.identity_id = $1 AND ir.client_id = $2`,
      [req.user.sub, tenantContext.clientId],
    );

    const roleNames = rows.map((r) => r.name);
    if (!required.some((r) => roleNames.includes(r))) {
      throw new ForbiddenException();
    }

    return true;
  }
}
