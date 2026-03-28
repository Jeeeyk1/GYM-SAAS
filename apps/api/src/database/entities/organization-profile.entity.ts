import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('organization_profiles')
export class OrganizationProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ nullable: true, type: 'text' })
  address: string | null;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  phone: string | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  email: string | null;

  @Column({ name: 'logo_url', nullable: true, type: 'text' })
  logoUrl: string | null;

  @Column({ name: 'brand_color', nullable: true, type: 'varchar', length: 7 })
  brandColor: string | null;

  @Column({ default: 'UTC', length: 100 })
  timezone: string;

  @Column({ name: 'operating_hours', type: 'jsonb', default: '{}' })
  operatingHours: Record<string, { open: string; close: string }>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Organization, (org) => org.profile)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
