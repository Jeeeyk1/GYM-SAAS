import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Organization } from '../../database/entities/organization.entity';
import { OrganizationProfile } from '../../database/entities/organization-profile.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationProfile, ClientFeature, IdentityRole]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
