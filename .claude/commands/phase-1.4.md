# Task: Build Phase 1.4 — Email, RBAC, and Staff Module

## Context

This phase wires up three tightly related pieces that were deferred from Phase 1.3:

1. **Email service** — invite tokens are currently returned in the API response body (fine for testing). They now need to be emailed to recipients. Use Resend as the provider.
2. **RBAC enforcement** — `GymRoleGuard` exists and is correct but not applied to any controller. Any valid JWT + x-gym-slug currently hits any endpoint. This phase applies role guards to all gym-scoped controllers.
3. **Staff module** — there is no way to invite staff to a gym yet. This adds `POST /staff` and related CRUD endpoints.

There are also two bugs to fix discovered when wiring up RBAC:
- `AdminService.createGym()` saves the owner staff record with `firstName: ''` and `lastName: ''` because `CreateGymDto` doesn't collect owner name fields.
- `MembersService.create()` never assigns a `member` IdentityRole in `identity_roles`. Without it, `GymRoleGuard` will reject members from `POST /checkins` (qr_self_scan).
- `AdminService` only creates `gym_owner`, `gym_admin`, `front_desk` system roles per gym — the `member` role is missing, so members can never pass GymRoleGuard.

---

## Before Writing Any Code

Read these files in order:

1. `CLAUDE.md`
2. `.claude/CLAUDE.md`
3. `apps/api/src/modules/admin/admin.service.ts`
4. `apps/api/src/modules/admin/dto/create-gym.dto.ts`
5. `apps/api/src/modules/members/members.service.ts`
6. `apps/api/src/modules/members/members.controller.ts`
7. `apps/api/src/modules/checkins/checkins.controller.ts`
8. `apps/api/src/modules/auth/invite.service.ts`
9. `apps/api/src/modules/auth/auth.service.ts`
10. `apps/api/src/common/guards/gym-role.guard.ts`
11. `apps/api/src/common/decorators/roles.decorators.ts`
12. `apps/api/src/config/app.config.ts`
13. `apps/api/src/database/migrations/20260222000001_create_clients.sql` (check client_profiles columns)
14. `apps/api/src/database/migrations/20260222000003_create_identity_members.sql` (check staff and roles columns)

---

## Step 1: Install Resend

```bash
cd apps/api && pnpm add resend
```

---

## Step 2: Extend app.config.ts

Add these two config entries to `apps/api/src/config/app.config.ts`:

```typescript
appUrl: process.env.APP_URL ?? 'http://localhost:3001',
email: {
  resendApiKey: process.env.RESEND_API_KEY ?? 're_CVY9sTXi_24CGttG3itY8MwZ7tPuZN8aq',
  fromAddress: process.env.EMAIL_FROM ?? 'GymSaaS <noreply@gymsaas.com>',
},
```

---

## Step 3: Email Module

Create the following structure:

```
apps/api/src/modules/email/
├── email.module.ts
└── email.service.ts
```

### email.service.ts

`EmailService` must gracefully degrade when `RESEND_API_KEY` is not set — log to console instead of throwing. This keeps the API usable in development without an email provider configured.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('app.email.resendApiKey', '');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = config.get<string>('app.email.fromAddress', 'GymSaaS <noreply@gymsaas.com>');
    this.appUrl = config.get<string>('app.appUrl', 'http://localhost:3001');
  }

  async sendGymOwnerActivation(params: {
    to: string;
    ownerName: string;
    gymName: string;
    inviteToken: string;
  }): Promise<void> {
    const url = `${this.appUrl}/activate?token=${params.inviteToken}`;
    await this.send({
      to: params.to,
      subject: `Activate your gym on GymSaaS — ${params.gymName}`,
      html: this.gymOwnerTemplate(params.ownerName, params.gymName, url),
    });
  }

  async sendStaffInvitation(params: {
    to: string;
    staffName: string;
    gymName: string;
    role: string;
    inviteToken: string;
  }): Promise<void> {
    const url = `${this.appUrl}/activate?token=${params.inviteToken}`;
    await this.send({
      to: params.to,
      subject: `You've been invited to join ${params.gymName}`,
      html: this.staffInviteTemplate(params.staffName, params.gymName, params.role, url),
    });
  }

  async sendMemberWelcome(params: {
    to: string;
    memberName: string;
    gymName: string;
    inviteToken: string;
  }): Promise<void> {
    const url = `${this.appUrl}/activate?token=${params.inviteToken}`;
    await this.send({
      to: params.to,
      subject: `Welcome to ${params.gymName}`,
      html: this.memberWelcomeTemplate(params.memberName, params.gymName, url),
    });
  }

  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EMAIL SKIPPED — no RESEND_API_KEY] To: ${opts.to} | Subject: ${opts.subject}`,
      );
      return;
    }
    await this.resend.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }

  private gymOwnerTemplate(ownerName: string, gymName: string, url: string): string {
    return `
      <p>Hi ${ownerName},</p>
      <p>Your gym <strong>${gymName}</strong> has been created on GymSaaS.</p>
      <p>Click the button below to activate your account and set your password.</p>
      <p><a href="${url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Activate Account</a></p>
      <p>This link expires in 72 hours.</p>
    `;
  }

  private staffInviteTemplate(name: string, gymName: string, role: string, url: string): string {
    return `
      <p>Hi ${name},</p>
      <p>You've been invited to join <strong>${gymName}</strong> as <strong>${role.replace('_', ' ')}</strong>.</p>
      <p><a href="${url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Accept Invitation</a></p>
      <p>This link expires in 72 hours.</p>
    `;
  }

  private memberWelcomeTemplate(name: string, gymName: string, url: string): string {
    return `
      <p>Hi ${name},</p>
      <p>Welcome to <strong>${gymName}</strong>!</p>
      <p>Click below to activate your account and access the member app.</p>
      <p><a href="${url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Activate Account</a></p>
      <p>This link expires in 72 hours.</p>
    `;
  }
}
```

### email.module.ts

Mark as `@Global()` so it can be injected without importing the module everywhere.

```typescript
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

---

## Step 4: Expand CreateGymDto + Update AdminService

### Update apps/api/src/modules/admin/dto/create-gym.dto.ts

Add required owner name fields and optional profile fields:

```typescript
@IsString()
ownerFirstName: string;

@IsString()
ownerLastName: string;

@IsOptional()
@IsString()
address?: string;

@IsOptional()
@IsString()
phone?: string;

@IsOptional()
@IsString()
timezone?: string;
```

### Update apps/api/src/modules/admin/admin.service.ts

1. Inject `EmailService` into the constructor.
2. Add `member` to `SYSTEM_ROLES` so members can pass GymRoleGuard:
   ```typescript
   { name: 'member', description: 'Gym member', isSystem: true },
   ```
3. Pass `dto.ownerFirstName` and `dto.ownerLastName` when creating the `Staff` record.
4. If any profile fields are provided (`address`, `phone`, `timezone`), update the `ClientProfile` inside the same transaction after saving it.
5. After the transaction, call `emailService.sendGymOwnerActivation(...)`. Do not put the email send inside the transaction — if email fails, the gym is still created. Wrap in try/catch and log the error without throwing.
6. Return shape stays the same: `{ client, ownerStaff, inviteToken }`.

---

## Step 5: Fix Member Role Assignment in MembersService

**Bug:** `MembersService.create()` never creates an `IdentityRole` for the member. Without it, the member cannot pass `GymRoleGuard` for `POST /checkins` (qr_self_scan).

### Update apps/api/src/modules/members/members.service.ts

1. Inject `@InjectRepository(IdentityRole)` (already present) and `@InjectRepository(Role)`.
2. After saving the `member` record, query the `member` role for this clientId:
   ```typescript
   const memberRole = await this.roleRepo.findOne({ where: { name: 'member', clientId } });
   ```
3. If found, create the `IdentityRole`:
   ```typescript
   await this.identityRoleRepo.save(
     this.identityRoleRepo.create({
       identityId: identity.id,
       roleId: memberRole.id,
       clientId,
       assignedBy: null,
     }),
   );
   ```
4. If not found (gym was created before this phase), skip silently — do not throw.
5. After the invite is created, call `emailService.sendMemberWelcome(...)`. Wrap in try/catch, log error without throwing.

The method signature and return type remain unchanged.

---

## Step 6: Staff Module

Create the following structure:

```
apps/api/src/modules/staff/
├── staff.module.ts
├── staff.service.ts
├── staff.controller.ts
└── dto/
    ├── create-staff.dto.ts
    └── update-staff.dto.ts
```

### dto/create-staff.dto.ts

```typescript
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsIn(['gym_admin', 'front_desk'])
  role: 'gym_admin' | 'front_desk';

  @IsOptional()
  @IsString()
  title?: string;
}
```

### dto/update-staff.dto.ts

```typescript
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
```

### staff.service.ts

**createStaff(clientId, dto, invitedByIdentityId)**

1. Check if an identity with that email already exists.
2. If not, create one: `{ email, provider: 'local', isVerified: false }`.
3. Check there is no existing Staff record with `{ identityId, clientId }` — throw `ConflictException('Staff member already exists for this gym')` if found.
4. Query the role: `Role WHERE name = dto.role AND client_id = clientId` — throw `NotFoundException` if missing.
5. Save Staff: `{ clientId, identityId, firstName, lastName, title, status: 'invited' }`.
6. Save IdentityRole: `{ identityId, roleId, clientId, assignedBy: invitedByIdentityId }`.
7. Create invite via InviteService: `{ clientId, identityId, role: dto.role, type: 'staff', invitedBy: invitedByIdentityId }`.
8. Call `emailService.sendStaffInvitation(...)`. Wrap in try/catch, log error without throwing.
9. Return `{ staff, inviteToken: invite.token }`.

**listStaff(clientId)**

Query staff records with identity_roles joined, return `Staff[]`. Use a query builder that joins `identity_roles` and `roles` to include the role name on each record. Return type: `Array<Staff & { roleName: string }>`.

```typescript
return this.staffRepo
  .createQueryBuilder('s')
  .leftJoinAndSelect('s.identity', 'identity')
  .where('s.client_id = :clientId', { clientId })
  .orderBy('s.created_at', 'DESC')
  .getMany();
```

Include role names by doing a separate query on `identity_roles` or add a subquery. Keep it simple — if the entity doesn't have a direct relation to roles, just return the staff list and let the caller query roles separately if needed. Do not overcomplicate.

**getStaffById(clientId, staffId)**

Find Staff WHERE `id = staffId AND clientId` — throw `NotFoundException` if not found.

**updateStaff(clientId, staffId, dto)**

Load staff with `getStaffById`, apply `Object.assign(staff, dto)`, save and return.

**deactivateStaff(clientId, staffId)**

Load staff, set `status = 'inactive'`, save. Do NOT delete the record.

### staff.controller.ts

All routes require `@UseGuards(JwtAuthGuard, GymRoleGuard)`.

```
GET    /staff          listStaff        → @GymRoles('gym_owner', 'gym_admin')
POST   /staff          createStaff      → @GymRoles('gym_owner', 'gym_admin')
GET    /staff/:id      getStaffById     → @GymRoles('gym_owner', 'gym_admin')
PATCH  /staff/:id      updateStaff      → @GymRoles('gym_owner', 'gym_admin')
DELETE /staff/:id      deactivateStaff  → @GymRoles('gym_owner')
```

Pass `@CurrentUser() user: JwtPayload` to `createStaff` as the `invitedByIdentityId`.

### staff.module.ts

```typescript
imports: [
  TypeOrmModule.forFeature([Staff, Identity, IdentityRole, Role]),
  AuthModule,
]
providers: [StaffService, GymRoleGuard]
```

---

## Step 7: Apply RBAC to Existing Controllers

`GymRoleGuard` is already written and correct. It just needs to be applied.

**Rules:**
- Add `GymRoleGuard` to the `providers` array of each module that uses it.
- Add `@UseGuards(JwtAuthGuard, GymRoleGuard)` to the controller class (replaces the existing `@UseGuards(JwtAuthGuard)`).
- Add `@GymRoles(...)` to each route handler.

### RBAC Matrix

| Controller | Route | Allowed Roles |
|-----------|-------|---------------|
| MembersController | `GET /members` | `gym_owner`, `gym_admin`, `front_desk` |
| MembersController | `POST /members` | `gym_owner`, `gym_admin` |
| MembersController | `GET /members/:id` | `gym_owner`, `gym_admin`, `front_desk` |
| MembersController | `PATCH /members/:id` | `gym_owner`, `gym_admin` |
| MembersController | `PATCH /members/:id/privacy` | `gym_owner`, `gym_admin`, `member` |
| MembersController | `GET /me/gym-context` | _(no @GymRoles — any authenticated gym user)_ |
| CheckInsController | `POST /checkins` | `gym_owner`, `gym_admin`, `front_desk`, `member` |
| CheckInsController | `POST /checkins/:id/checkout` | `gym_owner`, `gym_admin`, `front_desk` |
| CheckInsController | `GET /checkins` | `gym_owner`, `gym_admin`, `front_desk` |
| CheckInsController | `GET /checkins/active-members` | `gym_owner`, `gym_admin`, `front_desk` |
| CheckInsController | `GET /checkins/gym-qr` | `gym_owner`, `gym_admin`, `front_desk` |
| CheckInsController | `GET /members/:memberId/qr` | `gym_owner`, `gym_admin`, `front_desk` |

`GymRoleGuard` is a no-op when `@GymRoles()` is not set (returns true), so `GET /me/gym-context` just needs JwtAuthGuard.

### MembersModule update

Add `GymRoleGuard` to `providers` in `members.module.ts`.

### CheckInsModule update

Add `GymRoleGuard` to `providers` in `checkins.module.ts`.

### Service fix: PATCH /members/:id/privacy

`@GymRoles('gym_owner', 'gym_admin', 'member')` allows a member to call this endpoint, but a member must only be able to update their own privacy settings. Update `MembersService.updatePrivacy` signature:

```typescript
async updatePrivacy(
  callerIdentityId: string,
  callerRoles: string[],  // pass from controller after querying, or simplify:
  clientId: string,
  memberId: string,
  dto: UpdatePrivacySettingsDto,
): Promise<MemberPrivacySettings>
```

Simpler approach — in the service, after loading the member, if the caller has only the `member` role, verify that `member.identityId === callerIdentityId`. If not, throw `ForbiddenException`. Gym staff (owner/admin) can update any member's privacy settings.

Pass `@CurrentUser() user: JwtPayload` from the controller so the service can do this check.

---

## Step 8: Update AppModule

In `apps/api/src/app.module.ts`:

1. Import and add `EmailModule` — add it **before** the other domain modules so it's globally available.
2. Import and add `StaffModule`.

---

## Step 9: Update .claude/CLAUDE.md

Update the endpoint inventory section to add:

```
### Staff — requires JWT + x-gym-slug
GET    /staff           List staff for gym (gym_owner, gym_admin)
POST   /staff           Create staff + send invite email (gym_owner, gym_admin)
GET    /staff/:id       Get single staff member (gym_owner, gym_admin)
PATCH  /staff/:id       Update staff (gym_owner, gym_admin)
DELETE /staff/:id       Deactivate staff (gym_owner only)
```

Update the RBAC Implementation Status section to reflect that GymRoleGuard is now active on Members, CheckIns, and Staff controllers.

---

## Step 10: TypeScript Verification

```bash
cd apps/api && tsc --noEmit
```

Fix all TypeScript errors. Then show the complete list of files created or modified.

---

## Summary of Files to Create

```
apps/api/src/modules/email/email.module.ts          (new)
apps/api/src/modules/email/email.service.ts         (new)
apps/api/src/modules/staff/staff.module.ts          (new)
apps/api/src/modules/staff/staff.service.ts         (new)
apps/api/src/modules/staff/staff.controller.ts      (new)
apps/api/src/modules/staff/dto/create-staff.dto.ts  (new)
apps/api/src/modules/staff/dto/update-staff.dto.ts  (new)
```

## Summary of Files to Modify

```
apps/api/src/config/app.config.ts                       add appUrl + email config
apps/api/src/modules/admin/dto/create-gym.dto.ts        add owner name + profile fields
apps/api/src/modules/admin/admin.service.ts             inject EmailService, fix firstName/lastName, add member role, send email
apps/api/src/modules/members/members.service.ts         assign member IdentityRole on create, send welcome email
apps/api/src/modules/members/members.controller.ts      apply GymRoleGuard + @GymRoles per route
apps/api/src/modules/members/members.module.ts          add GymRoleGuard to providers
apps/api/src/modules/checkins/checkins.controller.ts    apply GymRoleGuard + @GymRoles per route
apps/api/src/modules/checkins/checkins.module.ts        add GymRoleGuard to providers
apps/api/src/app.module.ts                              add EmailModule + StaffModule
.claude/CLAUDE.md                                       update endpoint inventory + RBAC status
```
