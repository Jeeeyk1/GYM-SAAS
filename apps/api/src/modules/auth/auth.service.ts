import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AccountType, PlatformRole } from '@gym-saas/shared-types';
import { Member } from '../../database/entities/member.entity';
import { Identity } from '../../database/entities/identity.entity';
import { Staff } from '../../database/entities/staff.entity';
import { Client } from '../../database/entities/client.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { FeatureDefinition } from '../../database/entities/feature-definition.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { LoginDto, AcceptInviteDto, SelfRegisterDto, AdminLoginDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';
import { InviteService } from './invite.service';

type TokenPair = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Identity)
    private readonly identityRepo: Repository<Identity>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(FeatureDefinition)
    private readonly featureDefRepo: Repository<FeatureDefinition>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(IdentityRole)
    private readonly identityRoleRepo: Repository<IdentityRole>,
    private readonly inviteService: InviteService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, clientId?: string): Promise<TokenPair> {
    const identity = await this.identityRepo
      .createQueryBuilder('i')
      .addSelect('i.password_hash')
      .where('i.email = :email', { email: dto.email })
      .getOne();

    // Deliberately vague — do not reveal whether account exists or which
    // endpoint platform admins should use.
    if (!identity?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, identity.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Platform admin accounts must use /auth/admin/login
    if (identity.accountType === AccountType.PLATFORM_ADMIN) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If logging in under a specific gym context, block expired members
    if (clientId) {
      const member = await this.memberRepo.findOne({
        where: { identityId: identity.id, clientId },
      });
      if (member?.membershipExpiresAt && member.membershipExpiresAt < new Date()) {
        // Staff at this gym bypass the expiry check (front_desk staff may also be a member)
        const staffRole = await this.identityRoleRepo.findOne({
          where: { identityId: identity.id, clientId },
          relations: ['role'],
        });
        const isStaff = staffRole && ['gym_owner', 'gym_admin', 'front_desk'].includes(staffRole.role.name);
        if (!isStaff) {
          throw new UnauthorizedException('Membership has expired. Please renew to continue.');
        }
      }
    }

    await this.identityRepo.update(identity.id, { lastLoginAt: new Date() });
    return this.issueTokens(identity);
  }

  async adminLogin(dto: AdminLoginDto): Promise<TokenPair> {
    const identity = await this.identityRepo
      .createQueryBuilder('i')
      .addSelect('i.password_hash')
      .where('i.email = :email', { email: dto.email })
      .getOne();

    if (!identity?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, identity.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // This endpoint is exclusively for platform admins
    if (identity.accountType !== AccountType.PLATFORM_ADMIN) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.identityRepo.update(identity.id, { lastLoginAt: new Date() });
    return this.issueTokens(identity);
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<TokenPair & { gymSlug: string }> {
    const invite = await this.inviteService.validate(dto.token);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.identityRepo.update(invite.identityId, {
      passwordHash,
      isVerified: true,
    });

    await this.inviteService.accept(dto.token);

    // Transition the gym to active when the owner completes onboarding
    if (invite.type === 'owner') {
      await this.clientRepo.update({ id: invite.clientId }, { status: 'active' });
    }

    // Mark the staff record active for owner and staff invite types
    if (invite.type === 'owner' || invite.type === 'staff') {
      await this.staffRepo.update(
        { identityId: invite.identityId, clientId: invite.clientId },
        { status: 'active' },
      );
    }

    // Invites are always for gym users — platform admins are seeded, not invited
    return { ...this.issueTokens(invite.identity), gymSlug: invite.client.slug };
  }

  async selfRegister(
    dto: SelfRegisterDto,
    clientId: string,
  ): Promise<TokenPair> {
    const feature = await this.clientFeatureRepo
      .createQueryBuilder('cf')
      .innerJoin(FeatureDefinition, 'fd', 'fd.id = cf.feature_id')
      .where('cf.client_id = :clientId', { clientId })
      .andWhere('fd.key = :key', { key: 'member_self_registration' })
      .andWhere('cf.is_enabled = true')
      .getOne();

    if (!feature) {
      throw new BadRequestException('Self-registration is not enabled for this gym');
    }

    const existing = await this.identityRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      const alreadyMember = await this.memberRepo.findOne({
        where: { identityId: existing.id, clientId },
      });
      if (alreadyMember) throw new BadRequestException('An account with this email already exists for this gym');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const identity = existing ?? this.identityRepo.create({
      email: dto.email,
      provider: 'local',
      isVerified: false,
      accountType: AccountType.GYM_USER,
    });

    if (!existing) {
      identity.passwordHash = passwordHash;
      await this.identityRepo.save(identity);
    } else {
      await this.identityRepo.update(identity.id, { passwordHash });
    }

    const member = this.memberRepo.create({
      clientId,
      identityId: identity.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      status: 'pending',
      joinedAt: new Date(),
    });
    await this.memberRepo.save(member);

    // Assign member role so GymRoleGuard recognises self-registered members
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

    return this.issueTokens(identity);
  }

  async refresh(identityId: string): Promise<TokenPair> {
    const identity = await this.identityRepo.findOne({ where: { id: identityId } });
    if (!identity) throw new UnauthorizedException();
    return this.issueTokens(identity);
  }

  // ─── Token issuance ───────────────────────────────────────────────────────

  private issueTokens(identity: Identity): TokenPair {
    const accessPayload: JwtPayload =
      identity.accountType === AccountType.PLATFORM_ADMIN
        ? {
            sub: identity.id,
            email: identity.email!,
            accountType: AccountType.PLATFORM_ADMIN,
            platformRole: identity.platformRole as PlatformRole,
            type: 'access',
          }
        : {
            sub: identity.id,
            email: identity.email!,
            accountType: AccountType.GYM_USER,
            type: 'access',
          };

    const refreshPayload: JwtRefreshPayload = {
      sub: identity.id,
      email: identity.email!,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.get('app.jwtSecret'),
      expiresIn: this.config.get('app.jwtAccessExpiresIn', '15m'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.config.get('app.jwtRefreshSecret'),
      expiresIn: this.config.get('app.jwtRefreshExpiresIn', '7d'),
    });

    return { accessToken, refreshToken };
  }
}
