import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { FeatureDefinition } from './feature-definition.entity';

@Entity('client_features')
export class ClientFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'feature_id' })
  featureId: string;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  @Column({ name: 'enabled_at', type: 'timestamptz', nullable: true })
  enabledAt: Date | null;

  @ManyToOne(() => Client, (c) => c.clientFeatures)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => FeatureDefinition)
  @JoinColumn({ name: 'feature_id' })
  featureDefinition: FeatureDefinition;
}
