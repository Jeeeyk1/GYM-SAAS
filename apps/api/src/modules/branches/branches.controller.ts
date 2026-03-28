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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { GymRoles } from '../../common/decorators/roles.decorators';
import { CurrentTenant } from '../../common/decorators/tenant.decorators';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';

@Controller('branches')
@UseGuards(JwtAuthGuard, GymRoleGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @GymRoles('org_owner', 'gym_owner', 'staff')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.branchesService.listBranches(tenant.organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @GymRoles('org_owner')
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBranchDto) {
    return this.branchesService.createBranch(tenant.organizationId, dto);
  }

  @Get(':id')
  @GymRoles('org_owner', 'gym_owner', 'staff')
  getById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchesService.getBranchById(tenant.organizationId, id);
  }

  @Patch(':id')
  @GymRoles('org_owner', 'gym_owner')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.updateBranch(tenant.organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @GymRoles('org_owner')
  deactivate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchesService.deactivateBranch(tenant.organizationId, id);
  }
}
