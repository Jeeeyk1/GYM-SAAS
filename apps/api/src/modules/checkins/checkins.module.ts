import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CheckInsController } from './checkins.controller';
import { CheckInsService } from './checkins.service';
import { QrService } from './qr.service';
import { FeatureResolverService } from './feature-resolver.service';
import { CheckoutSchedulerService } from './checkout-scheduler.service';
import { BaseAttendanceBehavior } from './behaviors/base-attendance.behavior';
import { LoyaltyPointsBehavior } from './behaviors/loyalty-points.behavior';
import { WelcomeMessageBehavior } from './behaviors/welcome-message.behavior';
import { CHECKIN_BEHAVIORS } from './behaviors/behavior.interface';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { CheckIn } from '../../database/entities/checkin.entity';
import { Member } from '../../database/entities/member.entity';
import {
  ClientFeature,
  ClientFeatureOverride,
  FeatureDefinition,
} from '../../database/entities/client-feature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckIn,
      Member,
      ClientFeature,
      FeatureDefinition,
      ClientFeatureOverride,
    ]),
    // JwtModule needed by QrService for sign/verify
    JwtModule.register({}),
  ],
  controllers: [CheckInsController],
  providers: [
    CheckInsService,
    QrService,
    FeatureResolverService,
    CheckoutSchedulerService,
    // Behaviors
    BaseAttendanceBehavior,
    LoyaltyPointsBehavior,
    WelcomeMessageBehavior,
    GymRoleGuard,
    // Registry: inject an ordered array into CheckInsService
    {
      provide: CHECKIN_BEHAVIORS,
      useFactory: (
        base: BaseAttendanceBehavior,
        loyalty: LoyaltyPointsBehavior,
        welcome: WelcomeMessageBehavior,
      ) => [base, loyalty, welcome],
      inject: [BaseAttendanceBehavior, LoyaltyPointsBehavior, WelcomeMessageBehavior],
    },
  ],
  exports: [CheckInsService, FeatureResolverService],
})
export class CheckInsModule {}
