## Summary
Refactor tenant model:
- Replace legacy `clients` table with `organizations`.
- Introduce multi‑branch support via `branches`.
- Migrate all FKs from `client_id` → `organization_id`.
- Move `plan` column into new `subscriptions` table.
- Update associated profile and feature tables.
## Motivation
The old single‑tenant `client` model could not support multi‑branch organizations.
This migration enables:
- Enterprise gyms with multiple branches.
- Structured subscriptions and plan limits.
- Cleaner feature toggling per organization.
---
## Phase 1 — Schema Creation
**New tables:**
1. `organizations`
   - `id UUID PK`
   - `slug`, `name`, `status`, `is_demo`
   - `created_at`, `updated_at`
2. `organization_profiles`
   - `organization_id UUID FK`
   - `address`, `phone`, `email`
   - `logo_url`, `brand_color`, `timezone`, `operating_hours`, `metadata`
3. `branches`
   - `id UUID PK`
   - `organization_id UUID FK`
   - `name`, `address`, `is_active`, timestamps
4. `subscriptions`
   - `organization_id UUID FK UNIQUE`
   - `plan`, `max_members`, `max_branches`, `ai_token_limit`
   - `expires_at`, `auto_renew`, `created_at`
---
## Phase 2 — Data Backfill
1. **organizations**
   ```sql
   INSERT INTO organizations (id, slug, name, status, created_at, updated_at)
   SELECT id, slug, name, status, created_at, updated_at FROM clients;
organization_profiles

sql


INSERT INTO organization_profiles (organization_id, address, phone, email, timezone, logo_url, brand_color, operating_hours, metadata)
SELECT id, address, phone, email, timezone, logo_url, brand_color, operating_hours, metadata FROM client_profiles;
branches

For each organization, create a default branch:
sql


INSERT INTO branches (id, organization_id, name, is_active, created_at)
SELECT gen_random_uuid(), id, name || ' — Main Branch', TRUE, now()
FROM organizations;
subscriptions

Carry forward existing plan data:
sql


INSERT INTO subscriptions (organization_id, plan, created_at)
SELECT id, plan, created_at FROM organizations;

Phase 3 — Foreign Key Updates
Old Table	Old Column	New Column	Notes
client_features	client_id	organization_id	Cascades update
client_feature_overrides	client_id	organization_id	—
members	client_id	organization_id	Add branch_id nullable, default = main branch
staff	client_id	organization_id	Add branch_id nullable
check_ins	client_id	organization_id	—
audit_logs	client_id	organization_id	optional
invites	client_id	organization_id	—
SQL example:

sql


ALTER TABLE members ADD COLUMN organization_id UUID;
UPDATE members m SET organization_id = c.id
FROM clients c WHERE m.client_id = c.id;
ALTER TABLE members DROP COLUMN client_id;
ALTER TABLE members ADD COLUMN branch_id UUID NULL REFERENCES branches(id);
Phase 4 — Code & API Updates
Rename all references client → organization.
Refactor TenantContextMiddleware to resolve by x-org-slug.
Update DTOs & routes:


/clients/:slug → /organizations/:slug
/client-profile → /organization-profile
Adjust guards:
GymRoleGuard → use organization_id.
Update TypeORM entities & repositories.
Phase 5 — Testing
Unit tests: AuthService, GymRoleGuard, MembersService under new org context.
Integration tests:
Create org → create branch → add member/staff → perform check‑in.
Validate data continuity between old and new tenant models.
Phase 6 — Clean‑up
After verification:

Drop old tables:
sql


DROP TABLE IF EXISTS clients, client_profiles CASCADE;
Remove legacy fields:
client_id columns
obsolete joins
Phase 7 — Docs & Communication
Update CLAUDE.md (✅ done)
Update docs/architecture/SystemOverview.md ERD
Notify frontend team of new endpoint paths
Update seed scripts (pnpm seed) for roles and default org setup
Archive this revision after successful deployment


---
### ✅ Result of this File
- Self‑contained instruction manual for both engineers and AI assistants.  
- Step‑by‑step executable plan for human‑supervised migration.  
- LLMs will quote this file instead of guessing transition logic.
---
## 📘 3. Prompts to Use With Claude (or AI agent) per Step
| Stage | Example Prompt | Expected Output |
|--------|----------------|----------------|
| **Schema Drafting** | “Using `revision-2024-05-org-branch-migration.md`, generate the `CREATE TABLE` SQL for organizations, branches, and subscriptions with all constraints and indexes.” | SQL migration script |
| **Data Backfill** | “Write PostgreSQL data‑migration SQL to backfill new tables from clients and client_profiles as per the revision file.” | Verified backfill code |
| **Entity Update** | “Create new NestJS entity classes for Organization, Branch, and Subscription, aligned with the new schema.” | `.entity.ts` files |
| **API Refactor** | “Refactor existing ClientsModule into OrganizationsModule: update controllers, services, and DTOs.” | Refactored module stubs |
| **Post‑Migration Tests** | “Suggest unit and integration test cases verifying membership creation and tenant isolation under the new org/branch model.” | Jest test outlines |
> Tip: Run these prompts one at a time while referencing the same `revision` doc to keep the model grounded.  
---
## 🧠 4. Future Revisions (Plan Ahead)
| Revision | Purpose | Notes |
|-----------|----------|-------|
| `revision-2024-06-subscriptions-features.md` | Enhance subscription enforcement + feature gating | Introduce `FeatureResolverV2`, limits middleware |
| `revision-2024-07-cleanup-and-deprecations.md` | Remove unused tables (permissions, announcements v1) | Final cleanup before Phase 2 features |
| `revision-2024-08-AI-coach-layer.md` | Add `cached_ai_responses` + `ai_usage_logs` | Optimize LLM token usage |
---
## 🧩 5. Optional Stub Templates
To simplify adding future revision files, create a reusable empty template:
`docs/revision/_TEMPLATE.md`
```markdown
# Revision YYYY-MM — <Short Title>
## Summary
<What change will accomplish>
## Motivation
<Why change is required>
## Migration Plan
1. Schema changes
2. Data migration
3. API updates
4. Testing
5. Cleanup
## Backfill / Rollback Notes
<How to reverse or verify>
## Dependencies
<List dependent revisions or modules>
## Verification Checklist
- [ ] Migrations applied twice idempotently
- [ ] API tests passed
- [ ] Web/Mobile integrations verified