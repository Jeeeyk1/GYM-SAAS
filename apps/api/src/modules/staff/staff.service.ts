import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../database/entities/staff.entity';
import { Identity } from '../../database/entities/identity.entity';
import { Organization } from '../../database/entities/organization.entity';
import { IdentityRole } from '../../database/entities/identity-role.entity';
import { Role } from '../../database/entities/role.entity';
import { InviteService } from '../auth/invite.service';
import { EmailService } from '../email/email.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Identity)
    private readonly identityRepo: Repository<Identity>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(IdentityRole)
    private readonly identityRoleRepo: Repository<IdentityRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly inviteService: InviteService,
    private readonly emailService: EmailService,
  ) {}

  async createStaff(
    organizationId: string,
    dto: CreateStaffDto,
    invitedByIdentityId: string,
  ): Promise<{ staff: Staff; inviteToken: string }> {
    let identity = await this.identityRepo.findOne({ where: { email: dto.email } });
    if (!identity) {
      identity = await this.identityRepo.save(
        this.identityRepo.create({ email: dto.email, provider: 'local', isVerified: false }),
      );
    }

    const existing = await this.staffRepo.findOne({ where: { identityId: identity.id, organizationId } });
    if (existing) throw new ConflictException('Staff member already exists for this gym');

    const role = await this.roleRepo.findOne({ where: { name: dto.role, organizationId } });
    if (!role) throw new NotFoundException(`Role "${dto.role}" not found for this gym`);

    const staff = await this.staffRepo.save(
      this.staffRepo.create({
        organizationId,
        identityId: identity.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title ?? null,
        status: 'invited',
      }),
    );

    await this.identityRoleRepo.save(
      this.identityRoleRepo.create({
        identityId: identity.id,
        roleId: role.id,
        organizationId,
        branchId: dto.branchId ?? null,
        assignedBy: null,
      }),
    );

    const invite = await this.inviteService.create({
      organizationId,
      identityId: identity.id,
      role: dto.role,
      type: 'staff',
      invitedBy: invitedByIdentityId,
    });

    const org = await this.orgRepo.findOne({ where: { id: organizationId }, select: ['id', 'name'] });
    const gymName = org?.name ?? 'the gym';

    try {
      await this.emailService.sendStaffInvitation({
        to: dto.email,
        staffName: dto.firstName,
        gymName,
        role: dto.role,
        inviteToken: invite.token,
      });
    } catch (err) {
      this.logger.error(`Failed to send staff invitation email to ${dto.email}`, err);
    }

    return { staff, inviteToken: invite.token };
  }

  async listStaff(organizationId: string): Promise<Staff[]> {
    return this.staffRepo
      .createQueryBuilder('s')
      .where('s.organizationId = :organizationId', { organizationId })
      .orderBy('s.createdAt', 'DESC')
      .getMany();
  }

  async getStaffById(organizationId: string, staffId: string): Promise<Staff> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId, organizationId } });
    if (!staff) throw new NotFoundException('Staff member not found');
    return staff;
  }

  async updateStaff(organizationId: string, staffId: string, dto: UpdateStaffDto): Promise<Staff> {
    const staff = await this.getStaffById(organizationId, staffId);
    Object.assign(staff, dto);
    return this.staffRepo.save(staff);
  }

  async deactivateStaff(organizationId: string, staffId: string): Promise<Staff> {
    const staff = await this.getStaffById(organizationId, staffId);
    staff.status = 'inactive';
    return this.staffRepo.save(staff);
  }
}
