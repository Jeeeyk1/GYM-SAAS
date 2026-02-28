import { StaffStatus } from './enums';

export interface StaffResponse {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  status: StaffStatus;
  email: string | null;
  roles: string[];
  createdAt: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  role: 'gym_owner' | 'gym_admin' | 'front_desk';
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  title?: string;
  status?: StaffStatus;
}
