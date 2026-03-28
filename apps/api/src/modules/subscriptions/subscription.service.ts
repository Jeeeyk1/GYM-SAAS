import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { Member } from '../../database/entities/member.entity';
import { Branch } from '../../database/entities/branch.entity';

export type SubscriptionLimitKey = 'maxMembers' | 'maxBranches';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async getSubscription(organizationId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { organizationId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  /**
   * Throws ForbiddenException if the org has reached its plan limit for the given key.
   * -1 in the subscription means unlimited — always passes.
   */
  async assertLimit(organizationId: string, limitKey: SubscriptionLimitKey): Promise<void> {
    const sub = await this.subRepo.findOne({
      where: { organizationId },
      select: ['maxMembers', 'maxBranches'],
    });

    if (!sub) return;

    const limit: number = sub[limitKey];
    if (limit === -1) return;

    let current = 0;
    if (limitKey === 'maxMembers') {
      current = await this.memberRepo.count({ where: { organizationId } });
    } else {
      current = await this.branchRepo.count({ where: { organizationId, isActive: true } });
    }

    if (current >= limit) {
      const label = limitKey === 'maxMembers' ? 'members' : 'branches';
      throw new ForbiddenException(
        `Your plan limit of ${limit} ${label} has been reached. Please upgrade your plan.`,
      );
    }
  }
}
