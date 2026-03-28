import { SubscriptionPlan } from './enums';
import { OrganizationResponse } from './organization.types';
import { StaffResponse } from './staff.types';

export interface CreateGymRequest {
  slug: string;
  name: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  plan?: SubscriptionPlan;
  isDemo?: boolean;
}

export interface CreateGymResponse {
  organization: OrganizationResponse;
  ownerStaff: StaffResponse;
  inviteToken: string;
}

export interface GymContextResponse {
  currentOrg: OrganizationResponse;
  roles: string[];
  permissions: string[];
  resolvedFeatures: Record<string, { isEnabled: boolean; config: Record<string, unknown> }>;
}
