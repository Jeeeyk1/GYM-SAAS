import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { GymRoles } from '../../common/decorators/roles.decorators';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorators';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller()
@UseGuards(JwtAuthGuard, GymRoleGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('members')
  @GymRoles('gym_owner', 'gym_admin', 'front_desk')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.membersService.list(tenant.clientId);
  }

  @Post('members')
  @GymRoles('gym_owner', 'gym_admin')
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateMemberDto) {
    return this.membersService.create(tenant.clientId, dto);
  }

  @Get('members/:id')
  @GymRoles('gym_owner', 'gym_admin', 'front_desk')
  getById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membersService.getById(tenant.clientId, id);
  }

  @Patch('members/:id')
  @GymRoles('gym_owner', 'gym_admin')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(tenant.clientId, id, dto);
  }

  @Patch('members/:id/privacy')
  @GymRoles('gym_owner', 'gym_admin', 'member')
  updatePrivacy(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrivacySettingsDto,
  ) {
    return this.membersService.updatePrivacy(user.sub, tenant.clientId, id, dto);
  }

  @Get('me/gym-context')
  getGymContext(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.membersService.getGymContext(user.sub, tenant.clientId);
  }
}
