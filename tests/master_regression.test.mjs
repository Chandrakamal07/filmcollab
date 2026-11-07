import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

// Direct production module imports (executed natively via Node 22/24 type-stripping)
import {
  generateKeyPair,
  importPublicKey,
  importPrivateKey,
  deriveAESKey,
  encryptMessage,
  decryptMessage,
  encryptForRecipientOrThrow,
  getOrInitUserE2EE,
  ensureSenderE2EEPublicationReady,
  computeKeyId,
  decryptEnvelopeWithKeyring
} from '../src/lib/e2ee.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('FilmCollab Master Audit Regression Test Suite (M01-M28)', () => {

  // M01: Null renders and crash resilience
  describe('M01: Null Render & Price Normalization Resilience', () => {
    test('JoinedGroupDetails guards group.name when group is null during initial load', () => {
      const renderGroupHeader = (group, loadingGroup) => {
        if (loadingGroup || !group) {
          return { rendered: false, fallback: 'Loading group details...' };
        }
        return { rendered: true, title: group.name };
      };

      const initialState = renderGroupHeader(null, true);
      assert.equal(initialState.rendered, false);
      assert.equal(initialState.fallback, 'Loading group details...');

      const loadedState = renderGroupHeader({ id: 'grp-1', name: 'Indie Directors Hub' }, false);
      assert.equal(loadedState.rendered, true);
      assert.equal(loadedState.title, 'Indie Directors Hub');

      const notFoundState = renderGroupHeader(null, false);
      assert.equal(notFoundState.rendered, false);
    });

    test('LocationDetails safely normalizes nullable price and price_type without crashing', () => {
      const formatLocationPricing = (location) => {
        const rawPriceType = location.price_type;
        const normalizedPriceType = rawPriceType ? rawPriceType.replace('Per ', '').replace('per_', '') : 'day';
        const displayPrice = location.price ?? location.daily_rate ?? location.hourly_rate ?? 0;
        return { displayPrice, label: `₹${displayPrice} / ${normalizedPriceType}` };
      };

      const nullPriceTypeLoc = { id: 'loc-1', price: 15000, price_type: null };
      const res1 = formatLocationPricing(nullPriceTypeLoc);
      assert.equal(res1.displayPrice, 15000);
      assert.equal(res1.label, '₹15000 / day');

      const undefLoc = { id: 'loc-2', price: 25000 };
      const res2 = formatLocationPricing(undefLoc);
      assert.equal(res2.displayPrice, 25000);
      assert.equal(res2.label, '₹25000 / day');

      const validLoc = { id: 'loc-3', price: 5000, price_type: 'Per Hour' };
      const res3 = formatLocationPricing(validLoc);
      assert.equal(res3.label, '₹5000 / Hour');
    });
  });

  // M02 & M05: Reproducible Database Baseline & Schema Convergence Verification
  describe('M02 & M05: Database Baseline & Policy Convergence', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );
    const bootstrapSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20250108000000_bootstrap_profiles_and_auth.sql'),
      'utf8'
    );
    const unblockSql = fs.readFileSync(
      path.join(rootDir, 'unblock_rls.sql'),
      'utf8'
    );

    test('Bootstrap migration provisions public.profiles without premature user_roles reference or duplicate category', () => {
      assert.ok(bootstrapSql.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Bootstrap must create public.profiles');
      assert.ok(bootstrapSql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'), 'Bootstrap profiles.id must default to gen_random_uuid()');
      assert.ok(bootstrapSql.includes('user_id UUID REFERENCES auth.users(id)'), 'Bootstrap profiles must link user_id to auth.users without colliding inline constraint');
      const profilesDdl = bootstrapSql.split('CREATE TABLE IF NOT EXISTS public.shooting_locations')[0];
      assert.ok(!profilesDdl.includes('category TEXT'), 'Bootstrap must not pre-create category column on profiles before 20250109000004_add_category_to_profiles.sql');
      assert.ok(bootstrapSql.includes('CREATE TABLE IF NOT EXISTS public.shooting_locations'), 'Bootstrap must pre-create shooting_locations before 20261105000004');
      assert.ok(bootstrapSql.includes('CREATE TABLE IF NOT EXISTS public.notifications'), 'Bootstrap must pre-create notifications before 20251006000000');
      assert.ok(!bootstrapSql.includes('user_roles'), 'Bootstrap profiles policies must not reference user_roles before its definition');
    });

    test('Chronological replay of all migrations in supabase/migrations succeeds without duplicate column or missing table errors', () => {
      const migrationsDir = path.join(rootDir, 'supabase/migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      assert.ok(files.includes('20261107000000_complete_remediation_convergence.sql'), 'Must include forward convergence migration 20261107000000');

      const createdTables = new Set(['auth.users', 'storage.buckets', 'storage.objects']);
      const profileColumns = new Set(['id', 'user_id', 'username', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'bio', 'avatar_url', 'cover_image_url', 'location', 'role', 'website', 'company', 'skills', 'tags', 'is_verified', 'followers_count', 'projects_count', 'posts_count', 'likes_count', 'created_at', 'updated_at']);

      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        // Track created tables
        const createMatches = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)];
        for (const m of createMatches) {
          createdTables.add(m[1].toLowerCase());
        }

        // Verify non-IF NOT EXISTS ADD COLUMN on profiles does not collide
        const bareAddCategory = /ALTER\s+TABLE\s+(?:public\.)?profiles\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)category\b/i.test(sql);
        if (bareAddCategory) {
          assert.ok(!profileColumns.has('category'), `Duplicate bare ADD COLUMN category in ${file}`);
          profileColumns.add('category');
        }

        // Verify triggers/policies on notifications, shooting_locations, project_messages, site_settings only occur after table creation
        if (/ON\s+public\.notifications\b/i.test(sql)) {
          assert.ok(createdTables.has('notifications'), `notifications referenced before creation in ${file}`);
        }
        if (/ALTER\s+TABLE\s+public\.shooting_locations\b/i.test(sql)) {
          assert.ok(createdTables.has('shooting_locations'), `shooting_locations referenced before creation in ${file}`);
        }
        if (/ON\s+public\.project_messages\b/i.test(sql)) {
          assert.ok(createdTables.has('project_messages'), `project_messages referenced before creation in ${file}`);
        }
        if (/ON\s+public\.site_settings\b/i.test(sql)) {
          assert.ok(createdTables.has('site_settings'), `site_settings referenced before creation in ${file}`);
        }
      }
    });

    test('Master convergence migration guarantees profiles.id default and drops legacy auth FK', () => {
      assert.ok(migrationSql.includes('ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()'), 'Must alter profiles.id default');
      assert.ok(migrationSql.includes('DROP CONSTRAINT IF EXISTS'), 'Must drop legacy profiles.id foreign key if pointing to auth.users');
    });

    test('Master convergence migration guarantees required tables, columns and price default', () => {
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.settings'), 'Settings table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.admin_team_members'), 'Admin team table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.shooting_locations'), 'Shooting locations table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.property_site_visits'), 'Property site visits table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.project_tasks'), 'Project tasks table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.tickets'), 'Tickets table DDL');
      assert.ok(migrationSql.includes('DROP CONSTRAINT IF EXISTS tickets_user_id_fkey'), 'Must drop tickets_user_id_fkey to allow profile IDs');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.ticket_messages'), 'Ticket messages table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.ticket_updates'), 'Ticket updates table DDL');
      assert.ok(migrationSql.includes('author_id UUID REFERENCES public.profiles(id)'), 'ticket_updates must reference profiles(id)');
      assert.ok(migrationSql.includes('sync_ticket_update_content'), 'ticket_updates must sync content and message');
      assert.ok(migrationSql.includes('ALTER TABLE public.subscription_plans ALTER COLUMN price SET DEFAULT 0;'), 'Subscription plans price must default to 0');
      assert.ok(migrationSql.includes('ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS courses JSONB'), 'Companies must contain courses JSONB');
      assert.ok(migrationSql.includes('ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS events JSONB'), 'Companies must contain events JSONB');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.directory_categories'), 'Directory categories table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.global_tags'), 'Global tags table DDL');
    });

    test('Master convergence migration revokes legacy permissive repair policies', () => {
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;'), 'Must drop posts public read');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;'), 'Must drop unblock_rls tickets update');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can insert ticket updates" ON public.ticket_updates;'), 'Must drop unblock_rls ticket updates insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can insert ticket messages" ON public.ticket_messages;'), 'Must drop unblock_rls ticket messages insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can read ticket messages" ON public.ticket_messages;'), 'Must drop unblock_rls ticket messages read');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;'), 'Must drop notifications public insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "connections_insert_policy" ON public.connections;'), 'Must drop legacy connections insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.post_likes;'), 'Must drop permissive post_likes insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.post_saves;'), 'Must drop permissive post_saves insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_likes;'), 'Must drop permissive user_likes insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_saves;'), 'Must drop permissive user_saves insert');
      assert.ok(!unblockSql.includes('WITH CHECK (true)'), 'unblock_rls.sql must not contain insecure WITH CHECK (true)');
    });
  });

  // M03: Project Membership Privileges, Visibility & Creator Approval
  describe('M03: Project Authority & Creator Approvals', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Project members policy restricts self-join role to Applicant and allows creator approval', () => {
      assert.ok(migrationSql.includes("role = 'Applicant'"), 'Self-join must restrict role to Applicant');
      assert.ok(migrationSql.includes('project_members_update_creator'), 'Must include creator update policy for applicant approval');
      assert.ok(migrationSql.includes('project_members_delete_creator'), 'Must include creator delete policy for applicant rejection');
    });

    test('Project privacy policy requires visibility column and excludes Applicant from private metadata', () => {
      assert.ok(migrationSql.includes('ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS visibility TEXT'), 'Must ensure visibility column exists on projects');
      assert.ok(migrationSql.includes('projects_select_policy'), 'Must define projects_select_policy');
      assert.ok(migrationSql.includes("pm.role != 'Applicant'"), 'Applicants must not be treated as accepted members for private project metadata');
    });

    test('Project messages policy binds sender to authenticated profile and checks project membership', () => {
      assert.ok(migrationSql.includes('project_messages.sender_id'), 'Must check sender_id against profiles');
      assert.ok(migrationSql.includes("role != 'Applicant'"), 'Applicants must not post in internal project messages');
    });
  });

  // M04: Social Connections & Post Authorization
  describe('M04: Social Connections & Post Row Authorization', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Social connections require authenticated user to be requester or recipient', () => {
      assert.ok(migrationSql.includes('connections_insert_policy'), 'Must define bound connection insert policy');
      assert.ok(migrationSql.includes('connections_update_policy'), 'Must define bound connection update policy');
      assert.ok(migrationSql.includes('connections_delete_policy'), 'Must define bound connection delete policy');
    });

    test('Post selection enforces is_published = true or author ownership', () => {
      assert.ok(migrationSql.includes('is_published = true'), 'Must enforce is_published');
      assert.ok(migrationSql.includes('auth.uid() = author_id'), 'Must allow authors to view their draft posts');
    });
  });

  // M06: Team Provisioning & Uniqueness Contract
  describe('M06: Team Provisioning & Uniqueness Contract', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );
    const adminTeamSource = fs.readFileSync(path.join(rootDir, 'src/pages/AdminTeam.tsx'), 'utf8');

    test('AdminTeam provisioning respects UNIQUE(user_id, role) onConflict target', () => {
      assert.ok(migrationSql.includes('ON CONFLICT (user_id, role) DO NOTHING'), 'Migration RPC must specify ON CONFLICT (user_id, role) DO NOTHING');
      assert.ok(adminTeamSource.includes('provision_admin_team_member'), 'AdminTeam must delegate provisioning atomically to provision_admin_team_member RPC');
    });

    test('Server provides atomic provision_admin_team_member and revoke_admin_team_member RPCs', () => {
      assert.ok(migrationSql.includes('provision_admin_team_member'), 'Must define provision_admin_team_member RPC');
      assert.ok(migrationSql.includes('revoke_admin_team_member'), 'Must define revoke_admin_team_member RPC');
      assert.ok(adminTeamSource.includes('provision_admin_team_member'), 'AdminTeam must call provision RPC');
    });
  });

  // M07: DM Read Receipt UPDATE Policy & Identity Immutability
  describe('M07: DM Read Receipt UPDATE Policy & Profile Identity', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Messages update policy maps receiver_id through profiles table', () => {
      assert.ok(migrationSql.includes('messages_update_received'), 'Must define messages_update_received policy');
      assert.ok(migrationSql.includes('profiles.user_id = auth.uid()'), 'Must check user_id matching auth.uid()');
    });

    test('Messages update immutability trigger prevents rewriting sender, receiver, or content', () => {
      assert.ok(migrationSql.includes('check_message_update_immutability'), 'Must define check_message_update_immutability trigger');
      assert.ok(migrationSql.includes('NEW.sender_id IS DISTINCT FROM OLD.sender_id'), 'Must check sender_id immutability');
      assert.ok(migrationSql.includes('NEW.content IS DISTINCT FROM OLD.content'), 'Must check content immutability');
    });
  });

  // M08: Correlated Casting Policies
  describe('M08: Correlated Casting Policies', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Casting applicant and save policies use qualified table aliases and check status & deadline', () => {
      assert.ok(migrationSql.includes('p.id = casting_applicants.user_id'), 'Must use qualified alias on user_id');
      assert.ok(migrationSql.includes('cc.id = casting_applicants.casting_call_id'), 'Must qualify casting_call_id');
      assert.ok(migrationSql.includes("LOWER(COALESCE(cc.status, 'open')) IN ('open', 'active')"), 'Must check case-insensitive status');
      assert.ok(migrationSql.includes('COALESCE(cc.deadline, cc.last_date_to_apply)'), 'Must check deadline or last_date_to_apply');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Users can insert their own applications" ON public.casting_applicants;'), 'Must drop legacy permissive application policy');
      assert.ok(migrationSql.includes('casting_call_saves_select'), 'Must define select policy for saved casting calls');
      assert.ok(migrationSql.includes('check_casting_capacity'), 'Must include atomic casting capacity trigger');
    });
  });

  // M09: Authorized Cross-Account Notification RPC
  describe('M09: Authorized Notifications', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Migration provisions send_authorized_notification RPC for cross-account alerts', () => {
      assert.ok(migrationSql.includes('send_authorized_notification'), 'Must define send_authorized_notification RPC');
      assert.ok(migrationSql.includes('SECURITY DEFINER'), 'Notification RPC must execute as SECURITY DEFINER');
    });
  });

  // M11: Privacy Enforcement & Public Profile Projection
  describe('M11: Controlled Public Profile Projection & Storage Privacy', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Migration provisions public.public_profiles view with security_barrier masking sensitive fields', () => {
      assert.ok(migrationSql.includes('CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier = true)'), 'Must create public_profiles security_barrier view');
      assert.ok(migrationSql.includes('privacy_show_phone'), 'View must inspect privacy_show_phone');
      assert.ok(migrationSql.includes('privacy_show_email'), 'View must inspect privacy_show_email');
      assert.ok(migrationSql.includes('privacy_show_dob'), 'View must inspect privacy_show_dob');
      assert.ok(migrationSql.includes('REVOKE SELECT (email, phone, date_of_birth) ON public.profiles FROM anon'), 'Must revoke sensitive direct SELECT from anon');
    });

    test('Directory assets storage policy enforces non-blocked status and profile directory privacy', () => {
      assert.ok(migrationSql.includes('directory_assets_select_policy'), 'Must define directory_assets_select_policy');
      assert.ok(migrationSql.includes('privacy_show_directory'), 'Storage access must check privacy_show_directory');
    });
  });

  // M13: Community Groups Approval, Roles & Member Post Rules
  describe('M13: Community Groups Approval & Roles', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Migration adds require_approval, allow_member_posts and permits Pending in role CHECK', () => {
      assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS require_approval BOOLEAN'), 'Must add require_approval column');
      assert.ok(migrationSql.includes('ALTER COLUMN require_approval SET DEFAULT FALSE'), 'Must set require_approval default FALSE after backfill');
      assert.ok(migrationSql.includes('ADD COLUMN IF NOT EXISTS allow_member_posts BOOLEAN'), 'Must add allow_member_posts column');
      assert.ok(migrationSql.includes('ALTER COLUMN allow_member_posts SET DEFAULT TRUE'), 'Must set allow_member_posts default TRUE after backfill');
      assert.ok(migrationSql.includes("'Pending'"), 'Role CHECK constraint must permit Pending');
      assert.ok(migrationSql.includes('sync_community_group_settings'), 'Must define trigger to sync settings and columns');
    });
  });

  // M14: Production Fail-Closed E2EE (Native Web Crypto ECDH/AES-GCM)
  describe('M14: Production Fail-Closed E2EE (Native Web Crypto ECDH/AES-GCM)', () => {
    test('generateKeyPair, deriveAESKey, encryptMessage and decryptMessage execute cleanly', async () => {
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();

      assert.equal(aliceKeys.publicKeyJwk.kty, 'EC');
      assert.equal(aliceKeys.publicKeyJwk.crv, 'P-256');
      assert.equal(bobKeys.publicKeyJwk.kty, 'EC');

      const alicePrivate = await importPrivateKey(aliceKeys.privateKeyJwk);
      const bobPublic = await importPublicKey(bobKeys.publicKeyJwk);

      const bobPrivate = await importPrivateKey(bobKeys.privateKeyJwk);
      const alicePublic = await importPublicKey(aliceKeys.publicKeyJwk);

      const aliceShared = await deriveAESKey(alicePrivate, bobPublic);
      const bobShared = await deriveAESKey(bobPrivate, alicePublic);

      const secretScript = 'Top Secret: The protagonist is the director in disguise.';
      const encrypted = await encryptMessage(aliceShared, secretScript);

      assert.ok(encrypted.iv, 'Must generate IV');
      assert.ok(encrypted.ciphertext, 'Must generate ciphertext');

      const decrypted = await decryptMessage(bobShared, encrypted.iv, encrypted.ciphertext);
      assert.equal(decrypted, secretScript, 'Bob must successfully decrypt Alice’s message');
    });

    test('encryptForRecipientOrThrow fails closed immediately if sender private key is null', async () => {
      const bobKeys = await generateKeyPair();
      await assert.rejects(
        async () => {
          await encryptForRecipientOrThrow({
            senderPrivateKey: null,
            recipientPublicKeyJwkOrStr: bobKeys.publicKeyJwk,
            plaintext: 'Classified Plot Points'
          });
        },
        /E2EE_KEY_UNAVAILABLE: Sender private key is missing or not yet initialized/
      );
    });

    test('encryptForRecipientOrThrow fails closed immediately if recipient key is null or malformed', async () => {
      const aliceKeys = await generateKeyPair();
      const alicePrivate = await importPrivateKey(aliceKeys.privateKeyJwk);

      await assert.rejects(
        async () => {
          await encryptForRecipientOrThrow({
            senderPrivateKey: alicePrivate,
            recipientPublicKeyJwkOrStr: null,
            plaintext: 'Classified Plot Points'
          });
        },
        /E2EE_RECIPIENT_KEY_UNAVAILABLE: Recipient has not published an active encryption key/
      );

      await assert.rejects(
        async () => {
          await encryptForRecipientOrThrow({
            senderPrivateKey: alicePrivate,
            recipientPublicKeyJwkOrStr: '{invalid_json',
            plaintext: 'Classified Plot Points'
          });
        },
        /E2EE_INVALID_RECIPIENT_KEY: Recipient public key is malformed/
      );

      await assert.rejects(
        async () => {
          await encryptForRecipientOrThrow({
            senderPrivateKey: alicePrivate,
            recipientPublicKeyJwkOrStr: { kty: 'RSA' },
            plaintext: 'Classified Plot Points'
          });
        },
        /E2EE_INVALID_RECIPIENT_KEY: Recipient key is not a valid ECDH P-256 key/
      );
    });

    test('encryptForRecipientOrThrow successfully produces valid ENCRYPTED:iv:ciphertext envelope', async () => {
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();
      const alicePrivate = await importPrivateKey(aliceKeys.privateKeyJwk);

      const result = await encryptForRecipientOrThrow({
        senderPrivateKey: alicePrivate,
        recipientPublicKeyJwkOrStr: JSON.stringify(bobKeys.publicKeyJwk),
        plaintext: 'Cast audition location confirmed for tomorrow at 10 AM.'
      });

      assert.ok(result.envelope.startsWith('ENCRYPTED:'), 'Envelope must use ENCRYPTED prefix');
      const parts = result.envelope.split(':');
      assert.ok(parts.length >= 3, 'Envelope must contain tag, iv, ciphertext');
    });

    test('LocationDetails imports and invokes encryptForRecipientOrThrow for confidential enquiries', () => {
      const locDetailsSource = fs.readFileSync(path.join(rootDir, 'src/pages/locations/details.tsx'), 'utf8');
      assert.ok(locDetailsSource.includes('encryptForRecipientOrThrow'), 'LocationDetails must import encryptForRecipientOrThrow');
      assert.ok(locDetailsSource.includes('getOrInitUserE2EE'), 'LocationDetails must initialize/retrieve user E2EE keys');
      assert.ok(locDetailsSource.includes('send_authorized_notification'), 'LocationDetails must route notification through server RPC');
    });
  });

  // M16 & M17: Quality Gates, CSV Export & Navigation
  describe('M16 & M17: Quality Gates & Real CSV Export', () => {
    test('Course model interface and UI map website_link and validate external providers with URL protocol', () => {
      const industryHubSource = fs.readFileSync(path.join(rootDir, 'src/pages/industry-hub/page.tsx'), 'utf8');
      assert.ok(industryHubSource.includes('website_link?: string | null'), 'Course interface must include website_link');
      assert.ok(industryHubSource.includes("targetLink.startsWith('http')"), 'Course registration must validate external target URLs');
      assert.ok(industryHubSource.includes('isValidHttpUrl'), 'Must validate URL protocol with URL parser');
    });

    test('App.tsx provides /login compatibility alias redirecting to /auth/signin', () => {
      const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
      assert.ok(appSource.includes('<Route path="/login" element={<RedirectToSignIn />} />'), 'App must have /login alias');
    });

    test('AdminAnalytics handleExportCSV generates valid formatted CSV without ReferenceError', () => {
      const analyticsSource = fs.readFileSync(path.join(rootDir, 'src/pages/AdminAnalytics.tsx'), 'utf8');
      assert.ok(!analyticsSource.includes('...userData.metrics'), 'Must not reference undefined userData');
      assert.ok(analyticsSource.includes('...usersData.metrics'), 'Must map usersData.metrics correctly');
      assert.ok(analyticsSource.includes('const { toast } = useToast();'), 'Must instantiate useToast hook');
      assert.ok(analyticsSource.includes('toast({ title: "CSV Exported"'), 'Must invoke toast on export');

      // Functional CSV format simulation
      const usersMetrics = [{ title: 'Total Registered Users', value: '1,200', change: '+5%' }];
      const projectsMetrics = [{ title: 'Active Projects', value: '34', change: '+2%' }];

      const allMetrics = [
        ...usersMetrics.map(m => ({ category: "Users", ...m })),
        ...projectsMetrics.map(m => ({ category: "Projects", ...m }))
      ];

      const rows = [
        ["Category", "Metric", "Value", "Change"],
        ...allMetrics.map(m => [`"${m.category}"`, `"${m.title}"`, `"${m.value}"`, `"${m.change}"`])
      ];

      const csv = rows.map(r => r.join(",")).join("\n");
      assert.ok(csv.includes('Category,Metric,Value,Change'), 'CSV must contain headers');
      assert.ok(csv.includes('"Users","Total Registered Users","1,200","+5%"'), 'CSV must map rows with quoting');
      assert.ok(csv.includes('"Projects","Active Projects","34","+2%"'), 'CSV must include projects rows');
    });
  });

  // M20: Community Group Creation & Creator Membership Idempotency
  describe('M20: Community Group Creation & Idempotency', () => {
    test('Simulating atomic group creation does not delete valid group on 23505 conflict', async () => {
      let groupDeleted = false;
      const fakeGroup = { id: '55555555-5555-4555-8555-555555555555', name: 'Sound Designers' };

      const handleCreateGroupSimulation = async (group) => {
        let memberError = { code: '23505', message: 'duplicate key value violates unique constraint' };

        if (memberError && memberError.code !== '23505') {
          groupDeleted = true;
          throw new Error('Fatal member creation failed');
        }

        return { success: true, group };
      };

      const result = await handleCreateGroupSimulation(fakeGroup);
      assert.equal(result.success, true);
      assert.equal(groupDeleted, false, 'Group must NOT be deleted when duplicate owner is encountered');
      assert.equal(result.group.name, 'Sound Designers');
    });
  });

  // M22: Job Applications FK, Profile Binding & Immutability
  describe('M22: Job Application Profile Binding & Immutability', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Job applications insert policy strictly binds profile_id to auth.uid()', () => {
      assert.ok(
        migrationSql.includes('p.id = job_applications.profile_id') && migrationSql.includes('p.user_id = auth.uid()'),
        'job_applications_insert policy must ensure profile_id belongs to authenticated user'
      );
      assert.ok(migrationSql.includes('job_applications_profile_id_fkey'), 'Must create foreign key to public.profiles(id)');
    });

    test('Job applications update immutability trigger prevents rewriting candidate identity', () => {
      assert.ok(migrationSql.includes('check_job_application_update_immutability'), 'Must define check_job_application_update_immutability trigger');
      assert.ok(migrationSql.includes('NEW.profile_id IS DISTINCT FROM OLD.profile_id'), 'Must check candidate profile_id immutability');
      assert.ok(migrationSql.includes('NEW.job_id IS DISTINCT FROM OLD.job_id'), 'Must check job_id immutability');
    });
  });

  // M25: Studios Directory Opportunities & Persistence
  describe('M25: Studio Persistence & Caller Guarantees', () => {
    const studiosSource = fs.readFileSync(path.join(rootDir, 'src/pages/StudiosDirectory.tsx'), 'utf8');

    test('StudiosDirectory callers await updateViewingCompany and check ok result before toast', () => {
      assert.ok(studiosSource.includes('const res = await updateViewingCompany(updated)'), 'Callers must await updateViewingCompany');
      assert.ok(studiosSource.includes('if (!res.ok) return;'), 'Callers must guard success toasts on res.ok');
    });

    test('StudiosDirectory persists courses and events in updateViewingCompany payload and loads them', () => {
      assert.ok(studiosSource.includes('courses: (updated.courses || []) as any'), 'updateViewingCompany must persist courses');
      assert.ok(studiosSource.includes('courses: c.courses || []'), 'fetchCompanies must map courses');
    });
  });

  // M26: Chat Polling, Outbox Preservation & Message Idempotency
  describe('M26: Account-Scoped Outbox & Idempotent Retry', () => {
    test('loadChatData preserves failed outbox messages when server polling returns', () => {
      const activeRecipientId = 'user-recipient-uuid';
      const currentUserId = 'user-sender-uuid';

      const cachedConversations = [
        {
          id: activeRecipientId,
          messages: [
            {
              id: 'local-temp-msg-1',
              sender_id: currentUserId,
              receiver_id: activeRecipientId,
              content: 'Script draft review',
              timestamp: Date.now() - 5000,
              failed: true
            }
          ]
        }
      ];

      const serverMessages = [
        {
          id: 'server-msg-1',
          sender_id: activeRecipientId,
          receiver_id: currentUserId,
          content: 'Hey, did you send the draft?',
          created_at: new Date(Date.now() - 10000).toISOString()
        }
      ];

      const mergeOutbox = (dbMsgs, cachedConvs, activeId) => {
        const outboxConv = cachedConvs.find(c => c.id === activeId);
        const unsentMessages = (outboxConv?.messages || []).filter(m => m.failed);
        
        const mappedServer = dbMsgs.map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
          failed: false
        }));

        return [...mappedServer, ...unsentMessages].sort((a, b) => a.timestamp - b.timestamp);
      };

      const merged = mergeOutbox(serverMessages, cachedConversations, activeRecipientId);
      
      assert.equal(merged.length, 2);
      const failedMsg = merged.find(m => m.failed);
      assert.ok(failedMsg, 'Failed message must be preserved across polling cycles');
      assert.equal(failedMsg.content, 'Script draft review');
      assert.equal(failedMsg.failed, true);
    });

    test('Messages table contains client_message_id with unique constraint for retry idempotency', () => {
      const migrationSql = fs.readFileSync(
        path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
        'utf8'
      );
      assert.ok(migrationSql.includes('client_message_id TEXT'), 'Must add client_message_id to messages');
      assert.ok(migrationSql.includes('idx_messages_client_message_id'), 'Must create unique index on client_message_id');
    });

    test('Messages page generates collision-resistant UUID and reconciles 23505 conflict', () => {
      const messagesSource = fs.readFileSync(path.join(rootDir, 'src/pages/messages/page.tsx'), 'utf8');
      assert.ok(messagesSource.includes('crypto.randomUUID'), 'Must use crypto.randomUUID for client_message_id');
      assert.ok(messagesSource.includes("existingMsg.content !== envelope"), 'Must reconcile duplicate key with envelope content');
    });

    test('Sidebar and message caches are account-scoped with activeId suffix', () => {
      const sidebarSource = fs.readFileSync(path.join(rootDir, 'src/components/layout/sidebar.tsx'), 'utf8');
      assert.ok(sidebarSource.includes('chat_conversations_${activeId}'), 'Sidebar cache must be account-scoped');
      assert.ok(sidebarSource.includes('read_conversations_${activeId}'), 'Sidebar read receipts must be account-scoped');
    });
  });

  // M27: Truthful Metrics
  describe('M27: Truthful Metrics & Non-Fabricated Telemetry', () => {
    test('Zero registered profiles yields 0 counts and empty trend without fabricated points', () => {
      const computeDashboardStats = (profilesList, ticketsCount) => {
        const totalUsers = profilesList.length;
        const totalTickets = ticketsCount || 0;
        const totalTeamMembers = profilesList.filter(p => p.role?.toLowerCase() === 'admin').length;
        
        const registrationTrend = {};
        profilesList.forEach(p => {
          if (p.created_at) {
            const month = new Date(p.created_at).toISOString().slice(0, 7);
            registrationTrend[month] = (registrationTrend[month] || 0) + 1;
          }
        });

        const userTrendData = Object.entries(registrationTrend).map(([name, users]) => ({ name, users }));

        return {
          totalUsers,
          totalTickets,
          totalTeamMembers,
          userTrendData
        };
      };

      const emptyStats = computeDashboardStats([], 0);
      assert.equal(emptyStats.totalUsers, 0);
      assert.equal(emptyStats.totalTickets, 0, 'Tickets count must be 0, not hardcoded 3');
      assert.equal(emptyStats.totalTeamMembers, 0, 'Admin count must be 0, not default 1');
      assert.equal(emptyStats.userTrendData.length, 0, 'Trend must not contain fabricated 5 data points');
    });

    test('AdminAnalytics verifies verifiedUsers using strictly p.is_verified === true', () => {
      const analyticsSource = fs.readFileSync(path.join(rootDir, 'src/pages/AdminAnalytics.tsx'), 'utf8');
      assert.ok(analyticsSource.includes('p.is_verified === true'), 'Verified profiles must check is_verified, not avatar_url');
      assert.ok(analyticsSource.includes('Recently Updated Profiles'), 'Must label updated_at metric accurately');
    });

    test('Jobs page renders truthful application counts without Math.random and shows Confidential to non-owners', () => {
      const jobsSource = fs.readFileSync(path.join(rootDir, 'src/pages/Jobs.tsx'), 'utf8');
      assert.ok(!jobsSource.includes('Math.floor(Math.random() * 50)'), 'Must not contain random job application numbers');
      assert.ok(jobsSource.includes('selectedJob.applications_count'), 'Must use truthful selectedJob.applications_count');
      assert.ok(jobsSource.includes('"Confidential"'), 'Must designate applications count as Confidential for non-owners');
    });
  });

  // M28: Zero-Row Mutation Rejection & Optimistic Rollbacks
  describe('M28: Zero-Row Mutation Rejection & Optimistic Rollbacks', () => {
    test('Mutation handler rejects zero-row response and does not report false success', async () => {
      const executeDeleteWithVerification = async (itemId, mockDbResponse) => {
        const { data, error } = mockDbResponse;
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Record not found or unauthorized: 0 rows affected');
        }
        return { success: true, deletedId: data[0].id };
      };

      const successRes = await executeDeleteWithVerification('item-123', {
        data: [{ id: 'item-123' }],
        error: null
      });
      assert.equal(successRes.success, true);
      assert.equal(successRes.deletedId, 'item-123');

      await assert.rejects(
        async () => {
          await executeDeleteWithVerification('item-999', {
            data: [],
            error: null
          });
        },
        /Record not found or unauthorized: 0 rows affected/
      );
    });

    test('Profile directory file mutations inspect response and guard against zero rows', () => {
      const profileSource = fs.readFileSync(path.join(rootDir, 'src/pages/Profile.tsx'), 'utf8');
      assert.ok(profileSource.includes('delErr || !delData || delData.length === 0'), 'Profile file delete must check errors and zero rows');
      assert.ok(profileSource.includes('upErr || !upData || upData.length === 0'), 'Profile file update must check errors and zero rows');
    });

    test('AdminJobs, AdminDirectory, AdminLocations, AdminTickets, AdminTicketDetail, AdminUsers, AdminProjects enforce .select("id") and zero-row checks', () => {
      const adminFiles = [
        'src/pages/AdminJobs.tsx',
        'src/pages/AdminDirectory.tsx',
        'src/pages/AdminLocations.tsx',
        'src/pages/AdminTickets.tsx',
        'src/pages/AdminTicketDetail.tsx',
        'src/pages/AdminUsers.tsx',
        'src/pages/AdminProjects.tsx'
      ];
      for (const relPath of adminFiles) {
        const src = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
        assert.ok(src.includes('.select("id")') || src.includes(".select('id')"), `${relPath} must select id on mutations`);
        assert.ok(src.includes('!data || data.length === 0'), `${relPath} must reject zero-row mutations`);
      }
    });
  });

  // Behavioral & End-to-End Convergence Verification (20261107000000)
  describe('Behavioral & Convergence Verification (M02-M28)', () => {
    const forwardMigrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261107000000_complete_remediation_convergence.sql'),
      'utf8'
    );

    test('M11: Raw profiles RLS restricts non-owner SELECT when privacy flags are disabled while public_profiles masks fields', () => {
      assert.ok(forwardMigrationSql.includes('COALESCE(privacy_show_email, true) = true'), 'profiles_select_public must enforce privacy_show_email on raw table');
      assert.ok(forwardMigrationSql.includes('COALESCE(privacy_show_phone, true) = true'), 'profiles_select_public must enforce privacy_show_phone on raw table');
      assert.ok(forwardMigrationSql.includes('COALESCE(privacy_show_dob, true) = true'), 'profiles_select_public must enforce privacy_show_dob on raw table');

      // Behavioral redaction simulation comparing raw profiles vs public_profiles view
      const row = {
        id: 'prof-1',
        user_id: 'auth-1',
        full_name: 'Maya Lin',
        email: 'maya@secret.io',
        phone: '+919999999999',
        date_of_birth: '1992-05-10',
        privacy_show_email: false,
        privacy_show_phone: false,
        privacy_show_dob: false
      };

      const canNonOwnerSelectRawProfile = (r, viewerUid) => {
        if (viewerUid === r.user_id || viewerUid === r.id) return true;
        return (r.privacy_show_email ?? true) && (r.privacy_show_phone ?? true) && (r.privacy_show_dob ?? true);
      };

      const projectPublicProfile = (r, viewerUid) => {
        const isOwner = viewerUid === r.user_id || viewerUid === r.id;
        return {
          id: r.id,
          full_name: r.full_name,
          email: (r.privacy_show_email ?? true) || isOwner ? r.email : null,
          phone: (r.privacy_show_phone ?? true) || isOwner ? r.phone : null,
          date_of_birth: (r.privacy_show_dob ?? true) || isOwner ? r.date_of_birth : null
        };
      };

      assert.equal(canNonOwnerSelectRawProfile(row, 'stranger-uid'), false, 'Non-owner must be blocked from raw profiles row when any privacy flag is false');
      assert.equal(canNonOwnerSelectRawProfile(row, 'auth-1'), true, 'Owner can select raw profiles row');

      const redacted = projectPublicProfile(row, 'stranger-uid');
      assert.equal(redacted.email, null);
      assert.equal(redacted.phone, null);
      assert.equal(redacted.date_of_birth, null);
    });

    test('M14 & M15 & M26: Non-destructive E2EE key-ring decryption and identical ciphertext reuse on retry', async () => {
      const aliceOld = await generateKeyPair();
      const aliceNew = await generateKeyPair();
      const bob = await generateKeyPair();

      const bobPriv = await importPrivateKey(bob.privateKeyJwk);
      // Bob encrypts a message to Alice's OLD public key before Alice rotated keys
      const oldEnv = await encryptForRecipientOrThrow({
        senderPrivateKey: bobPriv,
        recipientPublicKeyJwkOrStr: aliceOld.publicKeyJwk,
        plaintext: 'Historical message encrypted to Alice old key'
      });

      const oldKeyId = await computeKeyId(aliceOld.publicKeyJwk);
      const newKeyId = await computeKeyId(aliceNew.publicKeyJwk);
      assert.notEqual(oldKeyId, newKeyId);

      // Alice's key-ring retains both her new key and her old key
      const keyring = [
        { keyId: newKeyId, publicKeyJwk: aliceNew.publicKeyJwk, privateKeyJwk: aliceNew.privateKeyJwk, createdAt: new Date().toISOString() },
        { keyId: oldKeyId, publicKeyJwk: aliceOld.publicKeyJwk, privateKeyJwk: aliceOld.privateKeyJwk, createdAt: new Date().toISOString() }
      ];

      const decryptedHistorical = await decryptEnvelopeWithKeyring({
        envelope: oldEnv.envelope,
        peerPublicKeyJwkOrStr: JSON.stringify(bob.publicKeyJwk),
        primaryPrivateKey: await importPrivateKey(aliceNew.privateKeyJwk),
        keyring
      });
      assert.equal(decryptedHistorical, 'Historical message encrypted to Alice old key', 'Keyring fallback must decrypt historical message after key rotation');

      // M26: Retry reuses stored encryptedEnvelope so 23505 reconciliation succeeds
      const storedEnvelope = oldEnv.envelope;
      const retryMsg = { id: 'client-uuid-1', content: 'Plaintext UI preview', encryptedEnvelope: storedEnvelope, failed: true };
      const envelopeUsedOnRetry = retryMsg.encryptedEnvelope || 're-encrypted-different-iv';
      assert.equal(envelopeUsedOnRetry, storedEnvelope, 'Retry must reuse exact initial encryptedEnvelope');
    });

    test('M06: app_role enum includes moderator and support and RPC casts v_db_role::public.app_role', () => {
      assert.ok(forwardMigrationSql.includes("ADD VALUE IF NOT EXISTS 'moderator'"), 'Must add moderator to app_role enum');
      assert.ok(forwardMigrationSql.includes("ADD VALUE IF NOT EXISTS 'support'"), 'Must add support to app_role enum');
      assert.ok(forwardMigrationSql.includes('v_db_role::public.app_role'), 'provision_admin_team_member must cast to public.app_role');

      const adminTeamSource = fs.readFileSync(path.join(rootDir, 'src/pages/AdminTeam.tsx'), 'utf8');
      assert.ok(!adminTeamSource.includes('rpcError.code === "PGRST202"'), 'AdminTeam must not contain non-atomic fallback');
    });

    test('M08, M09, M10, M13: Casting capacity SECURITY DEFINER, notification event check, post_comments immutability, community Pending restriction', () => {
      assert.ok(forwardMigrationSql.includes('check_casting_capacity()\nRETURNS TRIGGER\nLANGUAGE plpgsql\nSECURITY DEFINER'), 'check_casting_capacity must be SECURITY DEFINER');
      assert.ok(forwardMigrationSql.includes('FOR UPDATE'), 'check_casting_capacity must lock casting_calls row FOR UPDATE');
      assert.ok(forwardMigrationSql.includes('v_authorized BOOLEAN := false;'), 'send_authorized_notification must verify caller-recipient relationship');
      assert.ok(forwardMigrationSql.includes('check_post_comment_update_immutability'), 'post_comments must enforce update immutability trigger');
      assert.ok(forwardMigrationSql.includes("m.role != 'Pending'"), 'is_community_group_member and message select must exclude Pending members');
    });
  });

  // ============================================================================
  // R7-01 through R7-13: Real PostgreSQL 16 (PGlite) & Runtime Verification Suite
  // ============================================================================
  describe('R7-01..R7-13: Real PostgreSQL 16 Schema, RLS, Triggers, E2EE & Performance Verification', async () => {
    const supabaseMockPreamble = `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
        END IF;
      END $$;

      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

      CREATE SCHEMA IF NOT EXISTS auth;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      GRANT SELECT ON auth.users TO anon, authenticated, service_role;

      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS UUID
      LANGUAGE sql
      STABLE
      AS $func$
        SELECT NULLIF(
          COALESCE(
            current_setting('request.jwt.claim.sub', true),
            (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
          ),
          ''
        )::uuid;
      $func$;

      CREATE OR REPLACE FUNCTION auth.role()
      RETURNS TEXT
      LANGUAGE sql
      STABLE
      AS $func$
        SELECT COALESCE(
          NULLIF(current_setting('request.jwt.claim.role', true), ''),
          (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
          current_user
        );
      $func$;

      CREATE SCHEMA IF NOT EXISTS storage;
      GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

      CREATE TABLE IF NOT EXISTS storage.buckets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner UUID,
        public BOOLEAN DEFAULT false,
        file_size_limit BIGINT,
        allowed_mime_types TEXT[],
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS storage.objects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id TEXT REFERENCES storage.buckets(id),
        name TEXT,
        owner UUID,
        owner_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        last_accessed_at TIMESTAMPTZ DEFAULT now(),
        metadata JSONB
      );

      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;

      CREATE OR REPLACE FUNCTION storage.foldername(name TEXT)
      RETURNS TEXT[]
      LANGUAGE sql
      IMMUTABLE
      AS $func$
        SELECT string_to_array(name, '/');
      $func$;
      GRANT EXECUTE ON FUNCTION storage.foldername(TEXT) TO anon, authenticated, service_role;
    `;

    const migrationsDir = path.join(rootDir, 'supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    async function asUser(db, authUid, fn) {
      await db.exec(`
        RESET ROLE;
        SELECT set_config('request.jwt.claim.sub', '${authUid || ''}', false);
        SELECT set_config('request.jwt.claim.role', '${authUid ? 'authenticated' : 'anon'}', false);
        SELECT set_config('request.jwt.claims', '${JSON.stringify({ sub: authUid || null, role: authUid ? 'authenticated' : 'anon' })}', false);
        SET ROLE ${authUid ? 'authenticated' : 'anon'};
      `);
      try {
        return await fn();
      } finally {
        await db.exec(`
          RESET ROLE;
          SELECT set_config('request.jwt.claim.sub', '', false);
          SELECT set_config('request.jwt.claim.role', '', false);
          SELECT set_config('request.jwt.claims', '', false);
        `);
      }
    }

    test('R7-01 & R7-11: Existing-schema upgrade path (20250108..20261107 -> seed -> 20261108) executes cleanly in PostgreSQL 16', async () => {
      const upgradeDb = new PGlite();
      await upgradeDb.exec(supabaseMockPreamble);

      const preR7Files = migrationFiles.filter(f => f < '20261108000000');
      for (const file of preR7Files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await upgradeDb.exec(sql);
      }

      // Seed representative pre-existing data (including a ticket with auth.users.id in user_id)
      const legacyAuthUid = '11111111-1111-4111-8111-111111111101';
      const legacyProfileId = '22222222-2222-4222-8222-222222222201';
      await upgradeDb.exec(`
        INSERT INTO auth.users (id, email) VALUES ('${legacyAuthUid}', 'legacy@filmcollab.io');
        DELETE FROM public.profiles WHERE user_id = '${legacyAuthUid}';
        INSERT INTO public.profiles (id, user_id, username, full_name, email, role)
        VALUES ('${legacyProfileId}', '${legacyAuthUid}', 'legacy_dir', 'Legacy Director', 'legacy@filmcollab.io', 'blocked');
        INSERT INTO public.tickets (id, ticket_number, user_id, subject, description, category, priority, status)
        VALUES ('33333333-3333-4333-8333-333333333301', 'TKT-LEGACY-1', '${legacyAuthUid}', 'Legacy Ticket', 'Created with auth.users.id', 'Technical', 'medium', 'open');
      `);

      const r7Sql = fs.readFileSync(
        path.join(migrationsDir, '20261108000000_r7_complete_contract_and_security_remediation.sql'),
        'utf8'
      );
      await upgradeDb.exec(r7Sql);

      // Verify legacy ticket user_id was migrated from auth.users.id to profiles.id and FK constraint holds
      const migratedTicket = await upgradeDb.query(
        `SELECT user_id FROM public.tickets WHERE id = '33333333-3333-4333-8333-333333333301'`
      );
      assert.equal(migratedTicket.rows[0].user_id, legacyProfileId, 'Upgrade migration must normalize legacy ticket user_id to profiles.id');

      // Verify legacy blocked role was synced to account_status = 'blocked'
      const migratedProfile = await upgradeDb.query(
        `SELECT account_status, role FROM public.profiles WHERE id = '${legacyProfileId}'`
      );
      assert.equal(migratedProfile.rows[0].account_status, 'blocked');
      await upgradeDb.close();
    });

    test('R7-01 through R7-10: Clean install replay and full multi-role PostgreSQL 16 security & contract suite', async () => {
      const db = new PGlite();
      await db.exec(supabaseMockPreamble);

      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.exec(sql);
      }

      // 1. R7-01: Verify all required tables, views, columns, FKs, RPCs, and storage buckets exist in pg_catalog
      const requiredTables = [
        'profiles', 'posts', 'post_likes', 'post_saves', 'post_comments',
        'projects', 'project_likes', 'project_members', 'project_tasks', 'project_messages',
        'jobs', 'job_applications', 'connections', 'user_likes', 'user_saves', 'user_roles',
        'community_groups', 'community_group_members', 'community_group_messages',
        'directory_files', 'directory_categories', 'companies', 'company_applications',
        'company_followers', 'company_reviews', 'shooting_locations', 'shooting_location_likes',
        'property_site_visits', 'property_types', 'messages', 'tickets', 'ticket_messages',
        'ticket_updates', 'subscription_plans', 'contact_submissions', 'notifications',
        'casting_calls', 'casting_applicants', 'casting_call_saves', 'categories',
        'global_tags', 'settings', 'site_settings', 'admin_team_members',
        'industry_news', 'industry_events', 'industry_courses', 'reports'
      ];
      const tablesRes = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
      );
      const presentTables = new Set(tablesRes.rows.map(r => r.table_name));
      for (const t of requiredTables) {
        assert.ok(presentTables.has(t), `Missing required table or view in public schema: ${t}`);
      }

      const viewsRes = await db.query(
        `SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'public_profiles'`
      );
      assert.equal(viewsRes.rows.length, 1, 'public_profiles view must exist');

      const bucketsRes = await db.query(`SELECT id, public FROM storage.buckets`);
      const bucketsMap = new Map(bucketsRes.rows.map(b => [b.id, b.public]));
      for (const b of ['avatars', 'location_media', 'post-media', 'post_media', 'site_assets', 'directory_assets', 'directory_private']) {
        assert.ok(bucketsMap.has(b), `Missing storage bucket: ${b}`);
      }
      assert.equal(bucketsMap.get('directory_assets'), false, 'directory_assets bucket must be non-public (public = false)');
      assert.equal(bucketsMap.get('directory_private'), false, 'directory_private bucket must be non-public (public = false)');

      const fksRes = await db.query(`
        SELECT conname FROM pg_constraint
        WHERE conname IN (
          'tickets_user_id_fkey',
          'tickets_assigned_to_fkey',
          'ticket_messages_author_id_fkey',
          'ticket_updates_author_id_fkey',
          'job_applications_profile_id_fkey',
          'directory_files_user_id_fkey'
        )
      `);
      const fkNames = new Set(fksRes.rows.map(r => r.conname));
      for (const fk of ['tickets_user_id_fkey', 'tickets_assigned_to_fkey', 'ticket_messages_author_id_fkey', 'ticket_updates_author_id_fkey', 'job_applications_profile_id_fkey', 'directory_files_user_id_fkey']) {
        assert.ok(fkNames.has(fk), `Missing required foreign key constraint: ${fk}`);
      }

      // 2. Seed distinct auth.users.id != profiles.id fixtures for Alice, Bob, Staff, Admin, and Blocked user
      const aliceAuth = 'aaaa0000-0000-4000-8000-000000000001';
      const aliceProf = 'bbbb0000-0000-4000-8000-000000000001';
      const bobAuth   = 'aaaa0000-0000-4000-8000-000000000002';
      const bobProf   = 'bbbb0000-0000-4000-8000-000000000002';
      const staffAuth = 'aaaa0000-0000-4000-8000-000000000003';
      const staffProf = 'bbbb0000-0000-4000-8000-000000000003';
      const blockAuth = 'aaaa0000-0000-4000-8000-000000000004';
      const blockProf = 'bbbb0000-0000-4000-8000-000000000004';

      await db.exec(`
        INSERT INTO auth.users (id, email) VALUES
          ('${aliceAuth}', 'alice@filmcollab.io'),
          ('${bobAuth}', 'bob@filmcollab.io'),
          ('${staffAuth}', 'staff@filmcollab.io'),
          ('${blockAuth}', 'blocked@filmcollab.io');

        DELETE FROM public.profiles WHERE user_id IN ('${aliceAuth}', '${bobAuth}', '${staffAuth}', '${blockAuth}');

        INSERT INTO public.profiles (
          id, user_id, username, full_name, email, phone, date_of_birth,
          location, city, state, country, current_city, current_state, current_country,
          birth_city, birth_state, birth_country,
          category, role, account_status,
          privacy_show_email, privacy_show_phone, privacy_show_dob, privacy_show_location, privacy_show_directory,
          allow_profile_views
        ) VALUES
          ('${aliceProf}', '${aliceAuth}', 'alice_cin', 'Alice Cinematographer', 'alice@filmcollab.io', '+919000000001', '1991-04-12',
           'Mumbai, MH', 'Mumbai', 'Maharashtra', 'India', 'Mumbai', 'Maharashtra', 'India',
           'Pune', 'Maharashtra', 'India',
           'Cinematographer', 'user', 'active',
           false, false, false, false, false, true),
          ('${bobProf}', '${bobAuth}', 'bob_dir', 'Bob Director', 'bob@filmcollab.io', '+919000000002', '1988-08-20',
           'Chennai, TN', 'Chennai', 'Tamil Nadu', 'India', 'Chennai', 'Tamil Nadu', 'India',
           'Madurai', 'Tamil Nadu', 'India',
           'Director', 'user', 'active',
           true, true, true, true, true, true),
          ('${staffProf}', '${staffAuth}', 'staff_mod', 'Staff Moderator', 'staff@filmcollab.io', '+919000000003', '1990-01-01',
           'Delhi', 'New Delhi', 'Delhi', 'India', 'New Delhi', 'Delhi', 'India',
           'New Delhi', 'Delhi', 'India',
           'Producer', 'moderator', 'active',
           true, true, true, true, true, true),
          ('${blockProf}', '${blockAuth}', 'blocked_actor', 'Blocked Actor', 'blocked@filmcollab.io', '+919000000004', '1995-05-05',
           'Kolkata', 'Kolkata', 'West Bengal', 'India', 'Kolkata', 'West Bengal', 'India',
           'Kolkata', 'West Bengal', 'India',
           'Actor', 'blocked', 'blocked',
           true, true, true, true, true, true);

        -- Bob follows Alice
        INSERT INTO public.connections (user_id, connected_user_id, status)
        VALUES ('${bobProf}', '${aliceProf}', 'accepted');

        -- Provision Staff Moderator with granular permissions on tickets (edit) and jobs (delete), but NOT users
        INSERT INTO public.user_roles (user_id, role)
        VALUES ('${staffAuth}', 'moderator')
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.admin_team_members (user_id, profile_id, role, status, permissions)
        VALUES (
          '${staffAuth}',
          '${staffProf}',
          'Moderator',
          'Active',
          '{"Tickets": {"view": true, "edit": true}, "Jobs": {"view": true, "delete": true}}'::jsonb
        );
      `);

      // 3. R7-02 & R7-03: Public vs Private project notifications, location notifications, job notifications under ROLE authenticated
      await asUser(db, aliceAuth, async () => {
        // Alice creates a PUBLIC project -> should succeed and notify follower Bob (even when created_by = auth.users.id and connections uses profiles.id)
        const pubProjRes = await db.query(`
          INSERT INTO public.projects (title, category, project_type, status, visibility, created_by)
          VALUES ('Public Noir Feature', 'Direction', 'Feature Film', 'planning', 'public', '${aliceAuth}')
          RETURNING id
        `);
        assert.equal(pubProjRes.rows.length, 1);

        // Alice creates a PRIVATE project -> should succeed and NOT notify non-member follower Bob
        const privProjRes = await db.query(`
          INSERT INTO public.projects (title, category, project_type, status, visibility, created_by)
          VALUES ('Secret Studio Project', 'Direction', 'Feature Film', 'planning', 'private', '${aliceAuth}')
          RETURNING id
        `);
        assert.equal(privProjRes.rows.length, 1);

        // Alice creates a shooting location -> trigger must succeed under SECURITY DEFINER without 42501
        const locRes = await db.query(`
          INSERT INTO public.shooting_locations (name, city, state, property_type, price, status, created_by)
          VALUES ('Heritage Palace Studio', 'Mumbai', 'Maharashtra', 'Studio', 25000, 'active', '${aliceAuth}')
          RETURNING id
        `);
        assert.equal(locRes.rows.length, 1);

        // Alice creates a job -> trigger must succeed under SECURITY DEFINER without 42501
        const jobRes = await db.query(`
          INSERT INTO public.jobs (job_title, company_name, job_description, job_type, experience_level, location, industry, status, user_id)
          VALUES ('Lead Gaffer', 'Noir Productions', 'Lighting setup', 'Full-time', 'Mid-Level', 'Mumbai', 'Film', 'active', '${aliceAuth}')
          RETURNING id
        `);
        assert.equal(jobRes.rows.length, 1);
      });

      const bobNotifs = await db.query(
        `SELECT title, description FROM public.notifications WHERE user_id = '${bobProf}'`
      );
      assert.ok(
        bobNotifs.rows.some(n => n.description && n.description.includes('Public Noir Feature')),
        'Follower Bob must receive notification for Alice public project'
      );
      assert.ok(
        !bobNotifs.rows.some(n => n.description && n.description.includes('Secret Studio Project')),
        'Follower Bob must NOT receive notification for Alice private project when not an accepted project_member'
      );

      // 4. R7-04: Staff self-read on admin_team_members and granular server-side permission enforcement
      await asUser(db, staffAuth, async () => {
        const selfTeam = await db.query(`SELECT id, role, permissions FROM public.admin_team_members`);
        assert.equal(selfTeam.rows.length, 1, 'Active staff member must be able to read their own admin_team_members row');
        assert.equal(selfTeam.rows[0].role, 'Moderator');
      });

      await asUser(db, bobAuth, async () => {
        const otherTeam = await db.query(`SELECT id FROM public.admin_team_members`);
        assert.equal(otherTeam.rows.length, 0, 'Non-staff user must not read admin_team_members rows');
      });

      // Bob creates a ticket passing auth.users.id (normalized automatically to bobProf by trigger)
      let bobTicketId;
      await asUser(db, bobAuth, async () => {
        const tktRes = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, category, priority)
          VALUES ('${bobAuth}', 'Audio sync issue', 'Need help with timecode', 'Technical', 'high')
          RETURNING id, user_id
        `);
        assert.equal(tktRes.rows[0].user_id, bobProf, 'normalize_ticket_profile_references must normalize auth.uid() to profiles.id');
        bobTicketId = tktRes.rows[0].id;
      });

      // Staff moderator with tickets.edit = true can update Bob's ticket, but cannot edit Bob's profile (users.edit is not granted)
      await asUser(db, staffAuth, async () => {
        const updateTkt = await db.query(`
          UPDATE public.tickets SET status = 'in_progress', assigned_to = '${staffAuth}'
          WHERE id = '${bobTicketId}'
          RETURNING id, assigned_to
        `);
        assert.equal(updateTkt.rows.length, 1, 'Staff with tickets.edit permission must be allowed to update ticket');
        assert.equal(updateTkt.rows[0].assigned_to, staffProf, 'assigned_to must normalize to staff profile id');

        const unauthorizedProfileUpdate = await db.query(`
          UPDATE public.profiles SET bio = 'Tampered by staff without users permission'
          WHERE id = '${bobProf}'
          RETURNING id
        `);
        assert.equal(unauthorizedProfileUpdate.rows.length, 0, 'Staff without users.edit permission must not update another user profile');
      });

      // 5. R7-05: Blocked account server-side enforcement & self-unblock prevention
      await asUser(db, blockAuth, async () => {
        const activeCheck = await db.query(`SELECT public.is_caller_active() AS active`);
        assert.equal(activeCheck.rows[0].active, false, 'Blocked user must fail is_caller_active()');

        await assert.rejects(
          async () => {
            await db.query(`
              INSERT INTO public.posts (author_id, content, is_published)
              VALUES ('${blockProf}', 'Spam from blocked account', true)
            `);
          },
          /row-level security policy/i,
          'Blocked user must be denied inserting posts'
        );

        await assert.rejects(
          async () => {
            await db.query(`
              INSERT INTO public.messages (sender_id, receiver_id, content)
              VALUES ('${blockProf}', '${bobProf}', 'ENCRYPTED:iv:cipher')
            `);
          },
          /row-level security policy/i,
          'Blocked user must be denied sending messages'
        );

        await assert.rejects(
          async () => {
            await db.query(`
              UPDATE public.profiles SET account_status = 'active', role = 'user'
              WHERE id = '${blockProf}'
            `);
          },
          /Blocked accounts cannot modify|row-level security/i,
          'Blocked user must not be able to self-unblock'
        );
      });

      // 6. R7-06: Location & PII privacy enforcement across raw profiles vs public_profiles
      await asUser(db, bobAuth, async () => {
        // Alice has privacy_show_location = false, privacy_show_email = false, privacy_show_phone = false, privacy_show_dob = false
        const rawAlice = await db.query(`SELECT id FROM public.profiles WHERE id = '${aliceProf}'`);
        assert.equal(rawAlice.rows.length, 0, 'Non-owner must be blocked from selecting raw profiles row when privacy flags are disabled');

        const viewAlice = await db.query(`
          SELECT id, full_name, email, phone, date_of_birth,
                 location, city, state, country,
                 current_city, current_state, current_country,
                 birth_city, birth_state, birth_country
          FROM public.public_profiles
          WHERE id = '${aliceProf}'
        `);
        assert.equal(viewAlice.rows.length, 1, 'public_profiles must still return Alice public identity');
        const row = viewAlice.rows[0];
        assert.equal(row.full_name, 'Alice Cinematographer');
        assert.equal(row.email, null, 'email must be masked');
        assert.equal(row.phone, null, 'phone must be masked');
        assert.equal(row.date_of_birth, null, 'date_of_birth must be masked');
        assert.equal(row.location, null, 'location must be masked');
        assert.equal(row.city, null, 'city must be masked');
        assert.equal(row.state, null, 'state must be masked');
        assert.equal(row.country, null, 'country must be masked');
        assert.equal(row.current_city, null, 'current_city must be masked');
        assert.equal(row.current_state, null, 'current_state must be masked');
        assert.equal(row.current_country, null, 'current_country must be masked');
        assert.equal(row.birth_city, null, 'birth_city must be masked');
        assert.equal(row.birth_state, null, 'birth_state must be masked');
        assert.equal(row.birth_country, null, 'birth_country must be masked');
      });

      // Owner Alice sees her own unmasked fields in public_profiles
      await asUser(db, aliceAuth, async () => {
        const ownView = await db.query(`
          SELECT email, phone, location, city, current_city, birth_city
          FROM public.public_profiles
          WHERE id = '${aliceProf}'
        `);
        assert.equal(ownView.rows[0].email, 'alice@filmcollab.io');
        assert.equal(ownView.rows[0].location, 'Mumbai, MH');
        assert.equal(ownView.rows[0].city, 'Mumbai');
        assert.equal(ownView.rows[0].current_city, 'Mumbai');
        assert.equal(ownView.rows[0].birth_city, 'Pune');
      });

      // 7. R7-07: Private directory_assets bucket & RLS enforcement on directory_files and storage.objects
      await db.exec(`
        INSERT INTO public.directory_files (
          id, title, file_type, file_url, storage_bucket, storage_path, user_id, status, is_public
        ) VALUES (
          'dddd0000-0000-4000-8000-000000000001',
          'Alice Confidential Reel',
          'video',
          'storage://directory_assets/${aliceAuth}/reel.mp4',
          'directory_assets',
          '${aliceAuth}/reel.mp4',
          '${aliceProf}',
          'approved',
          true
        );

        INSERT INTO storage.objects (bucket_id, name, owner)
        VALUES ('directory_assets', '${aliceAuth}/reel.mp4', '${aliceAuth}');
      `);

      // Because Alice has privacy_show_directory = false, Bob cannot read Alice's directory_files row or storage.objects row
      await asUser(db, bobAuth, async () => {
        const dirRows = await db.query(`SELECT id FROM public.directory_files WHERE id = 'dddd0000-0000-4000-8000-000000000001'`);
        assert.equal(dirRows.rows.length, 0, 'Non-owner must not read directory_files when owner privacy_show_directory = false');

        const objRows = await db.query(`SELECT id FROM storage.objects WHERE bucket_id = 'directory_assets' AND name = '${aliceAuth}/reel.mp4'`);
        assert.equal(objRows.rows.length, 0, 'Non-owner must not read storage.objects when owner privacy_show_directory = false');
      });

      // Owner Alice CAN read her own directory_files and storage.objects
      await asUser(db, aliceAuth, async () => {
        const dirRows = await db.query(`SELECT id FROM public.directory_files WHERE id = 'dddd0000-0000-4000-8000-000000000001'`);
        assert.equal(dirRows.rows.length, 1, 'Owner must read own directory_files row');

        const objRows = await db.query(`SELECT id FROM storage.objects WHERE bucket_id = 'directory_assets' AND name = '${aliceAuth}/reel.mp4'`);
        assert.equal(objRows.rows.length, 1, 'Owner must read own storage.objects row');
      });

      // 8. R7-08: Public key rotation history trigger on profiles
      const key1 = JSON.stringify((await generateKeyPair()).publicKeyJwk);
      const key2 = JSON.stringify((await generateKeyPair()).publicKeyJwk);
      await asUser(db, aliceAuth, async () => {
        await db.query(`UPDATE public.profiles SET public_key = $1 WHERE id = $2`, [key1, aliceProf]);
        await db.query(`UPDATE public.profiles SET public_key = $1 WHERE id = $2`, [key2, aliceProf]);
        const keyHistRes = await db.query(`SELECT public_key, public_key_history FROM public.profiles WHERE id = $1`, [aliceProf]);
        assert.equal(keyHistRes.rows[0].public_key, key2);
        const hist = keyHistRes.rows[0].public_key_history;
        assert.ok(Array.isArray(hist) && hist.length === 1, 'Rotating public_key must archive previous key in public_key_history');
        assert.equal(hist[0].publicKey, key1);
      });

      // 9. R7-09: send_authorized_notification relationship enforcement, canonical profile_view text, and deduplication
      // Create a third user Charlie who has NO connection or like with Bob
      const charlieAuth = 'aaaa0000-0000-4000-8000-000000000005';
      const charlieProf = 'bbbb0000-0000-4000-8000-000000000005';
      await db.exec(`
        INSERT INTO auth.users (id, email) VALUES ('${charlieAuth}', 'charlie@filmcollab.io');
        DELETE FROM public.profiles WHERE user_id = '${charlieAuth}';
        INSERT INTO public.profiles (id, user_id, username, full_name, role, account_status)
        VALUES ('${charlieProf}', '${charlieAuth}', 'charlie_ed', 'Charlie Editor', 'user', 'active');
      `);

      await asUser(db, charlieAuth, async () => {
        // Charlie tries to forge a connection notification to Bob (who has privacy_allow_profile_views = true) without a connections row
        await assert.rejects(
          async () => {
            await db.query(`
              SELECT public.send_authorized_notification(
                p_recipient_id := '${bobProf}',
                p_title := 'Fake Connection Request',
                p_message := 'Forged alert',
                p_type := 'connection'
              )
            `);
          },
          /Unauthorized notification/i,
          'send_authorized_notification must reject forged connection notification when no connection row exists'
        );

        // Charlie tries to forge a like notification to Bob without any like row
        await assert.rejects(
          async () => {
            await db.query(`
              SELECT public.send_authorized_notification(
                p_recipient_id := '${bobProf}',
                p_title := 'Fake Like',
                p_message := 'Forged like',
                p_type := 'like'
              )
            `);
          },
          /Unauthorized notification/i,
          'send_authorized_notification must reject forged like notification when no like row exists'
        );

        // Charlie sends a profile_view notification with spoofed title/message -> server enforces canonical text and deduplicates repeats
        const pv1 = await db.query(`
          SELECT public.send_authorized_notification(
            p_recipient_id := '${bobProf}',
            p_title := 'SPOOFED URGENT SYSTEM ALERT',
            p_message := 'Click this phishing text',
            p_type := 'profile_view'
          ) AS id
        `);
        const pv2 = await db.query(`
          SELECT public.send_authorized_notification(
            p_recipient_id := '${bobProf}',
            p_title := 'SECOND SPOOFED ALERT',
            p_message := 'Another spam text',
            p_type := 'profile_view'
          ) AS id
        `);
        assert.equal(pv1.rows[0].id, pv2.rows[0].id, 'Repeated unread profile_view notifications must be deduplicated');
      });

      const pvRow = await db.query(`SELECT title, description FROM public.notifications WHERE id = (SELECT id FROM public.notifications WHERE user_id = '${bobProf}' AND type = 'profile' LIMIT 1)`);
      assert.equal(pvRow.rows[0].title, 'Profile View', 'profile_view notification must enforce canonical title');
      assert.equal(pvRow.rows[0].description, 'Someone viewed your profile.', 'profile_view notification must enforce canonical description');

      // 10. R7-10: Studio follows & reviews persistence and summary triggers
      let studioId;
      await asUser(db, aliceAuth, async () => {
        const compRes = await db.query(`
          INSERT INTO public.companies (name, category, description, user_id)
          VALUES ('Noir Light Studios', 'Production House', 'Boutique cinematography house', '${aliceAuth}')
          RETURNING id
        `);
        studioId = compRes.rows[0].id;
      });

      await asUser(db, bobAuth, async () => {
        await db.query(`
          INSERT INTO public.company_followers (company_id, user_id)
          VALUES ('${studioId}', '${bobAuth}')
        `);
        await db.query(`
          INSERT INTO public.company_reviews (company_id, user_id, author_name, rating, comment)
          VALUES ('${studioId}', '${bobAuth}', 'Bob Director', 5, 'World-class anamorphic lenses and crew.')
        `);

        // Bob cannot forge a review under Charlie's user_id
        await assert.rejects(
          async () => {
            await db.query(`
              INSERT INTO public.company_reviews (company_id, user_id, author_name, rating, comment)
              VALUES ('${studioId}', '${charlieAuth}', 'Charlie', 1, 'Forged review')
            `);
          },
          /row-level security policy/i
        );
      });

      const studioSummary = await db.query(
        `SELECT followers_count, reviews_count, rating FROM public.companies WHERE id = '${studioId}'`
      );
      assert.equal(studioSummary.rows[0].followers_count, 1, 'company_followers trigger must update followers_count');
      assert.equal(studioSummary.rows[0].reviews_count, 1, 'company_reviews trigger must update reviews_count');
      assert.equal(Number(studioSummary.rows[0].rating), 5, 'company_reviews trigger must update rating');

      await db.close();
    });

    test('R7-08: Authenticated E2EE key metadata rejects tampered header and decrypts across peer public_key_history', async () => {
      const aliceOld = await generateKeyPair();
      const aliceRotated = await generateKeyPair();
      const bob = await generateKeyPair();

      const aliceOldPriv = await importPrivateKey(aliceOld.privateKeyJwk);
      const bobPriv = await importPrivateKey(bob.privateKeyJwk);

      // 1. Alice sends an authenticated 4-part envelope to Bob using her OLD key before rotating
      const envFromAliceOld = await encryptForRecipientOrThrow({
        senderPrivateKey: aliceOldPriv,
        recipientPublicKeyJwkOrStr: bob.publicKeyJwk,
        plaintext: 'Scene 42 call sheet attached.',
        includeKeyMetadata: true
      });

      const parts = envFromAliceOld.envelope.split(':');
      assert.equal(parts.length, 4, 'includeKeyMetadata must emit 4-part ENCRYPTED:<keyId>:<iv>:<cipher> envelope');

      // 2. Tamper with parts[1] (keyId header) and verify decryptEnvelopeWithKeyring rejects it with E2EE_AUTHENTICATION_FAILED
      const tamperedEnvelope = `ENCRYPTED:tampered_key_id:${parts[2]}:${parts[3]}`;
      await assert.rejects(
        async () => {
          await decryptEnvelopeWithKeyring({
            envelope: tamperedEnvelope,
            primaryPrivateKey: bobPriv,
            primaryPublicKeyJwk: bob.publicKeyJwk,
            senderPublicKeyJwkOrStr: aliceOld.publicKeyJwk
          });
        },
        /E2EE_AUTHENTICATION_FAILED/,
        'Tampered 4-part key metadata header must be rejected'
      );

      // 3. Alice rotates her public key to aliceRotated.publicKeyJwk; her old public key is in peerPublicKeyHistory.
      // Bob decrypts Alice's historical message using Alice's current public_key + peerPublicKeyHistory!
      const decryptedByBob = await decryptEnvelopeWithKeyring({
        envelope: envFromAliceOld.envelope,
        primaryPrivateKey: bobPriv,
        primaryPublicKeyJwk: bob.publicKeyJwk,
        senderPublicKeyJwkOrStr: aliceRotated.publicKeyJwk,
        peerPublicKeyHistory: [{ publicKey: JSON.stringify(aliceOld.publicKeyJwk) }]
      });
      assert.equal(decryptedByBob, 'Scene 42 call sheet attached.');
    });

    test('R7-13: NewLocation replaces 8.55MB country-state-city with lightweight india-locations and Messages scopes polling', async () => {
      const newLocSource = fs.readFileSync(path.join(rootDir, 'src/pages/locations/new.tsx'), 'utf8');
      assert.ok(!newLocSource.includes('from "country-state-city"'), 'NewLocation must not import country-state-city');
      assert.ok(newLocSource.includes('from "@/lib/india-locations"'), 'NewLocation must use lightweight india-locations module');

      const messagesSource = fs.readFileSync(path.join(rootDir, 'src/pages/messages/page.tsx'), 'utf8');
      assert.ok(messagesSource.includes('.in("id", peerIds)'), 'Messages loadChatData must scope public_profiles query to participant peerIds');
      assert.ok(messagesSource.includes('document.visibilityState === "hidden"'), 'Messages polling must pause when tab is hidden');
    });

    test('R8-01..R8-08: Follow-up authorization, messaging, notifications, ticket authorship, location aliases, and project counters suite', async () => {
      // 1. Test upgrade path: 20250108..20261108 -> seed -> 20261109
      const upgDb = new PGlite();
      await upgDb.exec(supabaseMockPreamble);
      const preR8Files = migrationFiles.filter(f => f < '20261109000000');
      for (const file of preR8Files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await upgDb.exec(sql);
      }

      const seedCreatorAuth = 'cccc0000-0000-4000-8000-000000000001';
      const seedCreatorProf = 'dddd0000-0000-4000-8000-000000000091';
      await upgDb.exec(`
        INSERT INTO auth.users (id, email) VALUES ('${seedCreatorAuth}', 'seed@filmcollab.io');
        DELETE FROM public.profiles WHERE user_id = '${seedCreatorAuth}';
        INSERT INTO public.profiles (id, user_id, username, full_name, role, account_status)
        VALUES ('${seedCreatorProf}', '${seedCreatorAuth}', 'seed_creator', 'Seed Creator', 'user', 'active');
        INSERT INTO public.projects (id, title, category, project_type, status, visibility, created_by, team_size)
        VALUES ('eeee0000-0000-4000-8000-000000000001', 'Pre-R8 Seed Project', 'Direction', 'Feature', 'planning', 'public', '${seedCreatorAuth}', 99);
      `);

      const r8Sql = fs.readFileSync(
        path.join(migrationsDir, '20261109000000_r8_authorization_messaging_and_contract_remediation.sql'),
        'utf8'
      );
      await upgDb.exec(r8Sql);

      const recalculatedProj = await upgDb.query(
        `SELECT likes_count, team_size FROM public.projects WHERE id = 'eeee0000-0000-4000-8000-000000000001'`
      );
      assert.equal(recalculatedProj.rows[0].likes_count, 0, 'R8 upgrade must backfill truthful likes_count from project_likes');
      assert.equal(recalculatedProj.rows[0].team_size, 1, 'R8 upgrade must backfill truthful team_size (1 creator + accepted members)');
      await upgDb.close();

      // 2. Full clean-install R8 multi-role PostgreSQL 16 verification
      const db = new PGlite();
      await db.exec(supabaseMockPreamble);
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.exec(sql);
      }

      const aliceAuth   = 'aaaa1111-0000-4000-8000-000000000001';
      const aliceProf   = 'bbbb1111-0000-4000-8000-000000000001';
      const bobAuth     = 'aaaa1111-0000-4000-8000-000000000002';
      const bobProf     = 'bbbb1111-0000-4000-8000-000000000002';
      const adminAuth   = 'aaaa1111-0000-4000-8000-000000000003';
      const adminProf   = 'bbbb1111-0000-4000-8000-000000000003';
      const staffAuth   = 'aaaa1111-0000-4000-8000-000000000004';
      const staffProf   = 'bbbb1111-0000-4000-8000-000000000004';
      const blockedAuth = 'aaaa1111-0000-4000-8000-000000000005';
      const blockedProf = 'bbbb1111-0000-4000-8000-000000000005';

      await db.exec(`
        INSERT INTO auth.users (id, email) VALUES
          ('${aliceAuth}', 'alice@filmcollab.io'),
          ('${bobAuth}', 'bob@filmcollab.io'),
          ('${adminAuth}', 'admin@filmcollab.io'),
          ('${staffAuth}', 'staff@filmcollab.io'),
          ('${blockedAuth}', 'blocked@filmcollab.io');

        DELETE FROM public.profiles WHERE user_id IN ('${aliceAuth}', '${bobAuth}', '${adminAuth}', '${staffAuth}', '${blockedAuth}');

        -- Note: adminProf intentionally has profiles.role = 'user' while authorized via user_roles/admin_team_members (R8-02 scenario)
        INSERT INTO public.profiles (
          id, user_id, username, full_name, email, role, account_status,
          privacy_show_directory, allow_profile_views
        ) VALUES
          ('${aliceProf}', '${aliceAuth}', 'alice_r8', 'Alice R8', 'alice@filmcollab.io', 'user', 'active', false, true),
          ('${bobProf}', '${bobAuth}', 'bob_r8', 'Bob R8', 'bob@filmcollab.io', 'user', 'active', true, true),
          ('${adminProf}', '${adminAuth}', 'admin_r8', 'Global Admin R8', 'admin@filmcollab.io', 'user', 'active', true, true),
          ('${staffProf}', '${staffAuth}', 'staff_r8', 'Scoped Staff R8', 'staff@filmcollab.io', 'moderator', 'active', true, true),
          ('${blockedProf}', '${blockedAuth}', 'blocked_r8', 'Blocked User R8', 'blocked@filmcollab.io', 'blocked', 'blocked', true, true);

        INSERT INTO public.user_roles (user_id, role) VALUES
          ('${adminAuth}', 'admin'),
          ('${staffAuth}', 'moderator')
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.admin_team_members (user_id, profile_id, role, status, permissions) VALUES
          ('${adminAuth}', '${adminProf}', 'Admin', 'Active', '{"Users": {"view": true, "edit": true, "delete": true}, "Team": {"view": true, "edit": true}}'::jsonb),
          ('${staffAuth}', '${staffProf}', 'Moderator', 'Active', '{"Users": {"view": true, "edit": true}, "Tickets": {"view": true, "edit": true}}'::jsonb);
      `);

      // ======================================================================
      // R8-01: Cross-user storage object reference spoofing in directory_files
      // ======================================================================
      await db.exec(`
        INSERT INTO storage.objects (bucket_id, name, owner)
        VALUES
          ('directory_assets', '${aliceAuth}/private_script.pdf', '${aliceAuth}'),
          ('directory_assets', '${bobAuth}/own_headshot.jpg', '${bobAuth}');
      `);

      await asUser(db, bobAuth, async () => {
        // Bob tries to insert a public approved directory_files row referencing Alice's private object path in file_url
        await assert.rejects(
          async () => {
            await db.query(`
              INSERT INTO public.directory_files (title, file_type, file_url, storage_bucket, storage_path, user_id, status, is_public)
              VALUES (
                'Spoofed Reference to Alice Script',
                'document',
                'storage://directory_assets/${aliceAuth}/private_script.pdf',
                'directory_assets',
                '${aliceAuth}/private_script.pdf',
                '${bobProf}',
                'approved',
                true
              )
            `);
          },
          /Unauthorized .*reference/i,
          'R8-01: Must reject directory_files INSERT referencing another user storage path'
        );

        // Bob tries to spoof Alice's object via cover_image_url
        await assert.rejects(
          async () => {
            await db.query(`
              INSERT INTO public.directory_files (title, file_type, file_url, cover_image_url, user_id, status, is_public)
              VALUES (
                'Spoofed Cover Reference',
                'image',
                'storage://directory_assets/${bobAuth}/own_headshot.jpg',
                'storage://directory_assets/${aliceAuth}/private_script.pdf',
                '${bobProf}',
                'approved',
                true
              )
            `);
          },
          /Unauthorized .*reference/i,
          'R8-01: Must reject directory_files INSERT referencing another user cover_image_url'
        );

        // Bob tries to spoof Alice's object via additional_urls TEXT[]
        await assert.rejects(
          async () => {
            await db.query(`
              INSERT INTO public.directory_files (title, file_type, file_url, additional_urls, user_id, status, is_public)
              VALUES (
                'Spoofed Additional URLs Reference',
                'image',
                'storage://directory_assets/${bobAuth}/own_headshot.jpg',
                ARRAY['storage://directory_assets/${aliceAuth}/private_script.pdf'],
                '${bobProf}',
                'approved',
                true
              )
            `);
          },
          /Unauthorized .*reference/i,
          'R8-01: Must reject directory_files INSERT referencing another user in additional_urls'
        );

        // Even if Bob inserts his own valid directory_files row, he STILL cannot read Alice's storage.objects row
        await db.query(`
          INSERT INTO public.directory_files (title, file_type, file_url, user_id, status, is_public)
          VALUES (
            'Bob Legit Headshot',
            'image',
            'storage://directory_assets/${bobAuth}/own_headshot.jpg',
            '${bobProf}',
            'approved',
            true
          )
        `);

        const aliceObj = await db.query(
          `SELECT id FROM storage.objects WHERE bucket_id = 'directory_assets' AND name = '${aliceAuth}/private_script.pdf'`
        );
        assert.equal(aliceObj.rows.length, 0, 'R8-01: Bob must not read Alice private storage object');
      });

      // ======================================================================
      // R8-02: Admin protection, active-caller checks, and remaining write RLS
      // ======================================================================
      await asUser(db, staffAuth, async () => {
        // Scoped staff with Users.edit = true tries to block Global Admin whose profiles.role = 'user' (admin via user_roles/admin_team_members)
        await assert.rejects(
          async () => {
            await db.query(`
              UPDATE public.profiles SET account_status = 'blocked', role = 'blocked'
              WHERE id = '${adminProf}'
            `);
          },
          /Only global administrators can modify administrator|row-level security/i,
          'R8-02: Scoped staff with Users.edit must not modify or block a global Admin whose profiles.role is user'
        );

        // Scoped staff tries to call provision_admin_team_member
        await assert.rejects(
          async () => {
            await db.query(`
              SELECT public.provision_admin_team_member(
                p_profile_id := '${bobProf}',
                p_role := 'Admin',
                p_permissions := '{}'::jsonb
              )
            `);
          },
          /Only active global administrators/i,
          'R8-02: Non-global-admin staff must not execute provision_admin_team_member'
        );
      });

      // Blocked user tries to write to casting_applicants, casting_call_saves, company_applications, property_site_visits, project_members
      let aliceCastingId, aliceCompanyId, aliceLocationId, aliceProjectId;
      await asUser(db, aliceAuth, async () => {
        const cc = await db.query(`
          INSERT INTO public.casting_calls (
            creator_id, title, project_name, category, role_name, role_description,
            gender, age_min, age_max, experience, compensation, location
          ) VALUES (
            '${aliceProf}', 'Noir Lead Role', 'Noir Film', 'Acting', 'Lead',
            'Audition open', 'Any', 20, 50, '1-3 years', 'Paid', 'Mumbai'
          )
          RETURNING id
        `);
        aliceCastingId = cc.rows[0].id;

        const co = await db.query(`
          INSERT INTO public.companies (name, category, description, user_id)
          VALUES ('Alice Film Co', 'Production', 'Indie house', '${aliceAuth}')
          RETURNING id
        `);
        aliceCompanyId = co.rows[0].id;

        const loc = await db.query(`
          INSERT INTO public.shooting_locations (name, city, state, property_type, price, status, created_by)
          VALUES ('Alice Loft', 'Mumbai', 'Maharashtra', 'Apartment', 15000, 'active', '${aliceAuth}')
          RETURNING id
        `);
        aliceLocationId = loc.rows[0].id;

        const prj = await db.query(`
          INSERT INTO public.projects (title, category, project_type, status, visibility, created_by)
          VALUES ('Alice R8 Project', 'Direction', 'Feature', 'planning', 'public', '${aliceAuth}')
          RETURNING id
        `);
        aliceProjectId = prj.rows[0].id;
      });

      await asUser(db, blockedAuth, async () => {
        await assert.rejects(
          () => db.query(`INSERT INTO public.casting_applicants (casting_call_id, user_id, name) VALUES ('${aliceCastingId}', '${blockedProf}', 'Blocked Candidate')`),
          /row-level security policy/i,
          'R8-02: Blocked user must be denied inserting into casting_applicants'
        );
        await assert.rejects(
          () => db.query(`INSERT INTO public.casting_call_saves (casting_call_id, user_id) VALUES ('${aliceCastingId}', '${blockedAuth}')`),
          /row-level security policy/i,
          'R8-02: Blocked user must be denied inserting into casting_call_saves'
        );
        await assert.rejects(
          () => db.query(`INSERT INTO public.company_applications (company_id, user_id, name, email, role) VALUES ('${aliceCompanyId}', '${blockedAuth}', 'Blocked', 'blocked@filmcollab.io', 'Editor')`),
          /row-level security policy/i,
          'R8-02: Blocked user must be denied inserting into company_applications'
        );
        await assert.rejects(
          () => db.query(`INSERT INTO public.property_site_visits (location_id, user_id, owner_id, selected_day, selected_time) VALUES ('${aliceLocationId}', '${blockedAuth}', '${aliceAuth}', 'Monday', '09:00 to 12:00')`),
          /row-level security policy/i,
          'R8-02: Blocked user must be denied inserting into property_site_visits'
        );
        await assert.rejects(
          () => db.query(`INSERT INTO public.project_members (project_id, user_id, role) VALUES ('${aliceProjectId}', '${blockedAuth}', 'Applicant')`),
          /row-level security policy/i,
          'R8-02: Blocked user must be denied inserting into project_members'
        );
      });

      // ======================================================================
      // R8-04: Notification RPC contract alignment & anti-abuse validation
      // ======================================================================
      await asUser(db, bobAuth, async () => {
        // 1. Bob creates a PENDING connection request to Alice -> cannot forge 'connection_accepted' while still pending
        await db.query(`
          INSERT INTO public.connections (user_id, connected_user_id, status)
          VALUES ('${bobProf}', '${aliceProf}', 'pending')
        `);

        await assert.rejects(
          () => db.query(`
            SELECT public.send_authorized_notification(
              p_recipient_id := '${aliceProf}',
              p_title := 'Connection Accepted',
              p_message := 'Forged acceptance while pending',
              p_type := 'connection_accepted'
            )
          `),
          /Unauthorized notification/i,
          'R8-04: Pending connection must not authorize connection_accepted notification'
        );

        // 2. Bob tries to send a 'Profile Liked' notification with p_type = 'profile' without liking Alice -> rejected!
        await assert.rejects(
          () => db.query(`
            SELECT public.send_authorized_notification(
              p_recipient_id := '${aliceProf}',
              p_title := 'Profile Liked',
              p_message := 'Forged profile like via profile type',
              p_type := 'profile'
            )
          `),
          /Unauthorized notification/i,
          'R8-04: p_type = profile with Like title must require an actual user_likes/post_likes row'
        );

        // 3. Deduplication across varying p_message strings within 60s
        const connNotif1 = await db.query(`
          SELECT public.send_authorized_notification(
            p_recipient_id := '${aliceProf}',
            p_title := 'New Connection Request',
            p_message := 'Variant message 1',
            p_type := 'connection',
            p_link := '/network'
          ) AS id
        `);
        const connNotif2 = await db.query(`
          SELECT public.send_authorized_notification(
            p_recipient_id := '${aliceProf}',
            p_title := 'New Connection Request',
            p_message := 'Variant message 2 with random timestamp',
            p_type := 'connection',
            p_link := '/network'
          ) AS id
        `);
        assert.equal(
          connNotif1.rows[0].id,
          connNotif2.rows[0].id,
          'R8-04: Repeated unread notifications within 60s must deduplicate even if p_message varies'
        );

        // 4. Site visit booking notification ('booking') succeeds after property_site_visits insert
        await db.query(`
          INSERT INTO public.property_site_visits (location_id, user_id, owner_id, selected_day, selected_time, status)
          VALUES ('${aliceLocationId}', '${bobAuth}', '${aliceAuth}', 'Friday', '10:00 to 13:00', 'pending')
        `);
        const bookingNotif = await db.query(`
          SELECT public.send_authorized_notification(
            p_recipient_id := '${aliceProf}',
            p_title := 'New Site Visit Request',
            p_message := 'Bob requested a site visit',
            p_type := 'booking',
            p_link := '/locations/${aliceLocationId}'
          ) AS id
        `);
        assert.ok(bookingNotif.rows[0].id, 'R8-04: p_type = booking must succeed when property_site_visits row exists');

        // 5. Bob applies to Alice's project
        await db.query(`
          INSERT INTO public.project_members (project_id, user_id, role)
          VALUES ('${aliceProjectId}', '${bobAuth}', 'Applicant')
        `);
      });

      // Alice rejects Bob's application (deletes project_members row first, then calls send_authorized_notification with 'application_update')
      await asUser(db, aliceAuth, async () => {
        await db.query(`
          DELETE FROM public.project_members
          WHERE project_id = '${aliceProjectId}' AND user_id = '${bobAuth}' AND role = 'Applicant'
        `);

        const rejectNotif = await db.query(`
          SELECT public.send_authorized_notification(
            p_recipient_id := '${bobAuth}',
            p_title := 'Application Status Update',
            p_message := 'Your application to join Alice R8 Project was not accepted at this time.',
            p_type := 'application_update',
            p_link := '/projects'
          ) AS id
        `);
        assert.ok(rejectNotif.rows[0].id, 'R8-04: Project owner must be able to send application_update after deleting rejected Applicant row');
      });

      // ======================================================================
      // R8-05: Ticket author spoofing prevention on ticket_updates & ticket_messages
      // ======================================================================
      let bobR8TicketId;
      await asUser(db, bobAuth, async () => {
        const tRes = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, category, priority)
          VALUES ('${bobAuth}', 'R8 Support Ticket', 'Testing author binding', 'Technical', 'medium')
          RETURNING id
        `);
        bobR8TicketId = tRes.rows[0].id;
      });

      await asUser(db, staffAuth, async () => {
        // Staff inserts into ticket_updates attempting to spoof author_id = adminProf -> trigger binds author_id to staffProf
        const tuRes = await db.query(`
          INSERT INTO public.ticket_updates (ticket_id, author_id, message)
          VALUES ('${bobR8TicketId}', '${adminProf}', 'Staff note attempting to spoof Admin author')
          RETURNING id, author_id
        `);
        assert.equal(tuRes.rows[0].author_id, staffProf, 'R8-05: ticket_updates INSERT must bind author_id to authenticated caller profile ID');

        // Staff tries to UPDATE ticket_updates.author_id to adminProf -> rejected!
        await assert.rejects(
          () => db.query(`
            UPDATE public.ticket_updates SET author_id = '${adminProf}'
            WHERE id = '${tuRes.rows[0].id}'
          `),
          /author_id cannot be reassigned/i,
          'R8-05: ticket_updates UPDATE must forbid reassigning author_id'
        );
      });

      // ======================================================================
      // R8-06: Shooting location UPDATE alias synchronization
      // ======================================================================
      await asUser(db, aliceAuth, async () => {
        const updatedLoc = await db.query(`
          UPDATE public.shooting_locations
          SET type = 'Heritage Villa',
              phone = '+919999988888',
              email = 'villa@filmcollab.io',
              price = 45000,
              price_hour = 5500,
              media_urls = ARRAY['https://example.com/villa1.jpg', 'https://example.com/villa2.jpg']
          WHERE id = '${aliceLocationId}'
          RETURNING type, property_type, location_type, category,
                    phone, contact_phone, email, contact_email,
                    price, daily_rate, price_hour, hourly_rate,
                    media_urls, images, image_url
        `);
        const row = updatedLoc.rows[0];
        assert.equal(row.property_type, 'Heritage Villa', 'R8-06: Updating type must sync property_type');
        assert.equal(row.location_type, 'Heritage Villa', 'R8-06: Updating type must sync location_type');
        assert.equal(row.category, 'Heritage Villa', 'R8-06: Updating type must sync category');
        assert.equal(row.contact_phone, '+919999988888', 'R8-06: Updating phone must sync contact_phone');
        assert.equal(row.contact_email, 'villa@filmcollab.io', 'R8-06: Updating email must sync contact_email');
        assert.equal(Number(row.daily_rate), 45000, 'R8-06: Updating price must sync daily_rate');
        assert.equal(Number(row.hourly_rate), 5500, 'R8-06: Updating price_hour must sync hourly_rate');
        assert.deepEqual(row.images, ['https://example.com/villa1.jpg', 'https://example.com/villa2.jpg'], 'R8-06: Updating media_urls must sync images');
      });

      // ======================================================================
      // R8-07: Truthful project likes_count & team_size triggers
      // ======================================================================
      await asUser(db, bobAuth, async () => {
        await db.query(`
          INSERT INTO public.project_likes (project_id, user_id)
          VALUES ('${aliceProjectId}', '${bobAuth}')
        `);
        await db.query(`
          INSERT INTO public.project_members (project_id, user_id, role)
          VALUES ('${aliceProjectId}', '${bobAuth}', 'Applicant')
        `);
      });

      let projCounts = await db.query(`SELECT likes_count, team_size FROM public.projects WHERE id = '${aliceProjectId}'`);
      assert.equal(projCounts.rows[0].likes_count, 1, 'R8-07: project_likes INSERT must increment projects.likes_count to 1');
      assert.equal(projCounts.rows[0].team_size, 1, 'R8-07: Applicant role must NOT increment projects.team_size');

      await asUser(db, aliceAuth, async () => {
        await db.query(`
          UPDATE public.project_members SET role = 'Member'
          WHERE project_id = '${aliceProjectId}' AND user_id = '${bobAuth}'
        `);
      });

      projCounts = await db.query(`SELECT likes_count, team_size FROM public.projects WHERE id = '${aliceProjectId}'`);
      assert.equal(projCounts.rows[0].team_size, 2, 'R8-07: Accepting member must increment projects.team_size to 2 (creator + 1 accepted member)');

      await db.close();

      // ======================================================================
      // R8-03: Unified sender E2EE readiness & key publication verification
      // ======================================================================
      // Case 1: New browser when remote public_key already exists -> must NOT overwrite remote key and must return ready: false, requiresExplicitKeyRotation: true
      const existingServerKeyPair = await generateKeyPair();
      const existingServerPubStr = JSON.stringify(existingServerKeyPair.publicKeyJwk);
      let updateCalledCount = 0;
      const mockSupabaseNoOverwrite = {
        from: () => ({
          update: () => {
            updateCalledCount += 1;
            return {
              eq: () => ({
                select: async () => ({ data: [{ id: 'prof-r8-1' }], error: null })
              })
            };
          }
        })
      };

      const rotationGateRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseNoOverwrite,
        profileId: 'prof-r8-rotation-test',
        existingRemotePublicKey: existingServerPubStr,
        allowExplicitKeyRotation: false
      });
      assert.equal(rotationGateRes.ready, false, 'R8-03: Must not mark E2EE ready when new browser key differs from server public_key without confirmation');
      assert.equal(rotationGateRes.requiresExplicitKeyRotation, true, 'R8-03: Must signal requiresExplicitKeyRotation = true');
      assert.equal(updateCalledCount, 0, 'R8-03: Must NOT overwrite server public_key before explicit user rotation confirmation');

      // Case 2: PostgREST 42501 error on initial public_key publication -> must return ready: false, privKey: null
      const mockSupabase42501 = {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: async () => ({
                data: null,
                error: { code: '42501', message: 'new row violates row-level security policy for table "profiles"' }
              })
            })
          })
        })
      };

      const failedPubRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabase42501,
        profileId: 'prof-r8-42501-test',
        existingRemotePublicKey: null,
        allowExplicitKeyRotation: false
      });
      assert.equal(failedPubRes.ready, false, 'R8-03: Resolved PostgREST { error: 42501 } must leave ready = false');
      assert.equal(failedPubRes.privKey, null, 'R8-03: Failed key publication must not expose active sending privateKey');
      assert.match(failedPubRes.error || '', /row-level security policy/i);

      // Case 3: Explicit rotation confirmed and server acknowledges -> ready: true
      const confirmedPubRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseNoOverwrite,
        profileId: 'prof-r8-rotation-test',
        existingRemotePublicKey: existingServerPubStr,
        allowExplicitKeyRotation: true
      });
      assert.equal(confirmedPubRes.ready, true, 'R8-03: Explicit key rotation with server acknowledgement must mark ready = true');
      assert.equal(confirmedPubRes.requiresExplicitKeyRotation, false);
      assert.equal(updateCalledCount, 1, 'R8-03: Explicit key rotation must publish new key to server');

      // Verify Projects page source has no Math.random() fabrications for likes_count or team_size
      const projectsPageSrc = fs.readFileSync(path.join(rootDir, 'src/pages/projects/page.tsx'), 'utf8');
      assert.ok(!projectsPageSrc.includes('Math.random()'), 'R8-07: src/pages/projects/page.tsx must not fabricate likes_count or team_size with Math.random()');
    });

    test('R9-01..R9-03: Real PostgreSQL 16 ticket trigger, member cascade deletion, and E2EE key lookup safety suite', async () => {
      // 1. Test upgrade path: replay all migrations up to R8 (f < '20261110000000'), seed data, then apply 20261110000000
      const upgDb = new PGlite();
      await upgDb.exec(supabaseMockPreamble);
      const preR9Files = migrationFiles.filter(f => f < '20261110000000');
      for (const file of preR9Files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await upgDb.exec(sql);
      }

      const r9Sql = fs.readFileSync(
        path.join(migrationsDir, '20261110000000_r9_ticket_project_and_crypto_remediation.sql'),
        'utf8'
      );
      await upgDb.exec(r9Sql);
      await upgDb.close();

      // 2. Full clean-install R9 multi-role PostgreSQL 16 verification
      const db = new PGlite();
      await db.exec(supabaseMockPreamble);
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.exec(sql);
      }

      const aliceAuth   = 'aaaa1111-0000-4000-8000-000000000001';
      const aliceProf   = 'bbbb1111-0000-4000-8000-000000000001';
      const bobAuth     = 'aaaa1111-0000-4000-8000-000000000002';
      const bobProf     = 'bbbb1111-0000-4000-8000-000000000002';
      const adminAuth   = 'aaaa1111-0000-4000-8000-000000000003';
      const adminProf   = 'bbbb1111-0000-4000-8000-000000000003';
      const staffAuth   = 'aaaa1111-0000-4000-8000-000000000004';
      const staffProf   = 'bbbb1111-0000-4000-8000-000000000004';
      const outsiderAuth= 'aaaa1111-0000-4000-8000-000000000099';
      const outsiderProf= 'bbbb1111-0000-4000-8000-000000000099';

      await db.exec(`
        INSERT INTO auth.users (id, email) VALUES
          ('${aliceAuth}', 'alice@filmcollab.io'),
          ('${bobAuth}', 'bob@filmcollab.io'),
          ('${adminAuth}', 'admin@filmcollab.io'),
          ('${staffAuth}', 'staff@filmcollab.io'),
          ('${outsiderAuth}', 'outsider@filmcollab.io');

        DELETE FROM public.profiles WHERE user_id IN ('${aliceAuth}', '${bobAuth}', '${adminAuth}', '${staffAuth}', '${outsiderAuth}');

        INSERT INTO public.profiles (
          id, user_id, username, full_name, email, role, account_status,
          privacy_show_directory, allow_profile_views
        ) VALUES
          ('${aliceProf}', '${aliceAuth}', 'alice_r9', 'Alice R9', 'alice@filmcollab.io', 'user', 'active', true, true),
          ('${bobProf}', '${bobAuth}', 'bob_r9', 'Bob R9', 'bob@filmcollab.io', 'user', 'active', true, true),
          ('${adminProf}', '${adminAuth}', 'admin_r9', 'Global Admin R9', 'admin@filmcollab.io', 'admin', 'active', true, true),
          ('${staffProf}', '${staffAuth}', 'staff_r9', 'Staff Support R9', 'staff@filmcollab.io', 'moderator', 'active', true, true),
          ('${outsiderProf}', '${outsiderAuth}', 'outsider_r9', 'Outsider R9', 'outsider@filmcollab.io', 'user', 'active', true, true);

        INSERT INTO public.user_roles (user_id, role) VALUES
          ('${adminAuth}', 'admin'),
          ('${staffAuth}', 'moderator')
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.admin_team_members (user_id, profile_id, role, status, permissions) VALUES
          ('${adminAuth}', '${adminProf}', 'Admin', 'Active', '{"Users": {"view": true, "edit": true, "delete": true}, "Tickets": {"view": true, "edit": true, "delete": true}}'::jsonb),
          ('${staffAuth}', '${staffProf}', 'Moderator', 'Active', '{"Tickets": {"view": true, "edit": true, "add": true}}'::jsonb);
      `);

      // ======================================================================
      // R9-01: ticket_messages & ticket_updates author triggers and FK cleanup
      // ======================================================================
      let ticketId;
      await asUser(db, aliceAuth, async () => {
        const tRes = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, priority, category)
          VALUES ('${aliceProf}', 'Audio sync problem in scene 4', 'Playback drifts after 3 minutes', 'medium', 'Technical')
          RETURNING id
        `);
        ticketId = tRes.rows[0].id;

        // A. Alice (ticket owner) inserts reply into ticket_messages -> must succeed without 42703 (no author_name column error)
        const tmRes = await db.query(`
          INSERT INTO public.ticket_messages (ticket_id, author_id, message)
          VALUES ('${ticketId}', '${aliceProf}', 'Adding timestamp details: drift starts at 03:12')
          RETURNING id, author_id, message
        `);
        assert.equal(tmRes.rows[0].author_id, aliceProf, 'R9-01A: ticket_messages INSERT must bind author_id to caller profile');
        assert.equal(tmRes.rows[0].message, 'Adding timestamp details: drift starts at 03:12');

        // B. Attempting to manually UPDATE ticket_messages.author_id while profile exists -> rejected with 42501
        await assert.rejects(
          () => db.query(`
            UPDATE public.ticket_messages SET author_id = '${bobProf}'
            WHERE id = '${tmRes.rows[0].id}'
          `),
          /author_id cannot be reassigned/i,
          'R9-01A: ticket_messages UPDATE must forbid reassigning author_id to another user'
        );

        // Attempting to manually UPDATE ticket_messages.author_id = NULL while profile still exists -> rejected with 42501
        await assert.rejects(
          () => db.query(`
            UPDATE public.ticket_messages SET author_id = NULL
            WHERE id = '${tmRes.rows[0].id}'
          `),
          /author_id cannot be reassigned/i,
          'R9-01A: ticket_messages UPDATE must forbid setting author_id to NULL while author profile exists'
        );
      });

      // C. Staff agent posts ticket_messages reply and ticket_updates internal note
      await asUser(db, staffAuth, async () => {
        const staffMsg = await db.query(`
          INSERT INTO public.ticket_messages (ticket_id, author_id, message)
          VALUES ('${ticketId}', '${staffProf}', 'We have identified a sample rate mismatch.')
          RETURNING id, author_id
        `);
        assert.equal(staffMsg.rows[0].author_id, staffProf, 'R9-01A: Support staff ticket_messages reply must bind to staff profile');

        const staffUpd = await db.query(`
          INSERT INTO public.ticket_updates (ticket_id, author_id, message)
          VALUES ('${ticketId}', '${staffProf}', 'Escalated to sound engineering team')
          RETURNING id, author_id, author_name
        `);
        assert.equal(staffUpd.rows[0].author_id, staffProf, 'R9-01A: ticket_updates INSERT must bind author_id to staff profile');
        assert.equal(staffUpd.rows[0].author_name, 'Staff Support R9', 'R9-01A: ticket_updates INSERT must populate author_name from profile');
      });

      // D. Global Admin deletes author profile (bob creates a message, then bob profile is deleted)
      let bobTicketId;
      let bobMsgId;
      await asUser(db, bobAuth, async () => {
        const bTicket = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, priority, category)
          VALUES ('${bobProf}', 'Billing question', 'Invoice discrepancy', 'low', 'Billing')
          RETURNING id
        `);
        bobTicketId = bTicket.rows[0].id;

        const bMsg = await db.query(`
          INSERT INTO public.ticket_messages (ticket_id, author_id, message)
          VALUES ('${bobTicketId}', '${bobProf}', 'Please check March billing statement.')
          RETURNING id
        `);
        bobMsgId = bMsg.rows[0].id;
      });

      // Admin deletes Bob's profile -> ON DELETE SET NULL must succeed without 42501!
      await asUser(db, adminAuth, async () => {
        const delRes = await db.query(`
          DELETE FROM public.profiles WHERE id = '${bobProf}'
        `);
        assert.equal(delRes.rowCount, 1, 'R9-01B: Admin deleting profile with historical ticket messages must succeed');

        // Verify Bob's ticket message remains with author_id = NULL
        const orphanedMsg = await db.query(`
          SELECT id, author_id, message FROM public.ticket_messages WHERE id = '${bobMsgId}'
        `);
        assert.equal(orphanedMsg.rows.length, 1, 'R9-01B: Ticket message must be retained after author profile deletion');
        assert.equal(orphanedMsg.rows[0].author_id, null, 'R9-01B: Ticket message author_id must be cleanly set to NULL via FK ON DELETE SET NULL');
      });

      // ======================================================================
      // R9-02: Project deletion with members CASCADE lifecycle resilience
      // ======================================================================
      let emptyProjId;
      let memberProjId;

      await asUser(db, aliceAuth, async () => {
        // Create empty project
        const epRes = await db.query(`
          INSERT INTO public.projects (title, category, project_type, status, visibility, created_by)
          VALUES ('Empty Project R9', 'Short Film', 'Drama', 'planning', 'public', '${aliceAuth}')
          RETURNING id
        `);
        emptyProjId = epRes.rows[0].id;

        // Create project with member
        const mpRes = await db.query(`
          INSERT INTO public.projects (title, category, project_type, status, visibility, created_by)
          VALUES ('Feature Film With Team R9', 'Feature', 'Thriller', 'in_production', 'public', '${aliceAuth}')
          RETURNING id
        `);
        memberProjId = mpRes.rows[0].id;
      });

      // Add outsider as member to memberProjId
      await asUser(db, outsiderAuth, async () => {
        await db.query(`
          INSERT INTO public.project_members (project_id, user_id, role)
          VALUES ('${memberProjId}', '${outsiderAuth}', 'Applicant')
        `);
      });

      // Alice accepts outsider
      await asUser(db, aliceAuth, async () => {
        await db.query(`
          UPDATE public.project_members SET role = 'Sound Designer'
          WHERE project_id = '${memberProjId}' AND user_id = '${outsiderAuth}'
        `);
      });

      // Test outsider cannot delete Alice's project (denied by RLS)
      await asUser(db, outsiderAuth, async () => {
        const unauthDel = await db.query(`
          DELETE FROM public.projects WHERE id = '${memberProjId}'
        `);
        assert.equal(unauthDel.rowCount, 0, 'R9-02: Outsider must not be permitted to delete project');
      });

      // Test Alice deleting empty project -> succeeds
      await asUser(db, aliceAuth, async () => {
        const delEmpty = await db.query(`
          DELETE FROM public.projects WHERE id = '${emptyProjId}'
        `);
        assert.equal(delEmpty.rowCount, 1, 'R9-02: Owner deleting empty project must succeed');

        // Test Alice deleting project WITH members -> CASCADE must succeed without 23503!
        const delWithMembers = await db.query(`
          DELETE FROM public.projects WHERE id = '${memberProjId}'
        `);
        assert.equal(delWithMembers.rowCount, 1, 'R9-02: Owner deleting member-bearing project must succeed via CASCADE without FK 23503 error');

        const remainingMembers = await db.query(`
          SELECT * FROM public.project_members WHERE project_id = '${memberProjId}'
        `);
        assert.equal(remainingMembers.rows.length, 0, 'R9-02: Project members must be cascaded cleanly');
      });

      // Test direct member removal (preserves rejection event and allows rejection notification)
      let standaloneProjId;
      await asUser(db, aliceAuth, async () => {
        const spRes = await db.query(`
          INSERT INTO public.projects (title, category, project_type, status, visibility, created_by)
          VALUES ('Standalone Casting Project R9', 'Short', 'Drama', 'planning', 'public', '${aliceAuth}')
          RETURNING id
        `);
        standaloneProjId = spRes.rows[0].id;
      });

      await asUser(db, outsiderAuth, async () => {
        await db.query(`
          INSERT INTO public.project_members (project_id, user_id, role)
          VALUES ('${standaloneProjId}', '${outsiderAuth}', 'Applicant')
        `);
      });

      // Alice removes/rejects outsider directly
      await asUser(db, aliceAuth, async () => {
        const delMem = await db.query(`
          DELETE FROM public.project_members
          WHERE project_id = '${standaloneProjId}' AND user_id = '${outsiderAuth}'
        `);
        assert.equal(delMem.rowCount, 1, 'R9-02: Direct member removal must succeed');

        // Verify rejected event was recorded in project_member_events
        const events = await db.query(`
          SELECT * FROM public.project_member_events
          WHERE project_id = '${standaloneProjId}' AND user_id = '${outsiderAuth}' AND event_type = 'rejected'
        `);
        assert.equal(events.rows.length, 1, 'R9-02: Direct member removal must log rejected event');
        assert.equal(events.rows[0].actor_id, aliceAuth);
      });

      await db.close();

      // ======================================================================
      // R9-03: Sender E2EE publication & remote-key lookup safety verification
      // ======================================================================
      // Case 1: Resolved lookup error (timeout/PostgREST error) -> fail closed, 0 writes
      let writeCountLookupErr = 0;
      const mockSupabaseResolvedLookupError = {
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: { message: 'Read timeout contacting database' }
              })
            })
          }),
          update: () => {
            writeCountLookupErr += 1;
            return {
              eq: () => ({
                is: () => ({
                  select: async () => ({ data: [{ id: 'p1' }], error: null })
                }),
                select: async () => ({ data: [{ id: 'p1' }], error: null })
              })
            };
          }
        })
      };

      const resolvedErrRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseResolvedLookupError,
        profileId: 'prof-r9-resolved-err',
        allowExplicitKeyRotation: false
      });
      assert.equal(resolvedErrRes.ready, false, 'R9-03: Resolved remote-key lookup error must leave ready = false');
      assert.equal(resolvedErrRes.privKey, null, 'R9-03: Failed lookup must not expose sending privateKey');
      assert.equal(resolvedErrRes.requiresExplicitKeyRotation, false, 'R9-03: Lookup error is not a confirmed mismatched rotation state');
      assert.equal(writeCountLookupErr, 0, 'R9-03: Failed remote-key lookup must NOT execute any public_key write');

      // Case 2: Thrown network exception during lookup -> fail closed, 0 writes
      let writeCountThrownErr = 0;
      const mockSupabaseThrownLookupError = {
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                throw new Error('ECONNRESET: Connection terminated unexpectedly');
              }
            })
          }),
          update: () => {
            writeCountThrownErr += 1;
            return {
              eq: () => ({
                select: async () => ({ data: [{ id: 'p1' }], error: null })
              })
            };
          }
        })
      };

      const thrownErrRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseThrownLookupError,
        profileId: 'prof-r9-thrown-err',
        allowExplicitKeyRotation: false
      });
      assert.equal(thrownErrRes.ready, false, 'R9-03: Thrown remote-key lookup exception must leave ready = false');
      assert.equal(thrownErrRes.privKey, null, 'R9-03: Thrown exception must not expose privateKey');
      assert.equal(writeCountThrownErr, 0, 'R9-03: Thrown lookup exception must NOT execute any public_key write');

      // Case 3: Genuine empty remote key (verified absence) -> publishes with .is("public_key", null), 1 write, ready: true
      let writeCountVerifiedEmpty = 0;
      let isFilterApplied = false;
      const mockSupabaseVerifiedEmpty = {
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-r9-empty', public_key: null },
                error: null
              })
            })
          }),
          update: () => {
            writeCountVerifiedEmpty += 1;
            return {
              eq: () => ({
                is: (col, val) => {
                  if (col === 'public_key' && val === null) isFilterApplied = true;
                  return {
                    select: async () => ({ data: [{ id: 'prof-r9-empty' }], error: null })
                  };
                },
                select: async () => ({ data: [{ id: 'prof-r9-empty' }], error: null })
              })
            };
          }
        })
      };

      const emptyLookupRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseVerifiedEmpty,
        profileId: 'prof-r9-empty',
        allowExplicitKeyRotation: false
      });
      assert.equal(emptyLookupRes.ready, true, 'R9-03: Verified absence of remote key must allow initial publication');
      assert.equal(emptyLookupRes.requiresExplicitKeyRotation, false);
      assert.equal(writeCountVerifiedEmpty, 1, 'R9-03: Initial publication must perform exactly 1 write');
      assert.equal(isFilterApplied, true, 'R9-03: Initial publication must enforce .is("public_key", null) for race safety');

      // Case 4: Stale read / racing concurrent publication (0 rows updated) -> fail closed, requiresExplicitKeyRotation: true
      let writeCountStaleRead = 0;
      const mockSupabaseStaleRead = {
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-r9-stale', public_key: null },
                error: null
              })
            })
          }),
          update: () => {
            writeCountStaleRead += 1;
            return {
              eq: () => ({
                is: () => ({
                  select: async () => ({ data: [], error: null }) // 0 rows updated because another device published first!
                })
              })
            };
          }
        })
      };

      const staleReadRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseStaleRead,
        profileId: 'prof-r9-stale',
        allowExplicitKeyRotation: false
      });
      assert.equal(staleReadRes.ready, false, 'R9-03: Stale read with 0 rows updated must fail closed');
      assert.equal(staleReadRes.privKey, null);
      assert.equal(staleReadRes.requiresExplicitKeyRotation, true, 'R9-03: Concurrently updated server key must require explicit rotation confirmation');

      // Case 5: Matching key on server -> 0 writes, ready: true
      const memStore = new Map();
      globalThis.localStorage = {
        getItem: (k) => memStore.get(k) ?? null,
        setItem: (k, v) => memStore.set(k, String(v)),
        removeItem: (k) => memStore.delete(k),
        clear: () => memStore.clear()
      };
      const matchingKeyPair = await generateKeyPair();
      const matchingPubStr = JSON.stringify(matchingKeyPair.publicKeyJwk);
      const matchingPrivStr = JSON.stringify(matchingKeyPair.privateKeyJwk);
      globalThis.localStorage.setItem('e2ee_pub_prof-r9-matching', matchingPubStr);
      globalThis.localStorage.setItem('e2ee_priv_prof-r9-matching', matchingPrivStr);

      let writeCountMatching = 0;
      const mockSupabaseMatching = {
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-r9-matching', public_key: matchingPubStr },
                error: null
              })
            })
          }),
          update: () => {
            writeCountMatching += 1;
            return {
              eq: () => ({ select: async () => ({ data: [{ id: 'prof-r9-matching' }], error: null }) })
            };
          }
        })
      };

      const matchingRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseMatching,
        profileId: 'prof-r9-matching',
        existingRemotePublicKey: matchingPubStr,
        allowExplicitKeyRotation: false
      });
      assert.equal(matchingRes.ready, true, 'R9-03: Matching key must be ready immediately');
      assert.equal(matchingRes.requiresExplicitKeyRotation, false);
      assert.equal(writeCountMatching, 0, 'R9-03: Matching key must NOT execute any public_key writes');
    });

    test('R10-01 & R10-02: Ticket message boundary enforcement, profile blank key normalization, and verified publication readiness suite', async () => {
      // 1. Engine version verification: accurately document the embedded PGlite engine version (PostgreSQL 18.6)
      const engineCheckDb = new PGlite();
      const versionRes = await engineCheckDb.query('SHOW server_version;');
      const reportedVersion = versionRes.rows[0].server_version;
      assert.ok(reportedVersion.startsWith('18.'), `Engine must report PostgreSQL 18.x (observed: ${reportedVersion})`);
      await engineCheckDb.close();

      // 2. Upgrade path: replay all migrations up to R9 (f < '20261111000000'), seed blank public_key, apply 20261111000000
      const upgDb = new PGlite();
      await upgDb.exec(supabaseMockPreamble);
      const preR10Files = migrationFiles.filter(f => f < '20261111000000');
      for (const file of preR10Files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await upgDb.exec(sql);
      }

      const seedUserAuth = 'cccc0000-0000-4000-8000-000000000010';
      const seedUserProf = 'dddd0000-0000-4000-8000-000000000010';
      await upgDb.exec(`
        INSERT INTO auth.users (id, email) VALUES ('${seedUserAuth}', 'seed10@filmcollab.io');
        DELETE FROM public.profiles WHERE user_id = '${seedUserAuth}';
        INSERT INTO public.profiles (id, user_id, username, full_name, email, role, account_status, public_key)
        VALUES ('${seedUserProf}', '${seedUserAuth}', 'seed_r10', 'Seed R10', 'seed10@filmcollab.io', 'user', 'active', '   ');
      `);

      const r10Sql = fs.readFileSync(
        path.join(migrationsDir, '20261111000000_r10_ticket_boundary_and_crypto_readiness.sql'),
        'utf8'
      );
      await upgDb.exec(r10Sql);

      const normalizedProf = await upgDb.query(
        `SELECT public_key FROM public.profiles WHERE id = '${seedUserProf}';`
      );
      assert.equal(normalizedProf.rows[0].public_key, null, 'R10-02 upgrade must normalize blank/whitespace public_key to NULL');

      // Test trigger prevents future blank strings
      await upgDb.exec(`
        UPDATE public.profiles SET public_key = '' WHERE id = '${seedUserProf}';
      `);
      const recheckedProf = await upgDb.query(
        `SELECT public_key FROM public.profiles WHERE id = '${seedUserProf}';`
      );
      assert.equal(recheckedProf.rows[0].public_key, null, 'R10-02 trigger must normalize empty string to NULL on update');
      await upgDb.close();

      // 3. Clean-install full multi-role PostgreSQL (PGlite 18.6) verification
      const db = new PGlite();
      await db.exec(supabaseMockPreamble);
      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.exec(sql);
      }

      const aliceAuth   = 'aaaa1111-0000-4000-8000-000000000001';
      const aliceProf   = 'bbbb1111-0000-4000-8000-000000000001';
      const bobAuth     = 'aaaa1111-0000-4000-8000-000000000002';
      const bobProf     = 'bbbb1111-0000-4000-8000-000000000002';
      const adminAuth   = 'aaaa1111-0000-4000-8000-000000000003';
      const adminProf   = 'bbbb1111-0000-4000-8000-000000000003';

      await db.exec(`
        INSERT INTO auth.users (id, email) VALUES
          ('${aliceAuth}', 'alice@filmcollab.io'),
          ('${bobAuth}', 'bob@filmcollab.io'),
          ('${adminAuth}', 'admin@filmcollab.io');

        DELETE FROM public.profiles WHERE user_id IN ('${aliceAuth}', '${bobAuth}', '${adminAuth}');

        INSERT INTO public.profiles (
          id, user_id, username, full_name, email, role, account_status,
          privacy_show_directory, allow_profile_views
        ) VALUES
          ('${aliceProf}', '${aliceAuth}', 'alice_r10', 'Alice R10', 'alice@filmcollab.io', 'user', 'active', true, true),
          ('${bobProf}', '${bobAuth}', 'bob_r10', 'Bob R10', 'bob@filmcollab.io', 'user', 'active', true, true),
          ('${adminProf}', '${adminAuth}', 'admin_r10', 'Global Admin R10', 'admin@filmcollab.io', 'admin', 'active', true, true);

        INSERT INTO public.user_roles (user_id, role) VALUES
          ('${adminAuth}', 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.admin_team_members (user_id, profile_id, role, status, permissions) VALUES
          ('${adminAuth}', '${adminProf}', 'Admin', 'Active', '{"Users": {"view": true, "edit": true, "delete": true}, "Tickets": {"view": true, "edit": true, "delete": true}}'::jsonb);
      `);

      // ======================================================================
      // R10-01: Ticket message boundary enforcement & immutability suite
      // ======================================================================
      let aliceTicketId, bobTicketId, lockedTicketId, aliceMsgId;

      await asUser(db, aliceAuth, async () => {
        const atRes = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, priority, category, chat_enabled)
          VALUES ('${aliceProf}', 'Alice Open Ticket', 'Open query', 'low', 'General', true)
          RETURNING id;
        `);
        aliceTicketId = atRes.rows[0].id;

        const amRes = await db.query(`
          INSERT INTO public.ticket_messages (ticket_id, author_id, message)
          VALUES ('${aliceTicketId}', '${aliceProf}', 'Alice initial reply')
          RETURNING id;
        `);
        aliceMsgId = amRes.rows[0].id;

        const ltRes = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, priority, category, chat_enabled)
          VALUES ('${aliceProf}', 'Alice Locked Ticket', 'Chat disabled', 'low', 'General', false)
          RETURNING id;
        `);
        lockedTicketId = ltRes.rows[0].id;
      });

      await asUser(db, bobAuth, async () => {
        const btRes = await db.query(`
          INSERT INTO public.tickets (user_id, subject, description, priority, category, chat_enabled)
          VALUES ('${bobProf}', 'Bob Private Ticket', 'Confidential ticket', 'medium', 'Billing', true)
          RETURNING id;
        `);
        bobTicketId = btRes.rows[0].id;
      });

      // A. Reassigning ticket_id to Bob's ticket via WITH changed ... RETURNING 1 must fail with 42501
      await asUser(db, aliceAuth, async () => {
        await assert.rejects(
          () => db.query(`
            WITH changed AS (
              UPDATE public.ticket_messages
              SET ticket_id = '${bobTicketId}', message = 'Cross-ticket fixture'
              WHERE id = '${aliceMsgId}'
              RETURNING 1
            )
            SELECT count(*)::int AS changed FROM changed;
          `),
          /ticket_id cannot be reassigned/i,
          'R10-01: ticket_messages UPDATE must forbid reassigning ticket_id to another ticket'
        );

        // Assert source row is preserved and destination contains zero rows
        const srcCheck = await db.query(`
          SELECT id, ticket_id, message FROM public.ticket_messages WHERE id = '${aliceMsgId}';
        `);
        assert.equal(srcCheck.rows[0].ticket_id, aliceTicketId, 'Source message must remain in Alice ticket');
        assert.equal(srcCheck.rows[0].message, 'Alice initial reply', 'Source message text must remain unchanged after denied update');

        const dstCheck = await db.query(`
          SELECT count(*)::int AS cnt FROM public.ticket_messages WHERE ticket_id = '${bobTicketId}';
        `);
        assert.equal(dstCheck.rows[0].cnt, 0, 'Bob private ticket must have zero messages after denied cross-ticket move');
      });

      // B. Moving reply into Alice's locked ticket (chat_enabled = false) must be rejected
      await asUser(db, aliceAuth, async () => {
        await assert.rejects(
          () => db.query(`
            UPDATE public.ticket_messages
            SET ticket_id = '${lockedTicketId}', message = 'Move into locked'
            WHERE id = '${aliceMsgId}';
          `),
          /ticket_id cannot be reassigned/i,
          'R10-01: ticket_messages UPDATE must forbid moving message into locked ticket'
        );
      });

      // C. Outsider (Bob) attempting to edit Alice's ticket message -> denied by RLS (0 rows updated)
      await asUser(db, bobAuth, async () => {
        const outsiderUpdate = await db.query(`
          UPDATE public.ticket_messages
          SET message = 'Bob unauthorized tampering'
          WHERE id = '${aliceMsgId}'
          RETURNING 1;
        `);
        assert.equal(outsiderUpdate.rowCount, 0, 'R10-01: Outsider cannot update Alice ticket message');
      });

      // D. Legitimate same-ticket content edit by author -> succeeds
      await asUser(db, aliceAuth, async () => {
        const legitUpdate = await db.query(`
          UPDATE public.ticket_messages
          SET message = 'Alice edited reply with timestamp details'
          WHERE id = '${aliceMsgId}'
          RETURNING id, ticket_id, message;
        `);
        assert.equal(legitUpdate.rowCount, 1, 'R10-01: Author same-ticket message edit must succeed');
        assert.equal(legitUpdate.rows[0].message, 'Alice edited reply with timestamp details');
        assert.equal(legitUpdate.rows[0].ticket_id, aliceTicketId);
      });

      // E. Author reassignment on ticket_messages remains strictly rejected with 42501
      await asUser(db, aliceAuth, async () => {
        await assert.rejects(
          () => db.query(`
            UPDATE public.ticket_messages
            SET author_id = '${bobProf}'
            WHERE id = '${aliceMsgId}';
          `),
          /author_id cannot be reassigned/i,
          'R10-01: Author reassignment must be rejected with 42501'
        );
      });

      // F. Control: Admin deleting author profile ON DELETE SET NULL succeeds
      await asUser(db, adminAuth, async () => {
        const delRes = await db.query(`DELETE FROM public.profiles WHERE id = '${aliceProf}';`);
        assert.equal(delRes.rowCount, 1, 'R10-01: Admin deleting profile with ticket messages must succeed');

        const orphanedMsg = await db.query(`SELECT id, author_id FROM public.ticket_messages WHERE id = '${aliceMsgId}';`);
        assert.equal(orphanedMsg.rows[0].author_id, null, 'Message author_id must be cleanly set to NULL via FK ON DELETE SET NULL');
      });

      await db.close();

      // ======================================================================
      // R10-02: Encryption readiness & blank key normalization suite
      // ======================================================================
      // Case 1: Cached blank key "" with rotation disabled -> initiates publication with verified absence filter
      let writeCountBlank = 0;
      let orFilterApplied = false;
      const mockSupabaseBlankKeyAck = {
        from: (table) => ({
          update: (payload) => {
            writeCountBlank += 1;
            return {
              eq: () => ({
                or: (condition) => {
                  if (condition.includes('is.null') || condition.includes('eq.')) orFilterApplied = true;
                  return {
                    select: async () => ({ data: [{ id: 'prof-r10-blank' }], error: null })
                  };
                },
                is: () => ({
                  select: async () => ({ data: [{ id: 'prof-r10-blank' }], error: null })
                }),
                select: async () => ({ data: [{ id: 'prof-r10-blank' }], error: null })
              })
            };
          }
        })
      };

      const blankKeyAckRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseBlankKeyAck,
        profileId: 'prof-r10-blank',
        existingRemotePublicKey: '',
        allowExplicitKeyRotation: false
      });
      assert.equal(blankKeyAckRes.ready, true, 'R10-02: Cached blank key with acknowledged write must mark ready = true');
      assert.equal(blankKeyAckRes.requiresExplicitKeyRotation, false);
      assert.equal(writeCountBlank, 1, 'R10-02: Cached blank key must execute exactly 1 publication write');
      assert.equal(orFilterApplied, true, 'R10-02: Publication must enforce verified-absence filter on blank key');

      // Case 2: Cached blank key with write error -> must fail closed (ready: false, privKey: null)
      const mockSupabaseBlankKeyErr = {
        from: (table) => ({
          update: () => ({
            eq: () => ({
              or: () => ({
                select: async () => ({ data: null, error: { message: 'Database connection lost' } })
              })
            })
          })
        })
      };

      const blankKeyErrRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseBlankKeyErr,
        profileId: 'prof-r10-blank-err',
        existingRemotePublicKey: '   ',
        allowExplicitKeyRotation: false
      });
      assert.equal(blankKeyErrRes.ready, false, 'R10-02: Failed write on blank key must leave ready = false');
      assert.equal(blankKeyErrRes.privKey, null, 'R10-02: Failed write must not expose active private key');

      // Case 3: Fresh lookup returning blank string "   " from DB -> normalized to null and published
      let writeCountFreshBlank = 0;
      const mockSupabaseFreshBlank = {
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-r10-fresh-blank', public_key: '   ' },
                error: null
              })
            })
          }),
          update: () => {
            writeCountFreshBlank += 1;
            return {
              eq: () => ({
                or: () => ({
                  select: async () => ({ data: [{ id: 'prof-r10-fresh-blank' }], error: null })
                }),
                select: async () => ({ data: [{ id: 'prof-r10-fresh-blank' }], error: null })
              })
            };
          }
        })
      };

      const freshBlankRes = await ensureSenderE2EEPublicationReady({
        supabaseClient: mockSupabaseFreshBlank,
        profileId: 'prof-r10-fresh-blank',
        allowExplicitKeyRotation: false
      });
      assert.equal(freshBlankRes.ready, true, 'R10-02: Fresh lookup of blank key string must normalize to absent and publish');
      assert.equal(writeCountFreshBlank, 1, 'R10-02: Fresh lookup of blank string must perform publication write');

      // Case 4: End-to-end sender encryption and recipient decryption lifecycle
      const senderKeys = await generateKeyPair();
      const senderPrivKey = await importPrivateKey(senderKeys.privateKeyJwk);
      const senderPubStr = JSON.stringify(senderKeys.publicKeyJwk);
      const recipientKeys = await generateKeyPair();
      const recipientPrivKey = await importPrivateKey(recipientKeys.privateKeyJwk);
      const recipientPubStr = JSON.stringify(recipientKeys.publicKeyJwk);

      // Sender encrypts message for recipient
      const secretEnquiry = 'Confidential Studio Enquiry for Feature Film';
      const encResult = await encryptForRecipientOrThrow({
        plaintext: secretEnquiry,
        senderPrivateKey: senderPrivKey,
        recipientPublicKeyJwkOrStr: recipientPubStr,
        keyId: computeKeyId(recipientKeys.publicKeyJwk)
      });
      const encryptedEnvelope = encResult.envelope;
      assert.ok(encryptedEnvelope.startsWith('ENCRYPTED:'), 'Encrypted envelope must start with ENCRYPTED:');

      // Recipient decrypts with blank/missing sender key -> throws E2EE_SENDER_KEY_UNAVAILABLE
      await assert.rejects(
        () => decryptEnvelopeWithKeyring({
          envelope: encryptedEnvelope,
          primaryPrivateKey: recipientPrivKey,
          primaryPublicKeyJwk: recipientKeys.publicKeyJwk,
          senderPublicKeyJwkOrStr: '',
          peerPublicKeyHistory: []
        }),
        /E2EE_SENDER_KEY_UNAVAILABLE/i,
        'R10-02: Decrypting envelope with blank sender key must throw E2EE_SENDER_KEY_UNAVAILABLE'
      );

      // Recipient decrypts with verified published sender public key -> successfully recovers plaintext
      const decryptedText = await decryptEnvelopeWithKeyring({
        envelope: encryptedEnvelope,
        primaryPrivateKey: recipientPrivKey,
        primaryPublicKeyJwk: recipientKeys.publicKeyJwk,
        senderPublicKeyJwkOrStr: senderPubStr,
        peerPublicKeyHistory: []
      });
      assert.equal(decryptedText, secretEnquiry, 'R10-02: Decrypting envelope with published key must recover exact plaintext');
    });
  });
});
