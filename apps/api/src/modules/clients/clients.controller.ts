import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { CurrentUser } from '../../common/decorators/tenant.decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('my-gyms')
  getMyGyms(@CurrentUser() user: JwtPayload) {
    return this.clientsService.getMyGyms(user.sub);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.clientsService.getBySlug(slug);
  }

  @Patch(':clientId/profile')
  updateProfile(@Param('clientId') clientId: string, @Body() dto: UpdateProfileDto) {
    return this.clientsService.updateProfile(clientId, dto);
  }
}
