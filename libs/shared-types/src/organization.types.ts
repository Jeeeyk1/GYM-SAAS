import { OrgStatus, SubscriptionPlan } from './enums';

// ─── Organization ─────────────────────────────────────────────────────────────

export interface OrganizationResponse {
  id: string;
  slug: string;
  name: string;
  status: OrgStatus;
  isDemo: boolean;
  createdAt: string;
  profile?: OrganizationProfileResponse;
  subscription?: SubscriptionResponse;
}

export interface OrganizationProfileResponse {
  id: string;
  organizationId: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  timezone: string;
  operatingHours: Record<string, { open: string; close: string }>;
}

// ─── Branch ───────────────────────────────────────────────────────────────────

export interface BranchResponse {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchRequest {
  name: string;
  address?: string;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string;
  isActive?: boolean;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface SubscriptionResponse {
  id: string;
  organizationId: string;
  plan: SubscriptionPlan;
  maxMembers: number;
  maxBranches: number;
  aiTokenLimit: number;
  expiresAt: string | null;
  autoRenew: boolean;
  createdAt: string;
}
