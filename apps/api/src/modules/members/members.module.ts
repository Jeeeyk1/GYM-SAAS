import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member, Identity } from '../../database/entities/member.entity';
import { MemberPrivacySettings } from '../../database/entities/member.privacy.settings.entity';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { IdentityRole, Role } from '../../database/entities/role.entity';
import { AuthModule } from '../auth/auth.module';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Identity,
      MemberPrivacySettings,
      Client,
      ClientFeature,
      IdentityRole,
      Role,
    ]),
    AuthModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, GymRoleGuard],
  exports: [MembersService],
})
export class MembersModule {}
