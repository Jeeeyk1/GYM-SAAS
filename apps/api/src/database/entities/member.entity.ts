import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType, PlatformRole } from '@gym-saas/shared-types';
import { Client } from './client.entity';
import { MemberPrivacySettings } from './member.privacy.settings.entity';


@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

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

  @Column({ name: 'membership_type', nullable: true, length: 100, type: 'varchar' ,default: null })
  membershipType: string | null;

  @Column({ name: 'joined_at', type: 'date', nullable: true })
  joinedAt: Date | null;

  @Column({ name: 'loyalty_points', default: 0 })
  loyaltyPoints: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ name: 'qr_token', type: 'text', nullable: true, select: false, default: null })
  qrToken: string | null;

  @Column({ name: 'qr_token_expires_at', type: 'timestamptz', nullable: true, default: null })
  qrTokenExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Client, (c) => c.members)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @OneToOne(() => MemberPrivacySettings, (p) => p.member, { cascade: true })
  privacySettings: MemberPrivacySettings;
}

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, length: 255, unique: true, type: 'varchar' , default: null })
  email: string | null;

  @Column({ nullable: true, length: 50, unique: true, type: 'varchar' , default: null })
  phone: string | null;

  @Column({ name: 'password_hash', nullable: true, type: 'text', select: false })
  passwordHash: string | null;

  @Column({ default: 'local', length: 50 })
  provider: string;

  @Column({ name: 'provider_id', nullable: true, type: 'text' })
  providerId: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'account_type', type: 'varchar', length: 30, default: 'GYM_USER' })
  accountType: AccountType;

  @Column({ name: 'platform_role', type: 'varchar', length: 30, nullable: true, default: null })
  platformRole: PlatformRole | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}




export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending';



export type StaffStatus = 'active' | 'inactive' | 'invited';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'identity_id', type: 'varchar', length: 255 })
  identityId: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ nullable: true, length: 100, type: 'varchar', default: null })
  title: string | null;

  @Column({ default: 'active', length: 50, type: 'varchar' })
  status: StaffStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @JoinColumn({ name: 'client_id' })
  client: Client;
}