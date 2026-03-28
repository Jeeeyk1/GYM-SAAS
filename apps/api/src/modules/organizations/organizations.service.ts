import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Organization } from '../../database/entities/organization.entity';
import { OrganizationProfile } from '../../database/entities/organization-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationProfile)
    private readonly profileRepo: Repository<OrganizationProfile>,
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(IdentityRole)
    private readonly identityRoleRepo: Repository<IdentityRole>,
  ) {}

  async getMyOrganizations(identityId: string): Promise<Organization[]> {
    const identityRoles = await this.identityRoleRepo.find({ where: { identityId } });
    if (identityRoles.length === 0) return [];

    const orgIds = [...new Set(identityRoles.map((ir) => ir.organizationId))];
    return this.orgRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.profile', 'profile')
      .whereInIds(orgIds)
      .orderBy('o.createdAt', 'DESC')
      .getMany();
  }

  async getBySlug(slug: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({
      where: { slug },
      relations: ['profile'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateProfile(organizationId: string, dto: UpdateProfileDto): Promise<OrganizationProfile> {
    const profile = await this.profileRepo.findOne({ where: { organizationId } });
    if (!profile) throw new NotFoundException('Organization profile not found');

    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  async getFeatures(organizationId: string): Promise<ClientFeature[]> {
    return this.clientFeatureRepo
      .createQueryBuilder('cf')
      .innerJoinAndSelect('cf.featureDefinition', 'fd')
      .where('cf.organizationId = :organizationId', { organizationId })
      .getMany();
  }
}
