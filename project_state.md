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

| Finding ID | Title | Origin | Status | Verification & Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **R01** | Header & CTA login/signup reaching catch-all 404 | improvements | **FIXED** | Added `/signin` and `/signup` alias redirects preserving search/hash/state; updated landing topbar and CTA routes to `/auth/signin` and `/auth/signup`. |
| **R02** | Spotlight querying undocumented `projects_space` | improvements | **FIXED** | Replaced with query to `projects` (`created_by` or member); truthful empty state with CTA to create/join. |
| **R03** | Dashboard job cards wrong columns & losing UUID destination | improvements | **FIXED** | Mapped schema columns (`job_title`, `company_name`, `location`, `salary_min`, `industry`), computed relative timestamp, linked cards to `/jobs/${id}`. |
| **R04** | Project quick tabs not selecting workspace views | improvements | **FIXED** | Passed `?view=${tab}` parameter in `Dashboard.tsx`; synchronized tab selection via `searchParams` in `ProjectDetails.tsx`. |
| **R05** | Topbar search discarding query input | improvements | **FIXED** | Navigates to `/discover?q=...`; synchronized `query` and category filters in `discover/page.tsx`. |
| **P01** | Forgot-password and reset-password routes missing | Both branches | **FIXED** | Created `src/pages/auth/ForgotPassword.tsx` and `ResetPassword.tsx`; registered `/auth/forgot-password` and `/auth/reset-password` in `App.tsx`. |
| **P02** | Admin Profile unregistered and displaying mock data | Both branches | **FIXED** | Registered `/admin-dashboard/profile` under `AdminRoute`; rebuilt `AdminProfile.tsx` with real auth profile, live metrics, and real password update. |
| **P03** | Auth redirects competing over destination | Both branches | **FIXED** | Updated `PublicRoute` to honor `location.state?.from` (path, search, hash); `SignIn.tsx` navigates directly to requested destination. |
| **P04** | Job details & actions using hardcoded data | Both branches | **FIXED** | Rewrote `JobDetails.tsx` to load UUID jobs from Supabase `jobs` table; implemented real application submission, save, edit, and deletion; deduplicated `/jobs/:id` route in `App.tsx`. |
| **P05** | Profile Connect only showing toast | Both branches | **FIXED** | Implemented real `handleConnect` querying `connections`, inserting pending request, and triggering notification. |
| **P06** | Profile Message passing username ignored by messages page | Both branches | **FIXED** | Replaced localStorage-only handoff with URL query parameters `?recipient=${profile.id}&u=${encodeURIComponent(username)}`; resolved in `messages/page.tsx`. |
| **P07** | Messaging mock pagination, false success, cross-account cache | Both branches | **FIXED** | Removed mock `old-${Date.now()}` messages; implemented real Supabase pagination in `loadOlder`; truthful delivery error toasts; marked messages failed on error; account-namespaced chat cache. |
| **P08** | Community groups/membership/chat mock handlers | Both branches | **FIXED** | Implemented real search filtering across groups and joined tabs; connected `handleSendMessage`, `handleLeaveGroup`, and `handleSaveSettings` to Supabase operations; authored forward migration `20261105000000_create_community_groups.sql`. |
| **P09** | Admin Posts & Communities mutating local memory | Both branches | **FIXED** | Connected `AdminPosts.tsx` and `AdminCommunities.tsx` to real Supabase mutations (`is_published`, `hashtags`, delete, tags) with permission enforcement. |
| **P10** | Admin notifications & search unconnected | Both branches | **FIXED** | Connected "Mark all read" in `AdminNotifications.tsx` and `admin-topbar.tsx` to `supabase.from("notifications").update({ is_read: true })`; connected admin topbar search to `/admin-dashboard/users?q=...`. |
| **P11** | Admin Block File / Location only showing toasts | Both branches | **FIXED** | Implemented real moderation status/tag updates in `AdminDirectory.tsx` and `AdminLocations.tsx`; updated migration `20261105000001_fix_directory_files_admin_policy.sql` to authorize admin updates. |
| **P12** | Contact Us form timer with false success | Both branches | **FIXED** | Authored migration `20261105000002_create_contact_submissions.sql`; implemented real Supabase insert; validated input; preserved draft on failure. |
| **P13** | Billing upgrade fake setTimeout redirect | Both branches | **FIXED** | Replaced fake payment simulation with truthful preview notification banner and direct concierge handoff to `/contact`. |
| **P14** | Studios Directory storing companies/applications in global keys | Both branches | **FIXED** | Integrated Supabase `companies` fetch and registration; account-namespaced applications, follows, and saved companies. |
| **P15** | Theme selector not applying theme; Change Password inactive | Both branches | **FIXED** | Connected `next-themes` `setTheme` to appearance changes; implemented Change Password modal via `supabase.auth.updateUser({ password })`. |
| **P16** | Admin authority backdoor in `use-auth.tsx` | Both branches | **FIXED** | Removed `registering_admin` localStorage privilege escalation; enforced fail-closed permission checks. |
| **P17** | Directory delete policy comparing `auth.uid()` with `user_roles.id` | Both branches | **FIXED** | Authored migration `20261105000001_fix_directory_files_admin_policy.sql` comparing `user_roles.user_id`. |
| **P18** | Admin Analytics using random numbers | Both branches | **FIXED** | Removed `Math.random()`; derived measured metrics from real database tables and deterministic benchmarks. |
| **P19** | Footer links using `#` placeholders | Both branches | **FIXED** | Created `src/pages/Terms.tsx` and `Privacy.tsx`; mapped footer items to `/support`, `/privacy`, `/terms`, `/contact`, and official social channels. |

## 4. Verification
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed successfully in 38.79s (`dist/` generated).
- **Hosting Fallback**: Created `public/_redirects` and `vercel.json` for reliable SPA routing on direct page refreshes.
- **Environment**: Documented `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.example`.
- **Working Tree**: All work preserved **uncommitted** on branch `improvements`.

