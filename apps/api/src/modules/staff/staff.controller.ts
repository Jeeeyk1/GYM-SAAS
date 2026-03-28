import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { GymRoles } from '../../common/decorators/roles.decorators';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorators';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('staff')
@UseGuards(JwtAuthGuard, GymRoleGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @GymRoles('org_owner', 'gym_owner')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.staffService.listStaff(tenant.organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @GymRoles('org_owner', 'gym_owner')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffService.createStaff(tenant.organizationId, dto, user.sub);
  }

  @Get(':id')
  @GymRoles('org_owner', 'gym_owner')
  getById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.staffService.getStaffById(tenant.organizationId, id);
  }

  @Patch(':id')
  @GymRoles('org_owner', 'gym_owner')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.updateStaff(tenant.organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @GymRoles('org_owner')
  deactivate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.staffService.deactivateStaff(tenant.organizationId, id);
  }
}
