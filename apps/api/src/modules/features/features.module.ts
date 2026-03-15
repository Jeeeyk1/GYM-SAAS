import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { FeatureDefinition } from '../../database/entities/feature-definition.entity';
import { ClientFeatureOverride } from '../../database/entities/client-feature-override.entity';
import { CheckInsModule } from '../checkins/checkins.module';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientFeature, ClientFeatureOverride, FeatureDefinition]),
    CheckInsModule, // provides FeatureResolverService
  ],
  controllers: [FeaturesController],
  providers: [FeaturesService, GymRoleGuard],
})
export class FeaturesModule {}
