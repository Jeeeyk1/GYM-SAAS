import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member } from '../../database/entities/member.entity';
import { Identity } from '../../database/entities/identity.entity';
import { MemberPrivacySettings } from '../../database/entities/member.privacy.settings.entity';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { ClientFeatureOverride } from '../../database/entities/client-feature-override.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { AuthModule } from '../auth/auth.module';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { MembershipSchedulerService } from './membership-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Identity,
      MemberPrivacySettings,
      Client,
      ClientFeature,
      ClientFeatureOverride,
      IdentityRole,
      Role,
    ]),
    AuthModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, GymRoleGuard, MembershipSchedulerService],
  exports: [MembersService],
})
export class MembersModule {}
