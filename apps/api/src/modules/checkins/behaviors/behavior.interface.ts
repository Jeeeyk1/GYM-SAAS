import { CheckIn } from '../../../database/entities/checkin.entity';
import { Member } from '../../../database/entities/member.entity';

export interface CheckInContext {
  checkIn: CheckIn;
  member: Member;
  featureConfig: Record<string, unknown>;
}

export interface CheckInOutcome {
  feature: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ICheckInBehavior {
  /** Feature key this behavior belongs to. Use 'checkin.basic' for always-run behaviors. */
  readonly featureKey: string;
  handle(ctx: CheckInContext): Promise<CheckInOutcome>;
}

/** Injection token for the ordered array of check-in behaviors. */
export const CHECKIN_BEHAVIORS = Symbol('CHECKIN_BEHAVIORS');
