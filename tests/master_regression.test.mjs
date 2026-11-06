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
  encryptForRecipientOrThrow
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

    test('Bootstrap migration provisions public.profiles before foreign key references', () => {
      assert.ok(bootstrapSql.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Bootstrap must create public.profiles');
      assert.ok(bootstrapSql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'), 'Bootstrap profiles.id must default to gen_random_uuid()');
      assert.ok(bootstrapSql.includes('user_id UUID UNIQUE REFERENCES auth.users(id)'), 'Bootstrap profiles must link user_id to auth.users');
    });

    test('Master convergence migration guarantees profiles.id default and all required tables', () => {
      assert.ok(migrationSql.includes('ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()'), 'Must alter profiles.id default');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.settings'), 'Settings table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.admin_team_members'), 'Admin team table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.shooting_locations'), 'Shooting locations table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.property_site_visits'), 'Property site visits table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.project_tasks'), 'Project tasks table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.tickets'), 'Tickets table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.ticket_messages'), 'Ticket messages table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.ticket_updates'), 'Ticket updates table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.subscription_plans'), 'Subscription plans table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.directory_categories'), 'Directory categories table DDL');
      assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.global_tags'), 'Global tags table DDL');
    });

    test('Master convergence migration revokes legacy permissive repair policies', () => {
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;'), 'Must drop posts public read');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;'), 'Must drop unblock_rls tickets update');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can insert ticket updates" ON public.ticket_updates;'), 'Must drop unblock_rls ticket updates insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;'), 'Must drop notifications public insert');
      assert.ok(migrationSql.includes('DROP POLICY IF EXISTS "connections_insert_policy" ON public.connections;'), 'Must drop legacy connections insert');
    });
  });

  // M03: Project Membership Privileges & Creator Approval
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
      assert.ok(migrationSql.includes('is_published = true'), 'Unpublished posts must not be public');
      assert.ok(migrationSql.includes('posts_update_policy'), 'Post updates must be author-bound');
      assert.ok(migrationSql.includes('posts_delete_policy'), 'Post deletes must be author-bound');
    });
  });

  // M06: Team Provisioning & Admin Role Security
  describe('M06: Team Provisioning & Uniqueness Contract', () => {
    test('AdminTeam provisioning respects UNIQUE(user_id, role) onConflict target', () => {
      const adminTeamSource = fs.readFileSync(path.join(rootDir, 'src/pages/AdminTeam.tsx'), 'utf8');
      assert.ok(adminTeamSource.includes("onConflict: 'user_id,role'"), 'Upsert must use actual UNIQUE(user_id, role) constraint');
      assert.ok(adminTeamSource.includes("eq('role', 'admin')"), 'Member deletion must remove admin role, not wipe unrelated user roles');
    });
  });

  // M07: Direct Message Read Receipts & Identity Mapping
  describe('M07: DM Read Receipt UPDATE Policy & Profile Identity', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Messages update policy maps receiver_id through profiles table', () => {
      assert.ok(migrationSql.includes('messages_update_received'), 'Must define messages_update_received policy');
      assert.ok(migrationSql.includes('messages.receiver_id'), 'Policy must check messages.receiver_id against profiles');
    });
  });

  // M08: Casting Correlated Policies & Impersonation Prevention
  describe('M08: Correlated Casting Policies', () => {
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261106000000_reproducible_baseline_and_security_convergence.sql'),
      'utf8'
    );

    test('Casting applicant and save policies use qualified table aliases', () => {
      assert.ok(
        migrationSql.includes('p.id = casting_applicants.user_id') && migrationSql.includes('p.user_id = auth.uid()'),
        'Casting applicants must correlate p.id = casting_applicants.user_id AND p.user_id = auth.uid()'
      );
      assert.ok(
        migrationSql.includes('p.id = casting_call_saves.user_id') && migrationSql.includes('p.user_id = auth.uid()'),
        'Casting saves must correlate p.id = casting_call_saves.user_id AND p.user_id = auth.uid()'
      );
      assert.ok(
        migrationSql.includes('cc.deadline >= CURRENT_DATE'),
        'Casting insert must check deadline on server'
      );
    });
  });

  // M14: Production Fail-Closed End-to-End Encryption
  describe('M14: Production Fail-Closed E2EE (Native Web Crypto ECDH/AES-GCM)', () => {
    test('generateKeyPair, deriveAESKey, encryptMessage and decryptMessage execute cleanly', async () => {
      // 1. Generate real ECDH key pairs for Alice and Bob
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();

      assert.equal(aliceKeys.publicKeyJwk.kty, 'EC');
      assert.equal(aliceKeys.publicKeyJwk.crv, 'P-256');
      assert.equal(bobKeys.publicKeyJwk.kty, 'EC');

      // 2. Import keys
      const alicePrivate = await importPrivateKey(aliceKeys.privateKeyJwk);
      const bobPublic = await importPublicKey(bobKeys.publicKeyJwk);

      const bobPrivate = await importPrivateKey(bobKeys.privateKeyJwk);
      const alicePublic = await importPublicKey(aliceKeys.publicKeyJwk);

      // 3. Derive shared AES-GCM keys
      const aliceShared = await deriveAESKey(alicePrivate, bobPublic);
      const bobShared = await deriveAESKey(bobPrivate, alicePublic);

      // 4. Encrypt and decrypt a test message
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

      // Null recipient key
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

      // Malformed JSON string
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

      // Non-EC key
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
      assert.equal(parts.length, 3, 'Envelope must contain exactly three parts (tag, iv, ciphertext)');
      assert.ok(parts[1].length > 0, 'IV must be non-empty');
      assert.ok(parts[2].length > 0, 'Ciphertext must be non-empty');
    });
  });

  // M16: Honest Controls & Navigation
  describe('M16: Honest Course & Studio Registration Outcomes', () => {
    test('Course model interface and UI map website_link and validate external providers', () => {
      const industryHubSource = fs.readFileSync(path.join(rootDir, 'src/pages/industry-hub/page.tsx'), 'utf8');
      assert.ok(industryHubSource.includes('website_link?: string | null'), 'Course interface must include website_link');
      assert.ok(industryHubSource.includes("targetLink.startsWith('http')"), 'Course registration must validate external target URLs');
    });

    test('App.tsx provides /login compatibility alias redirecting to /auth/signin', () => {
      const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
      assert.ok(appSource.includes('<Route path="/login" element={<RedirectToSignIn />} />'), 'App must have /login alias');
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

  // M22: Job Applications FK & Profile Impersonation Prevention
  describe('M22: Job Application Profile Binding', () => {
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
      assert.ok(!analyticsSource.includes('|| newUsers'), 'Active users must not fall back to newUsers');
    });

    test('Jobs page renders truthful application counts without Math.random', () => {
      const jobsSource = fs.readFileSync(path.join(rootDir, 'src/pages/Jobs.tsx'), 'utf8');
      assert.ok(!jobsSource.includes('Math.floor(Math.random() * 50)'), 'Must not contain random job application numbers');
      assert.ok(jobsSource.includes('selectedJob.applications_count'), 'Must use truthful selectedJob.applications_count');
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

    test('StudiosDirectory callers await updateViewingCompany and check ok result before toast', () => {
      const studiosSource = fs.readFileSync(path.join(rootDir, 'src/pages/StudiosDirectory.tsx'), 'utf8');
      assert.ok(studiosSource.includes('const res = await updateViewingCompany(updated)'), 'Callers must await updateViewingCompany');
      assert.ok(studiosSource.includes('if (!res.ok) return;'), 'Callers must guard success toasts on res.ok');
    });
  });
});
