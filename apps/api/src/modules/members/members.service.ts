import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../database/entities/member.entity';
import { Identity } from '../../database/entities/identity.entity';
import { MemberPrivacySettings } from '../../database/entities/member.privacy.settings.entity';
import { Organization } from '../../database/entities/organization.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { ClientFeatureOverride } from '../../database/entities/client-feature-override.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { InviteService } from '../auth/invite.service';
import { EmailService } from '../email/email.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { formatMemberNumber, deepMerge } from '@gym-saas/shared-utils';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Identity)
    private readonly identityRepo: Repository<Identity>,
    @InjectRepository(MemberPrivacySettings)
    private readonly privacyRepo: Repository<MemberPrivacySettings>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureOverride)
    private readonly featureOverrideRepo: Repository<ClientFeatureOverride>,
    @InjectRepository(IdentityRole)
    private readonly identityRoleRepo: Repository<IdentityRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly inviteService: InviteService,
    private readonly emailService: EmailService,
  ) {}

  async list(organizationId: string): Promise<Member[]> {
    return this.memberRepo.find({
      where: { organizationId },
      relations: ['privacySettings'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(organizationId: string, dto: CreateMemberDto): Promise<{ member: Member; inviteToken: string }> {
    let identity = await this.identityRepo.findOne({ where: { email: dto.email } });
    if (!identity) {
      identity = await this.identityRepo.save(
        this.identityRepo.create({
          email: dto.email,
          phone: dto.phone ?? null,
          provider: 'local',
          isVerified: false,
        }),
      );
    }

    const memberCount = await this.memberRepo.count({ where: { organizationId } });
    const memberNumber = formatMemberNumber('GYM', memberCount + 1);

    const member = await this.memberRepo.save(
      this.memberRepo.create({
        organizationId,
        identityId: identity.id,
        memberNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        membershipType: dto.membershipType ?? null,
        status: 'active',
        joinedAt: new Date(),
        membershipExpiresAt: new Date(dto.membershipExpiresAt),
        membershipStartedAt: dto.membershipStartedAt ? new Date(dto.membershipStartedAt) : new Date(),
      }),
    );

    await this.privacyRepo.save(this.privacyRepo.create({ memberId: member.id }));

    // Assign member role in identity_roles so GymRoleGuard recognises them
    const memberRole = await this.roleRepo.findOne({ where: { name: 'member', organizationId } });
    if (memberRole) {
      await this.identityRoleRepo.save(
        this.identityRoleRepo.create({
          identityId: identity.id,
          roleId: memberRole.id,
          organizationId,
          branchId: null,
          assignedBy: null,
        }),
      );
    }

    const invite = await this.inviteService.create({
      organizationId,
      identityId: identity.id,
      role: 'member',
      type: 'member',
      invitedBy: null,
    });

    const org = await this.orgRepo.findOne({ where: { id: organizationId } });

    try {
      await this.emailService.sendMemberWelcome({
        to: dto.email,
        memberName: dto.firstName,
        gymName: org?.name ?? 'the gym',
        inviteToken: invite.token,
      });
    } catch (err) {
      this.logger.error(`Failed to send member welcome email to ${dto.email}`, err);
    }

    return { member, inviteToken: invite.token };
  }

  async getById(organizationId: string, memberId: string): Promise<Member> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, organizationId },
      relations: ['privacySettings'],
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async update(organizationId: string, memberId: string, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.getById(organizationId, memberId);
    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }

  async updatePrivacy(
    callerIdentityId: string,
    organizationId: string,
    memberId: string,
    dto: UpdatePrivacySettingsDto,
  ): Promise<MemberPrivacySettings> {
    const member = await this.getById(organizationId, memberId);

    // Members can only update their own privacy settings
    const callerRoles = await this.identityRoleRepo
      .createQueryBuilder('ir')
      .innerJoin('ir.role', 'r')
      .select('r.name', 'name')
      .where('ir.identityId = :id', { id: callerIdentityId })
      .andWhere('ir.organizationId = :organizationId', { organizationId })
      .getRawMany<{ name: string }>();

    const roleNames = callerRoles.map((r) => r.name);
    const isStaff = roleNames.some((r) => ['org_owner', 'gym_owner'].includes(r));

    if (!isStaff && member.identityId !== callerIdentityId) {
      throw new ForbiddenException();
    }

    let settings = await this.privacyRepo.findOne({ where: { memberId } });
    if (!settings) {
      settings = this.privacyRepo.create({ memberId });
    }
    Object.assign(settings, dto);
    return this.privacyRepo.save(settings);
  }

  async getGymContext(identityId: string, organizationId: string) {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      relations: ['profile'],
    });
    if (!org) throw new NotFoundException('Organization not found');

    const identityRoles = await this.identityRoleRepo
      .createQueryBuilder('ir')
      .innerJoinAndSelect('ir.role', 'role')
      .where('ir.identityId = :identityId', { identityId })
      .andWhere('ir.organizationId = :organizationId', { organizationId })
      .getMany();

    const roles = identityRoles.map((ir) => ir.role.name);

    const clientFeatures = await this.clientFeatureRepo
      .createQueryBuilder('cf')
      .innerJoinAndSelect('cf.featureDefinition', 'fd')
      .where('cf.organizationId = :organizationId', { organizationId })
      .getMany();

    const overrides = await this.featureOverrideRepo.find({ where: { organizationId } });
    const overrideByFeatureId = new Map(overrides.map((o) => [o.featureId, o.config]));

    const resolvedFeatures = clientFeatures.reduce<
      Record<string, { isEnabled: boolean; config: Record<string, unknown> }>
    >((acc, cf) => {
      const overrideConfig = overrideByFeatureId.get(cf.featureId) ?? {};
      acc[cf.featureDefinition.key] = {
        isEnabled: cf.isEnabled,
        config: deepMerge(cf.featureDefinition.defaultConfig, overrideConfig),
      };
      return acc;
    }, {});

    return { currentOrg: org, roles, permissions: [], resolvedFeatures };
  }
}
