import { Injectable } from '@nestjs/common';
import { ICheckInBehavior, CheckInContext, CheckInOutcome } from './behavior.interface';

@Injectable()
export class BaseAttendanceBehavior implements ICheckInBehavior {
  readonly featureKey = 'checkin.basic';

  async handle(ctx: CheckInContext): Promise<CheckInOutcome> {
    return {
      feature: 'checkin.basic',
      type: 'attendance_logged',
      data: { checkedInAt: ctx.checkIn.checkedInAt },
    };
  }
}
