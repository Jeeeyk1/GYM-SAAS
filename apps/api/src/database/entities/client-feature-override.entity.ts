import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { FeatureDefinition } from './feature-definition.entity';

@Entity('client_feature_overrides')
export class ClientFeatureOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'feature_id' })
  featureId: string;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', nullable: true, type: 'varchar', length: 255 })
  updatedBy: string | null;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => FeatureDefinition)
  @JoinColumn({ name: 'feature_id' })
  featureDefinition: FeatureDefinition;
}
