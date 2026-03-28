import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckIn } from '../../database/entities/checkin.entity';
import { Member } from '../../database/entities/member.entity';
import { TenantContext } from '../../common/middleware/tenant-context.middleware';
import { QrService } from './qr.service';
import { FeatureResolverService } from './feature-resolver.service';
import { CHECKIN_BEHAVIORS, CheckInOutcome, ICheckInBehavior } from './behaviors/behavior.interface';
import { CheckInDto, CheckInQueryDto } from './dto/checkin.dto';

@Injectable()
export class CheckInsService {
  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepo: Repository<CheckIn>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly qrService: QrService,
    private readonly featureResolver: FeatureResolverService,
    @Inject(CHECKIN_BEHAVIORS)
    private readonly behaviors: ICheckInBehavior[],
  ) {}

  async checkIn(
    dto: CheckInDto,
    tenant: TenantContext,
    actorIdentityId: string,
  ): Promise<{ checkIn: CheckIn; outcomes: CheckInOutcome[] }> {
    const features = await this.featureResolver.resolve(tenant.organizationId);

    if (!features.get('checkin.basic')?.isEnabled) {
      throw new ForbiddenException('Check-ins are not enabled for this gym');
    }

    // ── 1. Resolve memberId ───────────────────────────────────────────────────
    let memberId: string;

    if (dto.method === 'manual') {
      if (!dto.memberId) {
        throw new BadRequestException('memberId is required for manual check-in');
      }
      memberId = dto.memberId;
    } else if (dto.method === 'qr_staff_scan') {
      if (!dto.qrToken) {
        throw new BadRequestException('qrToken is required for qr_staff_scan');
      }
      const qrData = this.qrService.validateMemberQr(dto.qrToken);
      if (qrData.organizationId !== tenant.organizationId) {
        throw new ForbiddenException('QR token belongs to a different gym');
      }
      memberId = qrData.memberId;
    } else {
      // qr_self_scan: the authenticated user is the member
      const member = await this.memberRepo.findOne({
        where: { identityId: actorIdentityId, organizationId: tenant.organizationId },
      });
      if (!member) {
        throw new NotFoundException('No member record found for this user at this gym');
      }
      memberId = member.id;
    }

    // ── 2. Load member ────────────────────────────────────────────────────────
    const member = await this.memberRepo.findOne({
      where: { id: memberId, organizationId: tenant.organizationId },
      relations: ['privacySettings'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // ── 2b. Membership expiry check ───────────────────────────────────────────
    if (member.membershipExpiresAt && member.membershipExpiresAt < new Date()) {
      throw new ForbiddenException('Membership has expired. Please renew to continue.');
    }

    // ── 3. Duplicate check ────────────────────────────────────────────────────
    const duplicateWindowMinutes =
      (features.get('checkin.basic')?.config?.['duplicate_window_minutes'] as number | undefined) ?? 60;

    const openCheckIn = await this.checkInRepo
      .createQueryBuilder('ci')
      .where('ci.memberId = :memberId', { memberId })
      .andWhere('ci.organizationId = :organizationId', { organizationId: tenant.organizationId })
      .andWhere('ci.checkedOutAt IS NULL')
      .andWhere(
        `ci.checkedInAt > now() - interval '${duplicateWindowMinutes} minutes'`,
      )
      .getOne();

    if (openCheckIn) {
      throw new ConflictException({
        message: 'Member is already checked in',
        checkInId: openCheckIn.id,
      });
    }

    // ── 4. Create check-in ────────────────────────────────────────────────────
    const checkIn = this.checkInRepo.create({
      organizationId: tenant.organizationId,
      memberId: member.id,
      method: dto.method,
      station: dto.station ?? null,
    });
    await this.checkInRepo.save(checkIn);

    // ── 5. Run behavior registry ──────────────────────────────────────────────
    const outcomes: CheckInOutcome[] = [];

    for (const behavior of this.behaviors) {
      const featureEntry = features.get(behavior.featureKey);

      // Base attendance always runs; others require the feature to be enabled
      const shouldRun = behavior.featureKey === 'checkin.basic' || featureEntry?.isEnabled === true;

      if (shouldRun) {
        const outcome = await behavior.handle({
          checkIn,
          member,
          featureConfig: featureEntry?.config ?? {},
        });
        outcomes.push(outcome);
      }
    }

    // ── 6. Persist outcomes in metadata ──────────────────────────────────────
    checkIn.metadata = { outcomes };
    await this.checkInRepo.save(checkIn);

    return { checkIn, outcomes };
  }

  async checkOut(
    checkInId: string,
    tenant: TenantContext,
    method: 'manual' | 'staff',
  ): Promise<CheckIn> {
    const checkIn = await this.checkInRepo.findOne({
      where: { id: checkInId, organizationId: tenant.organizationId },
    });

    if (!checkIn) throw new NotFoundException('Check-in not found');
    if (checkIn.checkedOutAt) throw new BadRequestException('Already checked out');

    checkIn.checkedOutAt = new Date();
    checkIn.checkoutMethod = method;
    return this.checkInRepo.save(checkIn);
  }

  async getMemberQr(
    memberId: string,
    tenant: TenantContext,
  ): Promise<{ token: string; expiresAt: Date }> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, organizationId: tenant.organizationId },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.qrService.generateMemberQr(memberId, tenant.organizationId, this.memberRepo);
  }

  async getGymQr(tenant: TenantContext): Promise<{ payload: string }> {
    return { payload: this.qrService.getGymQrPayload(tenant.orgSlug) };
  }

  async getActiveMembers(
    tenant: TenantContext,
  ): Promise<Array<{ memberId: string; firstName: string; lastName: string; checkedInAt: Date }>> {
    const features = await this.featureResolver.resolve(tenant.organizationId);

    if (!features.get('checkin.active_members_board')?.isEnabled) {
      throw new ForbiddenException('Active members board is not enabled for this gym');
    }

    const rows = await this.checkInRepo
      .createQueryBuilder('ci')
      .innerJoin('ci.member', 'm')
      .innerJoin('m.privacySettings', 'ps')
      .select([
        'ci.id',
        'ci.memberId',
        'ci.checkedInAt',
        'm.firstName',
        'm.lastName',
      ])
      .where('ci.organizationId = :organizationId', { organizationId: tenant.organizationId })
      .andWhere('ci.checkedOutAt IS NULL')
      .andWhere("ci.checkedInAt > now() - interval '4 hours'")
      .andWhere('ps.show_in_active_members = true')
      .orderBy('ci.checkedInAt', 'DESC')
      .getMany();

    return rows.map((ci) => ({
      memberId: ci.memberId,
      firstName: ci.member.firstName,
      lastName: ci.member.lastName,
      checkedInAt: ci.checkedInAt,
    }));
  }

  async getHistory(
    query: CheckInQueryDto,
    tenant: TenantContext,
  ): Promise<{ data: CheckIn[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.checkInRepo
      .createQueryBuilder('ci')
      .where('ci.organizationId = :organizationId', { organizationId: tenant.organizationId });

    if (query.memberId) {
      // Verify member belongs to this org
      const member = await this.memberRepo.findOne({
        where: { id: query.memberId, organizationId: tenant.organizationId },
      });
      if (!member) throw new NotFoundException('Member not found');
      qb.andWhere('ci.memberId = :memberId', { memberId: query.memberId });
    }

    const [data, total] = await qb
      .orderBy('ci.checkedInAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }
}
