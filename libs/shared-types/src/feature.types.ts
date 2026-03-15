export interface FeatureConfig {
  isEnabled: boolean;
  config: Record<string, unknown>;
}

export interface ResolvedFeatures {
  [featureKey: string]: FeatureConfig;
}

export interface FeatureResponse {
  key: string;
  displayName: string;
  description: string | null;
  category: string | null;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

export interface UpdateFeatureRequest {
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}