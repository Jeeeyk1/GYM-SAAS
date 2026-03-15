import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../database/entities/member.entity';
import { Identity } from '../../database/entities/identity.entity';
import { MemberPrivacySettings } from '../../database/entities/member.privacy.settings.entity';
import { Client } from '../../database/entities/client.entity';
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
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
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

  async list(clientId: string): Promise<Member[]> {
    return this.memberRepo.find({
      where: { clientId },
      relations: ['privacySettings'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(clientId: string, dto: CreateMemberDto): Promise<{ member: Member; inviteToken: string }> {
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

    const memberCount = await this.memberRepo.count({ where: { clientId } });
    const memberNumber = formatMemberNumber('GYM', memberCount + 1);

    const member = await this.memberRepo.save(
      this.memberRepo.create({
        clientId,
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
    const memberRole = await this.roleRepo.findOne({ where: { name: 'member', clientId } });
    if (memberRole) {
      await this.identityRoleRepo.save(
        this.identityRoleRepo.create({
          identityId: identity.id,
          roleId: memberRole.id,
          clientId,
          assignedBy: null,
        }),
      );
    }

    const invite = await this.inviteService.create({
      clientId,
      identityId: identity.id,
      role: 'member',
      type: 'member',
      invitedBy: null,
    });

    const client = await this.clientRepo.findOne({ where: { id: clientId } });

    try {
      await this.emailService.sendMemberWelcome({
        to: dto.email,
        memberName: dto.firstName,
        gymName: client?.name ?? 'the gym',
        inviteToken: invite.token,
      });
    } catch (err) {
      this.logger.error(`Failed to send member welcome email to ${dto.email}`, err);
    }

    return { member, inviteToken: invite.token };
  }

  async getById(clientId: string, memberId: string): Promise<Member> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, clientId },
      relations: ['privacySettings'],
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async update(clientId: string, memberId: string, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.getById(clientId, memberId);
    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }

  async updatePrivacy(
    callerIdentityId: string,
    clientId: string,
    memberId: string,
    dto: UpdatePrivacySettingsDto,
  ): Promise<MemberPrivacySettings> {
    const member = await this.getById(clientId, memberId);

    // Members can only update their own privacy settings
    const callerRoles = await this.identityRoleRepo
      .createQueryBuilder('ir')
      .innerJoin('ir.role', 'r')
      .select('r.name', 'name')
      .where('ir.identity_id = :id', { id: callerIdentityId })
      .andWhere('ir.client_id = :clientId', { clientId })
      .getRawMany<{ name: string }>();

    const roleNames = callerRoles.map((r) => r.name);
    const isStaff = roleNames.some((r) => ['gym_owner', 'gym_admin'].includes(r));

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

  async getGymContext(identityId: string, clientId: string) {
    const client = await this.clientRepo.findOne({
      where: { id: clientId },
      relations: ['profile'],
    });
    if (!client) throw new NotFoundException('Gym not found');

    const identityRoles = await this.identityRoleRepo
      .createQueryBuilder('ir')
      .innerJoinAndSelect('ir.role', 'role')
      .where('ir.identity_id = :identityId', { identityId })
      .andWhere('ir.client_id = :clientId', { clientId })
      .getMany();

    const roles = identityRoles.map((ir) => ir.role.name);

    const clientFeatures = await this.clientFeatureRepo
      .createQueryBuilder('cf')
      .innerJoinAndSelect('cf.featureDefinition', 'fd')
      .where('cf.client_id = :clientId', { clientId })
      .getMany();

    const overrides = await this.featureOverrideRepo.find({ where: { clientId } });
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

    return { currentGym: client, roles, permissions: [], resolvedFeatures };
  }
}
