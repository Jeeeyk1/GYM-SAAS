import { Injectable } from '@nestjs/common';
import { ICheckInBehavior, CheckInContext, CheckInOutcome } from './behavior.interface';

@Injectable()
export class WelcomeMessageBehavior implements ICheckInBehavior {
  readonly featureKey = 'checkin.welcome_message';

  async handle(ctx: CheckInContext): Promise<CheckInOutcome> {
    const template =
      (ctx.featureConfig['message'] as string | undefined) ?? 'Welcome back, {first_name}!';

    const message = template.replace('{first_name}', ctx.member.firstName);

    return {
      feature: 'checkin.welcome_message',
      type: 'message',
      data: { message },
    };
  }
}
