import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType, PlatformRole } from '@gym-saas/shared-types';

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, length: 255, unique: true, type: 'varchar', default: null })
  email: string | null;

  @Column({ nullable: true, length: 50, unique: true, type: 'varchar', default: null })
  phone: string | null;

  @Column({ name: 'password_hash', nullable: true, type: 'text', select: true })
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
