import { getApiClient } from './api-client'
import { User } from './auth-store'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  user: User
}

interface GymData {
  id: string
  name: string
  slug: string
  email: string
  city: string
  state: string
  memberCount: number
  staffCount: number
  createdAt: string
  status: 'active' | 'inactive'
}

interface MemberData {
  id: string
  name: string
  email: string
  phone: string
  membershipType: string
  joinDate: string
  lastCheckIn?: string
  status: 'active' | 'inactive'
}

interface StaffData {
  id: string
  name: string
  email: string
  role: 'manager' | 'trainer' | 'staff'
  phone: string
  joinDate: string
  status: 'active' | 'inactive'
}

export const apiService = {
  // Auth endpoints
  async loginAsGym(data: LoginRequest): Promise<LoginResponse> {
    const response = await getApiClient().post('/auth/login', data)
    return response.data
  },

  async loginAsAdmin(data: LoginRequest): Promise<LoginResponse> {
    const response = await getApiClient().post('/auth/admin/login', data, { withCredentials: true })
    return response.data
  },

  async activateAccount(token: string, password: string) {
    const response = await getApiClient().post('/auth/accept-invite', {
      token,
      password,
    })
    return response.data
  },

  // Gym endpoints (admin-scoped)
  async getGyms(): Promise<GymData[]> {
    const response = await getApiClient().get('/admin/gyms')
    return response.data
  },

  async getGym(slug: string): Promise<GymData> {
    const response = await getApiClient().get(`/clients/${slug}`)
    return response.data
  },

  async createGym(data: Partial<GymData>): Promise<GymData> {
    const response = await getApiClient().post('/admin/gyms', data)
    return response.data
  },

  async updateGym(clientId: string, data: Partial<GymData>): Promise<GymData> {
    const response = await getApiClient().patch(`/clients/${clientId}/profile`, data)
    return response.data
  },

  // Member endpoints (gym-scoped — x-gym-slug header set by api-client interceptor)
  async getMembers(): Promise<MemberData[]> {
    const response = await getApiClient().get('/members')
    return response.data
  },

  async getMember(id: string): Promise<MemberData> {
    const response = await getApiClient().get(`/members/${id}`)
    return response.data
  },

  async createMember(data: Partial<MemberData>): Promise<MemberData> {
    const response = await getApiClient().post('/members', data)
    return response.data
  },

  async updateMember(id: string, data: Partial<MemberData>): Promise<MemberData> {
    const response = await getApiClient().patch(`/members/${id}`, data)
    return response.data
  },

  // Staff endpoints (gym-scoped — x-gym-slug header set by api-client interceptor)
  async getStaff(): Promise<StaffData[]> {
    const response = await getApiClient().get('/staff')
    return response.data
  },

  async getStaffMember(id: string): Promise<StaffData> {
    const response = await getApiClient().get(`/staff/${id}`)
    return response.data
  },

  async createStaff(data: Partial<StaffData>): Promise<StaffData> {
    const response = await getApiClient().post('/staff', data)
    return response.data
  },

  async updateStaff(id: string, data: Partial<StaffData>): Promise<StaffData> {
    const response = await getApiClient().patch(`/staff/${id}`, data)
    return response.data
  },

  async deleteStaff(id: string): Promise<void> {
    await getApiClient().delete(`/staff/${id}`)
  },

  // Check-in endpoints (gym-scoped — x-gym-slug header set by api-client interceptor)
  async createCheckIn(memberId: string) {
    const response = await getApiClient().post('/checkins', { memberId, method: 'manual' })
    return response.data
  },

  async getCheckIns(memberId?: string) {
    const response = await getApiClient().get('/checkins', {
      params: { memberId },
    })
    return response.data
  },
}
