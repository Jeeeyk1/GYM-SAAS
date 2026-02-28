import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FeatureDefinition } from '../../database/entities/client-feature.entity';
import { PlatformRoleGuard } from '../../common/guards/platform-role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureDefinition])],
  controllers: [AdminController],
  providers: [AdminService, PlatformRoleGuard],
})
export class AdminModule {}
