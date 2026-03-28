# GymSaaS — Core System Reference
Source of truth for architecture, conventions, and cross-app rules.

---

## 1. Overview

GymSaaS is a multi-tenant SaaS platform for gym management.
Each **Organization** represents a tenant gym brand.
An organization may have multiple **Branches** (physical locations).

**Business Model:**
- Gyms subscribe to a plan: `basic`, `advanced`, or `enterprise`.
- Plans set limits (member count, branch count, AI token budget).
- The platform owner (`gym_admin`) provisions organizations manually — they create the org, set the plan, and the invite email fires automatically. No self-signup for gym owners.

**Stack**

| Layer | Technology |
|---|---|
| API | NestJS 10 |
| Database | PostgreSQL 16 (TypeORM query builder only) |
| Migrations | node-pg-migrate |
| Web app | Next.js 14 App Router + Tailwind CSS |
| Mobile app | Expo React Native |
| Monorepo | Nx + pnpm workspaces |
| Auth | JWT access (15 min) + refresh (7 days httpOnly cookie) |
| Scheduling | @nestjs/schedule (cron jobs) |

---

## 2. Monorepo Layout

```
monorepo/
├── apps/
│   ├── api/       # NestJS REST API (port 3000)
│   ├── web/       # Next.js dashboard (port 3001)
│   └── mobile/    # Expo mobile app
├── libs/
│   ├── shared-types/   # DTOs, response shapes — single source of truth
│   ├── shared-utils/   # Pure utilities (deepMerge, date utils, etc.)
│   └── shared-config/  # Feature keys, PLAN_LIMITS, permission constants
├── docs/
│   ├── architecture/   # ERDs, diagrams, ADRs
│   ├── progress/       # Session progress notes (YYYY-MM-DD_Progress.md)
│   └── revision/       # Migration/changelog notes (one per major refactor)
└── pnpm-workspace.yaml
```

---

## 3. Domain Model

### Core Multi-Tenant Entities

| Table | Purpose |
|---|---|
| `organizations` | Tenant entity (gym brand). |
| `organization_profiles` | Branding, contact info, logo, timezone. |
| `branches` | Physical gyms under an organization. |
| `subscriptions` | Plan type, limits, expiry, renewal. |

### Identity & Access

| Table | Purpose |
|---|---|
| `identities` | Auth credentials. `platform_role` column = `gym_admin` or `null`. |
| `identity_roles` | Links identity → role → org → branch. `branch_id NULL` = org-wide scope. |
| `roles` | Gym-level roles: `org_owner`, `gym_owner`, `staff`, `member`. |
| `invites` | Invite token flow for onboarding owners, staff, and members. |

> Platform admins (`gym_admin`) are identified via `identity.platform_role` — they do **not** have a row in `identity_roles`.

### Members & Staff

| Table | Purpose |
|---|---|
| `members` | Gym members (`organization_id` + optional `branch_id` as home branch). |
| `staff` | Staff profiles tied to identities; scoped per branch. |
| `member_privacy_settings` | Controls leaderboard / activity visibility. |

### Operations

| Table | Purpose |
|---|---|
| `check_ins` | Check-in/out events; `method` = manual / qr_self / qr_staff. `branch_id` recorded. |
| `announcements` | Org/branch-wide messages shown to members and staff. |
| `audit_logs` | Append-only system events. |

### Feature System

| Table | Purpose |
|---|---|
| `feature_definitions` | Platform catalog of all features. |
| `client_features` | Per-org on/off toggle. |
| `client_feature_overrides` | Custom config deep-merged over defaults. |

---

## 4. Role Hierarchy

### Platform Level
Stored in `identity.platform_role` — NOT in `identity_roles`.

| Value | Who | Access |
|---|---|---|
| `gym_admin` | Platform owner + support team | Full access to `/admin/*`, all orgs |
| `null` | Everyone else | No platform access |

### Gym Level
Stored in `identity_roles` with `organization_id` + `branch_id`.

| Role | `branch_id` in identity_roles | What they can do |
|---|---|---|
| `org_owner` | `NULL` (org-wide) | See and manage ALL branches. Created automatically when platform admin provisions a gym. |
| `gym_owner` | specific branch UUID | See and manage their assigned branch only. |
| `staff` | specific branch UUID | Operational access at their branch: check-ins, members, announcements. |
| `member` | `NULL` (org-wide) | Check in at any branch, view announcements, AI chat, community chat. |

**Key rule:** `branch_id = NULL` means org-wide scope. `branch_id = <uuid>` means branch-scoped. Both `gym_owner` and `staff` must always have a branch assigned. `org_owner` and `member` never have a branch in their role row.

---

## 5. API Request Headers

| Header | Required by | Purpose |
|---|---|---|
| `Authorization: Bearer <token>` | All protected endpoints | JWT access token |
| `x-org-slug` | All gym-scoped endpoints | Identifies the organization (tenant) |
| `x-branch-id` | Branch-scoped roles (`gym_owner`, `staff`) | Identifies the active branch |

**Branch scoping rules:**
- `org_owner` — omits `x-branch-id`. API returns org-wide data.
- `gym_owner` / `staff` — MUST send `x-branch-id`. Guard rejects requests without it.
- `member` — omits `x-branch-id`. Members are org-wide.
- `gym_admin` (platform) — omits both; accesses all orgs via `/admin/*`.

**Never** accept `organization_id` or `branch_id` from request body — always from resolved context.

---

## 6. Subscription Plans & Limits

Plan names: `basic` | `advanced` | `enterprise`

Limits are defined in **`libs/shared-config/src/plan.limits.ts`** — a single constant to update when numbers change.

```typescript
// libs/shared-config/src/plan.limits.ts
export const PLAN_LIMITS = {
  basic:      { maxMembers: 100,  maxBranches: 1,  aiTokenLimit: 0       },
  advanced:   { maxMembers: 500,  maxBranches: 3,  aiTokenLimit: 100_000 },
  enterprise: { maxMembers: -1,   maxBranches: -1, aiTokenLimit: 1_000_000 },
} as const;
// -1 = unlimited
```

Enforcement happens at service layer via `SubscriptionService.assertLimit(orgId, limitKey)`.

**Feature config formula:**
```typescript
effectiveConfig = deepMerge(featureDefinition.defaultConfig, orgOverride.config)
```

`FeatureResolverService` caches resolved feature states per org for 60 seconds.
Call `featureResolver.invalidate(orgId)` after any feature or override update.

---

## 7. API Module Structure

| Module | Scope | Purpose |
|---|---|---|
| `auth` | Global | Login, refresh, accept-invite, logout, self-register |
| `admin` | Platform | Provision orgs, assign plans, list orgs |
| `organizations` | Tenant | Org profile CRUD |
| `branches` | Tenant | Branch CRUD + settings |
| `staff` | Tenant | Invite/manage staff (branch-scoped) |
| `members` | Tenant | Member CRUD, privacy settings |
| `checkins` | Tenant | Check-in/out, QR, behavior pipeline |
| `features` | Tenant | Toggle and configure per-org feature flags |
| `announcements` | Tenant | Post/read announcements (planned) |
| `chat` | Tenant | Community messaging (planned) |

**Controller pattern:**
```
Controller → Service → Repository (QueryBuilder)
```
- Controllers: HTTP only, no business logic.
- Services: all business logic with explicit return types.
- DTOs: `class-validator` decorators, one file per operation.

---

## 8. Check-in System

Three methods:

| Method | Who | Body | Resolution |
|---|---|---|---|
| `manual` | Staff | `memberId` | Direct lookup, verify org + branch |
| `qr_staff_scan` | Staff (scan member QR) | `qrToken` | Validate JWT, extract `memberId + orgId` |
| `qr_self_scan` | Member (scan gym QR) | none | JWT `sub` → `identityId → member` lookup |

**QR codes and branches:**
- Gym QR (posted at branch): payload includes `{ type: "gym_checkin", orgSlug, branchId }`. Check-in is attributed to that branch automatically.
- Member personal QR: generated per-member. If org has multiple branches, member selects branch in the mobile app before generating.
- QR tokens valid 30 days.

**Behavior pipeline** (runs after every check-in):
- `BaseAttendanceBehavior` — always
- `LoyaltyPointsBehavior` — if feature `checkin.loyalty_points` enabled
- `WelcomeMessageBehavior` — if feature `checkin.welcome_message` enabled

Outcomes stored in `check_ins.metadata`.

---

## 9. Security Rules

- Passwords: bcrypt, never returned in any response.
- Access tokens: 15 min. Refresh tokens: 7 days, httpOnly cookie.
- Never log or return `password_hash`.
- Never expose internal UUIDs in error messages.
- Never take `organization_id` or `branch_id` from request body.
- No raw SQL in services or guards — TypeORM query builder only.
- No `synchronize: true` in TypeORM config.
- No multiple `@Entity()` per file.
- JWT refresh tokens stored in httpOnly cookie only (not localStorage, not AsyncStorage).

---

## 10. Coding Standards

- Services: explicit return types on all methods.
- No `any` unless absolutely unavoidable.
- Use types from `@gym-saas/shared-types` — never redefine in apps.
- Entities: one `@Entity()` class per file, named `<table-name-singular>.entity.ts`.
- New API response shape → define in `shared-types` FIRST.
- New plan limits → update `shared-config/src/plan.limits.ts` ONLY. Never hardcode numbers.

---

## 11. Testing Standards

| Type | Goal | Framework |
|---|---|---|
| Unit | Mocked repos, cover business logic | Jest + @nestjs/testing |
| Integration | TestingModule, real services, fake DB | Jest |

Coverage targets: ≥70% lines, ≥80% branches.

Priority (security-critical first):
1. `GymRoleGuard` — 100% branch coverage
2. `AuthService`
3. `CheckInsService`
4. `MembersService`
5. `FeatureResolverService`

---

## 12. Documentation Rules

| Change | Where |
|---|---|
| New endpoint | `docs/services/<module>.md` |
| Schema migration | `docs/revision/<date>_<topic>.md` |
| Architecture decision | `docs/architecture/ADR/*.md` |
| Session progress / phase plan | `docs/progress/YYYY-MM-DD_Progress.md` |

---

## 13. Development Commands

```bash
pnpm docker:up        # Start Postgres + Redis
pnpm migrate:up       # Run pending migrations (run twice to verify idempotency)
pnpm seed             # Insert feature definitions + system roles
pnpm seed:admin       # Create platform admin account (once)
pnpm api              # Run API dev server (port 3000)
pnpm web              # Run web dashboard (port 3001)
pnpm mobile           # Run Expo
pnpm test --coverage  # Run tests with coverage
```

---

## 14. Never Do

- Modify already-applied migration files — create new ones.
- Use `TypeORM synchronize: true`.
- Take `organization_id` or `branch_id` from request body.
- Put business logic in guards or controllers.
- Expose `password_hash` or internal UUIDs in any response.
- Re-define types that exist in `shared-types`.
- Store tokens in localStorage or AsyncStorage.
- Add public self-registration (all accounts come from invites).
- Import circularly between domain modules.
- Hardcode plan limit numbers — always use `PLAN_LIMITS` from `shared-config`.

---

## 15. Refactor Tracker

| Refactor | Status | Notes |
|---|---|---|
| Entity-per-file | ✅ Done | |
| Org/branch schema (migrations 010-012) | ✅ Written, pending apply | Apply before any code refactor |
| Plan names basic/advanced/enterprise | 🔲 Migration needed (013) | Current code still has starter/growth |
| Role rename: front_desk → staff | 🔲 Migration needed (014) | Seed script update too |
| identity_roles: add branch_id column | 🔲 Migration needed (015) | Enables branch-scoped roles |
| platform_role: super_admin → gym_admin | 🔲 Migration needed (016) | CHECK constraint update on identities |
| Entity files: clientId → organizationId | 🔲 Phase 3.1 | 10 entity files |
| Services/guards: clientId → organizationId | 🔲 Phase 3.2 | ~115 references in 18 files |
| clients module → organizations module | 🔲 Phase 3.3 | Rename + new endpoints |
| TenantContextMiddleware: x-org-slug + x-branch-id | 🔲 Phase 3.4 | |
| GymRoleGuard: branch-aware logic | 🔲 Phase 3.5 | New role hierarchy |
| Branches module | 🔲 Phase 3.6 | CRUD + branch context |
| Subscription enforcement | 🔲 Phase 3.7 | maxMembers, maxBranches via PLAN_LIMITS |
| PLAN_LIMITS config constant | 🔲 Phase 3.0 | Do first, before any enforcement |
| Announcements module | 🔲 Phase 4.1 | DB table exists |
| Community chat module | 🔲 Phase 4.2 | DB tables exist |
| AI fitness chat | 🔲 Phase 4.3 | New DB tables needed |
| Member goals | 🔲 Phase 4.4 | New DB tables needed |
| Web dashboard (Next.js) | 🔲 Phase 5 | After API stable |
| Mobile app (Expo) | 🔲 Phase 6 | After web stable |

---

*This file is authoritative. Long-form explanations belong in `/docs/revision/` or `/docs/architecture/`. Session progress belongs in `/docs/progress/`.*
