import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('feature_definitions')
export class FeatureDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ name: 'display_name', length: 255 })
  displayName: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: true, length: 100, type: 'varchar', default: null })
  category: string | null;

  @Column({ name: 'default_enabled', default: false })
  defaultEnabled: boolean;

  @Column({ name: 'default_config', type: 'jsonb', default: '{}' })
  defaultConfig: Record<string, unknown>;

  @Column({ name: 'available_plans', type: 'text', array: true, default: ['starter', 'growth', 'enterprise'] })
  availablePlans: string[];

  @Column({ name: 'is_beta', default: false })
  isBeta: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
