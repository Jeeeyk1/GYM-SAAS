import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

export type SubscriptionPlan = 'basic' | 'advanced' | 'enterprise';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ default: 'basic', length: 50 })
  plan: SubscriptionPlan;

  @Column({ name: 'max_members', default: 100 })
  maxMembers: number;

  @Column({ name: 'max_branches', default: 1 })
  maxBranches: number;

  @Column({ name: 'ai_token_limit', default: 0 })
  aiTokenLimit: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'auto_renew', default: true })
  autoRenew: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToOne(() => Organization, (org) => org.subscription)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
