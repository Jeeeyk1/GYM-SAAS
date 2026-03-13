# GymSaaS — Technical Implementation Reference

See root `CLAUDE.md` for full product context, business flow, and architecture decisions.
This file covers implementation details, entity reference, and endpoint inventory.

---

## Running the Project

```bash
pnpm docker:up          # Start Postgres + Redis
pnpm migrate:up         # Run pending migrations (run twice to verify idempotency)
pnpm seed               # Seed feature_definitions + roles
pnpm seed:admin         # Insert platform admin account (once only)
pnpm api                # nest start --watch (port 3000)
pnpm web                # next dev (port 3001)
```

---

## API Endpoint Inventory

### Auth — no gym-slug required
```
POST /auth/login                  GYM_USER login (email + password)
POST /auth/admin/login            PLATFORM_ADMIN login (email + password)
POST /auth/accept-invite          Activate account from invite token (sets password)
POST /auth/register/:gymSlug      Self-register as member (feature-gated)
POST /auth/refresh                Refresh JWT using httpOnly cookie
POST /auth/logout                 Clear refresh cookie
```

### Admin — requires JWT + PlatformRoleGuard (super_admin)
```
POST /admin/gyms                  Create gym (transactional: client + profile + features + owner staff + role)
GET  /admin/gyms                  List all gyms
```

### Clients — requires JWT
```
GET   /clients/my-gyms            Gyms where this identity has a role
GET   /clients/:slug              Get gym by slug (public profile)
PATCH /clients/:clientId/profile  Update gym profile (owner only — RBAC pending)
```

### Members — requires JWT + x-gym-slug
```
GET   /members                    List members (gym_owner, gym_admin, front_desk)
POST  /members                    Create member + identity + invite + email (gym_owner, gym_admin)
GET   /members/:id                Get single member (gym_owner, gym_admin, front_desk)
PATCH /members/:id                Update member (gym_owner, gym_admin)
PATCH /members/:id/privacy        Update privacy settings (gym_owner, gym_admin, member — own only)
GET   /me/gym-context             Current user roles + resolved feature configs (any gym user)
```

### Staff — requires JWT + x-gym-slug
```
GET    /staff          List staff (gym_owner, gym_admin)
POST   /staff          Create staff + assign role + send invite email (gym_owner, gym_admin)
GET    /staff/:id      Get single staff member (gym_owner, gym_admin)
PATCH  /staff/:id      Update staff (gym_owner, gym_admin)
DELETE /staff/:id      Deactivate staff — sets status=inactive (gym_owner only)
```

### Check-ins — requires JWT + x-gym-slug
```
POST /checkins                         Check in (gym_owner, gym_admin, front_desk, member)
POST /checkins/:checkInId/checkout     Check out (gym_owner, gym_admin, front_desk)
GET  /checkins                         History (?memberId=&page=&limit=) (gym_owner, gym_admin, front_desk)
GET  /checkins/active-members          Currently checked-in members, feature-gated (gym_owner, gym_admin, front_desk)
GET  /checkins/gym-qr                  Gym QR payload (gym_owner, gym_admin, front_desk)
GET  /members/:memberId/qr             Member personal QR token (gym_owner, gym_admin, front_desk)
```

---

## Entity Quick Reference

| Entity | Table | File |
|--------|-------|------|
| Client | clients | entities/client.entity.ts |
| ClientProfile | client_profiles | entities/client-feature.entity.ts |
| FeatureDefinition | feature_definitions | entities/client-feature.entity.ts |
| ClientFeature | client_features | entities/client-feature.entity.ts |
| ClientFeatureOverride | client_feature_overrides | entities/client-feature.entity.ts |
| Identity | identities | entities/member.entity.ts |
| Member | members | entities/member.entity.ts |
| MemberPrivacySettings | member_privacy_settings | entities/member.privacy.settings.entity.ts |
| Staff | staff | entities/member.entity.ts |
| Invite | invites | entities/invite.entity.ts |
| CheckIn | check_ins | entities/checkin.entity.ts |
| AuditLog | audit_logs | entities/checkin.entity.ts |

---

## Applied Migrations

| File | Description |
|------|-------------|
| 20260222000001_create_clients | clients, client_profiles |
| 20260222000002_create_feature_system | feature_definitions, client_features, client_feature_overrides |
| 20260222000003_create_identity_members | identities, members, member_privacy_settings, staff, roles, identity_roles, permissions, role_permissions |
| 20260222000004_create_operations | check_ins, announcements, audit_logs |
| 20260222000005_create_chat_structure | chat_rooms, chat_room_members, chat_messages |
| 20260222000006_create_invites | invites |
| 20260227000007_add_account_type_to_identities | account_type, platform_role columns on identities |
| 20260228000007_checkin_checkout | checked_out_at, checkout_method on check_ins; qr_token, qr_token_expires_at on members; partial index |

---

## Key Decorators

```typescript
@CurrentTenant()  // extracts TenantContext from req.tenantContext
@CurrentUser()    // extracts JwtPayload from req.user (set by JwtStrategy)
```

`TenantContext` shape:
```typescript
{ clientId: string; clientSlug: string; plan: string; isDemo: boolean }
```

`JwtPayload` shape (from @gym-saas/shared-types — JwtAccessPayload):
```typescript
{ sub: string; email: string; type: 'access'; accountType: AccountType; platformRole: PlatformRole | null }
```

---

## Check-in Method Reference

| Method | Who calls | Body fields | Resolution |
|--------|-----------|-------------|------------|
| `manual` | Staff | `memberId` | Direct lookup, verify clientId matches |
| `qr_staff_scan` | Staff (after scanning member QR) | `qrToken` | Validate 30d JWT, extract memberId + clientId |
| `qr_self_scan` | Member (after scanning gym QR) | none | `identityId → member` lookup via JWT sub |

---

## Feature Resolver Cache

`FeatureResolverService` caches resolved feature maps per clientId for 60 seconds.
Call `featureResolver.invalidate(clientId)` after any feature override update.

---

## Shared Library Notes

- `@gym-saas/shared-types` — `main: ./src/index.js` (compiled), `types: ./src/index.d.ts`
- `@gym-saas/shared-utils` — `main: ./src/index.js` (compiled), `types: ./src/index.d.ts`
- Both are resolved at runtime via `NODE_PATH` set by the NestJS CLI binary
- tsconfig `paths` handles compile-time resolution; both must point to `.js` for runtime

---

## Module Dependency Rules

- `EmailModule` — `@Global()`, no imports, provides `EmailService` to all modules
- `CheckInsModule` imports: `JwtModule`, TypeORM features, no other domain modules
- `MembersModule` imports: `AuthModule` (for InviteService)
- `StaffModule` imports: `AuthModule` (for InviteService)
- `AdminModule` imports: TypeORM features only (EmailService injected via global EmailModule)
- `AuthModule` exports: `JwtModule`, `InviteService`, `PassportModule`
- Circular imports between domain modules are forbidden

---

## Migration Workflow

```bash
# Create new migration (name uses YYYYMMDD format + sequence):
# e.g. 20260305000008_add_something.sql
# Write SQL manually in apps/api/src/database/migrations/

pnpm migrate:up   # apply
pnpm migrate:up   # run again — must be a no-op (idempotency check)
```

database.js config at monorepo root:
- `dir`: `apps/api/src/database/migrations`
- `checkOrder: false` (our naming uses YYYYMMDDNNNNN, not strict timestamps)

---

## RBAC Implementation Status

PlatformRoleGuard — applied to `/admin/*`, checks `identity.platformRole === 'super_admin'`

GymRoleGuard — active on `MembersController`, `CheckInsController`, and `StaffController`.
Resolves roles from `identity_roles` table for the current `tenantContext.clientId` on every request.
Usage pattern:
```typescript
@UseGuards(JwtAuthGuard, GymRoleGuard)
@GymRoles('gym_owner', 'gym_admin')
@Get('members')
list(...) {}
```

System roles per gym (created automatically when a gym is created):
`gym_owner` | `gym_admin` | `front_desk` | `member`

ClientsController — RBAC not yet enforced (Phase 1.5).