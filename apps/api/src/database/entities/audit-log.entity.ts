import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'organization_id', nullable: true, length: 255, type: 'varchar' })
  organizationId: string | null;

  @Column({ name: 'actor_id', nullable: true, length: 255, type: 'varchar' })
  actorId: string | null;

  @Column({ name: 'actor_type', nullable: true, length: 50, type: 'varchar' })
  actorType: 'member' | 'staff' | 'system' | 'superadmin' | null;

  @Column({ length: 200, type: 'varchar' })
  action: string;

  @Column({ name: 'target_type', nullable: true, length: 100, type: 'varchar' })
  targetType: string | null;

  @Column({ name: 'target_id', nullable: true, length: 255, type: 'varchar' })
  targetId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
