import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { ClientProfile } from '../../database/entities/client-profile.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientProfile)
    private readonly profileRepo: Repository<ClientProfile>,
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(IdentityRole)
    private readonly identityRoleRepo: Repository<IdentityRole>,
  ) {}

  async getMyGyms(identityId: string): Promise<Client[]> {
    const identityRoles = await this.identityRoleRepo.find({ where: { identityId } });
    if (identityRoles.length === 0) return [];

    const clientIds = [...new Set(identityRoles.map((ir) => ir.organizationId))];
    return this.clientRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.profile', 'profile')
      .whereInIds(clientIds)
      .orderBy('c.createdAt', 'DESC')
      .getMany();
  }

  async getBySlug(slug: string): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { slug },
      relations: ['profile'],
    });
    if (!client) throw new NotFoundException('Gym not found');
    return client;
  }

  async updateProfile(clientId: string, dto: UpdateProfileDto): Promise<ClientProfile> {
    const profile = await this.profileRepo.findOne({ where: { clientId } });
    if (!profile) throw new NotFoundException('Gym profile not found');

    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  async getFeatures(clientId: string): Promise<ClientFeature[]> {
    return this.clientFeatureRepo
      .createQueryBuilder('cf')
      .innerJoinAndSelect('cf.featureDefinition', 'fd')
      .where('cf.client_id = :clientId', { clientId })
      .getMany();
  }
}
