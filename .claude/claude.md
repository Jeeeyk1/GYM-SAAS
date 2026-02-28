# GymSaaS Monorepo — Claude Code Context

## Project Overview
Multi-tenant SaaS platform for gyms. Nx monorepo with pnpm workspaces.
Each gym is a **Client** (tenant). All behavior is config-driven per client.

---

## Monorepo Structure
```
gym-saas-monorepo/
├── apps/
│   ├── api/          NestJS REST API (port 3000)
│   ├── web/          Next.js 14 admin dashboard (port 3001)
│   └── mobile/       Expo React Native member app
├── libs/
│   ├── shared-types/ DTOs and interfaces shared across all apps
│   ├── shared-utils/ Pure functions (deepMerge, date utils, member number)
│   └── shared-config/ Feature keys, permissions, API route constants
├── CLAUDE.md
├── database.json     node-pg-migrate config
├── pnpm-workspace.yaml
└── .env
```

---

## Tech Stack (API)
- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL 16 via TypeORM (query only — never synchronize: true)
- **Migrations**: node-pg-migrate — raw SQL in apps/api/src/database/migrations/
- **Auth**: JWT access token (15m) + refresh token (7d httpOnly cookie)
- **Package manager**: pnpm

---

## Running the Project
```bash
pnpm docker:up          # Start Postgres + Redis
pnpm migrate:up         # Run all pending migrations
pnpm seed               # Seed feature definitions + roles
pnpm api                # Start API (cd apps/api && nest start --watch)
```

---

## Current Phase Status

### DONE — Phase 1.1: Auth System
Files:
- apps/api/src/modules/auth/ (full module)
- apps/api/src/database/entities/invite.entity.ts
- apps/api/src/database/migrations/006_create_invites.sql

Endpoints:
- POST /auth/login
- POST /auth/accept-invite    (token + password — activates account)
- POST /auth/register/:gymSlug  (only if member_self_registration feature enabled)
- POST /auth/refresh
- POST /auth/logout

Key design:
- No public /register. All accounts are created via invite flow.
- Identity = auth record (email, passwordHash). Decoupled from Member/Staff.
- One identity can be staff at Gym A and member at Gym B simultaneously.
- Invite tokens stored in invites table with expiry (default 72h).

---

### DONE — Phase 1.2: Gym Registration + User System
Files:
- apps/api/src/modules/admin/ (full module)
- apps/api/src/modules/clients/ (full module)
- apps/api/src/modules/users/ (full module)

Endpoints:
  ADMIN (requires x-superadmin-token header):
    POST   /admin/gyms
    GET    /admin/gyms

  CLIENTS (requires JWT):
    GET    /clients/my-gyms
    GET    /clients/:slug
    PATCH  /clients/:clientId/profile

  USERS (requires JWT + x-gym-slug header):
    GET    /members
    POST   /members              returns { member, inviteToken }
    GET    /members/:id
    PATCH  /members/:id
    PATCH  /members/:id/privacy
    GET    /staff
    POST   /staff                returns { staff, inviteToken }
    GET    /me/gym-context

Key design:
- Gym creation is platform-admin only (POST /admin/gyms).
- Flow: admin creates gym → owner gets inviteToken → owner calls /auth/accept-invite.
- All gym creation is a single DB transaction (client + profile + feature seeding + owner staff + role).
- Staff role defaults to front_desk, can pass role: "gym_owner" | "gym_admin" | "front_desk".

---

### ONGOING — Phase 1.3: Check-in System
Build this next. Fullx requirements below in the prompt section.

### TODO — Phase 1.4: Gym-Level Feature Overrides
- GET/PATCH /features — toggle and configure per-gym features

### TODO — Phase 1.5: Community Chat
- Simple gym-wide chat, DB tables already exist in migration 005

---

## Non-Negotiable Rules

### Multi-tenancy
- Every query on tenant data MUST filter by clientId
- NEVER take clientId from request body — always from req.tenantContext.clientId
- Use @CurrentTenant() decorator in controllers
- TenantContextMiddleware resolves tenant from x-gym-slug header or subdomain

### Database
- NEVER use TypeORM synchronize: true
- NEVER modify existing migration files — create new ones
- All migration SQL must be idempotent (IF NOT EXISTS everywhere)
- Run migrations twice to verify idempotency

### NestJS Patterns
- Controllers handle HTTP only
- Services handle all business logic
- DTOs use class-validator decorators
- All service methods have explicit return types

### Security
- Never log or return passwordHash
- NEVER expose internal IDs in error messages

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
| MemberPrivacySettings | member_privacy_settings | entities/member.entity.ts |
| Staff | staff | entities/member.entity.ts |
| Invite | invites | entities/invite.entity.ts |
| CheckIn | check_ins | entities/checkin.entity.ts |

---

## Do NOT
- Add a public registration endpoint
- Use synchronize: true in TypeORM
- Modify existing migration files
- Take client_id from request body
- Add logic to controllers
- Expose passwordHash in any response
- Hardcode role UUIDs — always query roles by name