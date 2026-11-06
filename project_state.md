# FilmCollab Technical Project State

Current as of: November 6, 2026  
Workspace: `E:\new-filmcollab`  
Repository: `Chandrakamal07/filmcollab`  
Active Branch: `improvements` (PR #1)  
Local Working Commit: `088024fd5c005de3887ac1f7fa187cba9374f1c5` + active working tree remediation

## 1. Overview & Architecture
FilmCollab is a professional networking and creative collaboration platform for the film industry, designed with a bespoke Studio Noir aesthetic.
- **Frontend Stack**: Vite 5 + React 18 + TypeScript 5.8, Tailwind CSS, shadcn/ui components, Lucide icons, next-themes.
- **Hero & Media Integration**: Accepted 16:9 vintage golden reel looping video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) with reduced-motion fallback, responsive framing, and Studio Noir layout.
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Supabase Auth, Storage buckets, Realtime).
- **Strictly Typed PostgREST Contracts**: `createClient<Database>` in `src/integrations/supabase/client.ts` with comprehensive typed schemas in `src/integrations/supabase/types.ts`.
- **End-to-End Encryption**: Web Crypto API (ECDH P-256 key pair generation + AES-GCM 256-bit symmetric encryption) with fail-closed security for confidential direct messages.
- **Quality & CI Gate**: Enforced via `.github/workflows/ci.yml`, `npx tsc -b --pretty false` (0 diagnostics), and `npm test` (28 implementation-level assertions across 15 suites).

## 2. Key Directories & Entry Points
- `src/App.tsx`: Central application routing, route guards (`PublicRoute`, `ProtectedRoute`, `AdminRoute`), `/login` compatibility alias, and code-split routes via React.lazy with Suspense fallback.
- `src/pages/Index.tsx`: Public landing page featuring the Golden Reel video hero, craft categories, studio showcase, and verified CTAs.
- `src/pages/auth/`: Canonical authentication routes (`SignIn.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`).
- `src/pages/Dashboard.tsx`: Creator hub featuring user-scoped active project spotlight, live job opportunities, project quick tabs, and activity feed.
- `src/pages/messages/page.tsx`: Direct messaging hub with account-isolated storage, URL query resolution (`?recipient=` & `?u=`), real paginated history, fail-closed E2EE, and idempotent delivery using `client_message_id`.
- `src/pages/community/`: Guilds and collectives with real search filtering, group chat, real metadata/settings persistence, atomic creation/membership, and forward migration schema.
- `src/pages/StudiosDirectory.tsx`: Production company discovery and registration, multi-user applications persisted to `company_applications`, workspace updates to `companies` with awaited outcome verification, and honest empty states.
- `src/pages/Admin*.tsx`: Admin management suite (Profiles, Users, Posts, Communities, Directory, Locations, Analytics, Notifications) with real DB queries, strict UUID validation, and zero-row mutation rejection.

## 3. Master Audit Ledger (M01–M28) Immutable Scope & Status

| ID | Master Audit Scope | Status | Architectural Resolution & Evidence |
| :--- | :--- | :--- | :--- |
| **M01** | Initial group / null pricing crashes | **Fixed** | Guarded initial null loading state in `JoinedGroupDetails.tsx` (`if (!group) ...`). Normalized nullable pricing fields in `locations/page.tsx` and `locations/details.tsx`. Verified by Chromium fixture and unit test. |
| **M02** | Reproducible database baseline / contracts | **Fixed** | Authored bootstrap migration `supabase/migrations/20250108000000_bootstrap_profiles_and_auth.sql` providing clean bootstrap of `public.profiles` with `id UUID DEFAULT gen_random_uuid()` prior to historical FK references. Authored master forward convergence migration `20261106000000_reproducible_baseline_and_security_convergence.sql` defining all 14 tables, columns, defaults, FKs, and RLS policies. |
| **M03** | Project membership / privacy / chat authority | **Fixed** | Restricts self-join role to `'Applicant'`; added `project_members_update_creator` and `delete_creator` policies for creator acceptance/rejection; bound project message sender to profile identity; enforced `visibility = 'public'` for non-members in `projects_select_policy`. |
| **M04** | Social and post row authorization | **Fixed** | Restricts connection updates to `connected_user_id`; restricts connection creation and deletion to requester/recipient; post SELECT enforces `is_published = true` or author ownership; post UPDATE/DELETE strictly author-bound; dropped legacy permissive policies. |
| **M05** | Unsafe repair SQL and policy convergence | **Fixed** | Dropped legacy permissive repair policies from `unblock_rls.sql` (`Anyone can update tickets`, `Anyone can insert ticket updates`), `setup_notifications.sql` (`Anyone can insert notifications`), `create_site_settings.sql`, and `fix_posts_database_complete.sql` post-media storage delete. Replaced with strict owner/admin RLS. |
| **M06** | Distributed privileges, team provisioning / account lifecycle | **Fixed** | In `AdminTeam.tsx`, corrected upsert onConflict target to `user_id,role` matching database constraint `UNIQUE(user_id, role)`. Delete operation deletes only `role = 'admin'` for the target user without wiping other roles. Enforced page-level and action-level authorization in `admin-layout.tsx`. |
| **M07** | DM / project identity and RLS contracts | **Fixed** | Sourced caller identity consistently through `public.profiles.id`. Mapped SELECT, INSERT, and UPDATE (for read receipts) through sender/receiver profile PKs in `messages_update_received` policy. |
| **M08** | Casting creation / applications / saves / limits | **Fixed** | Corrected correlated subquery table aliases to explicit `p.id = casting_applicants.user_id AND p.user_id = auth.uid()` and `p.id = casting_call_saves.user_id`. Dropped all legacy policies by exact name. Enforced call deadline on server. |
| **M09** | Notification identity, authenticity and job trigger | **Fixed** | Updated `handle_new_job_notifications` trigger function to reference `NEW.job_title`. Resolved caller profile IDs across notification writers. Enforced restrictive `notifications_insert_policy` preventing arbitrary notification forgery. |
| **M10** | Real posts / likes / saves / media workflow | **Fixed** | Sourced post feed, likes, and saves from database tables. Removed hardcoded mock fallbacks. Added error handling during storage upload. Added row count verification on unlike and unsave mutations to roll back local state on zero affected rows. |
| **M11** | Server privacy and directory asset access | **Fixed** | Enforced directory asset SELECT policy checking status != 'blocked', tags not containing 'Blocked', uploader profile identity, and admin privileges. Verified storage bucket policies. |
| **M12** | Profile identity / stats / privacy / cache consistency | **Fixed** | Disambiguated `authUserId` and `profileId`. Updated directory files reader in `Profile.tsx` to match uploader identity. Account-scoped cache keys preventing stale profile data leakage across account switches. |
| **M13** | Community approval / post settings / live delivery | **Fixed** | In `community_group_members_insert`, checks group `require_approval`: if true, self-join is inserted with `role = 'Pending'`, requiring Owner approval. In `community_group_messages_insert`, enforces `allow_member_posts` and approved membership (`role != 'Pending'`). |
| **M14** | Encryption fallback and key lifecycle | **Fixed** | Implemented `encryptForRecipientOrThrow` in `src/lib/e2ee.ts` with native Web Crypto ECDH P-256 and AES-GCM 256. Fails closed with descriptive errors on null privateKey, missing recipient key, or malformed key. Both initial send and retry route through this function; zero plaintext transmission. Direct unit tests exercise production module. |
| **M15** | Location enquiry / visit / wishlist / schema contracts | **Fixed** | In `locations/details.tsx`, resolved sender profile ID and receiver profile ID for `messages` insert. Added `property_site_visits` table DDL with visitor and owner RLS policies in forward migration. |
| **M16** | No-op controls and false business outcomes | **Fixed** | Course registration maps `website_link`, validates external HTTP targets, and opens verified provider link. Replaced fake studio verification with review submission notice. Replaced fake message dispatch with mailto dispatch. Added `/login` compatibility alias in `src/App.tsx`. |
| **M17** | Type / lint / CI and meaningful regression tests | **Fixed** | Resolved all 11 TypeScript compiler diagnostics (`npx tsc -b --pretty false` exits with 0 errors). Created `.github/workflows/ci.yml`. Expanded `tests/master_regression.test.mjs` to 28 implementation-level assertions directly executing production crypto and verifying SQL DDL/policies. |
| **M18** | Dependency advisories | **Documented** | Documented advisory scan on lockfile. The 25 advisories primarily affect development tooling (build-time Vite, Rollup, postcss) and optional sub-features. Evaluated non-destructive upgrade paths to avoid breaking active build/runtime. |
| **M19** | Bundle / query / polling performance | **Fixed** | Converted 57 eager page imports in `src/App.tsx` to `React.lazy` with Suspense. Main bundle size optimized to ~732 kB. |
| **M20** | Group creation duplicate Owner rollback | **Fixed** | Verified atomic DB trigger `handle_community_group_creator()` attaches owner on group insert. In `src/pages/community/page.tsx`, checks existing owner row and handles onConflict `group_id,user_id` without destructive group deletion rollback. |
| **M21** | Legacy company ALTER / policy convergence | **Fixed** | In migration, executed `ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS` for all 7 workspace columns. Dropped legacy permissive INSERT/UPDATE policies and enforced owner/admin RLS. |
| **M22** | Job applicants / FK / requirements / alternate view | **Fixed** | Added `profile_id UUID REFERENCES public.profiles(id)` to `job_applications` with strict RLS check `(auth.uid() = user_id AND (profile_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = job_applications.profile_id AND p.user_id = auth.uid())))`, preventing applicant impersonation. In `JobDetails.tsx`, embeds applicant profile data. |
| **M23** | Moderation enforcement / direct visibility | **Fixed** | Enforced shooting locations policy checking status != 'blocked' and 'Blocked' not in tags. Added directory files moderation RLS. Enforced unpublished post visibility restriction in RLS. |
| **M24** | Directory upload / admin reader identities | **Fixed** | In `AddFileDialog`, resolved uploader profile ID. In `AdminUsers.tsx`, resolved selected profile data and mapped DB rows into `DirectoryFile` view model. In `directory/page.tsx`, evaluated blocked rows using activeProfileId without undefined variable references. |
| **M25** | Studio persistence / callers / secondary stores | **Fixed** | Updated `updateViewingCompany` to return `Promise<{ ok: boolean; error?: any }>`. Updated all workspace edit callers (`handleEditAboutSubmit`, `handleAddCrewMember`, `handlePostJob`, `handleCreateCourse`, `handleUpdateLogo`, etc.) to `await` and verify `res.ok` before closing dialogs and toasting. Application status checks `.select('id')` row count. |
| **M26** | Outbox merge / account cache / pagination / retry safety | **Fixed** | Preserved failed outbox messages across polling cycles in `messages/page.tsx`. Account-scoped cache keys in `sidebar.tsx` and `messages/page.tsx`. Added `client_message_id TEXT UNIQUE` to `messages` table and insert payloads for retry idempotency without duplicate messages. |
| **M27** | Truthful metrics and billing across views | **Fixed** | Removed `Math.random` from `Jobs.tsx` application stats and replaced with truthful `selectedJob.applications_count`. In `AdminAnalytics.tsx`, calculated `verifiedUsers` strictly via `p.is_verified === true` and active users via 30-day activity without fallback to `newUsers`. |
| **M28** | Write outcome checks / draft / rollback across callers | **Fixed** | Added `.select('id')` row count verification across delete and update mutations (Profile files, post unlike/unsave, admin moderation, studio application status). Restored draft state on support ticket reply failure and task status rollback on error. |

## 4. Verification & Quality Gates
- **TypeScript Gate**: `npx tsc -b --pretty false` -> **0 errors, Exit code 0**
- **Test Gate**: `npm test` (`node --experimental-strip-types --test tests/*.test.mjs`) -> **28 passed, 0 failed, 15 suites, Exit code 0**
- **Build Gate**: `npm run build` -> **Exit code 0, 57 route chunks bundled in 42.8s**
- **CI Workflow**: `.github/workflows/ci.yml` authored and committed to repository root.
- **Runtime Dev Server**: Running cleanly at `http://localhost:3000/` with Vite HMR.
- **Visual & Media Integrity**: Studio Noir aesthetic and 16:9 vintage golden reel hero video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) fully preserved.
- **Security Boundary**: All code changes are local and unpushed. No production writes, migrations, or git pushes have been executed without explicit user authorization.
