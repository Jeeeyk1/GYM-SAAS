import { Controller, Get, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { GymRoles } from '../../common/decorators/roles.decorators';
import { CurrentTenant } from '../../common/decorators/tenant.decorators';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';

@Controller('subscription')
@UseGuards(JwtAuthGuard, GymRoleGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @GymRoles('org_owner')
  getCurrent(@CurrentTenant() tenant: TenantContext) {
    return this.subscriptionService.getSubscription(tenant.organizationId);
  }
}
