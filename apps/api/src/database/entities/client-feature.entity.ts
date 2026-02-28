import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';


@Entity('client_profiles')
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ nullable: true, type: 'text' })
  address: string | null;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  phone: string | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  email: string | null;

  @Column({ default: 'UTC+8', length: 100 })
  timezone: string;

  @Column({ name: 'logo_url', nullable: true, type: 'text' })
  logoUrl: string | null;

  @Column({ name: 'brand_color', nullable: true, type: 'varchar', length: 7 })
  brandColor: string | null;

  @Column({ name: 'operating_hours', type: 'jsonb', default: '{}' })
  operatingHours: Record<string, { open: string; close: string }>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Client, (client) => client.profile)
  @JoinColumn({ name: 'client_id' })
  client: Client;
}


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

  @Column({ name: 'available_plans', type: 'text', array: true, default: ['starter','growth','enterprise'] })
  availablePlans: string[];

  @Column({ name: 'is_beta', default: false })
  isBeta: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}


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

  @Column({ name: 'updated_by', nullable: true , type: 'varchar', length: 255 })
  updatedBy: string | null;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => FeatureDefinition)
  @JoinColumn({ name: 'feature_id' })
  featureDefinition: FeatureDefinition;
}