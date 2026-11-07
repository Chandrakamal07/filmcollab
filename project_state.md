# FilmCollab Technical Project State

Current as of: November 7, 2026  
Workspace: `E:\new-filmcollab`  
Repository: `Chandrakamal07/filmcollab`  
Active Branch: `improvements` (PR #1)  
Reviewed Baseline Commit: `7ea7ef43fb6af2c04c1038b9d67fd08661c0c621` (HEAD)  
Working Tree State: **Local Uncommitted (R10 remediation verified locally; ready for inspection)**

## 1. Overview & Architecture
FilmCollab is a professional networking and creative collaboration platform for the film industry, designed with a bespoke Studio Noir aesthetic.
- **Frontend Stack**: Vite 5 + React 18 + TypeScript 5.8, Tailwind CSS, shadcn/ui components, Lucide icons, next-themes.
- **Hero & Media Integration**: Accepted 16:9 vintage golden reel looping video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) with reduced-motion fallback, responsive framing, and Studio Noir layout.
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Supabase Auth, Storage buckets, Realtime). Clean chronological replay of all 28 timestamped migrations from `20250108000000_bootstrap_profiles_and_auth.sql` through `20261111000000_r10_ticket_boundary_and_crypto_readiness.sql`, verified against both clean-install and existing-schema upgrade paths in the local `@electric-sql/pglite` embedded engine (PostgreSQL v18.6, verified via `SHOW server_version;`).
- **Strictly Typed PostgREST Contracts**: `createClient<Database>` in `src/integrations/supabase/client.ts` with comprehensive typed schemas (`Tables`, `Views.public_profiles`, `Enums.app_role`, and `Functions`) in `src/integrations/supabase/types.ts` including custom server RPCs (`provision_admin_team_member`, `revoke_admin_team_member`, `send_authorized_notification`, `is_caller_active`, `is_global_admin`, `has_staff_permission`).
- **End-to-End Encryption (`src/lib/e2ee.ts`)**: Web Crypto API (ECDH P-256 key pair generation + AES-GCM 256-bit symmetric encryption) with authenticated 4-part key metadata (`ENCRYPTED:<keyId>:<iv>:<ciphertext>`, binding `ENCRYPTED:<keyId>` via AES-GCM `additionalData` and verifying `computeKeyId` to reject tampered headers with `E2EE_AUTHENTICATION_FAILED`), peer `public_key_history` decryption support across key rotations, unified sender publication helper `ensureSenderE2EEPublicationReady`, explicit new-device key rotation confirmation before overwriting server `public_key`, fail-closed remote-key lookup state classification (`known_key`, `known_empty`, `lookup_failed`), blank/whitespace cached or fetched string normalization to `null`, race-safe initial publication enforcing `.or("public_key.is.null,public_key.eq.")` at write time, non-destructive local key-ring, and fail-closed security for confidential direct messages and location enquiries.
- **Private Directory Storage (`src/lib/directory-storage.ts`)**: Non-public `directory_assets` and `directory_private` buckets (`public = false`) backed by `storage.objects` RLS, canonical `storage://directory_assets/<path>` URIs, signed URL resolution with client-side caching (`resolveDirectoryAssetUrl`, `resolveDirectoryFileUrls`), and orphan storage cleanup on database write failure (`cleanupUploadedStorageObjects`).
- **Quality & CI Gate**: Enforced via `.github/workflows/ci.yml`, `npx tsc -b --pretty false` (0 diagnostics), `npm test` (55 assertions across 21 suites, including real PostgreSQL clean-install & upgrade execution via `@electric-sql/pglite`), `npm run build` (Exit code 0), and `npm run lint` (0 errors, Exit code 0).

## 2. Reproducible Database & Storage Contract Inventory
Verified in PostgreSQL (`pg_catalog` & `information_schema`) across all 28 timestamped migrations (`20250108000000` through `20261111000000`):
- **Public Tables (47)**: `profiles`, `posts`, `post_likes`, `post_saves`, `post_comments`, `projects`, `project_likes`, `project_members`, `project_member_events`, `project_tasks`, `project_messages`, `jobs`, `job_applications`, `connections`, `user_likes`, `user_saves`, `user_roles`, `community_groups`, `community_group_members`, `community_group_messages`, `directory_files`, `directory_categories`, `companies`, `company_applications`, `company_followers`, `company_reviews`, `shooting_locations`, `shooting_location_likes`, `property_site_visits`, `property_types`, `messages`, `tickets`, `ticket_messages`, `ticket_updates`, `subscription_plans`, `contact_submissions`, `notifications`, `casting_calls`, `casting_applicants`, `casting_call_saves`, `categories`, `global_tags`, `settings`, `site_settings`, `admin_team_members`, `industry_news`, `industry_events`, `industry_courses`, `reports`.
- **Public Views (1)**: `public.public_profiles` (`WITH (security_barrier = true)`), masking `email` (`privacy_show_email`), `phone` (`privacy_show_phone`), `date_of_birth` (`privacy_show_dob`), and all 10 location columns (`location`, `city`, `state`, `country`, `current_city`, `current_state`, `current_country`, `birth_city`, `birth_state`, `birth_country` via `privacy_show_location`) for non-owners/non-admins while exposing `public_key` and `public_key_history` for E2EE.
- **Explicit PostgREST Foreign Keys**: `tickets_user_id_fkey`, `tickets_assigned_to_fkey`, `ticket_messages_author_id_fkey`, `ticket_updates_author_id_fkey`, `job_applications_profile_id_fkey`, `directory_files_user_id_fkey` (with table-specific `BEFORE INSERT OR UPDATE` triggers `normalize_ticket_message_author()` on `public.ticket_messages` and `normalize_ticket_update_author()` on `public.ticket_updates`, enforcing `ticket_id` immutability, normalizing actor ID to `public.profiles.id`, and permitting legitimate `ON DELETE SET NULL` profile deletion).
- **Storage Buckets (7)**: `avatars` (`public = true`), `location_media` (`public = true`), `post-media` (`public = true`), `post_media` (`public = true`), `site_assets` (`public = true`), `directory_assets` (`public = false`), `directory_private` (`public = false`).

## 3. R10 Follow-Up Remediation Ledger (R10-01 and R10-02)

| ID | Finding | Status | Permanent Architectural Fix & Verification Scope |
| :--- | :--- | :--- | :--- |
| **R10-01** | Updating a reply can bypass ticket access and chat restrictions via cross-ticket reassignment | **VERIFIED (Engine-Level)** | Enforced strict `ticket_id` immutability directly in `normalize_ticket_message_author()` and `normalize_ticket_update_author()` triggers (`IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id THEN RAISE EXCEPTION 'Ticket message ticket_id cannot be reassigned' USING ERRCODE = '42501';`), ensuring the guard applies even when an update statement uses constant returns (`RETURNING 1`). Hardened `ticket_messages_participant_update` RLS policy with matching `USING` and `WITH CHECK` clauses requiring `is_caller_active()`, author/admin/staff role, and verifying the ticket belongs to the caller with `chat_enabled = true`. Verified in PostgreSQL: cross-ticket move via `WITH changed ... RETURNING 1` is rejected with 42501; move into a locked ticket (`chat_enabled = false`) is rejected; outsider edit is denied; legitimate same-ticket message text edit succeeds; author change remains rejected; admin profile delete with `ON DELETE SET NULL` cleanup succeeds; project cascade/direct removal controls remain passing. |
| **R10-02** | Cached blank key marks encryption ready without publishing, causing recipient decryption failures | **VERIFIED (Cryptographic & Production Helper)** | Updated `ensureSenderE2EEPublicationReady` in `src/lib/e2ee.ts` to sanitize all candidate keys (`typeof k === 'string' && k.trim().length > 0 ? k.trim() : null`). Classifies cached or fetched blank/whitespace strings (`""`) as `known_empty` (verified absent), preventing premature `ready: true`. Requires an acknowledged publication write before returning `ready: true`. Applied race-safe update filter `.or("public_key.is.null,public_key.eq.")` (falling back to `.is("public_key", null)`). Added migration `20261111000000` backfilling existing blank strings to `NULL` and attaching trigger `trg_normalize_profile_public_key` on `profiles`. Verified: cached blank string initiates publication and marks ready only after acknowledged write; failed write leaves `ready: false, privKey: null`; fresh lookup of blank string normalizes and publishes; end-to-end encryption with ready sender produces valid envelope; recipient decryption with missing/blank sender key raises `E2EE_SENDER_KEY_UNAVAILABLE`; recipient decryption with published key cleanly recovers plaintext. |

## 4. Retained R9, R8, R7, and Master Audit (M01–M28) Status
All 3 prior R9 findings (**R9-01–R9-03**), all 8 prior R8 findings (**R8-01–R8-08**), all 13 R7 findings (**R7-01–R7-13**), and all 28 baseline findings (**M01–M28**) remain strictly preserved, functional, and regression-tested in `tests/master_regression.test.mjs`:
- R9-01: Table-specific triggers on `ticket_messages` (no `author_name` column) and profile deletion `ON DELETE SET NULL` cleanup intact.
- R9-02: `log_project_member_event` parent deletion check `IF EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id)` preventing 23503 intact.
- R9-03: Remote key lookup failure fail-closed state classification and race-safe initial publication intact.
- R8-01: Cross-user storage object reference spoofing prevented; owner-scoped object checks intact.
- R8-02: Admin protection, scoped staff limitations, active-caller validation, and dropped legacy permissive write policies intact.
- R8-03: Sender readiness gating, outbox retry, Send/Retry readiness intact.
- R8-04: Notification caller types, connection transition validation, and project status URL regex intact.
- R8-05: Ticket update author spoofing prevented with server-side profile binding.
- R8-06: Shooting location UPDATE alias synchronization intact across all 6 alias pairs.
- R8-07: Truthful project `likes_count` and `team_size` database triggers and frontend non-random rendering intact.
- R8-08: Dependency vulnerability audit and triage documented.

## 5. Verification & Quality Gates
- **Engine Verification**: `SHOW server_version;` in `@electric-sql/pglite` -> **PostgreSQL 18.6** (accurately noted).
- **TypeScript Gate**: `npx tsc -b --pretty false` -> **PASS (0 errors, Exit code 0)**
- **Test Gate**: `npm test` (`node --experimental-strip-types --test tests/*.test.mjs`) -> **PASS (55 passed, 0 failed, 21 suites, Exit code 0, 17.5s)**
- **Build Gate**: `npm run build` -> **PASS (Exit code 0, built in 20.97s; `dist/assets/new-*.js` = 25.50 kB / 7.79 kB gzip)**
- **Lint Gate**: `npm run lint` -> **PASS (Exit code 0, 0 errors, 386 warnings)**
- **Dependency Audit Assessment**: `npm audit --json` -> **19 vulnerabilities (2 high, 17 moderate)**:
  - High: `zod` GHSA-mrhx-c7xc-m3w5 (safe in FilmCollab: flat-scalar form schemas only; zero recursive or deeply nested collection validators exposed to untrusted JSON parsing).
  - High: `vite` dev-server file-serving advisories (safe in production: static assets served via production reverse proxy/CDN, not Vite dev server).
  - 17 Moderate: transitive dependencies in dev tooling (`esbuild`, `quill` via `react-quill`).
- **Explicit External Verification Boundaries (`UNVERIFIED` in local environment)**:
  - **Live External Supabase Storage HTTP Daemon**: `UNVERIFIED` locally (no hosted or Dockerized Storage daemon in local execution environment; all SQL/RLS policies, bucket registrations, and client URL builders are tested and verified).
  - **Live Remote Hosted Database Migration History**: `UNVERIFIED` against hosted production database (all changes strictly verified locally in real PostgreSQL `@electric-sql/pglite` clean-install and existing-schema upgrade replay).
  - **Multi-Instance Storage Network Race Conditions**: `UNVERIFIED` for high-concurrency multi-region network failover scenarios without distributed cloud infrastructure.
- **Visual & Media Integrity**: Studio Noir aesthetic and 16:9 vintage golden reel hero video (`/media/main-reel.mp4`, poster `/media/main-reel-poster.webp`) fully preserved.
- **Git Working Tree**: Local changes uncommitted; no commits, pushes, merges, or production mutations performed.
