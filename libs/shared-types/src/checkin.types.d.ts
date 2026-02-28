import { CheckInMethod } from './enums';
export interface CheckInResponse {
    id: string;
    memberId: string;
    memberName: string;
    checkedInAt: string;
    method: CheckInMethod;
    station?: string;
    outcomes: CheckInOutcome[];
}
export interface CheckInOutcome {
    feature: string;
    type: 'loyalty_points' | 'welcome_message' | 'active_board' | string;
    data: Record<string, unknown>;
}
export interface CheckInRequest {
    qrToken?: string;
    memberId?: string;
    method: CheckInMethod;
    station?: string;
}
