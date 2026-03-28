import { MemberStatus } from './enums';

export interface MemberResponse {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  status: MemberStatus;
  membershipType: string;
  loyaltyPoints: number;
  joinedAt: string;
  email: string;
  membershipExpiresAt?: string | null;
  membershipStartedAt?: string | null;
}

export interface CreateMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipType: string;
  membershipExpiresAt: string;
  membershipStartedAt?: string;
}

export interface UpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  membershipType?: string;
  status?: MemberStatus;
  membershipExpiresAt?: string;
  membershipStartedAt?: string;
}

export interface MemberQrPayload {
  memberId: string;
  organizationId: string;
  issuedAt: number;
  expiresAt: number;
}