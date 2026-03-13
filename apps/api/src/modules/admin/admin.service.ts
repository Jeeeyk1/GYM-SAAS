import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature, ClientProfile, FeatureDefinition } from '../../database/entities/client-feature.entity';
import { Identity, Staff } from '../../database/entities/member.entity';
import { Invite } from '../../database/entities/invite.entity';
import { IdentityRole, Role } from '../../database/entities/role.entity';
import { EmailService } from '../email/email.service';
import { CreateGymDto } from './dto/create-gym.dto';

const SYSTEM_ROLES = [
  { name: 'gym_owner', description: 'Full gym owner access', isSystem: true },
  { name: 'gym_admin', description: 'Gym administrator', isSystem: true },
  { name: 'front_desk', description: 'Front desk staff', isSystem: true },
  { name: 'member', description: 'Gym member', isSystem: true },
];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(FeatureDefinition)
    private readonly featureDefRepo: Repository<FeatureDefinition>,
    private readonly emailService: EmailService,
  ) {}

  async createGym(dto: CreateGymDto): Promise<{ client: Client; ownerStaff: Staff; inviteToken: string }> {
    const existing = await this.dataSource.getRepository(Client).findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const featureDefs = await this.featureDefRepo.find({ where: { isActive: true } });

    const result = await this.dataSource.transaction(async (em) => {
      const client = await em.save(
        em.create(Client, {
          slug: dto.slug,
          name: dto.name,
          status: 'onboarding',
          plan: (dto.plan ?? 'starter') as any,
          isDemo: dto.isDemo ?? false,
          demoExpiresAt: dto.demoExpiresAt ? new Date(dto.demoExpiresAt) : null,
        }),
      );

      const profile = await em.save(em.create(ClientProfile, { clientId: client.id,email: dto.ownerEmail}));

      if (dto.address || dto.phone || dto.timezone) {
        await em.update(ClientProfile, profile.id, {
          ...(dto.address && { address: dto.address }),
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.timezone && { timezone: dto.timezone }),
        });
      }

      if (featureDefs.length > 0) {
        await em.save(
          featureDefs.map((fd) =>
            em.create(ClientFeature, { clientId: client.id, featureId: fd.id, isEnabled: fd.defaultEnabled }),
          ),
        );
      }

      const roles = await em.save(
        SYSTEM_ROLES.map((r) => em.create(Role, { clientId: client.id, ...r })),
      );
      const ownerRole = roles.find((r) => r.name === 'gym_owner')!;

      const identity = await em.save(
        em.create(Identity, { email: dto.ownerEmail, provider: 'local', isVerified: false }),
      );

      const staff = await em.save(
        em.create(Staff, {
          clientId: client.id,
          identityId: identity.id,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          status: 'invited',
        }),
      );

      await em.save(
        em.create(IdentityRole, {
          identityId: identity.id,
          roleId: ownerRole.id,
          clientId: client.id,
          assignedBy: null,
        }),
      );

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const invite = await em.save(
        em.create(Invite, {
          token: randomBytes(32).toString('hex'),
          clientId: client.id,
          identityId: identity.id,
          role: 'gym_owner',
          type: 'owner',
          invitedBy: null,
          status: 'pending',
          expiresAt,
          acceptedAt: null,
        }),
      );

      return { client, ownerStaff: staff, inviteToken: invite.token };
    });

    try {
      await this.emailService.sendGymOwnerActivation({
        to: dto.ownerEmail,
        ownerName: dto.ownerFirstName,
        gymName: dto.name,
        inviteToken: result.inviteToken,
      });
    } catch (err) {
      this.logger.error(`Failed to send gym owner activation email to ${dto.ownerEmail}`, err);
    }

    return result;
  }

  async listGyms(): Promise<Client[]> {
    return this.dataSource.getRepository(Client).find({
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }
}
