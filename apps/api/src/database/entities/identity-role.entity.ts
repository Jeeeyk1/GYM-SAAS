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
import { Role } from './role.entity';

@Entity('identity_roles')
export class IdentityRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'identity_id' })
  identityId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'branch_id', nullable: true, type: 'varchar' })
  branchId: string | null;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'assigned_by', nullable: true, type: 'varchar', length: 255 })
  assignedBy: string | null;

  @ManyToOne(() => Identity)
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
