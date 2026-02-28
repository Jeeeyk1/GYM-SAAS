# GymSaaS Monorepo — Claude Code Context

## What this project is
Multi-tenant SaaS platform for gyms. Nx monorepo with pnpm workspaces.
Each gym is a CLIENT (tenant). All behavior is config-driven at the CLIENT level.

## Apps
| App | Stack | Port | Purpose |
|-----|-------|------|---------|
| `apps/api` | NestJS + TypeORM + PostgreSQL | 3000 | REST API |
| `apps/web` | Next.js 14 (App Router) + Tailwind | 3001 | Admin dashboard |
| `apps/mobile` | Expo + React Native (Expo Router) | - | Member mobile app |

## Shared Libraries
| Lib | Import | Purpose |
|-----|--------|---------|
| `libs/shared-types` | `@gym-saas/shared-types` | DTOs, interfaces, enums — used by ALL apps |
| `libs/shared-utils` | `@gym-saas/shared-utils` | Pure functions (deepMerge, date utils, member number) |
| `libs/shared-config` | `@gym-saas/shared-config` | Feature keys, permissions, API routes |

## Critical rule: shared-types is the source of truth
- If you add a new API response shape → add it to `libs/shared-types` FIRST
- Then import in both `apps/api` (response DTO) and `apps/web`/`apps/mobile` (API call)
- NEVER duplicate type definitions across apps

## Running the project
```bash
pnpm docker:up         # Start Postgres + Redis
pnpm migrate:up        # Run all pending migrations
pnpm seed              # Seed feature definitions + roles
pnpm api               # Start API dev server (port 3000)
pnpm web               # Start web dev server (port 3001)
pnpm mobile            # Start Expo (mobile)
```

## Key commands
```bash
pnpm nx graph          # Visualize dependency graph
pnpm nx affected:test  # Only test what changed
pnpm nx run-many --target=typecheck --all  # Typecheck everything
```

## API App Rules (apps/api)

### Database
- NEVER use TypeORM synchronize: true
- NEVER write TypeORM migrations — use raw SQL in apps/api/src/database/migrations/
- All SQL migrations must be idempotent (IF NOT EXISTS everywhere)
- Every tenant table MUST have client_id UUID NOT NULL with an index

### Multi-tenancy
- Every query touching tenant data MUST filter by client_id
- NEVER take client_id from request body — use req.tenantContext.clientId
- Use @CurrentTenant() decorator in controllers
- Tenant resolved by TenantContextMiddleware via x-gym-slug header or subdomain

### NestJS Patterns
- One module per domain
- Services handle business logic, controllers handle HTTP only
- DTOs live in each module's dto/ folder with class-validator decorators
- All service methods must have explicit return types

### Feature System
- Feature flags: client_features table (per-gym on/off)
- Behavior config: client_feature_overrides table (per-gym JSONB)
- Runtime: deepMerge(feature_definitions.default_config, override.config)
- deepMerge lives in @gym-saas/shared-utils — use it in feature resolver
- New behaviors = new handler class, NOT if/else branching

## Web App Rules (apps/web)
- Use App Router (app/ directory), not pages/
- All API calls go through apps/web/src/lib/api-client.ts
- Use @tanstack/react-query for all server state
- Use react-hook-form + zod for all forms
- Types for API responses come from @gym-saas/shared-types — never redefine them
- x-gym-slug header is set automatically by api-client interceptor

## Mobile App Rules (apps/mobile)
- Expo Router for navigation (app/ directory)
- JWT stored in expo-secure-store (NEVER AsyncStorage for tokens)
- All API calls go through apps/mobile/src/lib/api-client.ts
- x-gym-slug and Authorization header set automatically by interceptor
- Types from @gym-saas/shared-types — never redefine

## Migration workflow
```bash
pnpm migrate:create -- --name your_description
# Edit the generated file in apps/api/src/database/migrations/
pnpm migrate:up
pnpm migrate:up  # Run twice to verify idempotency
```

## What's built
- [x] Database schema (5 migrations)
- [x] Feature system design
- [x] Shared types, utils, config libs
- [x] Monorepo scaffold (Nx + pnpm)

## What's NOT built yet (priority order)
1. Auth module (JWT login, refresh, guards)
2. Clients module (onboarding, demo gym seeding)
3. Feature resolver service (runtime deepMerge)
4. Members module (CRUD + QR token)
5. Check-ins module (behavior registry + handlers)
6. Staff module
7. Web dashboard pages (login, members list, checkins)
8. Mobile screens (login, QR scanner, profile)
9. Chat module (tables exist, service not built)

## Do NOT
- Modify existing migration files — create new ones
- Add business logic to controllers
- Use Repository.query() raw SQL in services
- Expose passwordHash in any response
- Import circularly between modules
- Define types in apps that already exist in shared-types
- Use localStorage/AsyncStorage for tokens in mobile
