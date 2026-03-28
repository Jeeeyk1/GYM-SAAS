import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AccountType } from '@gym-saas/shared-types';
import { GymRoleGuard } from './gym-role.guard';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Member } from '../../database/entities/member.entity';

const makeIdentityRole = (roleName: string, branchId: string | null = null) =>
  ({ branchId, role: { name: roleName } }) as unknown as IdentityRole;

const makeContext = (opts: {
  user?: Record<string, unknown>;
  tenantContext?: { organizationId?: string; branchId?: string | null };
}): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ ...opts }),
    }),
  }) as unknown as ExecutionContext;

describe('GymRoleGuard', () => {
  let guard: GymRoleGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let mockIrQb: {
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };
  let mockMemberQb: {
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };
  let mockDataSource: { getRepository: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    mockIrQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockMemberQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => ({
        createQueryBuilder: () => {
          if (entity === IdentityRole) return mockIrQb;
          if (entity === Member) return mockMemberQb;
          throw new Error(`Unexpected entity: ${String(entity)}`);
        },
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymRoleGuard,
        { provide: Reflector, useValue: reflector },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    guard = module.get(GymRoleGuard);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns true when no @GymRoles decorator is present (no-op)', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ user: {}, tenantContext: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockDataSource.getRepository).not.toHaveBeenCalled();
  });

  it('returns true when @GymRoles is an empty array', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = makeContext({ user: {}, tenantContext: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockDataSource.getRepository).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when tenantContext is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['org_owner']);
    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
    expect(mockDataSource.getRepository).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the user is a PLATFORM_ADMIN', async () => {
    reflector.getAllAndOverride.mockReturnValue(['org_owner']);
    const ctx = makeContext({
      user: { accountType: AccountType.PLATFORM_ADMIN, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: null },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockDataSource.getRepository).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when DB returns no matching role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['org_owner', 'gym_owner']);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('staff', 'branch-1')]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: 'branch-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no roles at all', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    mockIrQb.getMany.mockResolvedValue([]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: null },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('returns true for org_owner (branchId=null) regardless of branch context', async () => {
    reflector.getAllAndOverride.mockReturnValue(['org_owner']);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('org_owner', null)]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: 'branch-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockMemberQb.getOne).not.toHaveBeenCalled();
  });

  it('returns true for gym_owner whose branchId matches the request branch', async () => {
    reflector.getAllAndOverride.mockReturnValue(['gym_owner']);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('gym_owner', 'branch-1')]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: 'branch-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws ForbiddenException when gym_owner branchId does not match request branch', async () => {
    reflector.getAllAndOverride.mockReturnValue(['gym_owner', 'staff']);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('gym_owner', 'branch-2')]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: 'branch-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('returns true for member-only user when no membership record exists', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('member', null)]);
    mockMemberQb.getOne.mockResolvedValue(null);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: null },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockMemberQb.getOne).toHaveBeenCalledTimes(1);
  });

  it('returns true for member-only user whose membership has not yet expired', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    const futureDate = new Date(Date.now() + 86_400_000);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('member', null)]);
    mockMemberQb.getOne.mockResolvedValue({ membershipExpiresAt: futureDate });

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: null },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws ForbiddenException when member-only user has an expired membership', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    const pastDate = new Date(Date.now() - 86_400_000);
    mockIrQb.getMany.mockResolvedValue([makeIdentityRole('member', null)]);
    mockMemberQb.getOne.mockResolvedValue({ membershipExpiresAt: pastDate });

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: null },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenException('Membership has expired. Please renew to continue.'),
    );
  });

  it('skips expiry check for mixed-role user (member + staff) — not member-only', async () => {
    reflector.getAllAndOverride.mockReturnValue(['staff', 'member']);
    mockIrQb.getMany.mockResolvedValue([
      makeIdentityRole('member', null),
      makeIdentityRole('staff', 'branch-1'),
    ]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { organizationId: 'org-1', branchId: 'branch-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockMemberQb.getOne).not.toHaveBeenCalled();
  });
});
