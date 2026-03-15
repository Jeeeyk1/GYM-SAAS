export enum ClientStatus {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEMO = 'demo',
  CHURNED = 'churned',
}

export enum ClientPlan {
  STARTER = 'starter',
  GROWTH = 'growth',
  ENTERPRISE = 'enterprise',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum CheckInMethod {
  QR = 'qr',
  MANUAL = 'manual',
  KIOSK = 'kiosk',
  APP = 'app',
}

export enum ActorType {
  MEMBER = 'member',
  STAFF = 'staff',
  SYSTEM = 'system',
  SUPERADMIN = 'superadmin',
}

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  INVITED = 'invited',
}

export enum AccountType {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  GYM_USER = 'gym_user',
}

export enum PlatformRole {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_SUPPORT = 'platform_support',
}