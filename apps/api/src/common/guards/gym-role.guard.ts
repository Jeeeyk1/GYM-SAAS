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
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Member } from '../../database/entities/member.entity';

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

    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest<{
      user: JwtPayload;
      tenantContext?: TenantContext;
    }>();

    const tenantContext = req.tenantContext;
    if (!tenantContext) {
      throw new BadRequestException('Organization context required — include the x-org-slug header');
    }

    if (req.user.accountType !== AccountType.GYM_USER) {
      throw new ForbiddenException();
    }

    const identityRoles = await this.dataSource
      .getRepository(IdentityRole)
      .createQueryBuilder('ir')
      .innerJoinAndSelect('ir.role', 'r')
      .where('ir.identityId = :identityId', { identityId: req.user.sub })
      .andWhere('ir.organizationId = :orgId', { orgId: tenantContext.organizationId })
      .getMany();

    // Branch-scoped roles only apply when branchId matches.
    // Org-wide roles (branchId = null) always apply regardless of branch context.
    const applicable = identityRoles.filter(
      (ir) => ir.branchId === null || ir.branchId === tenantContext.branchId,
    );

    const roleNames = applicable.map((ir) => ir.role.name);

    if (!required.some((r) => roleNames.includes(r))) {
      throw new ForbiddenException();
    }

    const isMemberOnly = roleNames.length > 0 && roleNames.every((r) => r === 'member');
    if (isMemberOnly) {
      const member = await this.dataSource
        .getRepository(Member)
        .createQueryBuilder('m')
        .select(['m.membershipExpiresAt'])
        .where('m.identityId = :identityId', { identityId: req.user.sub })
        .andWhere('m.organizationId = :orgId', { orgId: tenantContext.organizationId })
        .getOne();

      if (member?.membershipExpiresAt && new Date(member.membershipExpiresAt) < new Date()) {
        throw new ForbiddenException('Membership has expired. Please renew to continue.');
      }
    }

    return true;
  }
}
