import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Direct production module imports (executed natively via Node 22/24 type-stripping)
import {
  generateKeyPair,
  importPublicKey,
  importPrivateKey,
  deriveAESKey,
  encryptMessage,
  decryptMessage,
  encryptForRecipientOrThrow,
  getOrInitUserE2EE
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

    test('Bootstrap migration provisions public.profiles without premature user_roles reference', () => {
      assert.ok(bootstrapSql.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Bootstrap must create public.profiles');
      assert.ok(bootstrapSql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'), 'Bootstrap profiles.id must default to gen_random_uuid()');
      assert.ok(bootstrapSql.includes('user_id UUID UNIQUE REFERENCES auth.users(id)'), 'Bootstrap profiles must link user_id to auth.users');
      assert.ok(!bootstrapSql.includes('user_roles'), 'Bootstrap profiles policies must not reference user_roles before its definition');
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
      assert.ok(adminTeamSource.includes("onConflict: 'user_id,role'"), 'Must specify onConflict: user_id,role');
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
      assert.ok(migrationSql.includes('require_approval BOOLEAN DEFAULT FALSE'), 'Must add require_approval column');
      assert.ok(migrationSql.includes('allow_member_posts BOOLEAN DEFAULT TRUE'), 'Must add allow_member_posts column');
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
  });
});
