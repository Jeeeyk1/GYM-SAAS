import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { FeatureDefinition } from '../../database/entities/feature-definition.entity';
import { ClientFeatureOverride } from '../../database/entities/client-feature-override.entity';
import { FeatureResolverService } from '../checkins/feature-resolver.service';
import { deepMerge } from '@gym-saas/shared-utils';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeatureResponse } from '@gym-saas/shared-types';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeatureDefinition)
    private readonly featureDefRepo: Repository<FeatureDefinition>,
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureOverride)
    private readonly overrideRepo: Repository<ClientFeatureOverride>,
    private readonly featureResolver: FeatureResolverService,
  ) {}

  async listFeatures(clientId: string): Promise<FeatureResponse[]> {
    const clientFeatures = await this.clientFeatureRepo.find({
      where: { clientId },
      relations: ['featureDefinition'],
    });

    const overrides = await this.overrideRepo.find({ where: { clientId } });
    const overrideByFeatureId = new Map(overrides.map((o) => [o.featureId, o.config]));

    return clientFeatures.map((cf) => {
      const def = cf.featureDefinition;
      const overrideConfig = overrideByFeatureId.get(cf.featureId) ?? {};
      return {
        key: def.key,
        displayName: def.displayName,
        description: def.description,
        category: def.category,
        isEnabled: cf.isEnabled,
        config: deepMerge(def.defaultConfig, overrideConfig),
      };
    });
  }

  async updateFeature(
    clientId: string,
    key: string,
    dto: UpdateFeatureDto,
  ): Promise<FeatureResponse> {
    if (dto.isEnabled === undefined && dto.config === undefined) {
      throw new BadRequestException('At least one of isEnabled or config must be provided');
    }

    const def = await this.featureDefRepo.findOne({ where: { key } });
    if (!def) throw new NotFoundException(`Feature '${key}' not found`);

    const cf = await this.clientFeatureRepo.findOne({
      where: { clientId, featureId: def.id },
    });
    if (!cf) throw new NotFoundException(`Feature '${key}' is not configured for this gym`);

    if (dto.isEnabled !== undefined) {
      await this.clientFeatureRepo.update(
        { id: cf.id },
        { isEnabled: dto.isEnabled, enabledAt: dto.isEnabled ? new Date() : null },
      );
      cf.isEnabled = dto.isEnabled;
    }

    let overrideConfig: Record<string, unknown>;

    if (dto.config !== undefined) {
      let override = await this.overrideRepo.findOne({
        where: { clientId, featureId: def.id },
      });
      if (override) {
        override.config = dto.config;
        await this.overrideRepo.save(override);
      } else {
        await this.overrideRepo.save(
          this.overrideRepo.create({
            clientId,
            featureId: def.id,
            config: dto.config,
            updatedBy: null,
          }),
        );
      }
      overrideConfig = dto.config;
    } else {
      const existing = await this.overrideRepo.findOne({
        where: { clientId, featureId: def.id },
      });
      overrideConfig = existing?.config ?? {};
    }

    this.featureResolver.invalidate(clientId);

    return {
      key: def.key,
      displayName: def.displayName,
      description: def.description,
      category: def.category,
      isEnabled: cf.isEnabled,
      config: deepMerge(def.defaultConfig, overrideConfig),
    };
  }
}
