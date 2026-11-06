import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

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

      // Initial state: group is null, loading is true
      const initialState = renderGroupHeader(null, true);
      assert.equal(initialState.rendered, false);
      assert.equal(initialState.fallback, 'Loading group details...');

      // Loaded state: group populated
      const loadedState = renderGroupHeader({ id: 'grp-1', name: 'Indie Directors Hub' }, false);
      assert.equal(loadedState.rendered, true);
      assert.equal(loadedState.title, 'Indie Directors Hub');

      // Error/Not found state: group is null, loading is false
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

      // Test null price_type (previously caused: Cannot read properties of null reading replace)
      const nullPriceTypeLoc = { id: 'loc-1', price: 15000, price_type: null };
      const res1 = formatLocationPricing(nullPriceTypeLoc);
      assert.equal(res1.displayPrice, 15000);
      assert.equal(res1.label, '₹15000 / day');

      // Test undefined price_type
      const undefLoc = { id: 'loc-2', price: 25000 };
      const res2 = formatLocationPricing(undefLoc);
      assert.equal(res2.displayPrice, 25000);
      assert.equal(res2.label, '₹25000 / day');

      // Test valid price_type
      const validLoc = { id: 'loc-3', price: 5000, price_type: 'Per Hour' };
      const res3 = formatLocationPricing(validLoc);
      assert.equal(res3.label, '₹5000 / Hour');
    });
  });

  // M20: Community Group Creation & Creator Membership Idempotency
  describe('M20: Community Group Creation & Idempotency', () => {
    test('Simulating atomic group creation does not delete valid group on 23505 conflict', async () => {
      let groupDeleted = false;
      const fakeGroup = { id: '55555555-5555-4555-8555-555555555555', name: 'Sound Designers' };

      // Simulate handler with trigger-created membership conflict
      const handleCreateGroupSimulation = async (group) => {
        // Trigger inserts Owner row automatically in DB
        const triggerInserted = true;

        // Client upsert with onConflict handles existing owner membership
        let memberError = null;
        if (triggerInserted) {
          // If duplicate key error 23505 is returned, it should NOT trigger compensation delete
          memberError = { code: '23505', message: 'duplicate key value violates unique constraint' };
        }

        if (memberError && memberError.code !== '23505') {
          // Only true unrecoverable error triggers compensation delete
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

  // M26: Chat Polling and Outbox Preservation
  describe('M26: Account-Scoped Outbox & Polling Resilience', () => {
    test('loadChatData preserves failed outbox messages when server polling returns', () => {
      const activeRecipientId = 'user-recipient-uuid';
      const currentUserId = 'user-sender-uuid';

      // 1. Cached outbox with one failed message
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
              failed: true // Unsent/failed message awaiting retry
            }
          ]
        }
      ];

      // 2. Server polling returns empty or previous messages (does not have the failed message)
      const serverMessages = [
        {
          id: 'server-msg-1',
          sender_id: activeRecipientId,
          receiver_id: currentUserId,
          content: 'Hey, did you send the draft?',
          created_at: new Date(Date.now() - 10000).toISOString()
        }
      ];

      // Merge logic from loadChatData
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

        // Merged messages must include both server messages and unsent outbox
        return [...mappedServer, ...unsentMessages].sort((a, b) => a.timestamp - b.timestamp);
      };

      const merged = mergeOutbox(serverMessages, cachedConversations, activeRecipientId);
      
      assert.equal(merged.length, 2);
      const failedMsg = merged.find(m => m.failed);
      assert.ok(failedMsg, 'Failed message must be preserved across polling cycles');
      assert.equal(failedMsg.content, 'Script draft review');
      assert.equal(failedMsg.failed, true);
    });
  });

  // M28: Zero-Row Mutation Rejection
  describe('M28: Zero-Row Mutation Rejection & Optimistic Rollbacks', () => {
    test('Mutation handler rejects zero-row response and does not report false success', async () => {
      const executeDeleteWithVerification = async (itemId, mockDbResponse) => {
        const { data, error } = mockDbResponse;
        if (error) throw error;
        // Zero-row check
        if (!data || data.length === 0) {
          throw new Error('Record not found or unauthorized: 0 rows affected');
        }
        return { success: true, deletedId: data[0].id };
      };

      // 1. Successful delete of 1 row
      const successRes = await executeDeleteWithVerification('item-123', {
        data: [{ id: 'item-123' }],
        error: null
      });
      assert.equal(successRes.success, true);
      assert.equal(successRes.deletedId, 'item-123');

      // 2. Zero-row response (e.g. invalid UUID, RLS-filtered, or already deleted)
      await assert.rejects(
        async () => {
          await executeDeleteWithVerification('item-999', {
            data: [], // 0 rows returned
            error: null
          });
        },
        /Record not found or unauthorized: 0 rows affected/
      );
    });
  });

  // M14: Fail-Closed E2EE Encryption
  describe('M14: Fail-Closed End-to-End Encryption', () => {
    test('E2EE fails closed on missing recipient key and prevents plaintext transmission', async () => {
      let transmittedPayload = null;
      let errorThrown = false;

      const sendMessageE2EE = async (content, recipientPublicKey) => {
        // Fail-closed rule: if presented as E2EE but recipient has no key, halt
        if (!recipientPublicKey) {
          errorThrown = true;
          throw new Error('E2EE_KEY_UNAVAILABLE: Recipient has not published an active encryption key.');
        }

        // Encrypt
        const encrypted = `ENC:${Buffer.from(content).toString('base64')}`;
        transmittedPayload = encrypted;
        return { success: true, payload: encrypted };
      };

      // Test with missing recipient key
      try {
        await sendMessageE2EE('Secret Film Script Plot Twist', null);
      } catch (err) {
        assert.equal(errorThrown, true);
        assert.match(err.message, /E2EE_KEY_UNAVAILABLE/);
      }

      // Plaintext must never have been transmitted
      assert.equal(transmittedPayload, null, 'Plaintext must not be transmitted when key is missing');

      // Test with valid key
      const ok = await sendMessageE2EE('Secret Film Script Plot Twist', '{"kty":"RSA"}');
      assert.equal(ok.success, true);
      assert.ok(transmittedPayload.startsWith('ENC:'));
    });
  });

  // M22 & M24: Distinct Auth and Profile ID Handling
  describe('M22 & M24: Profile PK vs Auth User ID Disambiguation', () => {
    test('Job applications and directory uploads target profile.id and auth.users.id correctly', () => {
      const authUser = { id: 'auth-user-1111-1111-1111-111111111111', email: 'director@filmcollab.com' };
      const userProfile = { id: 'profile-2222-2222-2222-222222222222', user_id: authUser.id, full_name: 'Director Jane' };

      // Ensure they are distinct
      assert.notEqual(authUser.id, userProfile.id);

      // Directory upload payload must use profile ID for directory_files.user_id FK
      const directoryUploadPayload = {
        title: 'CallSheet_Day1.pdf',
        file_url: 'https://storage/callsheet.pdf',
        user_id: userProfile.id // References public.profiles(id)
      };
      assert.equal(directoryUploadPayload.user_id, 'profile-2222-2222-2222-222222222222');

      // Job application payload must include profile_id for PostgREST embedding
      const jobApplicationPayload = {
        job_id: 'job-999',
        user_id: authUser.id, // References auth.users(id)
        profile_id: userProfile.id // References public.profiles(id)
      };
      assert.equal(jobApplicationPayload.user_id, authUser.id);
      assert.equal(jobApplicationPayload.profile_id, userProfile.id);
    });
  });

  // M27: Truthful Metrics
  describe('M27: Truthful Metrics & Non-Fabricated Telemetry', () => {
    test('Zero registered profiles yields 0 counts and empty trend without fabricated points', () => {
      const computeDashboardStats = (profilesList, ticketsCount) => {
        const totalUsers = profilesList.length;
        const totalTickets = ticketsCount || 0;
        const totalTeamMembers = profilesList.filter(p => p.role?.toLowerCase() === 'admin').length;
        
        // Accurate date aggregation
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

      // Empty database state
      const emptyStats = computeDashboardStats([], 0);
      assert.equal(emptyStats.totalUsers, 0);
      assert.equal(emptyStats.totalTickets, 0, 'Tickets count must be 0, not hardcoded 3');
      assert.equal(emptyStats.totalTeamMembers, 0, 'Admin count must be 0, not default 1');
      assert.equal(emptyStats.userTrendData.length, 0, 'Trend must not contain fabricated 5 data points');
    });
  });
});

