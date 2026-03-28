import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberPrivacySettings } from './member.privacy.settings.entity';
import { Organization } from './organization.entity';

export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'branch_id', nullable: true, type: 'varchar' })
  branchId: string | null;

  @Column({ name: 'identity_id', nullable: true, type: 'varchar', length: 255 })
  identityId: string | null;

  @Column({ name: 'member_number', nullable: true, type: 'varchar', length: 100 })
  memberNumber: string | null;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ default: 'active', length: 50 })
  status: MemberStatus;

  @Column({ name: 'membership_type', nullable: true, length: 100, type: 'varchar', default: null })
  membershipType: string | null;

  @Column({ name: 'joined_at', type: 'date', nullable: true })
  joinedAt: Date | null;

  @Column({ name: 'loyalty_points', default: 0 })
  loyaltyPoints: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ name: 'membership_started_at', type: 'timestamptz', nullable: true, default: null })
  membershipStartedAt: Date | null;

  @Column({ name: 'membership_expires_at', type: 'timestamptz', nullable: true, default: null })
  membershipExpiresAt: Date | null;

  @Column({ name: 'qr_token', type: 'text', nullable: true, select: false, default: null })
  qrToken: string | null;

  @Column({ name: 'qr_token_expires_at', type: 'timestamptz', nullable: true, default: null })
  qrTokenExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToOne(() => MemberPrivacySettings, (p) => p.member, { cascade: true })
  privacySettings: MemberPrivacySettings;
}
