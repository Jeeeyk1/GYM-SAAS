import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FeatureDefinition } from './feature-definition.entity';
import { Organization } from './organization.entity';

@Entity('client_feature_overrides')
export class ClientFeatureOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'feature_id' })
  featureId: string;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', nullable: true, type: 'varchar', length: 255 })
  updatedBy: string | null;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => FeatureDefinition)
  @JoinColumn({ name: 'feature_id' })
  featureDefinition: FeatureDefinition;
}
