import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientFeature, ClientProfile } from './client-feature.entity';
import { Member } from './member.entity';

export type ClientStatus = 'onboarding' | 'active' | 'suspended' | 'demo' | 'churned';
export type ClientPlan = 'starter' | 'growth' | 'enterprise';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ length: 255 })
  name: string;

  @Column({ default: 'onboarding', length: 50 })
  status: ClientStatus;

  @Column({ default: 'starter', length: 50 })
  plan: ClientPlan;

  @Column({ name: 'is_demo', default: false })
  isDemo: boolean;

  @Column({ name: 'demo_expires_at', type: 'timestamptz', nullable: true })
  demoExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => ClientProfile, (profile) => profile.client)
  profile: ClientProfile;

  @OneToMany(() => ClientFeature, (cf) => cf.client)
  clientFeatures: ClientFeature[];

  @OneToMany(() => Member, (m) => m.client)
  members: Member[];

}