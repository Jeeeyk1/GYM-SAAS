import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeatureDefinition } from './feature-definition.entity';
import { Organization } from './organization.entity';

@Entity('client_features')
export class ClientFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'feature_id' })
  featureId: string;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  @Column({ name: 'enabled_at', type: 'timestamptz', nullable: true })
  enabledAt: Date | null;

  @ManyToOne(() => Organization, (org) => org.clientFeatures)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => FeatureDefinition)
  @JoinColumn({ name: 'feature_id' })
  featureDefinition: FeatureDefinition;
}
