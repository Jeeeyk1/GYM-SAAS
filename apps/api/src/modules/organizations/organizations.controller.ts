import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { CurrentUser } from '../../common/decorators/tenant.decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { OrganizationsService } from './organizations.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('my-organizations')
  getMyOrganizations(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.getMyOrganizations(user.sub);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.organizationsService.getBySlug(slug);
  }

  @Patch(':organizationId/profile')
  updateProfile(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.organizationsService.updateProfile(organizationId, dto);
  }
}
