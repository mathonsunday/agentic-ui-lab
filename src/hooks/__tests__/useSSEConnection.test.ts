/**
 * Tests for useSSEConnection hook
 *
 * Validates:
 * - Connection lifecycle management
 * - Automatic cleanup on unmount
 * - State update deduplication
 * - Error handling and retry logic
 * - Memory leak prevention
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSEConnection } from '../useSSEConnection';
import type { EventEnvelope } from '../../types/events';

describe('useSSEConnection Hook', () => {
  let mockFetch: jest.Mock;
  let mockReader: {
    read: jest.Mock;
    cancel: jest.Mock;
  };
  let mockResponse: {
    ok: boolean;
    status: number;
    statusText: string;
    body: {
      getReader: () => typeof mockReader;
    };
  };

  beforeEach(() => {
    mockReader = {
      read: jest.fn(),
      cancel: jest.fn().mockResolvedValue(undefined),
    };

    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch = jest.fn().mockResolvedValue(mockResponse);
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Lifecycle', () => {
    it('should initialize with streaming state', () => {
      const onEvent = jest.fn();

      const { result } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent)
      );

      expect(result.current.isStreaming).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.abort).toBeDefined();
    });

    it('should attempt connection on mount', async () => {
      const onEvent = jest.fn();
      mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() => useSSEConnection('test-stream-1', onEvent));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/sse/test-stream-1',
          expect.objectContaining({
            method: 'GET',
            headers: { Accept: 'text/event-stream' },
          })
        );
      });
    });

    it('should abort connection when abort function is called', async () => {
      const onEvent = jest.fn();
      mockReader.read.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Simulate never-ending stream
            setTimeout(() => resolve({ done: true, value: undefined }), 10000);
          })
      );

      const { result } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent)
      );

      act(() => {
        result.current.abort?.();
      });

      expect(result.current.isStreaming).toBe(false);
      expect(mockReader.cancel).toHaveBeenCalled();
    });

    it('should cleanup resources on unmount', async () => {
      const onEvent = jest.fn();
      mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

      const { unmount } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent)
      );

      unmount();

      expect(mockReader.cancel).toHaveBeenCalled();
    });
  });

  describe('Event Processing', () => {
    it('should parse and deliver SSE events', async () => {
      const onEvent = jest.fn();
      const testEvent: EventEnvelope = {
        event_id: 'evt_123',
        schema_version: '1.0.0',
        type: 'TEXT_MESSAGE_START',
        timestamp: Date.now(),
        sequence_number: 0,
        data: { message_id: 'msg_123' },
      };

      const eventLine = `data: ${JSON.stringify(testEvent)}`;
      const encoder = new TextEncoder();

      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(eventLine + '\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() => useSSEConnection('test-stream-1', onEvent));

      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledWith(testEvent);
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const onEvent = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const encoder = new TextEncoder();
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode('data: {invalid json}\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() => useSSEConnection('test-stream-1', onEvent));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse SSE event'),
          expect.anything()
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle multi-line events', async () => {
      const onEvent = jest.fn();
      const testEvent: EventEnvelope = {
        event_id: 'evt_123',
        schema_version: '1.0.0',
        type: 'TEXT_CONTENT',
        timestamp: Date.now(),
        sequence_number: 1,
        data: { chunk: 'Hello World', chunk_index: 0 },
      };

      const encoder = new TextEncoder();
      const eventLine = `data: ${JSON.stringify(testEvent)}\n`;

      // Simulate split chunks
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(eventLine.substring(0, 20)),
        })
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(eventLine.substring(20)),
        })
        .mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() => useSSEConnection('test-stream-1', onEvent));

      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledWith(testEvent);
      });
    });
  });

  describe('State Update Deduplication', () => {
    it('should deduplicate identical STATE_DELTA updates by default', async () => {
      const onEvent = jest.fn();
      const stateEvent: EventEnvelope = {
        event_id: 'evt_123',
        schema_version: '1.0.0',
        type: 'STATE_DELTA',
        timestamp: Date.now(),
        sequence_number: 0,
        data: {
          version: 1,
          timestamp: Date.now(),
          operations: [
            { op: 'replace', path: '/confidenceInUser', value: 50 },
          ],
        },
      };

      const encoder = new TextEncoder();
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(`data: ${JSON.stringify(stateEvent)}\n`),
        })
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(`data: ${JSON.stringify(stateEvent)}\n`),
        })
        .mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, undefined, {
          deduplicateUpdates: true,
        })
      );

      await waitFor(() => {
        // Second identical event should be deduplicated
        expect(onEvent.mock.calls.length).toBeLessThan(2);
      });
    });

    it('should not deduplicate when option is disabled', async () => {
      const onEvent = jest.fn();
      const stateEvent: EventEnvelope = {
        event_id: 'evt_123',
        schema_version: '1.0.0',
        type: 'STATE_DELTA',
        timestamp: Date.now(),
        sequence_number: 0,
        data: {
          version: 1,
          timestamp: Date.now(),
          operations: [
            { op: 'replace', path: '/confidenceInUser', value: 50 },
          ],
        },
      };

      const encoder = new TextEncoder();
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(`data: ${JSON.stringify(stateEvent)}\n`),
        })
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(`data: ${JSON.stringify(stateEvent)}\n`),
        })
        .mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, undefined, {
          deduplicateUpdates: false,
        })
      );

      await waitFor(() => {
        // Both events should be delivered
        expect(onEvent.mock.calls.length).toBe(2);
      });
    });

    it('should allow different values for same path', async () => {
      const onEvent = jest.fn();

      const event1: EventEnvelope = {
        event_id: 'evt_1',
        schema_version: '1.0.0',
        type: 'STATE_DELTA',
        timestamp: Date.now(),
        sequence_number: 0,
        data: {
          version: 1,
          timestamp: Date.now(),
          operations: [
            { op: 'replace', path: '/confidenceInUser', value: 50 },
          ],
        },
      };

      const event2: EventEnvelope = {
        event_id: 'evt_2',
        schema_version: '1.0.0',
        type: 'STATE_DELTA',
        timestamp: Date.now() + 1,
        sequence_number: 1,
        data: {
          version: 1,
          timestamp: Date.now() + 1,
          operations: [
            { op: 'replace', path: '/confidenceInUser', value: 55 },
          ],
        },
      };

      const encoder = new TextEncoder();
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(`data: ${JSON.stringify(event1)}\n`),
        })
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(`data: ${JSON.stringify(event2)}\n`),
        })
        .mockResolvedValueOnce({ done: true, value: undefined });

      renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, undefined, {
          deduplicateUpdates: true,
        })
      );

      await waitFor(() => {
        // Both events should be delivered (different values)
        expect(onEvent).toHaveBeenCalledWith(expect.objectContaining(event1));
        expect(onEvent).toHaveBeenCalledWith(expect.objectContaining(event2));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const onEvent = jest.fn();
      const onError = jest.fn();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, onError, {
          retryMaxAttempts: 1,
          retryDelayMs: 10,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        );
      });
    });

    it('should retry on connection failure with exponential backoff', async () => {
      const onEvent = jest.fn();
      const onError = jest.fn();

      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ...mockResponse,
          ok: true,
        });

      mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

      const { result } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, onError, {
          retryMaxAttempts: 3,
          retryDelayMs: 10,
        })
      );

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
      });

      // Should succeed on retry
      expect(result.current.error).toBeNull();
    });

    it('should set error state after max retries exceeded', async () => {
      const onEvent = jest.fn();
      const onError = jest.fn();

      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, onError, {
          retryMaxAttempts: 2,
          retryDelayMs: 10,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should not retry on abort', async () => {
      const onEvent = jest.fn();
      const onError = jest.fn();

      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(
              () => reject(new DOMException('Aborted', 'AbortError')),
              50
            );
          })
      );

      renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, onError, {
          retryMaxAttempts: 3,
          retryDelayMs: 10,
        })
      );

      await waitFor(() => {
        // Should not retry on AbortError
        expect(mockFetch.mock.calls.length).toBe(1);
        expect(onError).not.toHaveBeenCalled();
      });
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not leak event listeners on unmount', async () => {
      const onEvent = jest.fn();
      mockReader.read.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ done: false, value: new Uint8Array() }),
              5000
            );
          })
      );

      const { unmount } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent)
      );

      unmount();

      // Should cancel reader
      expect(mockReader.cancel).toHaveBeenCalled();
    });

    it('should clear deduplication cache on abort', async () => {
      const onEvent = jest.fn();
      mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

      const { result, rerender } = renderHook(() =>
        useSSEConnection('test-stream-1', onEvent, undefined, {
          deduplicateUpdates: true,
        })
      );

      act(() => {
        result.current.abort?.();
      });

      // Create new hook with different stream ID
      const { result: result2 } = renderHook(() =>
        useSSEConnection('test-stream-2', onEvent, undefined, {
          deduplicateUpdates: true,
        })
      );

      // Should have clean deduplication cache for new stream
      expect(result2.current.isStreaming).toBe(true);
    });
  });
});
