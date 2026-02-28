import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../../database/entities/member.entity';
import { ICheckInBehavior, CheckInContext, CheckInOutcome } from './behavior.interface';

@Injectable()
export class LoyaltyPointsBehavior implements ICheckInBehavior {
  readonly featureKey = 'checkin.loyalty_points';

  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  async handle(ctx: CheckInContext): Promise<CheckInOutcome> {
    const pointsToAdd = (ctx.featureConfig['points_per_checkin'] as number | undefined) ?? 10;

    // Use raw UPDATE to avoid race conditions when multiple check-ins happen concurrently
    const result = await this.memberRepo.query(
      `UPDATE members SET loyalty_points = loyalty_points + $1 WHERE id = $2 RETURNING loyalty_points`,
      [pointsToAdd, ctx.member.id],
    );

    const newTotal = (result[0]?.[0]?.loyalty_points as number) ?? ctx.member.loyaltyPoints + pointsToAdd;

    return {
      feature: 'checkin.loyalty_points',
      type: 'points_awarded',
      data: { points: pointsToAdd, newTotal },
    };
  }
}
