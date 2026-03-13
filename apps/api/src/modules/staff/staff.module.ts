import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff, Identity } from '../../database/entities/member.entity';
import { IdentityRole, Role } from '../../database/entities/role.entity';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Identity, IdentityRole, Role]),
    AuthModule,
  ],
  controllers: [StaffController],
  providers: [StaffService, GymRoleGuard],
})
export class StaffModule {}
