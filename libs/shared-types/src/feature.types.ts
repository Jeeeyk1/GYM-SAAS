export interface FeatureConfig {
  isEnabled: boolean;
  config: Record<string, unknown>;
}

export interface ResolvedFeatures {
  [featureKey: string]: FeatureConfig;
}