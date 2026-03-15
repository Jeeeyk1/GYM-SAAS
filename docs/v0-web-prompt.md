# GymSaaS Web — v0 Build Prompt

This document is split into prompts to feed into v0.dev **one section at a time**.
Start with the Design System prompt, then move to each page group in order.

---

## Color Palette Recommendation

**Theme: "Iron" — Deep black + vivid red + clean white**

This palette signals premium, serious, high-performance — exactly what gym owners want to project to their members.

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#080808` | Page background |
| `surface` | `#111111` | Cards, panels |
| `surface-elevated` | `#1C1C1E` | Modals, dropdowns, hover states |
| `border` | `#272727` | All borders and dividers |
| `primary` | `#E53935` | CTAs, active states, badges |
| `primary-hover` | `#EF5350` | Hover on primary elements |
| `text-primary` | `#FAFAFA` | Main body text |
| `text-muted` | `#71717A` | Labels, secondary text |
| `success` | `#22C55E` | Active/checked-in status |
| `warning` | `#F59E0B` | Invited/pending status |
| `destructive` | `#EF4444` | Errors, delete actions |

---

## Folder Structure

Tell v0 to generate files in this exact structure:

```
apps/web/src/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx              # Marketing layout: top nav + footer
│   │   └── page.tsx                # Landing page
│   ├── (auth)/
│   │   ├── layout.tsx              # Centered card layout, no sidebar
│   │   ├── login/page.tsx          # Gym user login
│   │   ├── admin/login/page.tsx    # Platform admin login (separate)
│   │   └── activate/page.tsx       # Accept invite — set password
│   ├── (platform)/
│   │   ├── layout.tsx              # Platform admin layout: sidebar + topbar
│   │   └── admin/
│   │       ├── page.tsx            # Gyms list dashboard
│   │       └── gyms/new/page.tsx   # Create gym form
│   ├── (gym)/
│   │   ├── layout.tsx              # Gym layout: sidebar + topbar + gym context
│   │   └── [gymSlug]/
│   │       ├── page.tsx            # Gym dashboard overview
│   │       ├── members/
│   │       │   ├── page.tsx        # Members list
│   │       │   └── [id]/page.tsx   # Member detail
│   │       ├── staff/
│   │       │   └── page.tsx        # Staff management
│   │       ├── check-ins/
│   │       │   └── page.tsx        # Check-in history + active board
│   │       └── settings/
│   │           └── page.tsx        # Gym profile settings
│   ├── layout.tsx                  # Root layout: fonts, providers
│   └── globals.css
├── components/
│   ├── ui/                         # shadcn/ui base components
│   ├── layout/
│   │   ├── platform-sidebar.tsx
│   │   ├── gym-sidebar.tsx
│   │   └── topbar.tsx
│   ├── members/
│   │   ├── member-table.tsx
│   │   └── create-member-dialog.tsx
│   ├── staff/
│   │   ├── staff-table.tsx
│   │   └── invite-staff-dialog.tsx
│   └── check-ins/
│       ├── active-members-board.tsx
│       └── check-in-table.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts               # Axios instance with auth interceptor
│   │   ├── auth.ts                 # login, adminLogin, acceptInvite, refresh
│   │   ├── admin.ts                # createGym, listGyms
│   │   ├── members.ts              # CRUD + gymContext
│   │   ├── staff.ts                # CRUD
│   │   └── check-ins.ts            # checkIn, history, active
│   ├── stores/
│   │   └── auth.store.ts           # Zustand: access token + user in memory
│   └── utils.ts                    # cn(), formatDate(), formatMemberNumber()
├── middleware.ts                   # Route protection + redirect logic
└── types/
    └── index.ts                    # Re-export from @gym-saas/shared-types
```

---

## Prompt 1 — Design System + Tailwind Config

```
Build the Tailwind CSS config and global CSS for a gym SaaS platform called GymSaaS.

Tech stack: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui.

Color palette (dark theme only — no light mode):
- background: #080808
- surface (cards/panels): #111111
- surface-elevated (modals/dropdowns): #1C1C1E
- border: #272727
- primary red: #E53935
- primary red hover: #EF5350
- text: #FAFAFA
- text-muted: #71717A
- success green: #22C55E
- warning amber: #F59E0B
- destructive: #EF4444

In tailwind.config.ts:
- Extend colors with the tokens above
- Font: Inter from Google Fonts, set as default sans-serif

In globals.css:
- Apply background color to html and body
- Set text to #FAFAFA globally
- Style scrollbars: thin, track #111111, thumb #272727

Also generate the root app/layout.tsx that:
- Loads Inter font from next/font/google
- Wraps children in a ReactQueryProvider (client component at lib/providers.tsx)
- Sets metadata: title "GymSaaS", description "Multi-tenant gym management platform"
```

---

## Prompt 2 — Landing Page

```
Build the marketing landing page for GymSaaS at app/(marketing)/page.tsx.

Layout: Full-width dark page. Components in order from top to bottom.

1. TOP NAV (sticky)
   - Left: "GymSaaS" wordmark in white, bold. The "Gym" in white and "SaaS" in #E53935.
   - Right: "Sign in" ghost button + "Get Started" primary red button
   - Background: #080808 with a 1px bottom border #272727

2. HERO SECTION
   - Large headline (72px bold): "Run Your Gym. Not Spreadsheets."
   - Sub-headline (20px muted): "GymSaaS gives gym owners a complete platform to manage members, staff, check-ins, and more — all in one place."
   - Two CTA buttons: "Start Free Trial" (primary red) + "See How It Works" (ghost)
   - Background: subtle radial gradient from #1a0000 at center fading to #080808
   - No hero image — use clean typographic layout

3. STATS BAR (full-width dark strip)
   - 3 stats in a row: "500+ Gyms", "50K+ Members Managed", "99.9% Uptime"
   - Each stat: large number in red, label in muted text
   - Thin border top and bottom

4. FEATURES GRID (3 columns on desktop, 1 on mobile)
   - Title section: "Everything your gym needs"
   - 6 feature cards with icon, title, and 1-line description:
     1. Smart Check-ins — "QR codes, manual, or self-scan. Members check in in seconds."
     2. Member Management — "Full member profiles, membership types, loyalty points."
     3. Staff Control — "Invite your team with role-based access. Owner, admin, or front desk."
     4. Real-Time Board — "See who's currently in the gym at a glance."
     5. Invite-Only Accounts — "Every account starts with a secure invite. No random sign-ups."
     6. Feature Flags — "Turn features on or off per gym. Scales with your plan."
   - Cards: background #111111, border #272727, icon in red

5. HOW IT WORKS (3 steps, horizontal on desktop)
   - Title: "Up and running in minutes"
   - Step 1: "Platform admin creates your gym" — icon: building
   - Step 2: "You receive an activation email" — icon: mail
   - Step 3: "Log in and start managing" — icon: check-circle
   - Each step has a large step number in red, title, and description

6. PLANS SECTION (3 cards)
   - Title: "Simple, transparent pricing"
   - Three plan cards: Starter, Growth, Enterprise
   - Growth card should be highlighted with a red border and "Most Popular" badge
   - Each card: plan name, price placeholder ("Contact us"), bullet list of 4-5 features
   - CTA button on each card

7. FOOTER
   - Left: GymSaaS wordmark + "Built for serious gyms."
   - Right: links — Privacy, Terms, Contact
   - Bottom row: "© 2026 GymSaaS. All rights reserved."
   - Background: #080808, top border #272727
```

---

## Prompt 3 — Auth Pages

```
Build three auth pages for a gym SaaS platform. All use a centered card layout with
a dark background (#080808). The card is #111111 with border #272727, max-width 420px.

Tech: Next.js 14 App Router, TypeScript, React Hook Form, Zod, shadcn/ui.

1. app/(auth)/login/page.tsx — GYM USER LOGIN
   - Title: "Sign in to your gym"
   - Fields: Email, Password (with show/hide toggle)
   - Submit button: "Sign In" (full width, primary red)
   - Below form: "Forgot password?" link (muted, placeholder only — no implementation)
   - On submit: POST to /auth/login { email, password }
   - On success: store access token in auth store (Zustand), redirect to /[gymSlug]/
   - Note: the gym slug is determined from the x-gym-slug header which comes from
     the user's gym context (fetched after login from GET /me/gym-context)
   - Error: show inline error "Invalid email or password"

2. app/(auth)/admin/login/page.tsx — PLATFORM ADMIN LOGIN
   - Same layout but title: "Platform Admin"
   - Small badge above title: "INTERNAL" in red
   - Fields: Email, Password
   - On submit: POST to /auth/admin/login { email, password }
   - On success: redirect to /admin

3. app/(auth)/activate/page.tsx — ACCEPT INVITE (set password)
   - Title: "Activate your account"
   - Sub: "Set a password to complete your account setup."
   - Token is read from URL query param: ?token=xxx
   - Fields: Password, Confirm Password
   - Password rules shown as checklist below field: 8+ chars, one number
   - Submit: "Activate Account" (full width, primary red)
   - On submit: POST to /auth/accept-invite { token, password }
   - On success: redirect to /login with a success toast

All pages share app/(auth)/layout.tsx:
- Background: #080808
- Centered vertically and horizontally
- GymSaaS wordmark at top of card in large text
- "Gym" white + "SaaS" red
```

---

## Prompt 4 — Platform Admin Dashboard

```
Build the platform admin area for a gym SaaS. This is used by the super admin
to manage all gyms on the platform.

Tech: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query.

LAYOUT: app/(platform)/layout.tsx
- Dark sidebar (background #080808, border-right #272727), width 240px
- Sidebar items:
  - GymSaaS logo at top (wordmark, Gym white + SaaS red)
  - Nav item: "Gyms" (building icon) — links to /admin
  - Nav item: "Settings" (settings icon) — placeholder
- Active nav item: red left border + slightly lighter background (#1C1C1E)
- Top bar: right-aligned user email + "Sign Out" button
- Main content area: background #080808, padding 32px

PAGE 1: app/(platform)/admin/page.tsx — GYMS LIST
- Page title: "Gyms"
- Top right: "Add Gym" button (primary red)
- Stats row (3 cards):
  - Total Gyms (count)
  - Active Gyms (status = active)
  - Onboarding (status = onboarding)
  - Card style: background #111111, border #272727
- Data table with columns:
  - Name + slug (stacked, slug in muted smaller text)
  - Plan (badge: starter=gray, growth=blue, enterprise=purple)
  - Status (badge: onboarding=amber, active=green, suspended=red)
  - Created At (formatted date)
  - Actions: "View" icon button
- Fetch data: GET /admin/gyms
  - Requires Bearer token (from Zustand auth store)
  - No x-gym-slug header needed
- Empty state: icon + "No gyms yet. Create your first gym."
- Loading state: skeleton rows

PAGE 2: app/(platform)/admin/gyms/new/page.tsx — CREATE GYM FORM
- Page title: "Create New Gym"
- Breadcrumb: Gyms > New Gym
- Two-column layout on desktop (form fields left, summary right)
- LEFT — Form sections with dividers:
  Section "Gym Details":
    - Gym Name (required text)
    - Slug (required, lowercase alphanumeric + hyphens, auto-generated from name with edit button)
    - Plan selector: radio cards for Starter / Growth / Enterprise
  Section "Gym Owner":
    - First Name (required)
    - Last Name (required)
    - Email (required)
  Section "Gym Profile (Optional)":
    - Address (text)
    - Phone (text)
    - Timezone (select dropdown: common timezones list)
- RIGHT — Summary card:
  - Shows entered gym name + plan as a preview
  - Note: "An activation email will be sent to the owner automatically."
- Bottom: "Create Gym" button (primary red, full width on mobile)
- On submit: POST /admin/gyms with all fields
- On success: redirect to /admin with a success toast showing the gym name
- On error: inline field errors from API (e.g. slug already taken)
```

---

## Prompt 5 — Gym Staff Dashboard

```
Build the gym staff dashboard area. This is used by gym_owner, gym_admin, and front_desk
staff to manage their specific gym.

Tech: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query.

IMPORTANT: All API calls to gym-scoped endpoints must include the header x-gym-slug
set to the current gymSlug from the URL params. This is handled in the API client
interceptor which reads gymSlug from the URL.

LAYOUT: app/(gym)/layout.tsx
- Client component (needs to read params)
- Sidebar (240px, #080808, border-right #272727):
  - Top: gym name (fetched from context) + gym slug in muted text
  - Nav items with icons:
    - Dashboard (home icon) → /[gymSlug]
    - Members (users icon) → /[gymSlug]/members
    - Staff (user-check icon) → /[gymSlug]/staff
    - Check-ins (calendar icon) → /[gymSlug]/check-ins
    - Settings (settings icon) → /[gymSlug]/settings
  - Active item: red left border + #1C1C1E bg
  - Bottom: user email + sign out
- Topbar: breadcrumb on left, user avatar/name on right

PAGE 1: app/(gym)/[gymSlug]/page.tsx — DASHBOARD OVERVIEW
- Fetch: GET /me/gym-context (with x-gym-slug header)
- Stats cards row (4 cards):
  - Total Members
  - Active Members (status = active)
  - Check-ins Today (count from today's date)
  - Staff Members
  - Card: #111111 bg, #272727 border, large number, icon top-right
- Active Members Board (if feature enabled — check resolvedFeatures['checkin.active_members_board']):
  - Title: "Currently In Gym"
  - Fetch: GET /checkins/active-members
  - Small member name pills (avatar initials + name + checked-in time)
  - If no active members: "Gym is empty right now"
- Recent Check-ins table:
  - Last 10 check-ins (GET /checkins?page=1&limit=10)
  - Columns: Member Name, Check-in Time, Check-out Time, Method (badge)
  - Method badge colors: manual=gray, qr_staff_scan=blue, qr_self_scan=green

PAGE 2: app/(gym)/[gymSlug]/members/page.tsx — MEMBERS LIST
- Page title: "Members"
- Top bar: search input (client-side filter) + "Add Member" button (red)
- Fetch: GET /members
- Table columns:
  - Member (avatar initials + name + member number in muted)
  - Membership Type (badge or plain text, nullable)
  - Status (badge: active=green, inactive=gray, suspended=red, pending=amber)
  - Loyalty Points (number with star icon)
  - Joined At (formatted date)
  - Actions: "View" button
- ADD MEMBER DIALOG (opens on "Add Member" click):
  - Trigger: POST /members
  - Fields: First Name, Last Name, Email, Membership Type (optional select)
  - On success: close dialog, refetch members, show toast "Member created. Invite email sent."
  - The inviteToken is returned by API but NOT shown in the UI (email handles delivery)

PAGE 3: app/(gym)/[gymSlug]/staff/page.tsx — STAFF MANAGEMENT
- Note: this page is only meaningful for gym_owner and gym_admin roles
- Page title: "Staff"
- Top right: "Invite Staff" button (red) — only show if user has gym_owner or gym_admin role
- Fetch: GET /staff
- Table columns:
  - Name (avatar initials + first + last)
  - Role (badge: gym_owner=purple, gym_admin=blue, front_desk=gray)
  - Status (badge: active=green, invited=amber, inactive=gray)
  - Actions: "Deactivate" button (red outline, only for gym_owner, only for non-owner staff)
- INVITE STAFF DIALOG:
  - Trigger: POST /staff
  - Fields:
    - First Name, Last Name, Email
    - Role: radio or select — "Admin" (gym_admin) or "Front Desk" (front_desk)
    - Title (optional)
  - On success: close dialog, refetch, show toast "Invitation sent to [email]"

PAGE 4: app/(gym)/[gymSlug]/check-ins/page.tsx — CHECK-IN HISTORY
- Page title: "Check-ins"
- Two tabs: "History" + "Active Now"
- HISTORY TAB:
  - Filter bar: date range picker + member search
  - Fetch: GET /checkins?page=1&limit=20 (with pagination)
  - Table: Member, Check-in Time, Check-out Time (or "Still in" badge), Method, Duration
  - Pagination controls at bottom
- ACTIVE NOW TAB:
  - Fetch: GET /checkins/active-members
  - Grid of member cards: avatar initials (large), name, "In since HH:MM AM"
  - Each card has a "Check Out" button → POST /checkins/:id/checkout
  - Auto-refresh every 30 seconds
  - Empty state: large icon + "No members currently checked in"

PAGE 5: app/(gym)/[gymSlug]/settings/page.tsx — GYM SETTINGS
- Page title: "Settings"
- Read-only display of gym profile info fetched from GET /clients/:slug
- Sections (read-only for now, edit will be Phase 1.5):
  - Gym Name, Slug, Plan badge
  - Address, Phone, Timezone
  - Owner contact
- Note at bottom: "Feature configuration coming in a future update."
```

---

## API Client Setup Notes

Tell v0 to generate `lib/api/client.ts` with these requirements:

```
Build an Axios API client for a Next.js app calling a NestJS REST API.

Base URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
Credentials: true (for httpOnly refresh cookie)

Access token storage: Zustand store in memory only — NEVER localStorage.

Request interceptor:
1. Attach Authorization: Bearer <accessToken> from Zustand auth store (skip if no token)
2. Attach x-gym-slug header from a parameter passed per-call OR from a React context
   that reads the current gym slug from the URL pathname using next/navigation usePathname

Response interceptor:
1. On 401: attempt token refresh via POST /auth/refresh (no body needed — uses httpOnly cookie)
2. If refresh succeeds: retry the original request with new access token
3. If refresh fails: clear auth store, redirect to /login

Auth store (Zustand, lib/stores/auth.store.ts):
- State: accessToken: string | null, user: { sub, email, accountType, platformRole } | null
- Actions: setAuth(token, user), clearAuth()
- Never persist to localStorage or sessionStorage
```

---

## Key API Contracts

For v0 to generate correct types, include these shapes:

### Auth
```typescript
// POST /auth/login
body: { email: string; password: string }
response: { accessToken: string; refreshToken: string }

// POST /auth/admin/login
body: { email: string; password: string }
response: { accessToken: string; refreshToken: string }

// POST /auth/accept-invite
body: { token: string; password: string }
response: { accessToken: string; refreshToken: string }
```

### Admin
```typescript
// POST /admin/gyms
body: {
  slug: string; name: string; ownerEmail: string;
  ownerFirstName: string; ownerLastName: string;
  plan?: 'starter' | 'growth' | 'enterprise';
  address?: string; phone?: string; timezone?: string;
}
response: { client: Gym; ownerStaff: Staff; inviteToken: string }

// GET /admin/gyms
response: Gym[]
```

### Members
```typescript
// GET /members  (requires x-gym-slug)
response: Member[]

// POST /members
body: { firstName: string; lastName: string; email: string; membershipType?: string }
response: { member: Member; inviteToken: string }
// Note: inviteToken is NOT shown in the UI — email handles delivery
```

### Staff
```typescript
// GET /staff  (requires x-gym-slug)
response: Staff[]

// POST /staff
body: { firstName: string; lastName: string; email: string; role: 'gym_admin' | 'front_desk'; title?: string }
response: { staff: Staff; inviteToken: string }
// Note: inviteToken is NOT shown in the UI — email handles delivery

// DELETE /staff/:id
response: Staff  // status set to 'inactive'
```

### Check-ins
```typescript
// GET /checkins  (requires x-gym-slug)
query: { memberId?: string; page?: number; limit?: number }
response: { data: CheckIn[]; total: number; page: number; limit: number }

// GET /checkins/active-members  (requires x-gym-slug)
response: Array<{ memberId: string; firstName: string; lastName: string; checkedInAt: string }>

// POST /checkins/:id/checkout
response: CheckIn
```

### Gym Context
```typescript
// GET /me/gym-context  (requires x-gym-slug)
response: {
  currentGym: Gym;
  roles: string[];          // e.g. ['gym_owner']
  permissions: string[];
  resolvedFeatures: Record<string, { isEnabled: boolean; config: Record<string, unknown> }>
}
```

---

## Middleware

Tell v0 to generate `middleware.ts`:

```
Build Next.js middleware that:
1. Protects /admin/* routes — redirect to /admin/login if no access token in cookie
   (platform admin uses a separate login; their token is stored in a cookie called 'admin_token')
2. Protects /[gymSlug]/* routes — redirect to /login if not authenticated
3. Allows public access to / (marketing), /login, /admin/login, /activate

For auth checking in middleware, check for the presence of a 'refresh_token' httpOnly cookie.
If the cookie exists, the user is likely authenticated (actual validation happens server-side).
If not, redirect to appropriate login page.
```

---

## Notes for v0

- Use **shadcn/ui** components throughout: Button, Input, Table, Dialog, Badge, Card, Tabs, Select, Form
- All forms use **React Hook Form + Zod** validation
- All data fetching uses **TanStack Query** (useQuery, useMutation)
- Tables should handle **loading skeletons** and **empty states**
- All toasts use **shadcn/ui Sonner** (toast notifications)
- Typography: Inter font, consistent scale — h1 24px, h2 20px, body 14px
- Spacing: consistent 8px grid
- Never use `localStorage` or `sessionStorage` for tokens or auth state
- The gym slug always comes from the URL pathname (`/[gymSlug]/...`) — never from storage
