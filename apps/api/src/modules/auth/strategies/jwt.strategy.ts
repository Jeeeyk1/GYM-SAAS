import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAccessPayload } from '@gym-saas/shared-types';

// Re-export so controllers/guards can import from one place
export type JwtPayload = JwtAccessPayload;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtSecret'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (payload.type !== 'access') throw new UnauthorizedException();
    return payload;
  }
}
