import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CheckInsService } from './checkins.service';
import { CheckIn } from '../../database/entities/checkin.entity';
import { Member } from '../../database/entities/member.entity';
import { QrService } from './qr.service';
import { FeatureResolverService } from './feature-resolver.service';
import { CHECKIN_BEHAVIORS, ICheckInBehavior } from './behaviors/behavior.interface';
import { CheckInMethod } from './dto/checkin.dto';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeQb = (getOneResult: Partial<CheckIn> | null = null) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(getOneResult),
  getMany: jest.fn().mockResolvedValue([]),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
});

const TENANT: TenantContext = {
  organizationId: 'org-1',
  orgSlug: 'test-gym',
  plan: 'basic',
  isDemo: false,
  branchId: null,
};
const ACTOR_ID = 'identity-1';

const makeFeatures = (enabled = true): Map<string, { isEnabled: boolean; config: Record<string, unknown> }> =>
  new Map([
    ['checkin.basic', { isEnabled: enabled, config: { duplicate_window_minutes: 60 } }],
  ]);

const activeMember = (overrides: Partial<Member> = {}): Partial<Member> => ({
  id: 'member-1',
  membershipExpiresAt: null,
  privacySettings: {} as any,
  ...overrides,
});

describe('CheckInsService', () => {
  let service: CheckInsService;
  let checkInRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let memberRepo: { findOne: jest.Mock };
  let qrService: jest.Mocked<QrService>;
  let featureResolver: jest.Mocked<FeatureResolverService>;
  let mockBehavior: jest.Mocked<ICheckInBehavior>;

  beforeEach(async () => {
    const defaultQb = makeQb();
    checkInRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(defaultQb),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    memberRepo = { findOne: jest.fn() };
    qrService = {
      validateMemberQr: jest.fn(),
      generateMemberQr: jest.fn(),
      getGymQrPayload: jest.fn(),
    } as unknown as jest.Mocked<QrService>;
    featureResolver = {
      resolve: jest.fn(),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<FeatureResolverService>;
    mockBehavior = {
      featureKey: 'checkin.basic',
      handle: jest
        .fn()
        .mockResolvedValue({ feature: 'checkin.basic', type: 'attendance', data: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInsService,
        { provide: getRepositoryToken(CheckIn), useValue: checkInRepo },
        { provide: getRepositoryToken(Member), useValue: memberRepo },
        { provide: QrService, useValue: qrService },
        { provide: FeatureResolverService, useValue: featureResolver },
        { provide: CHECKIN_BEHAVIORS, useValue: [mockBehavior] },
      ],
    }).compile();

    service = module.get(CheckInsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── checkIn() ────────────────────────────────────────────────────────────────

  describe('checkIn', () => {
    it('throws ForbiddenException when checkin.basic feature is disabled', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures(false));

      await expect(
        service.checkIn({ method: CheckInMethod.MANUAL, memberId: 'member-1' }, TENANT, ACTOR_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for manual check-in with no memberId', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());

      await expect(
        service.checkIn({ method: CheckInMethod.MANUAL } as any, TENANT, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for qr_staff_scan with no qrToken', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());

      await expect(
        service.checkIn({ method: CheckInMethod.QR_STAFF_SCAN } as any, TENANT, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException for qr_staff_scan from a different gym', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      qrService.validateMemberQr.mockReturnValue({
        organizationId: 'different-gym',
        memberId: 'member-1',
      });

      await expect(
        service.checkIn(
          { method: CheckInMethod.QR_STAFF_SCAN, qrToken: 'some-token' },
          TENANT,
          ACTOR_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for qr_self_scan when no member record found for identity', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkIn({ method: CheckInMethod.QR_SELF_SCAN }, TENANT, ACTOR_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when member record not found by memberId (manual)', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkIn({ method: CheckInMethod.MANUAL, memberId: 'member-1' }, TENANT, ACTOR_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when member membership has expired', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      const expired = activeMember({ membershipExpiresAt: new Date(Date.now() - 86_400_000) });
      memberRepo.findOne.mockResolvedValue(expired);

      await expect(
        service.checkIn({ method: CheckInMethod.MANUAL, memberId: 'member-1' }, TENANT, ACTOR_ID),
      ).rejects.toThrow(new ForbiddenException('Membership has expired. Please renew to continue.'));
    });

    it('throws ConflictException when member is already checked in', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      memberRepo.findOne.mockResolvedValue(activeMember());
      const openCheckIn: Partial<CheckIn> = { id: 'ci-existing' };
      const qb = makeQb(openCheckIn);
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.checkIn({ method: CheckInMethod.MANUAL, memberId: 'member-1' }, TENANT, ACTOR_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a check-in, runs behaviors, and returns outcomes', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      memberRepo.findOne.mockResolvedValue(activeMember());
      const qb = makeQb(null);
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      const newCheckIn = { id: 'ci-new', organizationId: 'org-1', memberId: 'member-1', metadata: null };
      checkInRepo.create.mockReturnValue(newCheckIn);
      checkInRepo.save.mockResolvedValue(newCheckIn);

      const result = await service.checkIn(
        { method: CheckInMethod.MANUAL, memberId: 'member-1', station: 'front-door' },
        TENANT,
        ACTOR_ID,
      );

      expect(result.checkIn.id).toBe('ci-new');
      expect(result.outcomes).toHaveLength(1);
      expect(result.outcomes[0].type).toBe('attendance');
      expect(mockBehavior.handle).toHaveBeenCalledTimes(1);
      // Called twice: once to persist the row, once to save outcomes
      expect(checkInRepo.save).toHaveBeenCalledTimes(2);
    });

    it('resolves member via qr_staff_scan and creates check-in', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      qrService.validateMemberQr.mockReturnValue({
        organizationId: TENANT.organizationId,
        memberId: 'member-1',
      });
      memberRepo.findOne.mockResolvedValue(activeMember());
      const qb = makeQb(null);
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      const newCheckIn = { id: 'ci-qr', organizationId: 'org-1', memberId: 'member-1', metadata: null };
      checkInRepo.create.mockReturnValue(newCheckIn);
      checkInRepo.save.mockResolvedValue(newCheckIn);

      const result = await service.checkIn(
        { method: CheckInMethod.QR_STAFF_SCAN, qrToken: 'valid-token' },
        TENANT,
        ACTOR_ID,
      );

      expect(result.checkIn.id).toBe('ci-qr');
    });

    it('resolves member via qr_self_scan (actor is the member)', async () => {
      featureResolver.resolve.mockResolvedValue(makeFeatures());
      const member = activeMember();
      // First call: identity → member lookup; second call: member with relations
      memberRepo.findOne
        .mockResolvedValueOnce(member)  // qr_self_scan identity lookup
        .mockResolvedValueOnce(member); // load member with relations

      const qb = makeQb(null);
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      const newCheckIn = { id: 'ci-self', organizationId: 'org-1', memberId: 'member-1', metadata: null };
      checkInRepo.create.mockReturnValue(newCheckIn);
      checkInRepo.save.mockResolvedValue(newCheckIn);

      const result = await service.checkIn({ method: CheckInMethod.QR_SELF_SCAN }, TENANT, ACTOR_ID);
      expect(result.checkIn.id).toBe('ci-self');
    });
  });

  // ─── checkOut() ───────────────────────────────────────────────────────────────

  describe('checkOut', () => {
    it('throws NotFoundException when check-in record does not exist', async () => {
      checkInRepo.findOne.mockResolvedValue(null);

      await expect(service.checkOut('ci-1', TENANT, 'manual')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when already checked out', async () => {
      checkInRepo.findOne.mockResolvedValue({ id: 'ci-1', checkedOutAt: new Date() });

      await expect(service.checkOut('ci-1', TENANT, 'manual')).rejects.toThrow(BadRequestException);
    });

    it('sets checkedOutAt and returns the updated record', async () => {
      const openCheckIn = { id: 'ci-1', checkedOutAt: null };
      checkInRepo.findOne.mockResolvedValue(openCheckIn);
      checkInRepo.save.mockImplementation((ci: any) => Promise.resolve(ci));

      const result = await service.checkOut('ci-1', TENANT, 'staff');

      expect(result.checkedOutAt).toBeInstanceOf(Date);
      expect(result.checkoutMethod).toBe('staff');
    });
  });

  // ─── getMemberQr() ────────────────────────────────────────────────────────────

  describe('getMemberQr', () => {
    it('throws NotFoundException when member does not exist', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.getMemberQr('member-1', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('returns QR token data for a valid member', async () => {
      memberRepo.findOne.mockResolvedValue(activeMember());
      qrService.generateMemberQr.mockResolvedValue({
        token: 'qr-token',
        expiresAt: new Date(),
      });

      const result = await service.getMemberQr('member-1', TENANT);
      expect(result.token).toBe('qr-token');
    });
  });

  // ─── getGymQr() ───────────────────────────────────────────────────────────────

  describe('getGymQr', () => {
    it('returns gym QR payload', async () => {
      qrService.getGymQrPayload.mockReturnValue('gym-qr-payload');

      const result = await service.getGymQr(TENANT);
      expect(result.payload).toBe('gym-qr-payload');
    });
  });

  // ─── getActiveMembers() ───────────────────────────────────────────────────────

  describe('getActiveMembers', () => {
    it('throws ForbiddenException when active_members_board feature is disabled', async () => {
      featureResolver.resolve.mockResolvedValue(new Map());

      await expect(service.getActiveMembers(TENANT)).rejects.toThrow(ForbiddenException);
    });

    it('returns active members when feature is enabled', async () => {
      const features = new Map([
        ...makeFeatures(),
        ['checkin.active_members_board', { isEnabled: true, config: {} }],
      ]);
      featureResolver.resolve.mockResolvedValue(features);

      const fakeRow = {
        id: 'ci-1',
        memberId: 'member-1',
        checkedInAt: new Date(),
        member: { firstName: 'Alice', lastName: 'Smith' },
      };
      const qb = makeQb();
      qb.getMany.mockResolvedValue([fakeRow]);
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getActiveMembers(TENANT);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Alice');
    });
  });

  // ─── getHistory() ─────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns paginated check-in history', async () => {
      const fakeCheckIns = [{ id: 'ci-1' }, { id: 'ci-2' }];
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([fakeCheckIns, 2]);
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getHistory({ page: 1, limit: 10 }, TENANT);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('throws NotFoundException when filtering by non-existent memberId', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      const qb = makeQb();
      checkInRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.getHistory({ memberId: 'unknown-member', page: 1, limit: 10 }, TENANT),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
