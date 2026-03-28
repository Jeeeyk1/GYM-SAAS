import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Identity } from './identity.entity';
import { Organization } from './organization.entity';

export type InviteStatus = 'pending' | 'accepted' | 'expired';
export type InviteType = 'owner' | 'staff' | 'member';

@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64, unique: true })
  token: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'identity_id' })
  identityId: string;

  @Column({ length: 100 })
  role: string;

  @Column({ length: 50 })
  type: InviteType;

  @Column({ name: 'invited_by', nullable: true, type: 'varchar', length: 255 })
  invitedBy: string | null;

  @Column({ default: 'pending', length: 50 })
  status: InviteStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Identity)
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
