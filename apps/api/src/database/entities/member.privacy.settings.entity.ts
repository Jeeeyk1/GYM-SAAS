import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';



@Entity('member_privacy_settings')
export class MemberPrivacySettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'member_id' })
    memberId: string;

    @Column({ name: 'show_in_active_members', default: true })
    showInActiveMembers: boolean;

    @Column({ name: 'show_checkin_history', default: false })
    showCheckinHistory: boolean;

    @Column({ name: 'allow_member_messaging', default: true })
    allowMemberMessaging: boolean;

    @OneToOne(() => Member, (m) => m.privacySettings)
    @JoinColumn({ name: 'member_id' })
    member: Member;
}