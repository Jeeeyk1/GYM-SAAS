Current System vs Your Vision
What you described:

Gym owner subscribes → gets web admin + mobile app for members
Members → open app → find gym → log in (via staff invite) → check in/out via QR
Membership expiration → members blocked when expired → owners can track
Community chat → within gym only
AI feature → future (strategy needed)
Sales / announcements → future
Reality check — what's built vs what's missing:

┌──────────────────────────────────────────────────────────────────────┐
│  BACKEND API (NestJS)                                                │
│                                                                      │
│  ✅ Auth (login, invite, accept, refresh, logout, self-register)     │
│  ✅ Gym creation (full transaction with roles, features, invite)     │
│  ✅ Staff CRUD + invite flow + email                                 │
│  ✅ Member CRUD + invite flow + email                                │
│  ✅ Check-in system (3 methods + checkout + QR + auto-checkout cron) │
│  ✅ Feature flag system (toggle per gym, per-gym config override)    │
│  ✅ GymRoleGuard on all controllers                                  │
│  ✅ Email service (Resend, graceful fallback)                        │
│                                                                      │
│  ❌ Feature override API (GET/PATCH /features) — Phase 1.5           │
│  ❌ Announcements module (DB table EXISTS, service = zero)           │
│  ❌ Community chat (DB tables EXIST, service = zero)                 │
│  ❌ Sales / billing tracking — tables don't exist                   │
│  🔴 Membership expiration — field doesn't exist in DB at all        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  WEB DASHBOARD (Next.js)                       ❌ Not started        │
│                                                                      │
│  Missing: /activate page, login, member list, check-in history,     │
│  staff management, feature toggles, announcements                    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  MOBILE APP (Expo)                             ❌ Not started        │
│                                                                      │
│  Missing: gym finder, member login, QR scanner, check-in history,   │
│  community chat, membership status, profile                          │
└──────────────────────────────────────────────────────────────────────┘
Critical Gap: Membership Expiration Doesn't Exist
This is your #1 stated requirement — "once expired, they cannot use the application" — and it is completely absent from the database schema.

The members table has:

membershipType (freeform varchar — e.g. "monthly", "annual") — just a label
status (active/inactive/suspended/pending) — manual, no automation
joinedAt — just when they joined
What's missing:


membership_expires_at  TIMESTAMPTZ  -- when does their current membership end?
membership_started_at  TIMESTAMPTZ  -- when did the current period start?
Without membership_expires_at, the system cannot:

Block expired members from checking in
Show members their expiration date in the mobile app
Send renewal reminders
Give gym owners an "expiring soon" dashboard view
Calculate if a member is in grace period or fully lapsed
This needs a new migration before the mobile app is built, otherwise you build the UI against a foundation that doesn't support the core business rule.

The Flow as It Should Work (Your Vision, Mapped to Code)

1. MEMBER OPENS MOBILE APP
   → "Enter your gym" screen
   → Types gym slug or scans a gym QR code
   → App calls GET /clients/:slug (exists ✅)
   → Gym found → shows gym branding / name

2. MEMBER LOGS IN
   → Has already accepted invite (POST /auth/accept-invite ✅)
   → POST /auth/login + x-gym-slug header
   → Gets JWT → stored securely (no AsyncStorage for tokens ✅)
   → App shows: membership type, expiration date, loyalty points
   ← ❌ expiration date field doesn't exist

3. MEMBER CHECKS IN
   → Scans gym QR or shows personal QR
   → POST /checkins (3 methods ✅)
   → ❌ NOT YET: system should reject if membership_expires_at < now()
   → Behavior registry runs → loyalty points, welcome message
   → App shows: "Checked in! You have X loyalty points"

4. MEMBERSHIP EXPIRES
   → ❌ No cron job sending "your membership expires in 3 days" email
   → ❌ No enforcement at check-in
   → ❌ No "expired" state blocking app access

5. COMMUNITY CHAT
   → Member opens chat tab in app
   → Sees gym-wide channel (chat_rooms table exists ✅)
   → ❌ No WebSocket service, no REST fallback, no controller

6. GYM OWNER — WEB DASHBOARD
   → ❌ Entire web app not started
   → Can't log in, can't see members, can't manage anything via UI
Suggested Improvements (What Makes Gym Owners Pay)
These are ranked by business impact — what will actually sell the product:

Tier 1 — Table Stakes (Must Have Before Launch)
1. Membership expiration system
New migration: add membership_expires_at + membership_started_at to members.

Check-in guard: if membership_expires_at < now() → 403 "Membership expired"
Renewal: PATCH /members/:id already exists, just add the field
3-day and 1-day expiry reminder emails (extend the cron scheduler already there)
Member sees their expiry date in the mobile app
2. Gym finder on mobile
When a new member opens the app, they need to find their gym. Currently GET /clients/:slug requires knowing the exact slug. You need either:

A GET /clients?search=ironforge fuzzy search endpoint, OR
A gym join code (6-character code) that maps to the gym's slug — simpler, what most gym apps do (e.g. Mindbody, Glofox use gym codes)
3. Web dashboard — your gym owners have no interface right now

Tier 2 — Strong Differentiators (Drives Upgrade Revenue)
4. Announcements module — tables already exist, just needs service + controller + push notification trigger


POST /announcements  { title, body, isPinned, publishedAt }  → gym_owner, gym_admin
GET  /announcements                                           → all gym users
5. Attendance analytics
Give gym owners insight they can't get from a paper log:

Peak hours heatmap (busiest times of day per day of week)
Member frequency: "Active" / "At Risk" / "Lapsed" (based on check-in frequency)
Retention rate by membership type
These are mostly aggregation queries on check_ins — low build cost, high perceived value
6. Community chat — DB is ready, needs a WebSocket module (Phase 1.9 in roadmap)

Tier 3 — Premium Plan Features (Justify Higher Pricing)
7. Loyalty program upgrade
Points already exist (loyalty_points column, LoyaltyPointsBehavior already runs). Build on top:

Redemption for free days, merchandise discounts
Streak tracking ("5 visits this week!")
Leaderboard (top members by points this month) — drives social engagement
8. Multi-location support
One gym owner, multiple gym branches — all under one account. This is a future architectural concern (currently 1 identity = roles at multiple clients), but the data model already supports it.

AI Feature Strategy
Here's my honest take as a principal engineer. Don't build generic AI. Build AI that directly solves the gym owner's #1 problem: member churn.

The average gym loses 30-50% of members per year. If your AI helps them keep even 5% more members, that's thousands of dollars in retained revenue per gym. That's your pitch.

What to build (2 features, high ROI, low build cost):

AI Feature 1 — Churn Prediction + Automated Re-engagement

How it works:
─ Cron job runs daily
─ Finds members who: haven't checked in for 10+ days AND membership is active
─ Groups by severity: "at risk" (10-20 days), "lapsing" (20-30 days), "churned" (30+ days)
─ For each "at risk" member → calls Claude API:
    "Write a warm, motivating re-engagement email for [firstName] who hasn't
     been to [gymName] in [X] days. Their membership type is [type]. 
     Keep it under 100 words, no pressure, focus on how they feel when
     they come back."
─ Sends via Resend (EmailService already wired)
─ Logs to audit_logs (already exists)
This is low-code (uses your existing email + scheduler + audit system), but it's a feature gym owners will tell other gym owners about.

Plan: gate this behind the enterprise plan.

AI Feature 2 — Personalized Check-in Welcome Messages
You already have WelcomeMessageBehavior in the behavior registry. Upgrade it:


Current:  "Welcome back, John!"
Upgraded: Claude API call with context:
          - member name
          - visit count this month
          - last visit date
          - loyalty points
          → "Hey John! 4 visits this week — you're crushing it! 🔥 
             You're 50 points away from a free protein shake."
This runs at check-in time and is returned in the API response — the mobile app displays it. Zero new infrastructure needed. Just swap the behavior's output to call Claude API.

Gate this behind pro and enterprise plans.

Revised Roadmap
Given everything above, here's the order I'd do it:

Phase	What	Why
1.5	Feature override API (GET/PATCH /features)	Unlocks feature toggles for gym owners
1.6	Web dashboard: activation page + owner login + member list	Unblocks gym owners from using the product at all
1.7 NEW	Membership expiration migration + check-in enforcement + reminder emails	Your #1 stated requirement. Must be done before mobile launch
1.8	Announcements module (DB already exists)	Quick win — 1 day of work, high value
1.9	Mobile app (Expo): gym finder, member login, QR check-in, membership status	The member-facing product
2.0	Community chat (WebSocket on existing tables)	Add to mobile app
2.1	Attendance analytics dashboard (aggregation queries on existing data)	Upsell gym owners on insights
2.2	AI: Churn re-engagement + personalized check-in messages	Premium plan differentiator
2.3	Loyalty redemption + Stripe for member payments	Revenue flow for gym owners
2.4	GymSaaS billing (Stripe subscription for platform)	Your own revenue model
The single most important thing to build next: The membership expiration system + the web dashboard. Without those two, you can't do a real demo to a gym owner. Want me to start on the membership expiration migration?