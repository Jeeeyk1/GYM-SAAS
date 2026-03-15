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
  @GymRoles('gym_owner', 'gym_admin')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.staffService.listStaff(tenant.clientId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @GymRoles('gym_owner', 'gym_admin')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffService.createStaff(tenant.clientId, dto, user.sub);
  }

  @Get(':id')
  @GymRoles('gym_owner', 'gym_admin')
  getById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.staffService.getStaffById(tenant.clientId, id);
  }

  @Patch(':id')
  @GymRoles('gym_owner', 'gym_admin')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.updateStaff(tenant.clientId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @GymRoles('gym_owner')
  deactivate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.staffService.deactivateStaff(tenant.clientId, id);
  }
}
