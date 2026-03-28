import { Injectable, NestMiddleware, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../database/entities/branch.entity';
import { Organization } from '../../database/entities/organization.entity';

export interface TenantContext {
  organizationId: string;
  orgSlug: string;
  plan: string;
  isDemo: boolean;
  branchId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const slug = this.resolveSlug(req);

    if (!slug) {
      return next();
    }

    const org = await this.orgRepo.findOne({
      where: { slug },
      relations: { subscription: true },
    });

    if (!org) {
      throw new BadRequestException(`Organization '${slug}' not found`);
    }

    if (org.status === 'suspended') {
      throw new ForbiddenException('This organization account is suspended');
    }

    const branchId = await this.resolveBranchId(req, org.id);

    req.tenantContext = {
      organizationId: org.id,
      orgSlug: org.slug,
      plan: org.subscription?.plan ?? 'basic',
      isDemo: org.isDemo,
      branchId,
    };

    next();
  }

  private async resolveBranchId(req: Request, organizationId: string): Promise<string | null> {
    const branchHeader = req.headers['x-branch-id'] as string | undefined;
    if (!branchHeader) return null;

    const branch = await this.branchRepo.findOne({
      where: { id: branchHeader, organizationId, isActive: true },
      select: ['id'],
    });

    if (!branch) {
      throw new BadRequestException('Branch not found or inactive');
    }

    return branch.id;
  }

  private resolveSlug(req: Request): string | null {
    const headerSlug = req.headers['x-org-slug'] as string | undefined;
    if (headerSlug) return headerSlug.toLowerCase().trim();

    const host = req.hostname || '';
    const parts = host.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (!['www', 'api', 'app', 'admin', 'localhost'].includes(subdomain)) {
        return subdomain.toLowerCase();
      }
    }

    return null;
  }
}
