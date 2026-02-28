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
}
export interface CreateMemberRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    membershipType: string;
}
export interface UpdateMemberRequest {
    firstName?: string;
    lastName?: string;
    membershipType?: string;
    status?: MemberStatus;
}
export interface MemberQrPayload {
    memberId: string;
    clientId: string;
    issuedAt: number;
    expiresAt: number;
}
