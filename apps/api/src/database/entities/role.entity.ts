import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Identity } from './member.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id', nullable: true, type: 'varchar' })
  clientId: string | null;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;
}

@Entity('identity_roles')
export class IdentityRole {
  @PrimaryColumn({ name: 'identity_id' })
  identityId: string;

  @PrimaryColumn({ name: 'role_id' })
  roleId: string;

  @PrimaryColumn({ name: 'client_id' })
  clientId: string;

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

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
