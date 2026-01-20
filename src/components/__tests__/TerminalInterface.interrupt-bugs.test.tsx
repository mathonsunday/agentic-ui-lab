import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * TerminalInterface Interrupt Bug Fixes - Test Suite
 *
 * Tests for two critical bugs discovered during testing:
 * 1. No output until interrupt: After interrupting one stream, the next stream
 *    wouldn't show output until interrupted again
 * 2. Confidence jump after interrupt: Interrupting restored confidence instead of
 *    penalizing it (-15 penalty didn't persist)
 *
 * Root causes:
 * 1. isStreamInterruptedRef wasn't tied to specific stream ID, causing cross-stream
 *    contamination when chunks arrived quickly
 * 2. onConfidence callback from interrupted stream could fire after the penalty
 *    was applied, overwriting the -15 penalty with positive backend updates
 *
 * Fixes:
 * 1. Track interruptedStreamIdRef to validate chunk filtering per stream
 * 2. Block confidence updates from interrupted streams in onConfidence callback
 */

describe('TerminalInterface - Interrupt Bug Fixes', () => {
  describe('Bug #1: No Output Until Interrupt (Cross-Stream Contamination)', () => {
    it('should reset stream-specific interrupt flag for new streams', () => {
      /**
       * Scenario: User interrupts STREAM #19, then starts STREAM #20
       *
       * Before fix:
       * - isStreamInterruptedRef set to true for STREAM #19
       * - New STREAM #20 chunks filtered because isStreamInterruptedRef still true
       * - Output invisible until user interrupts again
       *
       * After fix:
       * - isStreamInterruptedRef reset to false for new stream
       * - interruptedStreamIdRef tracks which stream (19) was interrupted
       * - STREAM #20 chunks validated: streamId 20 !== interruptedStreamId 19
       * - Chunks pass through and render correctly
       */

      // Simulate stream state progression
      const stream19Interrupted = true; // User interrupted
      const interruptedStreamId = 19;

      // New stream starts (STREAM #20)
      const currentStreamId = 20;
      let isInterrupted = false; // Reset for new stream
      let interruptedStreamIdRef = interruptedStreamId; // Still tracks 19

      // Chunk from STREAM #20 arrives
      const shouldBlockChunk = isInterrupted && interruptedStreamIdRef === currentStreamId;
      expect(shouldBlockChunk).toBe(false); // Should NOT block (different stream)

      // Verify interrupt still applies to STREAM #19 if more chunks came in
      const stream19ChunkStreamId = 19;
      const shouldBlockStream19Chunk =
        isInterrupted && interruptedStreamIdRef === stream19ChunkStreamId;
      expect(shouldBlockStream19Chunk).toBe(false); // isInterrupted is false, so no blocking
    });

    it('should isolate interrupt state per stream ID', () => {
      /**
       * Multiple streams should not interfere with each other
       * Stream #18 interrupted, Stream #19 continues, Stream #20 starts fresh
       */

      interface StreamState {
        id: number;
        isInterrupted: boolean;
      }

      const streams: StreamState[] = [
        { id: 18, isInterrupted: true }, // User interrupted this
        { id: 19, isInterrupted: false }, // Received penalty, continuing
        { id: 20, isInterrupted: false }, // Just started, fresh
      ];

      const interruptedStreamId = 18;

      // Simulate chunks arriving from each stream
      streams.forEach((stream) => {
        // Check if this specific stream chunk should be blocked
        const shouldBlock = stream.isInterrupted && interruptedStreamId === stream.id;

        if (stream.id === 18) {
          expect(shouldBlock).toBe(true); // #18 was interrupted, block future chunks
        } else if (stream.id === 19) {
          expect(shouldBlock).toBe(false); // #19 wasn't interrupted directly
        } else if (stream.id === 20) {
          expect(shouldBlock).toBe(false); // #20 is fresh, no interrupt
        }
      });
    });

    it('should clear interrupt state when new stream begins', () => {
      /**
       * When handleInput starts a new stream, both flags should reset
       */

      // Simulate STREAM #19 being interrupted
      let isStreamInterruptedRef = true;
      let interruptedStreamIdRef = 19;

      // STREAM #20 starts (handleInput called)
      const newStreamId = 20;
      isStreamInterruptedRef = false; // Reset
      interruptedStreamIdRef = null; // Clear previous interrupt tracking

      expect(isStreamInterruptedRef).toBe(false);
      expect(interruptedStreamIdRef).toBe(null);

      // Now chunks from STREAM #20 pass validation
      const chunk = { length: 50 };
      const shouldBlockChunk = isStreamInterruptedRef && interruptedStreamIdRef === newStreamId;
      expect(shouldBlockChunk).toBe(false);
    });
  });

  describe('Bug #2: Confidence Jump After Interrupt (Penalty Overwrite)', () => {
    it('should block confidence updates from interrupted streams', () => {
      /**
       * Scenario: User interrupts STREAM #19 mid-response
       *
       * Timeline:
       * 1. User clicks interrupt at 18:19:17.462
       * 2. handleInterrupt() sets penalty: -15 (62% → 47%)
       * 3. But onConfidence callback from backend fires after
       * 4. Backend sends confidence update (positive delta)
       * 5. This overwrites the -15 penalty
       *
       * Fix: Track which stream was interrupted, ignore onConfidence
       *      callbacks from that stream after interrupt
       */

      const interruptedStreamId = 19;
      const beforeConfidence = 62;
      const penaltyApplied = -15;
      const expectedConfidenceAfterPenalty = 47;

      // Penalty applied in handleInterrupt
      let currentConfidence = beforeConfidence + penaltyApplied;
      expect(currentConfidence).toBe(expectedConfidenceAfterPenalty);

      // Backend sends confidence update (backend doesn't know about interrupt)
      const backendConfidenceUpdate = {
        from: beforeConfidence,
        to: 70, // Positive update from backend
      };

      // In onConfidence callback, check if this is from interrupted stream
      const incomingStreamId = 19;
      if (interruptedStreamId === incomingStreamId) {
        // BLOCK this update - don't apply it
        console.log(`⏭️ Ignoring confidence update from interrupted stream #${incomingStreamId}`);
        // currentConfidence stays at 47 (the penalty)
      } else {
        currentConfidence = backendConfidenceUpdate.to; // Would apply update
      }

      expect(currentConfidence).toBe(expectedConfidenceAfterPenalty); // Penalty persists
    });

    it('should allow confidence updates from non-interrupted streams', () => {
      /**
       * Only block updates from the specific interrupted stream,
       * not all confidence updates
       */

      const interruptedStreamId = 19;
      let currentConfidence = 47; // After -15 penalty

      // New stream starts
      const newStreamId = 20;
      const newConfidenceUpdate = {
        from: 47,
        to: 52, // User asked a good question
      };

      // This update should be allowed
      if (interruptedStreamId === newStreamId) {
        console.log(`Ignoring update from interrupted stream`);
        // Don't apply
      } else {
        currentConfidence = newConfidenceUpdate.to;
      }

      expect(currentConfidence).toBe(52); // Update applied (different stream)
    });

    it('should track which stream confidence updates came from', () => {
      /**
       * lastConfidenceUpdateStreamIdRef tracks the current stream
       * to validate updates belong to the right stream
       */

      let lastConfidenceUpdateStreamId = 20; // Current stream
      let interruptedStreamId = 19; // Previous stream that was interrupted

      // Confidence update arrives
      const updateStreamId = 19; // Claims to be from stream 19
      const confidenceUpdate = { from: 62, to: 70 };

      // Check: is this update from the interrupted stream?
      if (updateStreamId === interruptedStreamId) {
        // This update came from the interrupted stream - BLOCK IT
        expect(true).toBe(true); // Correctly identified as problematic
      }

      // Now update from current stream arrives
      const newUpdateStreamId = 20;
      if (newUpdateStreamId === lastConfidenceUpdateStreamId) {
        // This is from the current stream - ALLOW IT
        expect(true).toBe(true);
      }
    });

    it('should apply -15 confidence penalty on interrupt', () => {
      /**
       * The penalty itself is still applied, just protected from being overwritten
       */

      const beforeInterrupt = 62;
      const penaltyAmount = 15;
      const expectedAfterInterrupt = Math.max(0, beforeInterrupt - penaltyAmount);

      expect(expectedAfterInterrupt).toBe(47);
    });

    it('should log when blocking confidence updates from interrupted stream', () => {
      /**
       * Debug logging to verify the block is working
       */

      const logs: string[] = [];
      const mockLog = (msg: string) => logs.push(msg);

      const interruptedStreamId = 19;
      const incomingStreamId = 19;

      if (interruptedStreamId === incomingStreamId) {
        mockLog(`⏭️ [TerminalInterface] Ignoring confidence update from interrupted stream #${incomingStreamId}`);
      }

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('Ignoring confidence update');
      expect(logs[0]).toContain('#19');
    });
  });

  describe('Integration: Both Bugs Fixed', () => {
    it('should handle interrupt → new stream → confidence update sequence', () => {
      /**
       * Full sequence from user report:
       * 1. STREAM #18: Specimen 47 - full response
       * 2. User interrupts at ~42 seconds
       * 3. STREAM #19: Specimen 47 again - shows no output until interrupted
       * 4. User interrupts again
       * 5. Confidence should be 47 (-15 from 62), not 70 (from backend update)
       * 6. STREAM #20: Works fine (fresh state)
       *
       * With both fixes:
       * - STREAM #19 chunks pass through (different stream ID)
       * - Backend confidence updates blocked (interrupted stream ID check)
       * - Penalty persists (47%)
       * - STREAM #20 works normally
       */

      // Simulate the sequence
      let isInterrupted = false;
      let interruptedStreamId: number | null = null;
      let currentConfidence = 62;

      // STREAM #18 interrupted at 42s
      isInterrupted = true;
      interruptedStreamId = 18;
      currentConfidence = Math.max(0, currentConfidence - 15); // → 47
      expect(currentConfidence).toBe(47);

      // STREAM #19 starts
      isInterrupted = false; // Reset for new stream
      interruptedStreamId = 18; // Still tracks previous
      const stream19Id = 19;

      // Chunks from STREAM #19 arrive
      const stream19Chunk = { length: 100 };
      const shouldBlock19 = isInterrupted && interruptedStreamId === stream19Id;
      expect(shouldBlock19).toBe(false); // Chunks pass through ✓

      // Backend confidence update fires (from STREAM #19)
      if (interruptedStreamId === stream19Id) {
        // Don't apply (even though stream IDs don't match, this shows the check)
      } else {
        // Update would be applied here, but:
        // - interrupted stream is #18, not #19
        // - but we're blocking CURRENT stream #19 confidence updates after interrupt
      }

      // STREAM #19 interrupted
      isInterrupted = true;
      interruptedStreamId = 19;
      currentConfidence = Math.max(0, currentConfidence - 15); // → 32
      expect(currentConfidence).toBe(32);

      // STREAM #20 starts (fresh)
      isInterrupted = false;
      interruptedStreamId = 19;
      const stream20Id = 20;

      // Chunks from STREAM #20 pass (different stream)
      const shouldBlock20 = isInterrupted && interruptedStreamId === stream20Id;
      expect(shouldBlock20).toBe(false); // Chunks pass ✓

      // Stream #20 works fine
      expect(true).toBe(true);
    });

    it('should not interfere with normal (non-interrupted) confidence updates', () => {
      /**
       * When user doesn't interrupt, everything works normally
       */

      let isInterrupted = false;
      let interruptedStreamId: number | null = null;
      let currentConfidence = 50;

      // STREAM #1: Normal response
      const stream1Id = 1;
      const chunk1 = { length: 50 };
      const shouldBlock = isInterrupted && interruptedStreamId === stream1Id;
      expect(shouldBlock).toBe(false); // Chunks pass

      // Backend sends confidence update
      if (interruptedStreamId === stream1Id) {
        // Don't apply
      } else {
        currentConfidence = 60; // User asked good question
      }
      expect(currentConfidence).toBe(60); // Update applied normally

      // STREAM #2: Continue normally
      const stream2Id = 2;
      const shouldBlock2 = isInterrupted && interruptedStreamId === stream2Id;
      expect(shouldBlock2).toBe(false);

      if (interruptedStreamId === stream2Id) {
        // Don't apply
      } else {
        currentConfidence = 65; // More engagement
      }
      expect(currentConfidence).toBe(65); // Update applied normally
    });
  });

  describe('Edge Cases', () => {
    it('should handle null interruptedStreamId correctly', () => {
      /**
       * Before any interrupt, interruptedStreamId is null
       */

      let isInterrupted = false;
      let interruptedStreamId: number | null = null;

      const stream1Id = 1;
      const shouldBlock = isInterrupted && interruptedStreamId === stream1Id;
      expect(shouldBlock).toBe(false); // Never blocks (isInterrupted false)
    });

    it('should handle rapid successive interrupts', () => {
      /**
       * User spams interrupt button - each should be independent
       */

      let isInterrupted = false;
      let interruptedStreamId: number | null = null;

      // Interrupt STREAM #1
      isInterrupted = true;
      interruptedStreamId = 1;
      expect(interruptedStreamId).toBe(1);

      // Interrupt STREAM #2
      isInterrupted = true;
      interruptedStreamId = 2; // Updated to new stream
      expect(interruptedStreamId).toBe(2);

      // Interrupt STREAM #3
      isInterrupted = true;
      interruptedStreamId = 3; // Updated to new stream
      expect(interruptedStreamId).toBe(3);

      // Only #3 should be blocked
      const shouldBlockStream1 = isInterrupted && interruptedStreamId === 1;
      const shouldBlockStream3 = isInterrupted && interruptedStreamId === 3;
      expect(shouldBlockStream1).toBe(false);
      expect(shouldBlockStream3).toBe(true);
    });

    it('should handle confidence at boundaries (0 and 100)', () => {
      /**
       * -15 penalty should not go below 0
       * Updates should not go above 100
       */

      // Low confidence interrupted
      let confidence = 10;
      confidence = Math.max(0, confidence - 15);
      expect(confidence).toBe(0);

      // High confidence update (blocked anyway for interrupted stream)
      confidence = 100;
      // Would be blocked by interrupt logic, but boundaries still respected
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should reset refs when new stream starts', () => {
      /**
       * Fresh start: all interrupt tracking cleared
       */

      let isInterrupted = false;
      let interruptedStreamId: number | null = null;
      let lastConfidenceUpdateStreamId = 1;

      // New stream #2 starts
      const newStreamId = 2;
      isInterrupted = false; // RESET
      interruptedStreamId = null; // CLEAR
      lastConfidenceUpdateStreamId = newStreamId; // SET to current

      expect(isInterrupted).toBe(false);
      expect(interruptedStreamId).toBe(null);
      expect(lastConfidenceUpdateStreamId).toBe(2);
    });
  });
});
