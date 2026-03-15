import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../database/entities/member.entity';
import { Identity } from '../../database/entities/identity.entity';
import { Client } from '../../database/entities/client.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class MembershipSchedulerService {
  private readonly logger = new Logger(MembershipSchedulerService.name);

  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 9 * * *') // daily at 9am
  async sendExpiryReminders(): Promise<void> {
    this.logger.log('Running membership expiry reminder job');

    await Promise.all([
      this.sendRemindersForWindow(7),
      this.sendRemindersForWindow(1),
    ]);
  }

  private async sendRemindersForWindow(daysLeft: number): Promise<void> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 1);
    windowStart.setDate(windowStart.getDate() + daysLeft);

    const windowEnd = new Date();
    windowEnd.setHours(windowEnd.getHours() + 1);
    windowEnd.setDate(windowEnd.getDate() + daysLeft);

    const expiring = await this.memberRepo
      .createQueryBuilder('m')
      .innerJoin(Identity, 'i', 'i.id = m.identity_id')
      .innerJoin(Client, 'c', 'c.id = m.client_id')
      .select('m.id', 'id')
      .addSelect('m.firstName', 'firstName')
      .addSelect('m.membershipExpiresAt', 'membershipExpiresAt')
      .addSelect('i.email', 'email')
      .addSelect('c.name', 'gymName')
      .where('m.status = :status', { status: 'active' })
      .andWhere('m.membershipExpiresAt BETWEEN :start AND :end', {
        start: windowStart,
        end: windowEnd,
      })
      .andWhere('i.email IS NOT NULL')
      .getRawMany<{
        id: string;
        firstName: string;
        membershipExpiresAt: Date;
        email: string;
        gymName: string;
      }>();

    this.logger.log(`Found ${expiring.length} members expiring in ~${daysLeft} day(s)`);

    for (const row of expiring) {
      try {
        await this.emailService.sendMembershipExpiryReminder({
          to: row.email,
          memberName: row.firstName,
          gymName: row.gymName,
          daysLeft,
          expiresAt: new Date(row.membershipExpiresAt),
        });
      } catch (err) {
        this.logger.error(
          `Failed to send expiry reminder to ${row.email} (memberId: ${row.id})`,
          err,
        );
      }
    }
  }
}
