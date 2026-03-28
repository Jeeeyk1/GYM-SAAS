import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { ClientFeatureOverride } from '../../database/entities/client-feature-override.entity';
import { deepMerge } from '@gym-saas/shared-utils';

type FeatureMap = Map<string, { isEnabled: boolean; config: Record<string, unknown> }>;

interface CacheEntry {
  result: FeatureMap;
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000;

@Injectable()
export class FeatureResolverService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureOverride)
    private readonly overrideRepo: Repository<ClientFeatureOverride>,
  ) {}

  async resolve(organizationId: string): Promise<FeatureMap> {
    const cached = this.cache.get(organizationId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.result;
    }

    const features = await this.clientFeatureRepo.find({
      where: { organizationId },
      relations: ['featureDefinition'],
    });

    const overrides = await this.overrideRepo.find({ where: { organizationId } });
    const overrideByFeatureId = new Map(overrides.map((o) => [o.featureId, o.config]));

    const result: FeatureMap = new Map();

    for (const cf of features) {
      const def = cf.featureDefinition;
      const overrideConfig = overrideByFeatureId.get(cf.featureId) ?? {};
      const mergedConfig = deepMerge(def.defaultConfig, overrideConfig);

      result.set(def.key, {
        isEnabled: cf.isEnabled,
        config: mergedConfig,
      });
    }

    this.cache.set(organizationId, { result, cachedAt: Date.now() });
    return result;
  }

  /** Call this after a feature override is updated to force a cache refresh. */
  invalidate(organizationId: string): void {
    this.cache.delete(organizationId);
  }
}
