import { Body, Controller, HttpCode, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, AcceptInviteDto, SelfRegisterDto, AdminLoginDto } from './dto/auth.dto';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorators';
import { JwtRefreshGuard } from './guards/jwt.guards';

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto, tenant?.organizationId);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { accessToken };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.adminLogin(dto);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { accessToken };
  }

  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Body() dto: AcceptInviteDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, orgSlug } = await this.authService.acceptInvite(dto);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { accessToken, orgSlug };
  }

  @Post('register/:gymSlug')
  @HttpCode(HttpStatus.CREATED)
  async selfRegister(
    @Body() dto: SelfRegisterDto,
    @CurrentTenant() tenant: TenantContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.selfRegister(dto, tenant.organizationId);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { accessToken };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: JwtRefreshPayload, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.refresh(user.sub);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  }
}
