import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Organization } from '../../database/entities/organization.entity';
import { OrganizationProfile } from '../../database/entities/organization-profile.entity';
import { Branch } from '../../database/entities/branch.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { FeatureDefinition } from '../../database/entities/feature-definition.entity';
import { Identity } from '../../database/entities/identity.entity';
import { Staff } from '../../database/entities/staff.entity';
import { Invite } from '../../database/entities/invite.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { EmailService } from '../email/email.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { PLAN_LIMITS, PlanName } from '@gym-saas/shared-config';

const SYSTEM_ROLES = [
  { name: 'org_owner', description: 'Organization owner — full org-wide access', isSystem: true },
  { name: 'gym_owner', description: 'Branch owner — full access to one branch', isSystem: true },
  { name: 'staff', description: 'Branch staff', isSystem: true },
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

  async createGym(dto: CreateGymDto): Promise<{ organization: Organization; ownerStaff: Staff; inviteToken: string }> {
    const existing = await this.dataSource.getRepository(Organization).findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const featureDefs = await this.featureDefRepo.find({ where: { isActive: true } });
    const plan = (dto.plan ?? 'basic') as PlanName;
    const limits = PLAN_LIMITS[plan];

    const result = await this.dataSource.transaction(async (em) => {
      const organization = await em.save(
        em.create(Organization, {
          slug: dto.slug,
          name: dto.name,
          status: 'onboarding',
          isDemo: dto.isDemo ?? false,
        }),
      );

      await em.save(
        em.create(OrganizationProfile, {
          organizationId: organization.id,
          email: dto.ownerEmail,
          ...(dto.address && { address: dto.address }),
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.timezone && { timezone: dto.timezone }),
        }),
      );

      const branch = await em.save(
        em.create(Branch, {
          organizationId: organization.id,
          name: 'Main Branch',
          isActive: true,
        }),
      );

      await em.save(
        em.create(Subscription, {
          organizationId: organization.id,
          plan,
          maxMembers: limits.maxMembers,
          maxBranches: limits.maxBranches,
          aiTokenLimit: limits.aiTokenLimit,
          expiresAt: null,
          autoRenew: true,
        }),
      );

      if (featureDefs.length > 0) {
        await em.save(
          featureDefs.map((fd) =>
            em.create(ClientFeature, { organizationId: organization.id, featureId: fd.id, isEnabled: fd.defaultEnabled }),
          ),
        );
      }

      const roles = await em.save(
        SYSTEM_ROLES.map((r) => em.create(Role, { organizationId: organization.id, ...r })),
      );
      const ownerRole = roles.find((r) => r.name === 'org_owner')!;

      const identity = await em.save(
        em.create(Identity, { email: dto.ownerEmail, provider: 'local', isVerified: false }),
      );

      const staff = await em.save(
        em.create(Staff, {
          organizationId: organization.id,
          branchId: branch.id,
          identityId: identity.id,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          status: 'invited',
        }),
      );

      // org_owner has no branchId (org-wide scope)
      await em.save(
        em.create(IdentityRole, {
          identityId: identity.id,
          roleId: ownerRole.id,
          organizationId: organization.id,
          branchId: null,
          assignedBy: null,
        }),
      );

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const invite = await em.save(
        em.create(Invite, {
          token: randomBytes(32).toString('hex'),
          organizationId: organization.id,
          identityId: identity.id,
          role: 'org_owner',
          type: 'owner',
          invitedBy: null,
          status: 'pending',
          expiresAt,
          acceptedAt: null,
        }),
      );

      return { organization, ownerStaff: staff, inviteToken: invite.token };
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

  async listGyms(): Promise<Organization[]> {
    return this.dataSource.getRepository(Organization).find({
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }
}
