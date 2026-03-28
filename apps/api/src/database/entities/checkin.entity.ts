import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Organization } from './organization.entity';

export type CheckInMethod = 'qr_staff_scan' | 'qr_self_scan' | 'manual';
export type CheckoutMethod = 'manual' | 'auto' | 'staff';

@Entity('check_ins')
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ name: 'checked_in_at', type: 'timestamptz', default: () => 'now()' })
  checkedInAt: Date;

  @Column({ default: 'qr_staff_scan', length: 50 })
  method: CheckInMethod;

  @Column({ nullable: true, length: 100, type: 'varchar', default: null })
  station: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true, default: null })
  checkedOutAt: Date | null;

  @Column({ name: 'checkout_method', type: 'varchar', length: 50, nullable: true, default: null })
  checkoutMethod: CheckoutMethod | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}
