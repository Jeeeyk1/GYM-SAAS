import { ClientStatus, ClientPlan } from './enums';

export interface ClientResponse {
  id: string;
  slug: string;
  name: string;
  status: ClientStatus;
  plan: ClientPlan;
  isDemo: boolean;
  profile?: ClientProfileResponse;
}

export interface ClientProfileResponse {
  timezone: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  brandColor?: string;
  address?: Record<string, string>;
  operatingHours?: OperatingHours;
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}