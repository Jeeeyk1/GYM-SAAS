import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../database/entities/branch.entity';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async listBranches(organizationId: string): Promise<Branch[]> {
    return this.branchRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getBranchById(organizationId: string, id: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({ where: { id, organizationId } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async createBranch(organizationId: string, dto: CreateBranchDto): Promise<Branch> {
    await this.subscriptionService.assertLimit(organizationId, 'maxBranches');
    const branch = this.branchRepo.create({
      organizationId,
      name: dto.name,
      address: dto.address ?? null,
    });
    return this.branchRepo.save(branch);
  }

  async updateBranch(organizationId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.getBranchById(organizationId, id);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async deactivateBranch(organizationId: string, id: string): Promise<Branch> {
    const branch = await this.getBranchById(organizationId, id);
    branch.isActive = false;
    return this.branchRepo.save(branch);
  }
}
