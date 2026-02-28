import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../middleware/tenant-context.middleware';

/**
 * Extracts tenant context from the request.
 * Usage: @CurrentTenant() tenant: TenantContext
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  },
);

/**
 * Extracts the authenticated identity from the JWT payload.
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);