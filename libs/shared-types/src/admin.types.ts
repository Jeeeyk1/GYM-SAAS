import { ClientPlan, ClientStatus } from './enums';
import { ClientResponse } from './client.types';
import { StaffResponse } from './staff.types';

export interface CreateGymRequest {
  slug: string;
  name: string;
  ownerEmail: string;
  plan?: ClientPlan;
  isDemo?: boolean;
  demoExpiresAt?: string;
}

export interface CreateGymResponse {
  client: ClientResponse;
  ownerStaff: StaffResponse;
  inviteToken: string;
}

export interface GymContextResponse {
  currentGym: ClientResponse;
  roles: string[];
  permissions: string[];
  resolvedFeatures: Record<string, { isEnabled: boolean; config: Record<string, unknown> }>;
}
