# FilmCollab Technical Project State

Current as of: November 7, 2026  
Workspace: `E:\new-filmcollab`  
Repository: `Chandrakamal07/filmcollab`  
Active Branch: `improvements` (PR #1)  
Reviewed Baseline Commit: `96f4b5a1b6bdf084e8228be1552720f1f5a3d04e` (HEAD)  
Working Tree State: **Local Uncommitted (R9 remediation verified locally; ready for inspection)**

## 1. Overview & Architecture
FilmCollab is a professional networking and creative collaboration platform for the film industry, designed with a bespoke Studio Noir aesthetic.
- **Frontend Stack**: Vite 5 + React 18 + TypeScript 5.8, Tailwind CSS, shadcn/ui components, Lucide icons, next-themes.
- **Hero & Media Integration**: Accepted 16:9 vintage golden reel looping video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) with reduced-motion fallback, responsive framing, and Studio Noir layout.
- **Backend & Database**: Supabase (PostgreSQL 16 with Row Level Security, Supabase Auth, Storage buckets, Realtime). Clean chronological replay of all 27 timestamped migrations from `20250108000000_bootstrap_profiles_and_auth.sql` through `20261110000000_r9_ticket_project_and_crypto_remediation.sql`, verified against both clean-install and existing-schema upgrade paths in a real PostgreSQL 16 engine (`@electric-sql/pglite`).
- **Strictly Typed PostgREST Contracts**: `createClient<Database>` in `src/integrations/supabase/client.ts` with comprehensive typed schemas (`Tables`, `Views.public_profiles`, `Enums.app_role`, and `Functions`) in `src/integrations/supabase/types.ts` including custom server RPCs (`provision_admin_team_member`, `revoke_admin_team_member`, `send_authorized_notification`, `is_caller_active`, `is_global_admin`, `has_staff_permission`).
- **End-to-End Encryption (`src/lib/e2ee.ts`)**: Web Crypto API (ECDH P-256 key pair generation + AES-GCM 256-bit symmetric encryption) with authenticated 4-part key metadata (`ENCRYPTED:<keyId>:<iv>:<ciphertext>`, binding `ENCRYPTED:<keyId>` via AES-GCM `additionalData` and verifying `computeKeyId` to reject tampered headers with `E2EE_AUTHENTICATION_FAILED`), peer `public_key_history` decryption support across key rotations, unified sender publication helper `ensureSenderE2EEPublicationReady`, explicit new-device key rotation confirmation before overwriting server `public_key`, fail-closed remote-key lookup state classification (`known_key`, `known_empty`, `lookup_failed`), race-safe initial publication enforcing `.is("public_key", null)` at write time, non-destructive local key-ring, and fail-closed security for confidential direct messages and location enquiries.
- **Private Directory Storage (`src/lib/directory-storage.ts`)**: Non-public `directory_assets` and `directory_private` buckets (`public = false`) backed by `storage.objects` RLS, canonical `storage://directory_assets/<path>` URIs, signed URL resolution with client-side caching (`resolveDirectoryAssetUrl`, `resolveDirectoryFileUrls`), and orphan storage cleanup on database write failure (`cleanupUploadedStorageObjects`).
- **Quality & CI Gate**: Enforced via `.github/workflows/ci.yml`, `npx tsc -b --pretty false` (0 diagnostics), `npm test` (54 assertions across 21 suites, including real PostgreSQL 16 clean-install & upgrade execution via `@electric-sql/pglite`), `npm run build` (Exit code 0), and `npm run lint` (0 errors, Exit code 0).

## 2. Reproducible Database & Storage Contract Inventory
Verified in PostgreSQL 16 (`pg_catalog` & `information_schema`) across all 27 timestamped migrations (`20250108000000` through `20261110000000`):
- **Public Tables (47)**: `profiles`, `posts`, `post_likes`, `post_saves`, `post_comments`, `projects`, `project_likes`, `project_members`, `project_member_events`, `project_tasks`, `project_messages`, `jobs`, `job_applications`, `connections`, `user_likes`, `user_saves`, `user_roles`, `community_groups`, `community_group_members`, `community_group_messages`, `directory_files`, `directory_categories`, `companies`, `company_applications`, `company_followers`, `company_reviews`, `shooting_locations`, `shooting_location_likes`, `property_site_visits`, `property_types`, `messages`, `tickets`, `ticket_messages`, `ticket_updates`, `subscription_plans`, `contact_submissions`, `notifications`, `casting_calls`, `casting_applicants`, `casting_call_saves`, `categories`, `global_tags`, `settings`, `site_settings`, `admin_team_members`, `industry_news`, `industry_events`, `industry_courses`, `reports`.
- **Public Views (1)**: `public.public_profiles` (`WITH (security_barrier = true)`), masking `email` (`privacy_show_email`), `phone` (`privacy_show_phone`), `date_of_birth` (`privacy_show_dob`), and all 10 location columns (`location`, `city`, `state`, `country`, `current_city`, `current_state`, `current_country`, `birth_city`, `birth_state`, `birth_country` via `privacy_show_location`) for non-owners/non-admins while exposing `public_key` and `public_key_history` for E2EE.
- **Explicit PostgREST Foreign Keys**: `tickets_user_id_fkey`, `tickets_assigned_to_fkey`, `ticket_messages_author_id_fkey`, `ticket_updates_author_id_fkey`, `job_applications_profile_id_fkey`, `directory_files_user_id_fkey` (with table-specific `BEFORE INSERT OR UPDATE` triggers `normalize_ticket_message_author()` on `public.ticket_messages` and `normalize_ticket_update_author()` on `public.ticket_updates`, normalizing actor ID to `public.profiles.id` and permitting legitimate `ON DELETE SET NULL` profile deletion).
- **Storage Buckets (7)**: `avatars` (`public = true`), `location_media` (`public = true`), `post-media` (`public = true`), `post_media` (`public = true`), `site_assets` (`public = true`), `directory_assets` (`public = false`), `directory_private` (`public = false`).

## 3. R9 Follow-Up Remediation Ledger (R9-01 through R9-03)

| ID | Finding | Status | Permanent Architectural Fix & Verification Scope |
| :--- | :--- | :--- | :--- |
| **R9-01** | Shared ticket-author trigger crashes `ticket_messages` INSERT (42703) and blocks profile FK cleanup (42501) | **VERIFIED (Engine-Level)** | Separated into table-specific trigger functions: `normalize_ticket_message_author()` for `public.ticket_messages` (which has no `author_name` column) and `normalize_ticket_update_author()` for `public.ticket_updates`. Narrowed UPDATE immutability to permit `ON DELETE SET NULL` cleanup when `NEW.author_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.author_id)`, while rejecting unauthorized client reassignment with 42501. Added `ticket_messages_participant_update` RLS policy. Verified in PostgreSQL 16: ticket owner and Support agent inserts succeed without 42703; client UPDATE setting `author_id` to another user or NULL is rejected with 42501; global Admin deleting an author profile succeeds and leaves `ticket_messages.author_id` as NULL while retaining the message. |
| **R9-02** | `log_project_member_event` fails on project CASCADE deletion with FK 23503 error | **VERIFIED (Engine-Level)** | Updated `log_project_member_event` plpgsql trigger function to verify `IF EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id)` before inserting a member rejection event on DELETE. When a project is deleted, cascading deletion of its members skips event insertion for the disappearing parent project. Verified in PostgreSQL 16: owner deleting an empty project succeeds; owner deleting a member-bearing project succeeds via CASCADE without 23503; outsider deletion remains denied; direct member removal continues logging rejection events and allows rejection notifications. |
| **R9-03** | Failed remote-key lookup can trigger unconfirmed key replacement without rotation permission | **VERIFIED (Cryptographic & Production Helper)** | Hardened `ensureSenderE2EEPublicationReady` in `src/lib/e2ee.ts` to explicitly classify remote lookup state into `known_key`, `known_empty`, and `lookup_failed`. On lookup timeout, network error, or query failure, fails closed immediately (`ready: false`, `privKey: null`, `requiresExplicitKeyRotation: false`, 0 writes). For verified absence (`known_empty`), enforces race safety by appending `.is("public_key", null)` to the update query; if concurrent publication occurs (0 rows updated), fails closed with `requiresExplicitKeyRotation: true`. Verified: resolved lookup error (0 writes, ready: false), thrown network error (0 writes, ready: false), genuine empty remote key (1 write, ready: true), stale read / race condition (0 overwrites, ready: false, requiresExplicitKeyRotation: true), and matching key (0 writes, ready: true). |

## 4. Retained R8 Ledger (R8-01 through R8-08) & Master Audit (M01–M28) Status
All 8 prior R8 findings (**R8-01–R8-08**), all 13 R7 findings (**R7-01–R7-13**), and all 28 baseline findings (**M01–M28**) remain strictly preserved, functional, and regression-tested in `tests/master_regression.test.mjs`:
- R8-01: Cross-user storage object reference spoofing prevented; owner-scoped object checks intact.
- R8-02: Admin protection, scoped staff limitations, active-caller validation, and dropped legacy permissive write policies intact.
- R8-03: Sender readiness gating, outbox retry, Send/Retry readiness intact.
- R8-04: Notification caller types, connection transition validation, and project status URL regex intact.
- R8-05: Ticket update author spoofing prevented with server-side profile binding.
- R8-06: Shooting location UPDATE alias synchronization intact across all 6 alias pairs.
- R8-07: Truthful project `likes_count` and `team_size` database triggers and frontend non-random rendering intact.
- R8-08: Dependency vulnerability audit and triage documented.

## 5. Verification & Quality Gates
- **TypeScript Gate**: `npx tsc -b --pretty false` -> **PASS (0 errors, Exit code 0)**
- **Test Gate**: `npm test` (`node --experimental-strip-types --test tests/*.test.mjs`) -> **PASS (54 passed, 0 failed, 21 suites, Exit code 0, 14.2s)**
- **Build Gate**: `npm run build` -> **PASS (Exit code 0, built in 45.35s; `dist/assets/new-*.js` = 25.50 kB / 7.79 kB gzip)**
- **Lint Gate**: `npm run lint` -> **PASS (Exit code 0, 0 errors, 386 warnings)**
- **Dependency Audit Assessment**: `npm audit --json` -> **19 vulnerabilities (2 high, 17 moderate)**:
  - High: `zod` GHSA-mrhx-c7xc-m3w5 (safe in FilmCollab: flat-scalar form schemas only; zero recursive or deeply nested collection validators exposed to untrusted JSON parsing).
  - High: `vite` dev-server file-serving advisories (safe in production: static assets served via production reverse proxy/CDN, not Vite dev server).
  - 17 Moderate: transitive dependencies in dev tooling (`esbuild`, `quill` via `react-quill`).
- **Explicit External Verification Boundaries (`UNVERIFIED` in local environment)**:
  - **Live External Supabase Storage HTTP Daemon**: `UNVERIFIED` locally (no hosted or Dockerized Storage daemon in local execution environment; all SQL/RLS policies, bucket registrations, and client URL builders are tested and verified).
  - **Live Remote Hosted Database Migration History**: `UNVERIFIED` against hosted production database (all changes strictly verified locally in real PostgreSQL 16 `@electric-sql/pglite` clean-install and existing-schema upgrade replay).
  - **Multi-Instance Storage Network Race Conditions**: `UNVERIFIED` for high-concurrency multi-region network failover scenarios without distributed cloud infrastructure.
- **Visual & Media Integrity**: Studio Noir aesthetic and 16:9 vintage golden reel hero video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) fully preserved.
- **Git Working Tree**: Local changes uncommitted; no commits, pushes, merges, or production mutations performed.
