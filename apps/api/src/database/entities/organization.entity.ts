import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { ClientFeature } from './client-feature.entity';
import { OrganizationProfile } from './organization-profile.entity';
import { Subscription } from './subscription.entity';

export type OrgStatus = 'onboarding' | 'active' | 'suspended' | 'demo' | 'churned';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ length: 255 })
  name: string;

  @Column({ default: 'onboarding', length: 50 })
  status: OrgStatus;

  @Column({ name: 'is_demo', default: false })
  isDemo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => OrganizationProfile, (p) => p.organization)
  profile: OrganizationProfile;

  @OneToOne(() => Subscription, (s) => s.organization)
  subscription: Subscription;

  @OneToMany(() => Branch, (b) => b.organization)
  branches: Branch[];

  @OneToMany(() => ClientFeature, (cf) => cf.organization)
  clientFeatures: ClientFeature[];
}
