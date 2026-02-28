import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckInsService } from './checkins.service';
import { CheckInDto, CheckInQueryDto } from './dto/checkin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorators';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller()
@UseGuards(JwtAuthGuard)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post('checkins')
  @HttpCode(HttpStatus.CREATED)
  checkIn(
    @Body() dto: CheckInDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.checkInsService.checkIn(dto, tenant, user.sub);
  }

  @Post('checkins/:checkInId/checkout')
  @HttpCode(HttpStatus.OK)
  checkOut(
    @Param('checkInId', ParseUUIDPipe) checkInId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.checkInsService.checkOut(checkInId, tenant, 'staff');
  }

  @Get('checkins')
  getHistory(
    @Query() query: CheckInQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.checkInsService.getHistory(query, tenant);
  }

  @Get('checkins/active-members')
  getActiveMembers(@CurrentTenant() tenant: TenantContext) {
    return this.checkInsService.getActiveMembers(tenant);
  }

  @Get('checkins/gym-qr')
  getGymQr(@CurrentTenant() tenant: TenantContext) {
    return this.checkInsService.getGymQr(tenant);
  }

  @Get('members/:memberId/qr')
  getMemberQr(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.checkInsService.getMemberQr(memberId, tenant);
  }
}
