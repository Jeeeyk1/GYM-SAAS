import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AccountType } from '@gym-saas/shared-types';
import { AuthService } from './auth.service';
import { Identity } from '../../database/entities/identity.entity';
import { Member } from '../../database/entities/member.entity';
import { Staff } from '../../database/entities/staff.entity';
import { Organization } from '../../database/entities/organization.entity';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { Role } from '../../database/entities/role.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { InviteService } from './invite.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeQb = (getOneResult: unknown = null) => ({
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(getOneResult),
});

const makeRepo = () => ({
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const GYM_IDENTITY: Partial<Identity> = {
  id: 'id-1',
  email: 'member@gym.com',
  passwordHash: 'hashed-password',
  accountType: AccountType.GYM_USER,
  platformRole: null,
};

const PLATFORM_IDENTITY: Partial<Identity> = {
  id: 'id-2',
  email: 'admin@platform.com',
  passwordHash: 'hashed-password',
  accountType: AccountType.PLATFORM_ADMIN,
  platformRole: 'gym_admin' as any,
};

describe('AuthService', () => {
  let service: AuthService;
  let identityRepo: ReturnType<typeof makeRepo>;
  let memberRepo: ReturnType<typeof makeRepo>;
  let identityRoleRepo: ReturnType<typeof makeRepo>;
  let jwtService: jest.Mocked<JwtService>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    identityRepo = makeRepo();
    memberRepo = makeRepo();
    identityRoleRepo = makeRepo();

    jwtService = { sign: jest.fn().mockReturnValue('mock-token') } as unknown as jest.Mocked<JwtService>;
    config = { get: jest.fn().mockReturnValue('mock-secret') } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Identity), useValue: identityRepo },
        { provide: getRepositoryToken(Member), useValue: memberRepo },
        { provide: getRepositoryToken(Staff), useValue: makeRepo() },
        { provide: getRepositoryToken(Organization), useValue: makeRepo() },
        { provide: getRepositoryToken(ClientFeature), useValue: makeRepo() },
        { provide: getRepositoryToken(Role), useValue: makeRepo() },
        { provide: getRepositoryToken(IdentityRole), useValue: identityRoleRepo },
        { provide: InviteService, useValue: { validate: jest.fn(), accept: jest.fn() } },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── login() ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException when identity is not found', async () => {
      const qb = makeQb(null);
      identityRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      const qb = makeQb(GYM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'member@gym.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when a PLATFORM_ADMIN tries gym login', async () => {
      const qb = makeQb(PLATFORM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.login({ email: 'admin@platform.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on successful login without org context', async () => {
      const qb = makeQb(GYM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      identityRepo.update.mockResolvedValue({});

      const result = await service.login({ email: 'member@gym.com', password: 'pass' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('throws UnauthorizedException for expired member login with org context', async () => {
      const qb = makeQb(GYM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const expiredMember = {
        id: 'm-1',
        membershipExpiresAt: new Date(Date.now() - 86_400_000), // yesterday
      };
      memberRepo.findOne.mockResolvedValue(expiredMember);
      // No staff role found
      identityRoleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'member@gym.com', password: 'pass' }, 'org-1'),
      ).rejects.toThrow(new UnauthorizedException('Membership has expired. Please renew to continue.'));
    });

    it('allows staff login even when their member record is expired', async () => {
      const qb = makeQb(GYM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const expiredMember = {
        id: 'm-1',
        membershipExpiresAt: new Date(Date.now() - 86_400_000),
      };
      memberRepo.findOne.mockResolvedValue(expiredMember);
      // Staff role exists (using new role name)
      identityRoleRepo.findOne.mockResolvedValue({
        id: 'ir-1',
        role: { name: 'staff' },
      });
      identityRepo.update.mockResolvedValue({});

      const result = await service.login({ email: 'member@gym.com', password: 'pass' }, 'org-1');
      expect(result.accessToken).toBe('mock-token');
    });

    it('allows login when member record exists but has no expiry date', async () => {
      const qb = makeQb(GYM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      memberRepo.findOne.mockResolvedValue({ id: 'm-1', membershipExpiresAt: null });
      identityRepo.update.mockResolvedValue({});

      const result = await service.login({ email: 'member@gym.com', password: 'pass' }, 'org-1');
      expect(result.accessToken).toBe('mock-token');
    });
  });

  // ─── adminLogin() ────────────────────────────────────────────────────────────

  describe('adminLogin', () => {
    it('throws UnauthorizedException when identity is not found', async () => {
      const qb = makeQb(null);
      identityRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.adminLogin({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when a GYM_USER tries admin login', async () => {
      const qb = makeQb(GYM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.adminLogin({ email: 'member@gym.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on successful admin login', async () => {
      const qb = makeQb(PLATFORM_IDENTITY);
      identityRepo.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      identityRepo.update.mockResolvedValue({});

      const result = await service.adminLogin({ email: 'admin@platform.com', password: 'pass' });
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });

  // ─── refresh() ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('throws UnauthorizedException when identity no longer exists', async () => {
      identityRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('id-1')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new token pair on valid refresh', async () => {
      identityRepo.findOne.mockResolvedValue(GYM_IDENTITY);

      const result = await service.refresh('id-1');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });
});
