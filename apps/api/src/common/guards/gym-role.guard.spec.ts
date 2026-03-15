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

const makeContext = (opts: {
  user?: Record<string, unknown>;
  tenantContext?: Record<string, unknown>;
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
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    mockDataSource = { query: jest.fn() };

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
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('returns true when @GymRoles is an empty array', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = makeContext({ user: {}, tenantContext: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when tenantContext is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['gym_owner']);
    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      // tenantContext is absent
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the user is a PLATFORM_ADMIN', async () => {
    reflector.getAllAndOverride.mockReturnValue(['gym_owner']);
    const ctx = makeContext({
      user: { accountType: AccountType.PLATFORM_ADMIN, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when DB returns no matching role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['gym_owner', 'gym_admin']);
    // user only has front_desk, which is not in required list
    mockDataSource.query.mockResolvedValueOnce([{ name: 'front_desk' }]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockDataSource.query).toHaveBeenCalledTimes(1);
  });

  it('throws ForbiddenException when user has no roles at all', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    mockDataSource.query.mockResolvedValueOnce([]); // no roles

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('returns true for a staff user with a matching role (skips expiry check)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['gym_owner']);
    mockDataSource.query.mockResolvedValueOnce([{ name: 'gym_owner' }]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    // Only one query: role lookup. No expiry check for non-member-only users.
    expect(mockDataSource.query).toHaveBeenCalledTimes(1);
  });

  it('returns true for mixed-role user (member + front_desk) — not member-only, skips expiry', async () => {
    reflector.getAllAndOverride.mockReturnValue(['front_desk', 'member']);
    mockDataSource.query.mockResolvedValueOnce([{ name: 'member' }, { name: 'front_desk' }]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockDataSource.query).toHaveBeenCalledTimes(1);
  });

  it('returns true for member-only user when no membership record exists', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    mockDataSource.query
      .mockResolvedValueOnce([{ name: 'member' }]) // roles query
      .mockResolvedValueOnce([]); // expiry query: no member row

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockDataSource.query).toHaveBeenCalledTimes(2);
  });

  it('returns true for member-only user whose membership has not yet expired', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    const futureDate = new Date(Date.now() + 86_400_000); // tomorrow
    mockDataSource.query
      .mockResolvedValueOnce([{ name: 'member' }])
      .mockResolvedValueOnce([{ membership_expires_at: futureDate }]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws ForbiddenException when member-only user has an expired membership', async () => {
    reflector.getAllAndOverride.mockReturnValue(['member']);
    const pastDate = new Date(Date.now() - 86_400_000); // yesterday
    mockDataSource.query
      .mockResolvedValueOnce([{ name: 'member' }])
      .mockResolvedValueOnce([{ membership_expires_at: pastDate }]);

    const ctx = makeContext({
      user: { accountType: AccountType.GYM_USER, sub: 'id-1' },
      tenantContext: { clientId: 'client-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenException('Membership has expired. Please renew to continue.'),
    );
  });
});
