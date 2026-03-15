# GymSaaS — Architecture Reference

> Last updated: 2026-03-15
> See `CLAUDE.md` for coding standards, testing, and running the project.

---

## System Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────────────────────┐
│   Web Dashboard  │ ─────────────▶ │  Next.js (port 3001)             │
│   (gym owner /  │                │  - Admin dashboard                │
│    platform)    │                │  - Rewrites /api/v1/* → API       │
└─────────────────┘                └──────────┬───────────────────────┘
                                              │ internal HTTP
┌─────────────────┐     HTTPS                 ▼
│   Mobile App    │ ─────────────▶ ┌──────────────────────────────────┐
│   (members)     │                │  NestJS API (port 3000)          │
└─────────────────┘                │  - REST endpoints /api/v1/*      │
                                   │  - JWT auth + RBAC guards        │
                                   │  - Multi-tenant middleware        │
                                   └──────────┬───────────────────────┘
                                              │
                                   ┌──────────▼───────────────────────┐
                                   │  PostgreSQL 16                   │
                                   │  - 14 tables                     │
                                   │  - Row-level tenant isolation     │
                                   └──────────────────────────────────┘
```

**Key design decision:** The Next.js server proxies all `/api/v1/*` requests to NestJS. The browser never makes cross-origin requests — CORS is a non-issue for the web app.

---

## Multi-Tenancy Model

Every gym is a **Client** (tenant). All tenant data is isolated by `client_id` column — never by schema or database.

```
clients
  └── client_profiles (1:1)
  └── client_features (1:many)  ← feature flags for this gym
  └── client_feature_overrides (1:many)  ← config overrides
  └── members (1:many)
  └── staff (1:many)
  └── check_ins (1:many)
```

**Tenant resolution flow:**
```
HTTP Request
  → TenantContextMiddleware reads x-gym-slug header
  → Queries clients table for slug
  → Attaches TenantContext { clientId, clientSlug, plan, isDemo } to request
  → Controllers extract via @CurrentTenant() decorator
```

**Rule:** `clientId` is ALWAYS sourced from `req.tenantContext.clientId`. Never from request body.

---

## Authentication Flow

```
Login:
  POST /auth/login { email, password } + x-gym-slug header
    → Validate credentials (bcrypt)
    → Optional: check membership expiry if gym context present
    → Issue access token (JWT 15m) + refresh token (JWT 7d, httpOnly cookie)

Token refresh:
  POST /auth/refresh  (cookie sent automatically)
    → Validate refresh token
    → Issue new access token

Gym-scoped requests:
  GET /members  + Authorization: Bearer <token> + x-gym-slug: ironforge-gym
    → JwtAuthGuard validates token, attaches JwtPayload to req.user
    → TenantContextMiddleware resolves gym from x-gym-slug
    → GymRoleGuard checks identity has required role for this gym
    → Controller handles request
```

### JWT Payloads

**Access token (15m):**
```typescript
{ sub: identityId, email, type: 'access', accountType, platformRole? }
```

**Refresh token (7d):**
```typescript
{ sub: identityId, email, type: 'refresh' }
```

**Member QR token (30d):**
```typescript
{ sub: identityId, memberId, clientId, type: 'member_qr' }
```

---

## RBAC Architecture

Two guard layers:

### PlatformRoleGuard
Applied to `/admin/*`. Checks `identity.platformRole === 'super_admin'`. No DB query — reads from JWT.

### GymRoleGuard
Applied to all gym-scoped endpoints. Queries `identity_roles` table on every request:
```sql
SELECT r.name FROM identity_roles ir
JOIN roles r ON r.id = ir.role_id
WHERE ir.identity_id = $1 AND ir.client_id = $2
```
Checks that at least one role name matches the `@GymRoles(...)` decorator.

Also enforces membership expiry: if the user has only the `member` role, queries `members.membership_expires_at` and throws 403 if expired.

---

## Feature Flag Architecture

```
feature_definitions    — platform-wide catalogue (key, defaultConfig, defaultEnabled)
       ↓ one row per gym per feature
client_features        — per-gym toggle (isEnabled)
       ↓ optional
client_feature_overrides — per-gym JSONB config patch

Resolved config = deepMerge(feature_definitions.default_config, client_feature_overrides.config)
```

`FeatureResolverService` (CheckInsModule, exported) caches the resolved map per `clientId` for 60 seconds in-process. Call `featureResolver.invalidate(clientId)` after any mutation.

**Endpoints:**
- `GET /features` — list all features for the current gym (gym_owner, gym_admin)
- `PATCH /features/:key` — toggle isEnabled or update config (gym_owner, gym_admin)

---

## Request / Response Pipeline

```
Request:
  Middleware → Guards → Interceptor (before) → Controller → Service

Response:
  Service → Controller → Interceptor (after: wraps in { data, meta }) → Client

Error:
  Any layer throws → HttpExceptionFilter → { error: { statusCode, message, timestamp, path } }
```

### Success response envelope
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-15T09:00:00.000Z",
    "path": "/api/v1/members"
  }
}
```

### Error response envelope
```json
{
  "error": {
    "statusCode": 403,
    "message": "Membership has expired. Please renew to continue.",
    "timestamp": "2026-03-15T09:00:00.000Z",
    "path": "/api/v1/checkins"
  }
}
```

The web/mobile Axios client automatically unwraps `response.data.data` → `response.data` so callers always receive the raw payload.

---

## Check-in Behavior Pipeline

```
POST /checkins
  → Resolve method (manual | qr_staff_scan | qr_self_scan)
  → Verify member exists and belongs to gym
  → Check membership expiry → 403 if expired
  → Verify checkin.basic feature is enabled
  → Insert check_in row
  → Run behavior pipeline in order:
      1. BaseAttendanceBehavior (always)
      2. LoyaltyPointsBehavior (if checkin.loyalty_points enabled)
      3. WelcomeMessageBehavior (if checkin.welcome_message enabled)
  → Return check-in record + outcomes array
```

Adding a new behavior: create `<name>.behavior.ts` implementing `ICheckInBehavior`, register in `CheckInsModule` providers and `CHECKIN_BEHAVIORS` factory.

---

## Database Schema Overview

### Core Tenant Tables
| Table | Purpose |
|-------|---------|
| `clients` | One row per gym |
| `client_profiles` | Gym contact info, branding, hours |
| `feature_definitions` | Platform catalogue of features |
| `client_features` | Per-gym feature on/off |
| `client_feature_overrides` | Per-gym config JSON patch |

### Identity & Access
| Table | Purpose |
|-------|---------|
| `identities` | Auth credentials (email + bcrypt hash) |
| `members` | Gym member profile (linked to identity) |
| `staff` | Gym staff profile (linked to identity) |
| `roles` | System roles per gym (gym_owner, gym_admin, front_desk, member) |
| `identity_roles` | Many-to-many: identity ↔ role ↔ gym |
| `invites` | Pending activation tokens (72h expiry) |

### Operations
| Table | Purpose |
|-------|---------|
| `check_ins` | Every check-in event |
| `audit_logs` | Append-only audit trail (not yet written to — reserved) |
| `member_privacy_settings` | Per-member privacy preferences |

### Planned (tables exist, services not built)
| Table | Purpose |
|-------|---------|
| `chat_rooms` | Gym-scoped chat channels |
| `chat_room_members` | Room membership |
| `chat_messages` | Message records |

---

## Email Architecture

`EmailModule` is `@Global()`. Inject `EmailService` in any module without importing `EmailModule`.

Emails are sent via **Resend** (https://resend.com). If `RESEND_API_KEY` is not set, emails are logged but not sent (safe for local dev).

Current transactional emails:
| Trigger | Method |
|---------|--------|
| Gym owner created | `sendGymOwnerActivation()` |
| Staff invited | `sendStaffInvitation()` |
| Member created | `sendMemberWelcome()` |
| Membership expiring in 7d or 1d | `sendMembershipExpiryReminder()` (daily 9am cron) |

---

## Membership Expiration

`membershipExpiresAt` is required on every member (set at creation, updatable via PATCH).

Expiry is enforced at three layers:
1. **Login** (`AuthService.login`) — if x-gym-slug present and member expired → 401. Staff bypass.
2. **All gym-scoped endpoints** (`GymRoleGuard`) — member-only roles → 403 if expired.
3. **Check-in** (`CheckInsService`) — explicit check → 403 if expired.

Reminder emails: `MembershipSchedulerService` runs daily at 9am, sends emails to members expiring in ~7 days and ~1 day.

---

## Architecture Decision Records (ADRs)

### ADR-001: Single DB, clientId isolation (not schema-per-tenant)
**Decision:** All tenants share one DB schema, isolated by `client_id` column.
**Rationale:** Simpler ops, easier cross-tenant queries for platform admin, sufficient for scale at this stage. Upgrade path: read replicas → partitioning.

### ADR-002: Next.js as API proxy (no direct browser→API calls)
**Decision:** Next.js rewrites `/api/v1/*` to NestJS. Browser only ever talks to Next.js origin.
**Rationale:** Eliminates CORS complexity, single origin for cookies, easy to add edge caching later.

### ADR-003: JWT with httpOnly refresh cookie
**Decision:** Short-lived access token in memory, long-lived refresh token in httpOnly cookie.
**Rationale:** Protects against XSS (refresh token never accessible to JS), CSRF mitigated by short-lived access token.

### ADR-004: One entity per file
**Decision:** Each TypeORM `@Entity()` class lives in its own file.
**Rationale:** Discoverability — if you need `Identity`, look in `identity.entity.ts`. Reduces cognitive load when AI-assisted development generates/reads code.

### ADR-005: Global ResponseInterceptor + HttpExceptionFilter
**Decision:** All API responses wrapped in `{ data, meta }` envelope; all errors in `{ error: { statusCode, message, ... } }`.
**Rationale:** Consistent contract for web/mobile clients. Axios auto-unwraps on the client side.
