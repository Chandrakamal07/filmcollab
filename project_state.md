# FilmCollab Technical Project State

Current as of: November 6, 2026  
Workspace: `E:\new-filmcollab`  
Repository: `Chandrakamal07/filmcollab`  
Active Branch: `improvements` (PR #1)

## 1. Overview & Architecture
FilmCollab is a professional networking and creative collaboration platform for the film industry, designed with a bespoke Studio Noir aesthetic.
- **Frontend Stack**: Vite + React 18 + TypeScript, Tailwind CSS, shadcn/ui components, Lucide icons, next-themes.
- **Hero & Media Integration**: Accepted 16:9 vintage golden reel looping video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) with reduced-motion fallback, responsive framing, and Studio Noir layout.
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Supabase Auth, Storage buckets, Realtime).
- **Strictly Typed PostgREST Contracts**: `createClient<Database>` in `src/integrations/supabase/client.ts` with comprehensive typed schemas in `src/integrations/supabase/types.ts` covering 47 tables.
- **End-to-End Encryption**: Web Crypto API (ECDH P-256 key pair generation + AES-GCM 256-bit symmetric encryption) for confidential direct messages.

## 2. Key Directories & Entry Points
- `src/App.tsx`: Central application routing, route guards (`PublicRoute`, `ProtectedRoute`, `AdminRoute`), and SPA canonical/compatibility redirects.
- `src/pages/Index.tsx`: Public landing page featuring the Golden Reel video hero, craft categories, studio showcase, and verified CTAs.
- `src/pages/auth/`: Canonical authentication routes (`SignIn.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`).
- `src/pages/Dashboard.tsx`: Creator hub featuring user-scoped active project spotlight, live job opportunities, project quick tabs, and activity feed.
- `src/pages/messages/page.tsx`: Direct messaging hub with account-isolated storage, URL query resolution (`?recipient=` & `?u=`), real paginated history, failed message persistence, and retry capability.
- `src/pages/community/`: Guilds and collectives with real search filtering, group chat, real metadata/settings persistence, atomic creation/membership, and forward migration schema.
- `src/pages/StudiosDirectory.tsx`: Production company discovery and registration, multi-user applications persisted to `company_applications`, workspace updates to `companies`, and honest empty states.
- `src/pages/Admin*.tsx`: Admin management suite (Profiles, Users, Posts, Communities, Directory, Locations, Analytics, Notifications) with real DB queries and strict UUID validation.

## 3. Repository Functional Audit & Repair Status

### A. Code Review Findings (B01–B18) Resolution Matrix

| Finding ID | Scope & Title | Severity | Status | Verification & Architectural Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **B01** | Missing imports blocking build (`@/lib/supabase`) | Blocker | **VERIFIED** | Replaced phantom `@/lib/supabase` imports in `JobDetails.tsx`, `AdminProfile.tsx`, and `ResetPassword.tsx` with `@/integrations/supabase/client`. Excluded abandoned legacy backup `ProjectDetails.broken.tsx` from `tsconfig.app.json`. Verified via `npx tsc -p tsconfig.app.json --noEmit` and `npm run build`. |
| **B02** | Undefined `setChatMessages` setter in community chat | Critical | **VERIFIED** | Replaced read-only `const chatMessages` with real React state in `GroupDetails.tsx` and `JoinedGroupDetails.tsx`. Connected live query on valid UUID `groupId` from `community_group_messages`. Preserved drafts on failed send. |
| **B03** | Company mapper crash in `StudiosDirectory.tsx` | Critical | **VERIFIED** | Added default empty arrays (`jobs`, `auditions`, `internships`, `projects`, `team`, `reviews`) to mapped database records in `fetchCompanies`; added optional chaining to reducers `(c.auditions?.length || 0)`. |
| **B04** | Admin escalation backdoor & fail-open permissions | High | **VERIFIED** | Removed `registering_admin`, removed email substring search (`email.includes('admin')`), removed `user_metadata.role` self-promotion, removed DB role update to admin. Enforced role strictly from Supabase `user_roles` table. Guest sessions strictly map to `role = 'user'`. |
| **B05** | Community RLS infinite recursion | High | **VERIFIED (SQL)** | Rewrote `20261105000000_create_community_groups.sql` and `20261105000004_comprehensive_security_and_contracts.sql` using non-recursive `SECURITY DEFINER` helpers `is_community_group_member` and `is_community_group_admin` with fixed `SET search_path = public`. |
| **B06** | Self-inserting privileged community roles | High | **VERIFIED (SQL)** | Restricted `community_group_members_insert` policy so self-joining users can only insert `role = 'Member'` into public groups; only group creators can insert `role = 'Owner'`. |
| **B07** | Profile Connect & Message recipient ID mismatch | Medium | **VERIFIED** | In `Profile.tsx`, updated `handleSendMessage` to pass `profile.id` (profiles PK). Updated `handleConnect` to resolve sender's `profiles.id` and recipient's `profile.id` for `connections` insert. In `messages/page.tsx`, added fallback chain checking `id`, `user_id`, and `username`. |
| **B08** | Moderator permission check case/action mismatch | Medium | **VERIFIED** | Updated `AdminPosts.tsx` to check `hasPermission("Posts", "edit")` and `hasPermission("Posts", "delete")`, and `AdminCommunities.tsx` to check `hasPermission("Communities", "delete")`. Normalized in `use-auth.tsx`. |
| **B09** | Admin notification queries mismatch & error swallowing | Medium | **VERIFIED** | Aligned queries in `admin-topbar.tsx` and `AdminNotifications.tsx` with `setup_notifications.sql`: query `notifications` by `user_id = profile.id`, update `{ status: 'read' }`, inspect errors with user feedback, and provide honest empty state with no mock fallbacks. |
| **B10** | Directory/Locations blocking visibility & missing migration | Medium | **VERIFIED** | Updated migration `20261105000001_fix_directory_files_admin_policy.sql` and `20261105000004_comprehensive_security_and_contracts.sql`. In `AdminDirectory.tsx` and `AdminLocations.tsx`, verified updated row count. Filtered blocked items from public view; protected direct detail URLs in `locations/details.tsx`. |
| **B11** | Fake trending groups with numeric IDs in `community/page.tsx` | Medium | **VERIFIED** | Replaced hardcoded groups with live fetch from `community_groups`. Added honest empty states. Wired "Create Group" dialog to insert into `community_groups` and add creator as `role = 'Owner'` in `community_group_members`. |
| **B12** | AdminProfile targeting auth UID against profiles PK | Medium | **VERIFIED** | Updated `AdminProfile.tsx` to target `profiles` by `profile.id` (or `user_id`), verified updated row count with `.select()`, called `refreshProfile()`, and queried real `tickets` table instead of non-existent `support_tickets`. |
| **B13** | Direct messages decryption failure on older messages | Medium | **VERIFIED** | In `messages/page.tsx`, integrated E2EE ECDH/AES-GCM decryption into `loadOlder` pagination and eliminated un-scoped global localStorage fallback in `loadLocalData`. Persisted failed delivery state with retry button. |
| **B14** | Swallowed studio registration errors & cache fallback | Medium | **VERIFIED** | In `StudiosDirectory.tsx`, required authentication for `handleRegisterCompany`, threw on insert failure without creating phantom local company, persisted applications to DB, and removed un-scoped global storage keys. |
| **B15** | JobDetails unauthenticated Edit/Delete & public applicants | Medium | **VERIFIED** | In `JobDetails.tsx`, gated Edit and Delete buttons and the Applicants tab behind `canManage` (`user.id === job.user_id` or admin). Queried real `job_applications` with honest empty state and wired resume/portfolio views. |
| **B16** | Dashboard Files opening Overview & fallback job links | Low | **VERIFIED** | In `Dashboard.tsx`, wired "Files" quick tab to `/directory?project=${featuredProject.id}`, verified valid UUID before linking to `/jobs/${opp.id}`, and wired `directory/page.tsx` to filter by `project_id`. |
| **B17** | Un-routed Terms & Privacy pages | Low | **VERIFIED** | Imported `Terms` and `Privacy` in `src/App.tsx` and registered public routes `/terms` and `/privacy`. |
| **B18** | Dishonest analytics and billing mock data | Low | **VERIFIED** | In `AdminAnalytics.tsx`, dynamically queried `directory_files` and `job_applications`, accurately measured active users against 30-day activity, and labelled uninstrumented metrics as "Not instrumented". In `Billing.tsx`, replaced fake credit card and invoices with honest empty states and preview notice. |

### B. Findings C01–C10 Resolution Matrix

| Finding ID | Scope & Title | Severity | Status | Verification & Architectural Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **C01** | Admin recognition trusts profile/browser state & guest authority | P1 | **VERIFIED** | In `use-auth.tsx`, removed all email substring searches (`email.includes('admin')`) and metadata-based auto-promotion. `isAdmin()` strictly requires an authenticated session and verified `userRole?.role === 'admin'`. Restored guest session always enforces `role = 'user'`. |
| **C02** | Group settings overwrite real group with defaults | P1 | **VERIFIED** | In `GroupDetails.tsx` and `JoinedGroupDetails.tsx`, removed hardcoded default settings initial state. Loaded real group by UUID from DB, initialized settings directly from DB record, and disabled Save button during loading/error states. |
| **C03** | Group creation atomicity and orphan setup | P1 | **VERIFIED** | In `src/pages/community/page.tsx`, added compensation rollback (deleting created group) if creator membership insert fails. Authored forward migration trigger `trg_community_group_creator_member` in `20261105000004_comprehensive_security_and_contracts.sql` to auto-insert owner member atomically on the database level. |
| **C04** | Studio applications & workspace edits local-only | P1 | **VERIFIED** | In `StudiosDirectory.tsx`, persisted applications to `public.company_applications` table with fallback to account-scoped cache only on network failure. Persisted workspace edits to `public.companies`. Queried real incoming applications for studio owners. |
| **C05** | Location blocking direct-access & owner ID mismatch | P1 | **VERIFIED** | In `locations/page.tsx`, fixed ownership check to use `l.created_by === user?.id`. In `locations/details.tsx`, blocked direct URL access for blocked locations with an explicit "Location Unavailable" card. Forward migration authored for RLS enforcement. |
| **C06** | Job applicants hardcoded demo data & unconnected controls | P2 | **VERIFIED** | In `JobDetails.tsx`, eliminated hardcoded demo applicants array. Added live fetch from `public.job_applications` joined with applicant `profiles`. Displayed honest empty state and wired "View Resume" / "View Portfolio" actions. Connected job application form submit to insert into `job_applications`. |
| **C07** | Directory ignores project query parameter | P2 | **VERIFIED** | In `directory/page.tsx`, read `searchParams.get("project")`, included `projectId` in query keys, filtered files by `project_id = projectId`, displayed an active filter badge with clear button, and bound `project_id` in `AddFileDialog.tsx`. |
| **C08** | Admin moderation fake records & invalid UUID success | P2 | **VERIFIED** | In `AdminCommunities.tsx` and `AdminPosts.tsx`, removed initial dummy arrays, added distinct loading and empty states, and strictly validated `isUuid(String(id))` before attempting database updates/deletes, rejecting non-UUID operations. |
| **C09** | Fabricated analytics & billing figures | P2 | **VERIFIED** | In `AdminAnalytics.tsx`, replaced hardcoded applications count with real `public.job_applications` count. Replaced `totalUsers * 0.7` with users active in the last 30 days (`updated_at >= thirtyDaysAgo`). Clearly labeled uninstrumented metrics as "Not instrumented" / "—". In `Billing.tsx`, removed hardcoded renewal dates. |
| **C10** | Failed message delivery state not persisted in chat cache | P2 | **VERIFIED** | In `messages/page.tsx`, persisted `failed: true` message status into local account-scoped cache on send failure via `saveLocalData(updated)`. Added inline retry button and idempotent `handleRetryMessage` function. |

## 4. Build & Production Verification
- **TypeScript**: `npx tsc -p tsconfig.app.json --noEmit` passed with **0 errors**.
- **Production Build**: `npm run build` completed successfully with **0 errors** in **34.48s** (`dist/` generated).
- **Supabase Contract**: Strictly typed client `createClient<Database>` active across all 47 application tables.
- **Forward Migration**: Authored `supabase/migrations/20261105000004_comprehensive_security_and_contracts.sql` covering RLS policies, trigger-based atomic membership, and missing entity schemas.
- **Runtime Dev Server**: Running cleanly at `http://localhost:3000/` with Vite HMR.
- **Design & Media Integrity**: Studio Noir aesthetic and 16:9 vintage golden reel hero video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) fully preserved.


