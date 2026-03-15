import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { Member } from '../../database/entities/member.entity';
import { Identity } from '../../database/entities/identity.entity';
import { Staff } from '../../database/entities/staff.entity';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { FeatureDefinition } from '../../database/entities/feature-definition.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { Invite } from '../../database/entities/invite.entity';
import { InviteService } from './invite.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('app.jwtSecret'),
        signOptions: { expiresIn: config.get('app.jwtAccessExpiresIn', '15m') },
      }),
    }),
    TypeOrmModule.forFeature([Identity, Member, Staff, Client, ClientFeature, FeatureDefinition, IdentityRole, Role, Invite]),
  ],
  controllers: [AuthController],
  providers: [AuthService, InviteService, AuthController, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, InviteService],
})
export class AuthModule {}