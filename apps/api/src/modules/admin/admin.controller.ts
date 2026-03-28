import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { PlatformRoleGuard } from '../../common/guards/platform-role.guard';
import { PlatformRole } from '../../common/decorators/roles.decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
@PlatformRole('gym_admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('gyms')
  @HttpCode(HttpStatus.CREATED)
  createGym(@Body() dto: CreateGymDto) {
    return this.adminService.createGym(dto);
  }

  @Get('gyms')
  listGyms() {
    return this.adminService.listGyms();
  }
}
