import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member, Identity } from '../../database/entities/member.entity';
import { MemberPrivacySettings } from '../../database/entities/member.privacy.settings.entity';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { IdentityRole, Role } from '../../database/entities/role.entity';
import { InviteService } from '../auth/invite.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { formatMemberNumber } from '@gym-saas/shared-utils';

@Injectable()
export class MembersService {
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
    @InjectRepository(IdentityRole)
    private readonly identityRoleRepo: Repository<IdentityRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly inviteService: InviteService,
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
      }),
    );

    await this.privacyRepo.save(this.privacyRepo.create({ memberId: member.id }));

    const invite = await this.inviteService.create({
      clientId,
      identityId: identity.id,
      role: 'member',
      type: 'member',
      invitedBy: null,
    });

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
    clientId: string,
    memberId: string,
    dto: UpdatePrivacySettingsDto,
  ): Promise<MemberPrivacySettings> {
    await this.getById(clientId, memberId);

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

    const resolvedFeatures = clientFeatures.reduce<
      Record<string, { isEnabled: boolean; config: Record<string, unknown> }>
    >((acc, cf) => {
      acc[cf.featureDefinition.key] = {
        isEnabled: cf.isEnabled,
        config: cf.featureDefinition.defaultConfig,
      };
      return acc;
    }, {});

    return { currentGym: client, roles, permissions: [], resolvedFeatures };
  }
}
