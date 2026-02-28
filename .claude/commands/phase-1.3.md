# Task: Build Phase 1.3 — Check-in System

## Before writing any code
Read these files in order:
1. CLAUDE.md
2. apps/api/src/database/migrations/004_create_operations.sql
3. apps/api/src/database/entities/checkin.entity.ts
4. apps/api/src/database/entities/member.entity.ts
5. apps/api/src/database/entities/client-feature.entity.ts
6. apps/api/src/modules/users/users.service.ts (for patterns)
7. apps/api/src/config/app.config.ts

---

## Step 1: New Migration — 007_checkin_checkout.sql

Create apps/api/src/database/migrations/007_checkin_checkout.sql

The check_ins table already exists from migration 004. This migration ONLY adds missing columns. All idempotent.

```sql
-- Add checkout columns to check_ins
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='check_ins' AND column_name='checked_out_at'
  ) THEN
    ALTER TABLE check_ins ADD COLUMN checked_out_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='check_ins' AND column_name='checkout_method'
  ) THEN
    ALTER TABLE check_ins ADD COLUMN checkout_method VARCHAR(50)
      CHECK (checkout_method IN ('manual', 'auto', 'staff'));
  END IF;
END $$;

-- Update method check constraint to support new values
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_ins_method_check'
  ) THEN
    ALTER TABLE check_ins DROP CONSTRAINT check_ins_method_check;
  END IF;
END $$;

ALTER TABLE check_ins ADD CONSTRAINT check_ins_method_check
  CHECK (method IN ('qr_staff_scan', 'qr_self_scan', 'manual'));

-- Add qr_token columns to members (30-day long-lived QR)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='members' AND column_name='qr_token'
  ) THEN
    ALTER TABLE members ADD COLUMN qr_token TEXT;
    ALTER TABLE members ADD COLUMN qr_token_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Partial index for fast "who is currently checked in" queries
CREATE INDEX IF NOT EXISTS idx_checkins_client_open
  ON check_ins(client_id, checked_in_at DESC)
  WHERE checked_out_at IS NULL;
```

After writing the file run:
```bash
pnpm migrate:up
pnpm migrate:up
```
Second run must be a no-op (idempotency check).

---

## Step 2: Update Entities

**apps/api/src/database/entities/checkin.entity.ts**
- Change CheckInMethod type to: `'qr_staff_scan' | 'qr_self_scan' | 'manual'`
- Add `checkedOutAt: Date | null` — column name `checked_out_at`, type timestamptz, nullable
- Add `checkoutMethod: string | null` — column name `checkout_method`, varchar 50, nullable

**apps/api/src/database/entities/member.entity.ts**
- Add `qrToken: string | null` — column name `qr_token`, type text, nullable, `select: false`
- Add `qrTokenExpiresAt: Date | null` — column name `qr_token_expires_at`, type timestamptz, nullable

---

## Step 3: Build the Check-ins Module

Full structure to create:
```
apps/api/src/modules/checkins/
├── checkins.module.ts
├── checkins.service.ts
├── checkins.controller.ts
├── qr.service.ts
├── feature-resolver.service.ts
├── checkout-scheduler.service.ts
├── dto/
│   └── checkin.dto.ts
└── behaviors/
    ├── behavior.interface.ts
    ├── base-attendance.behavior.ts
    ├── loyalty-points.behavior.ts
    └── welcome-message.behavior.ts
```

---

### qr.service.ts

Member QR (long-lived, 30 days — works offline):
- `generateMemberQr(memberId, clientId, memberRepo)`:
  - If member already has a non-expired qrToken, return it
  - Otherwise sign a JWT: `{ type: "member_checkin", memberId, clientId }`, expiry 30 days, secret = `${JWT_SECRET}_qr`
  - Save token + expiresAt to member record
  - Return `{ token, expiresAt }`
- `validateMemberQr(token)`:
  - Verify JWT with same secret
  - Return `{ memberId, clientId }` or throw UnauthorizedException

Gym QR (static — no JWT, just encodes the slug):
- `getGymQrPayload(slug)`:
  - Return JSON string: `{ "type": "gym_checkin", "slug": "..." }`
  - No expiry. Mobile app encodes this string into a QR image.
  - Member scanning this QR reads the slug, then calls POST /checkins with method: "qr_self_scan"

Add `qrSecret` to apps/api/src/config/app.config.ts:
```typescript
qrSecret: (process.env.JWT_SECRET ?? '') + '_qr',
```

---

### feature-resolver.service.ts

```typescript
resolve(clientId: string): Promise<Map<string, { isEnabled: boolean; config: Record<string, unknown> }>>
```

- Query ClientFeature JOIN FeatureDefinition LEFT JOIN ClientFeatureOverride for this clientId
- For each feature: deepMerge(featureDefinition.defaultConfig, override?.config ?? {})
- Import deepMerge from `../../../libs/shared-utils/src/deep-merge` (adjust relative path as needed, or use the `@gym-saas/shared-utils` path alias)
- Cache in a simple in-memory Map: `Map<clientId, { result, cachedAt }>` — invalidate after 60 seconds
- Return a Map keyed by feature key string

---

### behaviors/behavior.interface.ts

```typescript
import { CheckIn } from '../../../database/entities/checkin.entity';
import { Member } from '../../../database/entities/member.entity';

export interface CheckInContext {
  checkIn: CheckIn;
  member: Member;
  featureConfig: Record<string, unknown>;
}

export interface CheckInOutcome {
  feature: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ICheckInBehavior {
  featureKey: string;
  handle(ctx: CheckInContext): Promise<CheckInOutcome>;
}
```

---

### behaviors/base-attendance.behavior.ts
- featureKey: `'checkin.basic'`
- Always runs regardless of feature flags
- Outcome: `{ feature: 'checkin.basic', type: 'attendance_logged', data: { checkedInAt: checkIn.checkedInAt } }`

### behaviors/loyalty-points.behavior.ts
- featureKey: `'checkin.loyalty_points'`
- Read `config.points_per_checkin` (default 10)
- Increment using raw UPDATE to avoid race conditions:
  ```sql
  UPDATE members SET loyalty_points = loyalty_points + $1 WHERE id = $2 RETURNING loyalty_points
  ```
- Outcome: `{ feature: 'checkin.loyalty_points', type: 'points_awarded', data: { points: N, newTotal: M } }`

### behaviors/welcome-message.behavior.ts
- featureKey: `'checkin.welcome_message'`
- Read `config.message` (default: `'Welcome back, {first_name}!'`)
- Replace `{first_name}` with member.firstName
- Outcome: `{ feature: 'checkin.welcome_message', type: 'message', data: { message: '...' } }`

---

### dto/checkin.dto.ts

```typescript
import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min, Max, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum CheckInMethod {
  QR_STAFF_SCAN = 'qr_staff_scan',
  QR_SELF_SCAN = 'qr_self_scan',
  MANUAL = 'manual',
}

export class CheckInDto {
  @IsEnum(CheckInMethod)
  method: CheckInMethod;

  @ValidateIf(o => o.method === CheckInMethod.QR_STAFF_SCAN)
  @IsString()
  qrToken?: string;

  @ValidateIf(o => o.method === CheckInMethod.MANUAL)
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  station?: string;
}

export class CheckInQueryDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

### checkins.service.ts

**checkIn(dto, tenant, actorIdentityId)**

1. Resolve memberId based on method:
   - `manual` → dto.memberId (verify member.clientId === tenant.clientId)
   - `qr_staff_scan` → QrService.validateMemberQr(dto.qrToken) → extract memberId, verify clientId matches tenant.clientId
   - `qr_self_scan` → find Member WHERE identityId = actorIdentityId AND clientId = tenant.clientId

2. Load member with privacySettings relation

3. Resolve features: `const features = await featureResolver.resolve(tenant.clientId)`

4. Duplicate check:
   - Get `duplicate_window_minutes` from features.get('checkin.basic')?.config ?? 60
   - Query: check_ins WHERE member_id = ? AND client_id = ? AND checked_out_at IS NULL AND checked_in_at > now() - interval
   - If found: throw ConflictException with message 'Member is already checked in' and include the open check-in id

5. Create CheckIn: `{ clientId, memberId, method: dto.method, station: dto.station ?? null }`

6. Run behaviors in order:
   - BaseAttendanceBehavior always runs
   - LoyaltyPointsBehavior: only if features.get('checkin.loyalty_points')?.isEnabled
   - WelcomeMessageBehavior: only if features.get('checkin.welcome_message')?.isEnabled

7. Save outcomes into checkIn.metadata: `{ outcomes: CheckInOutcome[] }`

8. Save checkIn and return `{ checkIn, outcomes }`

**checkOut(checkInId, tenant, method: 'manual' | 'staff')**
- Find CheckIn WHERE id = ? AND clientId = tenant.clientId
- If not found: NotFoundException
- If checkedOutAt already set: BadRequestException('Already checked out')
- Update: checkedOutAt = now(), checkoutMethod = method
- Return updated CheckIn

**getMemberQr(memberId, tenant)**
- Verify member.clientId === tenant.clientId, else NotFoundException
- Return QrService.generateMemberQr(memberId, tenant.clientId, memberRepo)

**getGymQr(tenant)**
- Return QrService.getGymQrPayload(tenant.clientSlug)

**getActiveMembers(tenant)**
- Check features: if !features.get('checkin.active_members_board')?.isEnabled throw ForbiddenException
- Query open check-ins for this gym in the last 4 hours
- Join with members and member_privacy_settings
- Filter: show_in_active_members = true
- Return: `Array<{ memberId, firstName, lastName, checkedInAt }>`

**getHistory(query, tenant)**
- Paginated query scoped to tenant.clientId
- If query.memberId: filter by memberId (verify member belongs to gym first)
- Return `{ data, total, page, limit }`

---

### checkout-scheduler.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckIn } from '../../database/entities/checkin.entity';

@Injectable()
export class CheckoutSchedulerService {
  private readonly logger = new Logger(CheckoutSchedulerService.name);

  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepo: Repository<CheckIn>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async autoCheckout(): Promise<void> {
    const result = await this.checkInRepo
      .createQueryBuilder()
      .update(CheckIn)
      .set({
        checkedOutAt: () => 'now()',
        checkoutMethod: 'auto',
      })
      .where('checked_out_at IS NULL')
      .andWhere("checked_in_at < now() - interval '4 hours'")
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto checkout: ${result.affected} check-ins closed`);
    }
  }
}
```

---

### checkins.controller.ts

All routes require @UseGuards(JwtAuthGuard). All routes are gym-scoped (require x-gym-slug header for tenant context).

```
POST   /checkins                        Check in (all 3 scenarios)
POST   /checkins/:checkInId/checkout    Manual check out
GET    /checkins                        History (?memberId=&page=&limit=)
GET    /checkins/active-members         Active members board
GET    /checkins/gym-qr                 Gym QR payload (staff/kiosk use)
GET    /members/:memberId/qr            Member personal QR token
```

---

### checkins.module.ts

```typescript
imports: [
  TypeOrmModule.forFeature([CheckIn, Member, ClientFeature, FeatureDefinition, ClientFeatureOverride]),
  ScheduleModule.forRoot(),  // only if not already in AppModule
]
providers: [
  CheckInsService,
  QrService,
  FeatureResolverService,
  CheckoutSchedulerService,
  BaseAttendanceBehavior,
  LoyaltyPointsBehavior,
  WelcomeMessageBehavior,
]
```

Install @nestjs/schedule if missing from apps/api/package.json:
```bash
cd apps/api && pnpm add @nestjs/schedule
```

---

## Step 4: Register in AppModule

In apps/api/src/app.module.ts:
- Import and add CheckInsModule to the imports array
- Import ScheduleModule.forRoot() in AppModule (remove from CheckinsModule if added there — only one place)

---

## Step 5: Verify

```bash
cd apps/api && tsc --noEmit
```

Fix all TypeScript errors. Then show the complete folder structure of everything created or modified.