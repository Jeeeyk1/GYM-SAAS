import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckIn } from '../../database/entities/checkin.entity';

@Injectable()
export class CheckoutSchedulerService {
  private readonly logger = new Logger(CheckoutSchedulerService.name);

  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepo: Repository<CheckIn>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async autoCheckout(): Promise<void> {
    const result = await this.checkInRepo
      .createQueryBuilder()
      .update(CheckIn)
      .set({
        checkedOutAt: () => 'now()',
        checkoutMethod: 'auto',
      })
      .where('checked_out_at IS NULL')
      .andWhere("checked_in_at < now() - interval '4 hours'")
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto checkout: ${result.affected} check-ins closed`);
    }
  }
}
