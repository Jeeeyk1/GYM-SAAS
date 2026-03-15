import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
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
