import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff } from '../../database/entities/staff.entity';
import { Identity } from '../../database/entities/identity.entity';
import { Client } from '../../database/entities/client.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { GymRoleGuard } from '../../common/guards/gym-role.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Identity, Client, IdentityRole, Role]),
    AuthModule,
  ],
  controllers: [StaffController],
  providers: [StaffService, GymRoleGuard],
})
export class StaffModule {}
