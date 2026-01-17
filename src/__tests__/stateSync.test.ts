/**
 * Tests for State Synchronization Layer
 *
 * Verifies:
 * - State versioning
 * - Conflict detection
 * - JSON Patch operations
 * - Optimistic update rollback
 * - Checksum validation
 */

import { describe, it, expect } from 'vitest';
import type { MiraState } from '../../api/lib/types';
import {
  createVersionedState,
  generateStateDelta,
  applyPatch,
  validateStateSync,
  rollbackOptimisticUpdate,
  StateSyncManager,
} from '../lib/stateSync';

describe('State Synchronization', () => {
  const createTestState = (): MiraState => ({
    confidenceInUser: 50,
    userProfile: {
      thoughtfulness: 60,
      adventurousness: 70,
      engagement: 80,
      curiosity: 75,
      superficiality: 20,
    },
    currentMood: 'curious',
    hasFoundKindred: false,
    memories: [],
    responseIndices: {},
  });

  describe('Versioned State', () => {
    it('should create versioned state with metadata', () => {
      const state = createTestState();
      const versioned = createVersionedState(state, 0);

      expect(versioned.version).toBe(0);
      expect(versioned.timestamp).toBeDefined();
      expect(versioned.checksum).toBeDefined();
      expect(versioned.state).toEqual(state);
    });

    it('should generate deterministic checksums', () => {
      const state = createTestState();

      // FIXED: Test that same state produces same checksum (determinism)
      const versioned1 = createVersionedState(state, 0);
      const versioned2 = createVersionedState(state, 0);
      expect(versioned1.checksum).toBe(versioned2.checksum);
    });

    it('should have low collision rate for different states', () => {
      // FIXED: Test that different states produce different checksums
      const mutations = [
        createTestState(),
        { ...createTestState(), confidenceInUser: 51 },
        { ...createTestState(), confidenceInUser: 52 },
        { ...createTestState(), currentMood: 'excited' },
        { ...createTestState(), hasFoundKindred: true },
      ];

      const checksums = mutations.map(s => createVersionedState(s).checksum);
      const unique = new Set(checksums);

      // All different states should have different checksums
      expect(unique.size).toBe(mutations.length);
    });

    it('should produce different checksums for different states', () => {
      const state1 = createTestState();
      const state2 = createTestState();
      state2.confidenceInUser = 75;

      const versioned1 = createVersionedState(state1);
      const versioned2 = createVersionedState(state2);

      expect(versioned1.checksum).not.toBe(versioned2.checksum);
    });

    it('should increment version number', () => {
      const state = createTestState();
      const v0 = createVersionedState(state, 0);
      const v1 = createVersionedState(state, 1);
      const v2 = createVersionedState(state, 2);

      expect(v0.version).toBe(0);
      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
    });
  });

  describe('State Deltas', () => {
    it('should generate delta for confidence change', () => {
      const state1 = createTestState();
      const state2 = createTestState();
      state2.confidenceInUser = 75;

      const v1 = createVersionedState(state1, 0);
      const v2 = createVersionedState(state2, 1);

      const delta = generateStateDelta(v1, v2);

      expect(delta.from_version).toBe(0);
      expect(delta.to_version).toBe(1);
      expect(delta.operations.length).toBeGreaterThan(0);
      expect(delta.operations.some((op) => op.path === '/confidenceInUser')).toBe(true);
    });

    it('should generate delta for profile change', () => {
      const state1 = createTestState();
      const state2 = createTestState();
      state2.userProfile.thoughtfulness = 80;

      const v1 = createVersionedState(state1, 0);
      const v2 = createVersionedState(state2, 1);

      const delta = generateStateDelta(v1, v2);

      expect(delta.operations.some((op) => op.path === '/userProfile')).toBe(true);
    });

    it('should generate delta for mood change', () => {
      const state1 = createTestState();
      const state2 = createTestState();
      state2.currentMood = 'excited';

      const v1 = createVersionedState(state1, 0);
      const v2 = createVersionedState(state2, 1);

      const delta = generateStateDelta(v1, v2);

      expect(delta.operations.some((op) => op.path === '/currentMood')).toBe(true);
    });

    it('should generate delta for boolean change', () => {
      const state1 = createTestState();
      const state2 = createTestState();
      state2.hasFoundKindred = true;

      const v1 = createVersionedState(state1, 0);
      const v2 = createVersionedState(state2, 1);

      const delta = generateStateDelta(v1, v2);

      expect(delta.operations.some((op) => op.path === '/hasFoundKindred')).toBe(true);
    });

    it('should include checksum in delta', () => {
      const state1 = createTestState();
      const state2 = createTestState();

      const v1 = createVersionedState(state1, 0);
      const v2 = createVersionedState(state2, 1);

      const delta = generateStateDelta(v1, v2);

      expect(delta.checksum).toBeDefined();
      expect(delta.checksum).toBe(v2.checksum);
    });

    it('should use replace operation type', () => {
      const state1 = createTestState();
      const state2 = createTestState();
      state2.confidenceInUser = 75;

      const v1 = createVersionedState(state1, 0);
      const v2 = createVersionedState(state2, 1);

      const delta = generateStateDelta(v1, v2);

      const confOp = delta.operations.find((op) => op.path === '/confidenceInUser');
      expect(confOp?.op).toBe('replace');
      expect(confOp?.value).toBe(75);
    });
  });

  describe('Patch Application', () => {
    it('should apply replace patch operation', () => {
      const state = createTestState();
      const versioned = createVersionedState(state, 0);

      const patched = applyPatch(versioned, [
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      expect(patched.state.confidenceInUser).toBe(75);
      expect(patched.version).toBe(1);
    });

    it('should increment version when applying patch', () => {
      const state = createTestState();
      const v0 = createVersionedState(state, 0);

      const v1 = applyPatch(v0, [
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      const v2 = applyPatch(v1, [
        { op: 'replace', path: '/currentMood', value: 'excited' },
      ]);

      expect(v0.version).toBe(0);
      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
    });

    it('should handle multiple patches', () => {
      const state = createTestState();
      const versioned = createVersionedState(state, 0);

      const patched = applyPatch(versioned, [
        { op: 'replace', path: '/confidenceInUser', value: 75 },
        { op: 'replace', path: '/currentMood', value: 'excited' },
        { op: 'replace', path: '/hasFoundKindred', value: true },
      ]);

      expect(patched.state.confidenceInUser).toBe(75);
      expect(patched.state.currentMood).toBe('excited');
      expect(patched.state.hasFoundKindred).toBe(true);
    });

    it('should update checksum after patch', () => {
      const state = createTestState();
      const v0 = createVersionedState(state, 0);

      const v1 = applyPatch(v0, [
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      expect(v0.checksum).not.toBe(v1.checksum);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect version mismatch', () => {
      const state = createTestState();
      const serverVersion = createVersionedState(state, 1);

      const result = validateStateSync(0, serverVersion);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Version mismatch');
    });

    it('should accept matching versions', () => {
      const state = createTestState();
      const serverVersion = createVersionedState(state, 1);

      const result = validateStateSync(1, serverVersion);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should provide error details', () => {
      const state = createTestState();
      const serverVersion = createVersionedState(state, 5);

      const result = validateStateSync(3, serverVersion);

      expect(result.error).toContain('v3');
      expect(result.error).toContain('v5');
    });
  });

  describe('Optimistic Updates', () => {
    it('should rollback optimistic update', () => {
      const state = createTestState();
      const versioned = createVersionedState(state, 0);

      const ops = [{ op: 'replace', path: '/confidenceInUser', value: 75 }] as const;
      const rolled = rollbackOptimisticUpdate(versioned, ops as any);

      // Rollback returns original version
      expect(rolled).toBeDefined();
    });
  });

  describe('State Sync Manager', () => {
    it('should initialize with state', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      const local = manager.getLocalVersion();
      const server = manager.getServerVersion();

      expect(local.state).toEqual(state);
      expect(server.state).toEqual(state);
    });

    it('should apply optimistic local update', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      const updated = manager.optimisticUpdate([
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      expect(updated.state.confidenceInUser).toBe(75);
      expect(updated.version).toBe(1);
    });

    it('should confirm server update', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      // Make optimistic update
      manager.optimisticUpdate([
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      // Server confirms with version 1
      const serverState = createTestState();
      serverState.confidenceInUser = 75;
      const serverVersion = createVersionedState(serverState, 1);

      manager.confirmServerUpdate(serverVersion);

      const local = manager.getLocalVersion();
      const server = manager.getServerVersion();

      expect(local.version).toBe(server.version);
    });

    it('should detect conflict and rollback', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      // Make optimistic update
      const local1 = manager.optimisticUpdate([
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      // FIXED: Verify optimistic update was applied
      expect(local1.state.confidenceInUser).toBe(75);
      expect(local1.version).toBe(1);

      // Server has different state
      const serverState = createTestState();
      serverState.confidenceInUser = 60;
      const serverVersion = createVersionedState(serverState, 1);

      const result = manager.syncWithServer(serverVersion);

      // FIXED: Properly verify conflict detection
      expect(result.hasConflict).toBe(true);
      // Local should match server after conflict (rollback)
      expect(result.localVersion.state.confidenceInUser).toBe(60);
      expect(result.localVersion.checksum).toBe(serverVersion.checksum);
      // Verify that conflicting change is actually detected
      expect(result.localVersion.state).toEqual(serverVersion.state);
    });

    it('should track local vs server state separately', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      const local1 = manager.getLocalVersion();
      const server1 = manager.getServerVersion();

      expect(local1.version).toBe(server1.version);

      // Make optimistic update
      manager.optimisticUpdate([
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      const local2 = manager.getLocalVersion();
      const server2 = manager.getServerVersion();

      // Local updated, server unchanged
      expect(local2.version).toBe(1);
      expect(server2.version).toBe(0);
    });
  });

  describe('State Sync Scenarios', () => {
    it('should handle successful optimistic update flow', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      // 1. Client makes optimistic update
      manager.optimisticUpdate([
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      // 2. Server confirms
      const serverState = createTestState();
      serverState.confidenceInUser = 75;
      const serverVersion = createVersionedState(serverState, 1);
      manager.confirmServerUpdate(serverVersion);

      const local = manager.getLocalVersion();
      expect(local.state.confidenceInUser).toBe(75);
      expect(local.version).toBe(1);
    });

    it('should handle rejected optimistic update flow', () => {
      const state = createTestState();
      const manager = new StateSyncManager(state);

      // 1. Client makes optimistic update
      manager.optimisticUpdate([
        { op: 'replace', path: '/confidenceInUser', value: 75 },
      ]);

      // 2. Server rejects and sends different state
      const serverState = createTestState();
      serverState.confidenceInUser = 50; // Rejected the change
      const serverVersion = createVersionedState(serverState, 1);

      const result = manager.syncWithServer(serverVersion);

      expect(result.hasConflict).toBe(true);
      // After sync, client matches server
      const local = manager.getLocalVersion();
      expect(local.state.confidenceInUser).toBe(50);
    });
  });
});
