# GymSaaS — Project Context

## What This Is

Multi-tenant SaaS platform for gyms. A single platform serves many gyms. Each gym is a **Client** (tenant). All behavior, features, and config are scoped at the client level.

**Business model:** The platform owner (super admin) onboards gyms. Each gym subscribes to a plan and gets access to features based on that plan. Gym owners manage their own staff and members through a web dashboard. Members interact primarily through a mobile app.

---

## Monorepo Structure

```
monorepo/
├── apps/
│   ├── api/          NestJS REST API — port 3000
│   ├── web/          Next.js 14 admin dashboard — port 3001
│   └── mobile/       Expo React Native member app
├── libs/
│   ├── shared-types/ DTOs, interfaces, enums — imported by ALL apps
│   ├── shared-utils/ Pure utility functions (deepMerge, date utils, member number)
│   └── shared-config/ Feature keys, permission constants, API route constants
├── docs/
│   └── progress/     Session progress notes
├── CLAUDE.md         This file — full context
├── .claude/CLAUDE.md Technical implementation reference
├── database.js       node-pg-migrate config
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API framework | NestJS 10 |
| Database | PostgreSQL 16 via TypeORM (query builder only) |
| Migrations | node-pg-migrate — raw SQL files |
| Auth | JWT access token (15m) + refresh token (7d httpOnly cookie) |
| Scheduling | @nestjs/schedule (cron jobs) |
| Web | Next.js 14 App Router + Tailwind CSS |
| Mobile | Expo + React Native (Expo Router) |
| Monorepo | Nx + pnpm workspaces |
| Package manager | pnpm |

---

## Business Flow — Gym Onboarding

This is the intended production flow. The backend invite token mechanism is built; email delivery is the pending piece.

```
1. Platform admin creates a gym via web dashboard
   POST /admin/gyms  { slug, name, ownerEmail, ownerFirstName, ownerLastName, plan }
   → Creates: client + client_profile + feature flags + owner staff record + role
   → Returns: inviteToken (72h expiry)
   → [PENDING] Sends activation email to ownerEmail with link:
     https://app.gymsaas.com/activate?token=<inviteToken>

2. Gym owner opens the activation link
   → Web page at /activate?token=xxx
   → Owner fills in: password (account creation)
   → Calls POST /auth/accept-invite { token, password }
   → Account activated, JWT returned, redirected to gym dashboard
   → Role: GYM_OWNER scoped to that client

3. Gym owner logs in at their gym
   → POST /auth/login { email, password }
   → x-gym-slug header identifies which gym's context to load
   → JWT contains identityId; gym context resolved separately

4. Owner invites staff via web dashboard
   → POST /staff { email, firstName, lastName, role }
   → [PENDING] Email sent to staff with activation link
   → Staff activates, role: FRONT_DESK or GYM_ADMIN scoped to that gym

5. Owner creates members (or members self-register if feature enabled)
   → POST /members { email, firstName, lastName, membershipType }
   → [PENDING] Welcome email sent with activation link
   → Member activates via mobile app or web
```

**Key principle:** No account is created without an invite. All accounts originate from an invite token. There is no public self-registration except via the `member_self_registration` feature flag.

---

## Identity and Role Design

### Identity vs Member vs Staff

One `Identity` (auth record) can be a staff member at Gym A and a member at Gym B simultaneously. The identity holds credentials. Member and Staff records hold the gym-scoped profile.

```
Identity (identities table)
  - email, passwordHash, provider, isVerified
  - accountType: GYM_USER | PLATFORM_ADMIN
  - platformRole: super_admin | platform_admin | null

Member (members table)
  - clientId, identityId → links to gym + identity
  - firstName, lastName, membershipType, loyaltyPoints, status

Staff (staff table)
  - clientId, identityId → links to gym + identity
  - firstName, lastName, title, status
```

### Role-Based Access Control (RBAC)

Two levels of RBAC:

**Platform level** (checked by PlatformRoleGuard):
| Role | Access |
|------|--------|
| `super_admin` | Full access to /admin/* endpoints |
| `platform_admin` | Read access to platform data |

**Gym level** (checked by GymRoleGuard — enforcement in progress):
| Role | Intended Access |
|------|----------------|
| `gym_owner` | Full gym management: staff, members, settings, features |
| `gym_admin` | Same as owner except cannot delete gym or change plan |
| `front_desk` | Check-in members, view member list (read-only) |
| `member` | Self check-in, view own history, own profile |

**Current state:** Gym-level role guards exist but are not yet applied to all endpoints. Any valid JWT with correct x-gym-slug can currently hit any gym-scoped endpoint. RBAC enforcement is planned for Phase 1.4.

---

## Check-in System

Three check-in scenarios are supported:

### 1. Member scans gym QR code (qr_self_scan)
The gym prints a static QR poster. The QR encodes: `{ "type": "gym_checkin", "slug": "ironforge-gym" }`. The member opens the mobile app, scans the poster, the app reads the slug and calls `POST /checkins` with `method: qr_self_scan` using the member's own JWT. The identity resolves to their member record automatically.

### 2. Staff scans member QR code (qr_staff_scan)
Each member has a personal 30-day QR token (JWT). The member shows their QR on the mobile app. Staff scans it at the front desk. The scan sends `POST /checkins` with `method: qr_staff_scan, qrToken: <member JWT>`. The token is validated and the member is checked in.

### 3. Manual check-in (manual)
Staff looks up a member by name or member number and selects them. Sends `POST /checkins` with `method: manual, memberId: <uuid>`. Used when a member has no phone or QR issues.

### Check-in Behavior System

After a check-in is recorded, a registry of behaviors runs:
- `BaseAttendanceBehavior` — always runs, logs attendance
- `LoyaltyPointsBehavior` — runs if `checkin.loyalty_points` feature enabled, awards points
- `WelcomeMessageBehavior` — runs if `checkin.welcome_message` feature enabled, returns personalized message

Adding a new behavior = new class implementing `ICheckInBehavior` + one line in the module. No changes to the service. Outcomes are stored in `check_ins.metadata` as `{ outcomes: CheckInOutcome[] }` and returned in the API response.

Auto-checkout runs every hour via cron job — closes any check-in open for more than 4 hours.

---

## Feature System

Every gym has a set of feature flags backed by three tables:

```
feature_definitions   — master list of all features (key, defaultConfig, defaultEnabled)
client_features       — per-gym on/off toggle
client_feature_overrides — per-gym JSONB config override
```

At runtime: `deepMerge(featureDefinition.defaultConfig, clientOverride.config)` produces the effective config. `deepMerge` lives in `@gym-saas/shared-utils`.

Feature keys live in `libs/shared-config/src/feature.keys.ts`. Always use those constants, never hardcode strings.

Current feature keys:
- `checkin.basic` — gate for the entire check-in system
- `checkin.loyalty_points` — points per check-in
- `checkin.welcome_message` — personalized message on check-in
- `checkin.active_members_board` — real-time board of who is currently in the gym
- `member_self_registration` — allows members to register without an invite

---

## Multi-Tenancy Rules (Non-Negotiable)

- Every query on tenant data MUST filter by `clientId`
- NEVER take `clientId` from the request body — always from `req.tenantContext.clientId`
- Use `@CurrentTenant()` decorator in controllers
- Tenant is resolved by `TenantContextMiddleware` from the `x-gym-slug` header or subdomain
- Every tenant table MUST have `client_id UUID NOT NULL` with an index

---

## Shared Libraries — Source of Truth

`libs/shared-types` is the single source of truth for all API response shapes, DTOs, and enums.

Rules:
- Adding a new API response shape → define it in `shared-types` FIRST, then import in `apps/api` and `apps/web`/`apps/mobile`
- Never redefine types in apps that already exist in shared-types
- `shared-utils` package.json `main` must point to `./src/index.js` (compiled JS), not `.ts`

---

## API Module Structure

Each domain is one NestJS module:

```
apps/api/src/modules/
├── auth/         Login, refresh, logout, accept-invite, admin-login
├── admin/        Platform admin: create/list gyms (super_admin only)
├── clients/      Gym profile: my-gyms, get by slug, update profile
├── members/      Member CRUD, privacy settings, gym context
└── checkins/     Check-in/out, QR generation, active board, history
```

Planned modules:
- `staff/` — staff CRUD with invite flow
- `features/` — toggle and configure per-gym features (Phase 1.4)
- `email/` — transactional email service (Phase 1.4)
- `chat/` — gym-wide messaging (Phase 1.5, DB tables exist)

---

## Current Build Status

### Done
- Database schema (8 migrations applied)
- Shared types, utils, config libraries
- Monorepo scaffold (Nx + pnpm)
- Auth module: login, refresh, logout, accept-invite, admin-login
- Admin module: gym creation (transactional), gym list
- Clients module: my-gyms, profile update
- Members module: CRUD, privacy settings, gym context
- Check-ins module: all 3 check-in methods, checkout, QR generation, active board, history, auto-checkout cron

### In Progress / Planned

| Phase | Description | Status |
|-------|-------------|--------|
| 1.4 | Email service + RBAC enforcement + Staff endpoints | Next |
| 1.5 | Feature override management (GET/PATCH /features) | Planned |
| 1.6 | Web dashboard (Next.js): login, gym setup, members, check-ins | Planned |
| 1.7 | Community chat (DB exists, service not built) | Planned |
| 1.8 | Mobile app: login, QR scanner, check-in history, profile | Planned |

---

## Coding Standards

### NestJS
- Controllers handle HTTP only — no business logic, no DB queries
- Services handle all business logic with explicit return types
- DTOs in each module's `dto/` folder with class-validator decorators
- One module per domain — no cross-module service injection unless exported
- Use `@CurrentTenant()` for tenant context, `@CurrentUser()` for JWT payload

### Database
- Never use TypeORM `synchronize: true`
- Never modify existing migration files — always create new ones
- All migration SQL must be idempotent (`IF NOT EXISTS` everywhere)
- Run `pnpm migrate:up` twice to verify idempotency
- Migration filename format: `YYYYMMDDNNNNNn_description.sql`

### TypeScript
- All service methods have explicit return types
- No `any` unless absolutely unavoidable
- Use types from `@gym-saas/shared-types` — never redefine in apps

### Security
- Never log or return `passwordHash`
- Never expose internal IDs in error messages
- Never take `clientId` from request body
- JWT tokens: access 15m, refresh 7d httpOnly cookie, QR token 30d

---

## Running the Project

```bash
pnpm docker:up          # Start Postgres + Redis
pnpm migrate:up         # Run all pending migrations
pnpm seed               # Seed feature definitions + roles
pnpm seed:admin         # Insert platform admin account (run once)
pnpm api                # Start API dev server (port 3000)
pnpm web                # Start web dev server (port 3001)
pnpm mobile             # Start Expo
```

---

## Do NOT

- Modify existing migration files — create new ones
- Use `synchronize: true` in TypeORM
- Take `client_id` from request body
- Add business logic to controllers
- Use `Repository.query()` raw SQL inside services (use query builder)
- Expose `passwordHash` in any response
- Hardcode role UUIDs — always query roles by name
- Duplicate types that exist in `shared-types`
- Use `localStorage` or `AsyncStorage` for tokens in the web/mobile apps
- Add a public registration endpoint (all accounts come from invites)
- Import circularly between modules
