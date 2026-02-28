import { Injectable, NestMiddleware, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../database/entities/client.entity';

export interface TenantContext {
  clientId: string;
  clientSlug: string;
  plan: string;
  isDemo: boolean;
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
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Resolution priority:
    // 1. x-gym-slug header (used by mobile apps)
    // 2. Subdomain (web: gym-slug.gymsaas.com)
    // 3. Skip — some routes (auth, health) don't need tenant context

    const slug = this.resolveSlug(req);

    if (!slug) {
      // Let it through — route guards will enforce tenant requirement
      return next();
    }

    const client = await this.clientRepo.findOne({
      where: { slug },
      select: ['id', 'slug', 'plan', 'status', 'isDemo'],
    });

    if (!client) {
      throw new BadRequestException(`Gym '${slug}' not found`);
    }

    if (client.status === 'suspended') {
      throw new ForbiddenException('This gym account is suspended');
    }

    if (client.isDemo && client.demoExpiresAt && client.demoExpiresAt < new Date()) {
      throw new ForbiddenException('Demo period has expired');
    }

    req.tenantContext = {
      clientId: client.id,
      clientSlug: client.slug,
      plan: client.plan,
      isDemo: client.isDemo,
    };

    next();
  }

  private resolveSlug(req: Request): string | null {
    const headerSlug = req.headers['x-gym-slug'] as string | undefined;
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