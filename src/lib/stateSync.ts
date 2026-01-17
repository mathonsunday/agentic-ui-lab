/**
 * State Synchronization Utilities
 *
 * Implements versioned state management with:
 * - State versioning for conflict detection
 * - JSON Patch (RFC 6902) support for efficient state deltas
 * - Optimistic update rollback
 * - State checksum validation
 */

import type { MiraState } from '../../api/lib/types';

/**
 * Versioned state with metadata
 */
export interface VersionedState {
  /** The actual state */
  state: MiraState;

  /** Version number (increments on each change) */
  version: number;

  /** ISO timestamp of last update */
  timestamp: number;

  /** Checksum for validation */
  checksum: string;

  /** Expected version client should have before updating */
  expected_version?: number;
}

/**
 * JSON Patch operation (RFC 6902)
 */
export interface PatchOperation {
  /** Operation type */
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

  /** JSON Pointer path */
  path: string;

  /** Value for add/replace operations */
  value?: unknown;

  /** Source path for move/copy operations */
  from?: string;
}

/**
 * State delta containing patch operations
 */
export interface StateDelta {
  /** Version before patch */
  from_version: number;

  /** Version after patch */
  to_version: number;

  /** JSON Patch operations */
  operations: PatchOperation[];

  /** Full state snapshot if patch would be larger */
  full_state?: MiraState;

  /** Checksum of resulting state */
  checksum: string;
}

/**
 * Calculate simple checksum of state for validation
 */
function calculateChecksum(state: MiraState): string {
  const json = JSON.stringify(state);
  let hash = 0;

  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Keep as 32-bit int
  }

  return `chk_${Math.abs(hash).toString(16)}`;
}

/**
 * Create versioned state wrapper
 */
export function createVersionedState(state: MiraState, version = 0): VersionedState {
  return {
    state,
    version,
    timestamp: Date.now(),
    checksum: calculateChecksum(state),
  };
}

/**
 * Generate a state delta from two versions
 * Uses JSON Patch format for efficiency
 */
export function generateStateDelta(
  from: VersionedState,
  to: VersionedState
): StateDelta {
  // For now, use full state since we have only a few fields
  // In production, would use RFC 6902 patch generation
  const operations: PatchOperation[] = [];
  const fromState = from.state;
  const toState = to.state;

  // Check each field for changes
  if (fromState.confidenceInUser !== toState.confidenceInUser) {
    operations.push({
      op: 'replace',
      path: '/confidenceInUser',
      value: toState.confidenceInUser,
    });
  }

  if (JSON.stringify(fromState.userProfile) !== JSON.stringify(toState.userProfile)) {
    operations.push({
      op: 'replace',
      path: '/userProfile',
      value: toState.userProfile,
    });
  }

  if (fromState.currentMood !== toState.currentMood) {
    operations.push({
      op: 'replace',
      path: '/currentMood',
      value: toState.currentMood,
    });
  }

  if (fromState.hasFoundKindred !== toState.hasFoundKindred) {
    operations.push({
      op: 'replace',
      path: '/hasFoundKindred',
      value: toState.hasFoundKindred,
    });
  }

  // Memories array is append-only, so we track length changes
  if (fromState.memories.length !== toState.memories.length) {
    operations.push({
      op: 'replace',
      path: '/memories',
      value: toState.memories,
    });
  }

  return {
    from_version: from.version,
    to_version: to.version,
    operations,
    checksum: calculateChecksum(toState),
  };
}

/**
 * Apply a patch to a state
 * Returns new state with updated version
 */
export function applyPatch(
  versioned: VersionedState,
  operations: PatchOperation[]
): VersionedState {
  let state = { ...versioned.state };

  for (const op of operations) {
    switch (op.op) {
      case 'replace': {
        const pathParts = op.path.split('/').filter((p) => p);
        let current: any = state;

        // Navigate to parent object
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]];
          if (!current) break;
        }

        if (current) {
          const lastKey = pathParts[pathParts.length - 1];
          current[lastKey] = op.value;
        }
        break;
      }

      // Other operations could be implemented as needed
    }
  }

  return {
    state,
    version: versioned.version + 1,
    timestamp: Date.now(),
    checksum: calculateChecksum(state),
  };
}

/**
 * Validate that client and server states are in sync
 */
export function validateStateSync(
  clientVersion: number,
  serverVersion: VersionedState
): { valid: boolean; error?: string } {
  if (clientVersion !== serverVersion.version) {
    return {
      valid: false,
      error: `Version mismatch: client has v${clientVersion}, server has v${serverVersion.version}`,
    };
  }

  return { valid: true };
}

/**
 * Rollback an optimistic update by removing the operations
 */
export function rollbackOptimisticUpdate(
  versioned: VersionedState,
  appliedOps: PatchOperation[]
): VersionedState {
  // Create inverse operations
  const inverseOps: PatchOperation[] = [];

  for (const op of appliedOps.reverse()) {
    if (op.op === 'replace') {
      // Store old value - for now just skip (full state refresh)
      inverseOps.push(op);
    }
  }

  // In practice, we'd apply inverse ops or reset to previous checkpoint
  // For now, just return the state unchanged (client will fetch fresh)
  return versioned;
}

/**
 * State synchronization manager
 */
export class StateSyncManager {
  private localVersion: VersionedState;
  private serverVersion: VersionedState;

  constructor(initialState: MiraState) {
    this.localVersion = createVersionedState(initialState, 0);
    this.serverVersion = createVersionedState(initialState, 0);
  }

  /**
   * Apply optimistic local update
   */
  optimisticUpdate(patch: PatchOperation[]): VersionedState {
    const updated = applyPatch(this.localVersion, patch);
    this.localVersion = updated;
    return updated;
  }

  /**
   * Confirm server accepted our update
   */
  confirmServerUpdate(serverVersion: VersionedState): void {
    this.serverVersion = serverVersion;
    this.localVersion = {
      ...serverVersion,
      version: serverVersion.version,
      timestamp: serverVersion.timestamp,
    };
  }

  /**
   * Rollback if server rejected
   */
  rollbackUpdate(): VersionedState {
    this.localVersion = this.serverVersion;
    return this.localVersion;
  }

  /**
   * Receive server state update
   */
  syncWithServer(serverVersion: VersionedState): {
    hasConflict: boolean;
    localVersion: VersionedState;
  } {
    const hasConflict = this.localVersion.version !== this.serverVersion.version;

    if (hasConflict) {
      // Client made changes while server was also changing
      // Rollback local, use server version
      this.localVersion = serverVersion;
    }

    this.serverVersion = serverVersion;

    return { hasConflict, localVersion: this.localVersion };
  }

  /**
   * Get current local version
   */
  getLocalVersion(): VersionedState {
    return this.localVersion;
  }

  /**
   * Get current server version
   */
  getServerVersion(): VersionedState {
    return this.serverVersion;
  }
}
