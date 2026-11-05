# FilmCollab Technical Project State

Current as of: November 5, 2026  
Workspace: `E:\new-filmcollab`  
Repository: `Chandrakamal07/filmcollab`  
Active Branch: `improvements` (Preserved uncommitted changes)

## 1. Overview & Architecture
FilmCollab is a professional networking and creative collaboration platform for the film industry, designed with a bespoke Studio Noir aesthetic.
- **Frontend Stack**: Vite + React 18 + TypeScript, Tailwind CSS, shadcn/ui components, Lucide icons, next-themes.
- **Hero & Media Integration**: Accepted 16:9 vintage golden reel looping video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) with reduced-motion fallback, responsive framing, and Studio Noir layout.
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Supabase Auth, Storage buckets, Realtime).
- **End-to-End Encryption**: Web Crypto API (ECDH P-256 key pair generation + AES-GCM 256-bit symmetric encryption) for confidential direct messages.

## 2. Key Directories & Entry Points
- `src/App.tsx`: Central application routing, route guards (`PublicRoute`, `ProtectedRoute`, `AdminRoute`), and SPA canonical/compatibility redirects.
- `src/pages/Index.tsx`: Public landing page featuring the Golden Reel video hero, craft categories, studio showcase, and verified CTAs.
- `src/pages/auth/`: Canonical authentication routes (`SignIn.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`).
- `src/pages/Dashboard.tsx`: Creator hub featuring user-scoped active project spotlight, live job opportunities, project quick tabs, and activity feed.
- `src/pages/messages/page.tsx`: Direct messaging hub with account-isolated storage, URL query resolution (`?recipient=` & `?u=`), real paginated history, and truthful delivery status.
- `src/pages/community/`: Guilds and collectives with real search filtering, group chat, membership actions, and forward migration schema.
- `src/pages/StudiosDirectory.tsx`: Production company discovery and registration, account-scoped workspaces, applications, follows, and bookmarks.
- `src/pages/Admin*.tsx`: Admin management suite (Profiles, Users, Posts, Communities, Directory, Locations, Analytics, Notifications).

## 3. Repository Functional Audit & Repair Status (Nov 5, 2026)

### A. Independent Code Review Findings (B01–B18) Resolution Matrix

| Finding ID | Scope & Title | Severity | Status | Verification & Architectural Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **B01** | Missing imports blocking build (`@/lib/supabase`) | Blocker | **VERIFIED** | Replaced phantom `@/lib/supabase` imports in `JobDetails.tsx`, `AdminProfile.tsx`, and `ResetPassword.tsx` with `@/integrations/supabase/client`. Excluded abandoned legacy backup `ProjectDetails.broken.tsx` from `tsconfig.app.json`. Verified via `npx tsc -p tsconfig.app.json --noEmit` and `npm run build`. |
| **B02** | Undefined `setChatMessages` setter in community chat | Critical | **VERIFIED** | Replaced read-only `const chatMessages` with real React state in `GroupDetails.tsx` and `JoinedGroupDetails.tsx`. Connected live query on valid UUID `groupId` from `community_group_messages`. Preserved drafts on failed send. |
| **B03** | Company mapper crash in `StudiosDirectory.tsx` | Critical | **VERIFIED** | Added default empty arrays (`jobs`, `auditions`, `internships`, `projects`, `team`, `reviews`) to mapped database records in `fetchCompanies`; added optional chaining to reducers `(c.auditions?.length || 0)`. |
| **B04** | Admin escalation backdoor & fail-open permissions | High | **VERIFIED** | Removed `registering_admin`, removed email string search (`email.includes('admin')`), removed `user_metadata.role` self-promotion, removed DB role update to admin. Enforced role strictly from Supabase `user_roles` table. Added migration `20261105000003_secure_auth_roles.sql` defaulting public signups to `'user'::app_role`. Normalized case-insensitive permission checks (`update` -> `edit`). |
| **B05** | Community RLS infinite recursion | High | **VERIFIED** | Rewrote `20261105000000_create_community_groups.sql` using non-recursive `SECURITY DEFINER` helpers `is_community_group_member` and `is_community_group_admin` with fixed `SET search_path = public`. |
| **B06** | Self-inserting privileged community roles | High | **VERIFIED** | Restricted `community_group_members_insert` policy so self-joining users can only insert `role = 'Member'` into public groups; only group creators can insert `role = 'Owner'`. |
| **B07** | Profile Connect & Message recipient ID mismatch | Medium | **VERIFIED** | In `Profile.tsx`, updated `handleSendMessage` to pass `profile.id` (profiles PK). Updated `handleConnect` to resolve sender's `profiles.id` and recipient's `profile.id` for `connections` insert. In `messages/page.tsx`, added fallback chain checking `id`, `user_id`, and `username`. |
| **B08** | Moderator permission check case/action mismatch | Medium | **VERIFIED** | Updated `AdminPosts.tsx` to check `hasPermission("Posts", "edit")` and `hasPermission("Posts", "delete")`, and `AdminCommunities.tsx` to check `hasPermission("Communities", "delete")`. Normalized in `use-auth.tsx`. |
| **B09** | Admin notification queries mismatch & error swallowing | Medium | **VERIFIED** | Aligned queries in `admin-topbar.tsx` and `AdminNotifications.tsx` with `setup_notifications.sql`: query `notifications` by `user_id = profile.id`, update `{ status: 'read' }`, inspect errors with user feedback, and provide honest empty state with no mock fallbacks. |
| **B10** | Directory/Locations blocking visibility & missing migration | Medium | **VERIFIED** | Updated migration `20261105000001_fix_directory_files_admin_policy.sql` adding `status` column, non-blocked public SELECT policy, and admin UPDATE/DELETE policies. In `AdminDirectory.tsx` and `AdminLocations.tsx`, verified updated row count. Filtered blocked items from public view in `directory/page.tsx` and `locations/page.tsx`. |
| **B11** | Fake trending groups with numeric IDs in `community/page.tsx` | Medium | **VERIFIED** | Replaced hardcoded groups with live fetch from `community_groups`. Added honest empty states. Wired "Create Group" dialog to insert into `community_groups` and add creator as `role = 'Owner'` in `community_group_members`. |
| **B12** | AdminProfile targeting auth UID against profiles PK | Medium | **VERIFIED** | Updated `AdminProfile.tsx` to target `profiles` by `profile.id` (or `user_id`), verified updated row count with `.select()`, called `refreshProfile()`, and queried real `tickets` table instead of non-existent `support_tickets`. |
| **B13** | Direct messages decryption failure on older messages | Medium | **VERIFIED** | In `messages/page.tsx`, integrated E2EE ECDH/AES-GCM decryption into `loadOlder` pagination and eliminated un-scoped global localStorage fallback in `loadLocalData`. |
| **B14** | Swallowed studio registration errors & cache fallback | Medium | **VERIFIED** | In `StudiosDirectory.tsx`, required authentication for `handleRegisterCompany`, threw on insert failure without creating phantom local company, and removed un-scoped global storage keys. |
| **B15** | JobDetails unauthenticated Edit/Delete & public applicants | Medium | **VERIFIED** | In `JobDetails.tsx`, gated Edit and Delete buttons and the Applicants tab behind `canManage` (`user.id === job.user_id` or admin). Verified row count with `.select()`. Namespaced saved job state to `saved_jobs_${user.id}`. |
| **B16** | Dashboard Files opening Overview & fallback job links | Low | **VERIFIED** | In `Dashboard.tsx`, wired "Files" quick tab to `/directory?project=${featuredProject.id}`, verified valid UUID before linking to `/jobs/${opp.id}`, and refactored Promises to async/await. |
| **B17** | Un-routed Terms & Privacy pages | Low | **VERIFIED** | Imported `Terms` and `Privacy` in `src/App.tsx` and registered public routes `/terms` and `/privacy`. |
| **B18** | Dishonest analytics and billing mock data | Low | **VERIFIED** | In `AdminAnalytics.tsx`, dynamically queried `directory_files` grouped by file type with honest empty states, and accurately labelled "Total Registered Users". In `Billing.tsx`, replaced fake credit card and invoices with honest empty states and preview notice. |

## 4. Verification & Build
- **TypeScript**: `npx tsc -p tsconfig.app.json --noEmit` passed with **0 errors**.
- **Production Build**: `npm run build` completed successfully in **27.83s** (`dist/` generated).
- **Runtime Dev Server**: Running cleanly at `http://localhost:3000/` with Vite HMR.
- **Working Tree**: All work preserved **uncommitted** on branch `improvements` of `Chandrakamal07/filmcollab`.

