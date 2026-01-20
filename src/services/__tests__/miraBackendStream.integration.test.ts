/**
 * Integration Tests for miraBackendStream
 *
 * Tests the streamMiraBackend function through its public API by mocking fetch
 * and simulating SSE responses. This ensures refactoring safety without
 * requiring internal exports.
 *
 * Coverage:
 * - All event type handlers (handleEnvelopeEvent branches)
 * - Event reordering (EventBuffer)
 * - Deduplication (wrappedCallbacks)
 * - Abort handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamMiraBackend, type StreamCallbacks } from '../miraBackendStream';
import type { MiraState } from '../../../api/lib/types';
import type { EventEnvelope, EventType } from '../../types/events';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates an EventEnvelope with sensible defaults
 */
function createEnvelope<T>(
  type: EventType,
  data: T,
  sequenceNumber: number,
  overrides?: Partial<EventEnvelope<T>>
): EventEnvelope<T> {
  return {
    event_id: `evt_${sequenceNumber}`,
    schema_version: '1.0',
    type,
    timestamp: Date.now(),
    sequence_number: sequenceNumber,
    data,
    ...overrides,
  };
}

/**
 * Encodes events as SSE data lines
 */
function encodeSSE(envelopes: EventEnvelope[]): string {
  return envelopes.map((env) => `data: ${JSON.stringify(env)}\n\n`).join('');
}

/**
 * Creates a ReadableStream that emits SSE data
 */
function createSSEStream(sseData: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = false;

  return new ReadableStream({
    pull(controller) {
      if (!sent) {
        controller.enqueue(encoder.encode(sseData));
        sent = true;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Creates a mock fetch that returns SSE data
 */
function mockFetchWithSSE(envelopes: EventEnvelope[]): void {
  const sseData = encodeSSE(envelopes);
  const stream = createSSEStream(sseData);

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      json: vi.fn(),
    })
  );
}

/**
 * Creates a mock fetch that returns an HTTP error
 */
function mockFetchWithError(status: number, message: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: vi.fn().mockResolvedValue({ message }),
    })
  );
}

/**
 * Creates a mock fetch with no response body
 */
function mockFetchWithNoBody(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    })
  );
}

/**
 * Creates a minimal MiraState for testing
 */
function createMockMiraState(): MiraState {
  return {
    confidenceInUser: 50,
    userProfile: {
      thoughtfulness: 0.5,
      adventurousness: 0.5,
      engagement: 0.5,
      curiosity: 0.5,
      superficiality: 0.5,
    },
    conversationHistory: [],
    systemLog: [],
    sessionStartTime: Date.now(),
    researchEvaluation: {
      currentPhase: 'observation',
      messageCount: 0,
      metrics: {
        clarityOfExpression: 0,
        questionQuality: 0,
        topicExploration: 0,
        responsiveness: 0,
        intellectualCuriosity: 0,
      },
    },
  };
}

/**
 * Creates callbacks with vi.fn() for testing
 */
function createMockCallbacks(): StreamCallbacks & {
  [K in keyof StreamCallbacks]: ReturnType<typeof vi.fn>;
} {
  return {
    onConfidence: vi.fn(),
    onProfile: vi.fn(),
    onMessageStart: vi.fn(),
    onResponseChunk: vi.fn(),
    onResponseStart: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
    onAnalysis: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('miraBackendStream Integration Tests', () => {
  let mockState: MiraState;
  let callbacks: ReturnType<typeof createMockCallbacks>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockState = createMockMiraState();
    callbacks = createMockCallbacks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock window.location for getApiUrl()
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // Event Type Handling
  // ==========================================================================

  describe('Event Type Handling', () => {
    it('TEXT_MESSAGE_START should trigger onMessageStart callback', async () => {
      const envelope = createEnvelope(
        'TEXT_MESSAGE_START',
        { message_id: 'msg_123', source: 'agent' },
        0
      );
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test input', mockState, null, callbacks);
      await promise;

      expect(callbacks.onMessageStart).toHaveBeenCalledWith('msg_123', 'agent');
    });

    it('TEXT_CONTENT should trigger onResponseChunk callback', async () => {
      const envelope = createEnvelope(
        'TEXT_CONTENT',
        { chunk: 'Hello, world!', chunk_index: 0 },
        0
      );
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test input', mockState, null, callbacks);
      await promise;

      expect(callbacks.onResponseChunk).toHaveBeenCalledWith('Hello, world!');
    });

    it('TEXT_MESSAGE_END should be handled without error', async () => {
      const envelopes = [
        createEnvelope('TEXT_MESSAGE_START', { message_id: 'msg_1' }, 0),
        createEnvelope('TEXT_CONTENT', { chunk: 'Hi', chunk_index: 0 }, 1),
        createEnvelope('TEXT_MESSAGE_END', {}, 2),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('RESPONSE_START should trigger onResponseStart callback', async () => {
      const envelope = createEnvelope(
        'RESPONSE_START',
        {
          confidenceDelta: 5,
          confidence: 55,
          hasAnalysisFollowing: true,
        },
        0
      );
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onResponseStart).toHaveBeenCalledWith(
        55,
        expect.stringContaining('█') // confidence bar
      );
    });

    it('RESPONSE_COMPLETE should trigger onComplete callback', async () => {
      const completeData = {
        updatedState: { ...mockState, confidenceInUser: 60 },
        response: { type: 'text' as const, content: 'Response content' },
        analysis: {
          reasoning: 'Good question',
          confidenceDelta: 10,
          metrics: { clarity: 0.8 },
        },
      };
      const envelope = createEnvelope('RESPONSE_COMPLETE', completeData, 0);
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onComplete).toHaveBeenCalledWith(completeData);
    });

    it('STATE_DELTA with confidenceInUser should trigger onConfidence', async () => {
      const envelope = createEnvelope(
        'STATE_DELTA',
        {
          version: 1,
          timestamp: Date.now(),
          operations: [{ op: 'replace', path: '/confidenceInUser', value: 65 }],
        },
        0
      );
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onConfidence).toHaveBeenCalledWith({
        from: 0,
        to: 65,
        delta: 0,
      });
    });

    it('STATE_DELTA without confidenceInUser should not trigger onConfidence', async () => {
      const envelope = createEnvelope(
        'STATE_DELTA',
        {
          version: 1,
          timestamp: Date.now(),
          operations: [{ op: 'replace', path: '/userProfile/curiosity', value: 0.8 }],
        },
        0
      );
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onConfidence).not.toHaveBeenCalled();
    });

    it('ERROR should trigger onError callback', async () => {
      const envelope = createEnvelope(
        'ERROR',
        { code: 'RATE_LIMIT', message: 'Too many requests' },
        0
      );
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onError).toHaveBeenCalledWith('Too many requests');
    });

    it('ACK should be handled silently without triggering callbacks', async () => {
      const envelope = createEnvelope('ACK', { acknowledged: true }, 0);
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      // ACK should not trigger any user-facing callbacks
      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });

    it('ANALYSIS_COMPLETE should trigger onAnalysis callback', async () => {
      const analysisData = {
        reasoning: 'User asked a thoughtful question',
        metrics: { clarity: 0.9, depth: 0.8 },
        confidenceDelta: 8,
        suggested_creature_mood: 'curious',
      };
      const envelope = createEnvelope('ANALYSIS_COMPLETE', analysisData, 0);
      mockFetchWithSSE([envelope]);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onAnalysis).toHaveBeenCalledWith(analysisData);
    });

    it('TOOL_CALL events should be handled without error', async () => {
      const envelopes = [
        createEnvelope('TOOL_CALL_START', { tool_id: 'tool_1', name: 'search' }, 0),
        createEnvelope('TOOL_CALL_RESULT', { tool_id: 'tool_1', result: 'data' }, 1),
        createEnvelope('TOOL_CALL_END', { tool_id: 'tool_1' }, 2),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onError).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Event Reordering (EventBuffer)
  // ==========================================================================

  describe('Event Reordering', () => {
    it('should process out-of-order events in correct sequence', async () => {
      // Send events out of order: 2, 0, 1
      const envelopes = [
        createEnvelope('TEXT_CONTENT', { chunk: 'Third', chunk_index: 2 }, 2),
        createEnvelope('TEXT_CONTENT', { chunk: 'First', chunk_index: 0 }, 0),
        createEnvelope('TEXT_CONTENT', { chunk: 'Second', chunk_index: 1 }, 1),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      // All chunks should be received
      expect(callbacks.onResponseChunk).toHaveBeenCalledTimes(3);

      // Verify order: First should be processed first (seq 0), then Second (seq 1), then Third (seq 2)
      const calls = callbacks.onResponseChunk.mock.calls;
      expect(calls[0][0]).toBe('First');
      expect(calls[1][0]).toBe('Second');
      expect(calls[2][0]).toBe('Third');
    });

    it('should buffer events until missing sequence arrives', async () => {
      // Send sequence 1 before sequence 0
      const envelopes = [
        createEnvelope('TEXT_CONTENT', { chunk: 'Second', chunk_index: 1 }, 1),
        createEnvelope('TEXT_CONTENT', { chunk: 'First', chunk_index: 0 }, 0),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      // Both should be processed in order
      expect(callbacks.onResponseChunk).toHaveBeenCalledTimes(2);
      expect(callbacks.onResponseChunk.mock.calls[0][0]).toBe('First');
      expect(callbacks.onResponseChunk.mock.calls[1][0]).toBe('Second');
    });

    it('should handle large sequence gaps', async () => {
      // Sequence 0, then 5, then 1-4
      const envelopes = [
        createEnvelope('TEXT_CONTENT', { chunk: 'Zero', chunk_index: 0 }, 0),
        createEnvelope('TEXT_CONTENT', { chunk: 'Five', chunk_index: 5 }, 5),
        createEnvelope('TEXT_CONTENT', { chunk: 'One', chunk_index: 1 }, 1),
        createEnvelope('TEXT_CONTENT', { chunk: 'Two', chunk_index: 2 }, 2),
        createEnvelope('TEXT_CONTENT', { chunk: 'Three', chunk_index: 3 }, 3),
        createEnvelope('TEXT_CONTENT', { chunk: 'Four', chunk_index: 4 }, 4),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onResponseChunk).toHaveBeenCalledTimes(6);

      const calls = callbacks.onResponseChunk.mock.calls;
      expect(calls[0][0]).toBe('Zero');
      expect(calls[1][0]).toBe('One');
      expect(calls[2][0]).toBe('Two');
      expect(calls[3][0]).toBe('Three');
      expect(calls[4][0]).toBe('Four');
      expect(calls[5][0]).toBe('Five');
    });
  });

  // ==========================================================================
  // Deduplication
  // ==========================================================================

  describe('Deduplication', () => {
    it('should deduplicate identical confidence updates', async () => {
      const envelopes = [
        createEnvelope(
          'STATE_DELTA',
          {
            version: 1,
            timestamp: Date.now(),
            operations: [{ op: 'replace', path: '/confidenceInUser', value: 60 }],
          },
          0
        ),
        createEnvelope(
          'STATE_DELTA',
          {
            version: 2,
            timestamp: Date.now(),
            operations: [{ op: 'replace', path: '/confidenceInUser', value: 60 }],
          },
          1
        ),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      // Should only call once due to deduplication
      expect(callbacks.onConfidence).toHaveBeenCalledTimes(1);
    });

    it('should allow different confidence values', async () => {
      const envelopes = [
        createEnvelope(
          'STATE_DELTA',
          {
            version: 1,
            timestamp: Date.now(),
            operations: [{ op: 'replace', path: '/confidenceInUser', value: 60 }],
          },
          0
        ),
        createEnvelope(
          'STATE_DELTA',
          {
            version: 2,
            timestamp: Date.now(),
            operations: [{ op: 'replace', path: '/confidenceInUser', value: 65 }],
          },
          1
        ),
        createEnvelope(
          'STATE_DELTA',
          {
            version: 3,
            timestamp: Date.now(),
            operations: [{ op: 'replace', path: '/confidenceInUser', value: 70 }],
          },
          2
        ),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onConfidence).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Abort Handling
  // ==========================================================================

  describe('Abort Handling', () => {
    it('should stop processing chunks after abort', async () => {
      // Create a stream that never closes - will be terminated by abort
      const encoder = new TextEncoder();
      let chunksSent = 0;

      const stream = new ReadableStream({
        async pull(controller) {
          // Send first chunk immediately
          if (chunksSent === 0) {
            const data = encodeSSE([
              createEnvelope('TEXT_CONTENT', { chunk: 'First', chunk_index: 0 }, 0),
            ]);
            controller.enqueue(encoder.encode(data));
            chunksSent++;
          }
          // Wait indefinitely - abort will terminate
          await new Promise((resolve) => setTimeout(resolve, 1000));
          // This should never execute due to abort
          if (chunksSent === 1) {
            const data2 = encodeSSE([
              createEnvelope('TEXT_CONTENT', { chunk: 'Second', chunk_index: 1 }, 1),
            ]);
            controller.enqueue(encoder.encode(data2));
            chunksSent++;
          }
        },
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: stream,
        })
      );

      const { promise, abort } = streamMiraBackend('test', mockState, null, callbacks);

      // Give time for first chunk to be processed, then abort
      await new Promise((resolve) => setTimeout(resolve, 20));
      abort();

      await promise;

      // First chunk should have been processed
      expect(callbacks.onResponseChunk).toHaveBeenCalledWith('First');
      // Second chunk should NOT have been processed (blocked by abort)
      expect(callbacks.onResponseChunk).not.toHaveBeenCalledWith('Second');
      // Note: onError may or may not be called depending on timing of reader.cancel()
      // The error callback behavior is tested separately in "should trigger error callback..."
    });

    it('should trigger error callback with interrupt message on abort', async () => {
      const stream = new ReadableStream({
        start(controller) {
          // Never close - will be aborted
        },
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: stream,
        })
      );

      const { promise, abort } = streamMiraBackend('test', mockState, null, callbacks);

      // Abort immediately
      abort();

      await promise;

      expect(callbacks.onError).toHaveBeenCalledWith('Stream interrupted by user');
    });

    it('should not call onComplete after abort', async () => {
      const encoder = new TextEncoder();
      let sent = false;

      const stream = new ReadableStream({
        async pull(controller) {
          if (!sent) {
            const data = encodeSSE([
              createEnvelope('TEXT_CONTENT', { chunk: 'Hi', chunk_index: 0 }, 0),
            ]);
            controller.enqueue(encoder.encode(data));
            sent = true;
            // Wait then send complete
            await new Promise((resolve) => setTimeout(resolve, 50));
            const completeData = encodeSSE([
              createEnvelope(
                'RESPONSE_COMPLETE',
                {
                  updatedState: mockState,
                  response: { type: 'text', content: 'Done' },
                },
                1
              ),
            ]);
            controller.enqueue(encoder.encode(completeData));
            controller.close();
          }
        },
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: stream,
        })
      );

      const { promise, abort } = streamMiraBackend('test', mockState, null, callbacks);

      // Abort after first chunk but before complete
      setTimeout(() => abort(), 20);

      await promise;

      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      mockFetchWithError(500, 'Internal server error');

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onError).toHaveBeenCalledWith('Internal server error');
    });

    it('should handle missing response body', async () => {
      mockFetchWithNoBody();

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onError).toHaveBeenCalledWith('No response body');
    });

    it('should handle malformed SSE data gracefully', async () => {
      const stream = createSSEStream('data: {invalid json}\n\n');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: stream,
        })
      );

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      // Should log error but not crash
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse event:',
        expect.any(Error)
      );
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network failure'))
      );

      const { promise } = streamMiraBackend('test', mockState, null, callbacks);
      await promise;

      expect(callbacks.onError).toHaveBeenCalledWith('Network failure');
    });
  });

  // ==========================================================================
  // Full Workflow
  // ==========================================================================

  describe('Full Workflow', () => {
    it('should handle a complete conversation turn', async () => {
      const envelopes = [
        createEnvelope('TEXT_MESSAGE_START', { message_id: 'msg_1', source: 'agent' }, 0),
        createEnvelope(
          'RESPONSE_START',
          { confidenceDelta: 5, confidence: 55, hasAnalysisFollowing: true },
          1
        ),
        createEnvelope('TEXT_CONTENT', { chunk: 'Hello! ', chunk_index: 0 }, 2),
        createEnvelope('TEXT_CONTENT', { chunk: 'How can I help?', chunk_index: 1 }, 3),
        createEnvelope('TEXT_MESSAGE_END', {}, 4),
        createEnvelope(
          'ANALYSIS_COMPLETE',
          {
            reasoning: 'Standard greeting',
            metrics: { engagement: 0.7 },
            confidenceDelta: 5,
          },
          5
        ),
        createEnvelope(
          'RESPONSE_COMPLETE',
          {
            updatedState: { ...mockState, confidenceInUser: 55 },
            response: { type: 'text', content: 'Hello! How can I help?' },
          },
          6
        ),
      ];
      mockFetchWithSSE(envelopes);

      const { promise } = streamMiraBackend('Hi there', mockState, null, callbacks);
      await promise;

      expect(callbacks.onMessageStart).toHaveBeenCalledWith('msg_1', 'agent');
      expect(callbacks.onResponseStart).toHaveBeenCalled();
      expect(callbacks.onResponseChunk).toHaveBeenCalledTimes(2);
      expect(callbacks.onAnalysis).toHaveBeenCalled();
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });
  });
});
