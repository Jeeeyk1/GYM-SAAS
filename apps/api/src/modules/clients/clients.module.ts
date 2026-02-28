import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature, ClientProfile } from '../../database/entities/client-feature.entity';
import { IdentityRole } from '../../database/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientProfile, ClientFeature, IdentityRole])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
