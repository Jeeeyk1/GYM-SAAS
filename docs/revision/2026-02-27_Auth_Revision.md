# Auth & Roles Revision — 2026-02-27

## Context

This document captures the analysis of the current auth/roles/user system and proposes architectural revisions before Phase 1.3 begins. The goal is to fix foundational gaps before they become load-bearing problems.

---

## Problems Found in Current State

### 1. JWT roles are always empty
`issueTokens()` always returns `roles: []`. The `identity_roles` table is fully populated (gym_owner/gym_admin/front_desk/member) but is **never queried at login time**. The JWT payload carries no useful role information.

```typescript
// Current (broken):
private issueTokens(sub: string, email: string) {
  return {
    accessToken: this.jwtService.sign({ sub, email, roles: [] }),  // always empty
  };
}
```

### 2. No SUPER_ADMIN concept in the identity system
The platform admin access (`/admin/gyms`) is protected by a raw `x-superadmin-token` header comparison. There is no `SUPER_ADMIN` user in the database. You cannot audit who is doing what, you cannot revoke access gracefully, and you cannot give different people different platform-level access.

### 3. No guard enforcement at all
The RBAC schema (roles, permissions, role_permissions, identity_roles) is complete and seeded, but no `@Roles()` or `@Permissions()` decorator checks are applied anywhere. Any valid JWT can call any protected endpoint regardless of role.

### 4. Single login endpoint for everyone
`POST /auth/login` handles platform admins, gym owners, staff, and gym members the same way. There is no differentiation in the login flow or in what the returned JWT represents. A gym member JWT looks identical to a gym owner JWT.

### 5. Staff & Member are separate domain entities — is this right?
A question raised: should Staff and Member share a single table with a `type` field? Analysis and decision below.

---

## Entity Relationship Summary (Current)

```
Identity (global, one per email)
  ├── has many IdentityRole (identity_id + role_id + client_id)
  ├── has many Member records (one per gym they are a member at)
  ├── has many Staff records (one per gym they are staff at)
  └── has many Invites

Role (per-gym, system roles seeded on gym creation)
  ├── gym_owner
  ├── gym_admin
  ├── front_desk
  └── member
  └── has many Permissions (via role_permissions junction)

IdentityRole (who has what role, at which gym)
  ├── identity_id FK identities
  ├── role_id FK roles
  └── client_id FK clients  — same identity can be gym_owner at GymA and member at GymB
```

### What is currently working
- JWT access + refresh token flow (login, refresh, logout)
- Invite flow (create invite → accept invite → set password)
- Gym creation transaction (client + profile + features + roles + owner staff + invite)
- TenantContextMiddleware resolves `client_id` from `x-gym-slug` header
- RBAC schema fully seeded per gym (roles + permissions tables populated)

### What is broken or missing

| Gap | Severity |
|-----|----------|
| JWT roles always `[]` | High |
| No SUPER_ADMIN user identity | High |
| No guard enforcement on any endpoint | High |
| No login separation between account types | Medium |
| `x-superadmin-token` raw string comparison | Medium |

---

## Decision: Staff vs Member — Keep Separate

**Keep Staff and Member as separate tables.** Rationale:

| | Member | Staff |
|--|--------|-------|
| `identity_id` | Nullable (walk-in members may have no login) | Required (staff must have auth) |
| Key fields | member_number, loyalty_points, membership_type, joined_at | title |
| Privacy settings | Yes (MemberPrivacySettings child record) | No |
| RBAC role | member | gym_owner / gym_admin / front_desk |
| Unique constraint | (client_id, member_number) | (client_id, identity_id) |

Unifying them creates a wide table with lots of nullable columns that serve only one type. The domain concepts are genuinely different.

**Note**: The current schema already supports one identity being both a Member and a Staff at the same gym (e.g., a gym owner who also trains there). This is intentional and should stay.

---

## Proposed Architecture Revision

### A. Add `account_type` to identities

Add a new column to the `identities` table:

```sql
-- New migration: 007_add_account_type_to_identities.sql
ALTER TABLE identities
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(30) NOT NULL DEFAULT 'gym_user'
    CHECK (account_type IN ('platform_admin', 'gym_user')),
  ADD COLUMN IF NOT EXISTS platform_role VARCHAR(30)
    CHECK (platform_role IN ('super_admin', 'platform_support'));
-- platform_role is NULL for all gym_user accounts
```

Two account types:
- `platform_admin` — logs in via `/auth/admin/login`, has a `platform_role` embedded in JWT
- `gym_user` — all gym staff and members, logs in via `/auth/login`

---

### B. New JWT Payload Shape

```typescript
// For platform_admin accounts
interface PlatformAdminJwtPayload {
  sub: string;                                      // identity.id
  email: string;
  accountType: 'platform_admin';
  platformRole: 'super_admin' | 'platform_support';
  type: 'access';
}

// For gym_user accounts (staff + members)
interface GymUserJwtPayload {
  sub: string;            // identity.id
  email: string;
  accountType: 'gym_user';
  type: 'access';
  // Gym-level roles are NOT embedded in the JWT.
  // They are resolved per-request by GymRoleGuard using tenantContext.
  // Reason: one identity can have different roles at different gyms.
  // Embedding all roles would pollute the token; re-issuing per gym is impractical.
}
```

---

### C. Two Login Endpoints

```
POST /auth/login          → gym users only (staff + members)
POST /auth/admin/login    → platform admins only
```

- `/auth/login` validates `account_type = 'gym_user'` and rejects platform admins with a generic "invalid credentials" error (do not reveal which endpoint to use).
- `/auth/admin/login` validates `account_type = 'platform_admin'` and returns a JWT with `platformRole` embedded.

---

### D. Guard Stack

```typescript
// 1. Already exists — validates access token, sets req.user
@UseGuards(JwtAuthGuard)

// 2. New — for /admin/** platform endpoints
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
@PlatformRole('super_admin')

// 3. New — for gym endpoints requiring a specific staff role
@UseGuards(JwtAuthGuard, GymRoleGuard)
@GymRoles('gym_owner', 'gym_admin')

// 4. Future — granular permission check (phase after roles work)
@UseGuards(JwtAuthGuard, GymRoleGuard, PermissionsGuard)
@RequirePermission('members:write')
```

**GymRoleGuard logic:**
1. Extract `identityId` from `req.user.sub`
2. Extract `clientId` from `req.tenantContext.clientId` (400 if missing)
3. Query `identity_roles` JOIN `roles` WHERE `identity_id = ? AND client_id = ?`
4. Check if any returned role name is in the `@GymRoles()` list
5. Throw `403 Forbidden` if none match

Member-level access (viewing own profile, etc.) does not need `GymRoleGuard`. A valid JWT + an active member record at the gym is sufficient — add the guard only for staff operations.

---

### E. Platform SUPER_ADMIN Seeding

Replace the `x-superadmin-token` flow entirely:

```bash
# New seed command
pnpm seed:admin
# Reads PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD from .env
# Creates identity with account_type='platform_admin', platform_role='super_admin'
# Idempotent: skips if a platform_admin already exists
```

**New gym creation flow:**
```
POST /admin/gyms
Authorization: Bearer <platform_admin_jwt>   ← instead of x-superadmin-token header
Guard: JwtAuthGuard + PlatformRoleGuard('super_admin')
```

---

## Summary of All Changes Required

### Migration `007_add_account_type_to_identities.sql`
- `account_type VARCHAR(30) NOT NULL DEFAULT 'gym_user'` with CHECK constraint
- `platform_role VARCHAR(30) NULLABLE` with CHECK constraint
- Idempotent (IF NOT EXISTS / DO $$ blocks)

### Auth module
- `issueTokens()` accepts `accountType` and `platformRole`, builds correct payload
- New `POST /auth/admin/login` endpoint
- `POST /auth/login` rejects `platform_admin` accounts
- Add `GymUserJwtPayload` + `PlatformAdminJwtPayload` to `libs/shared-types/auth.types.ts`

### New guards (new files in `apps/api/src/common/guards/`)
- `platform-role.guard.ts` + `@PlatformRole()` decorator
- `gym-role.guard.ts` + `@GymRoles()` decorator

### Admin module
- Replace `SuperadminGuard` + `x-superadmin-token` with `JwtAuthGuard + PlatformRoleGuard('super_admin')`

### Seed
- New `seed:admin` npm script + implementation file
- Reads from `.env`: `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`

### Shared types (`libs/shared-types`)
- Add `AccountType`, `PlatformRole` enums to `enums.ts`
- Populate `auth.types.ts` (currently empty): `AuthLoginRequest`, `AuthLoginResponse`, `GymUserJwtPayload`, `PlatformAdminJwtPayload`

---

## Implementation Order

```
1.  Migration 007 — account_type + platform_role columns on identities
2.  Enums in shared-types — AccountType, PlatformRole
3.  Auth types in shared-types — JWT payload interfaces, request/response DTOs
4.  Update issueTokens() — build correct JWT payload per account type
5.  New POST /auth/admin/login endpoint
6.  Update POST /auth/login — reject platform_admin accounts
7.  PlatformRoleGuard + @PlatformRole() decorator
8.  Update /admin/** to use JwtAuthGuard + PlatformRoleGuard (drop SuperadminGuard)
9.  GymRoleGuard + @GymRoles() decorator
10. Apply @GymRoles() to existing endpoints in users module (POST /staff, PATCH /members/:id, etc.)
11. seed:admin command
12. Remove SuperadminGuard (dead code cleanup)
```

---

## What This Does NOT Change

- Staff and Member tables stay separate
- Invite flow is unchanged — staff and members still onboard via invite
- TenantContextMiddleware is unchanged
- Refresh token cookie flow is unchanged
- The IdentityRole / Role / Permission schema is unchanged — GymRoleGuard queries it as-is
- The `member_self_registration` feature flag flow is unchanged

---

## Open Questions (Decide Before Implementing)

1. **Should `/auth/login` reject platform_admin with a generic error or a clear message?**
   Recommendation: Generic "invalid credentials" — do not reveal which endpoint to use.

2. **Should `GymRoleGuard` throw 400 or 403 when there is no tenant context (no x-gym-slug header)?**
   Recommendation: `400 Bad Request` with "gym context required".

3. **Member role enforcement: guard or just valid JWT + active member record?**
   Recommendation: Valid JWT + active member record is sufficient for member-level access. Only staff operations need `@GymRoles()`.

4. **Do we need `platform_support` role now?**
   Recommendation: Include it in the CHECK constraint now, but only seed `super_admin`.
