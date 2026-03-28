import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { GymRoles } from '../../common/decorators/roles.decorators';
import { CurrentTenant } from '../../common/decorators/tenant.decorators';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';
import { FeaturesService } from './features.service';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@Controller('features')
@UseGuards(JwtAuthGuard, GymRoleGuard)
@GymRoles('org_owner', 'gym_owner')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext) {
    return this.featuresService.listFeatures(tenant.organizationId);
  }

  @Patch(':key')
  update(
    @Param('key') key: string,
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featuresService.updateFeature(tenant.organizationId, key, dto);
  }
}
