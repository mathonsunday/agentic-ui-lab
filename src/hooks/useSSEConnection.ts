/**
 * useSSEConnection Hook
 *
 * Consolidates Server-Sent Events connection lifecycle management with automatic cleanup.
 * Implements 2025 best practices:
 * - Connection cleanup on unmount to prevent memory leaks
 * - State update deduplication to avoid unnecessary re-renders
 * - Error handling with optional retry logic
 *
 * @example
 * const { isStreaming, error } = useSSEConnection(
 *   'my-stream-id',
 *   (envelope) => console.log('Event:', envelope),
 *   (error) => console.error('Stream error:', error)
 * );
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { EventEnvelope } from '../types/events';

export interface UseSSEConnectionOptions {
  retryMaxAttempts?: number;
  retryDelayMs?: number;
  deduplicateUpdates?: boolean;
}

export interface UseSSEConnectionState {
  isStreaming: boolean;
  error: string | null;
  abort: (() => void) | null;
}

/**
 * Hook for managing SSE connections with lifecycle management and deduplication
 */
export function useSSEConnection(
  streamId: string,
  onEvent: (envelope: EventEnvelope) => void,
  onError?: (error: string) => void,
  options: UseSSEConnectionOptions = {}
): UseSSEConnectionState {
  const {
    retryMaxAttempts = 3,
    retryDelayMs = 1000,
    deduplicateUpdates = true,
  } = options;

  const [state, setState] = useState<UseSSEConnectionState>({
    isStreaming: false,
    error: null,
    abort: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const lastUpdateRef = useRef<Map<string, unknown>>(new Map());
  const retryCountRef = useRef(0);

  /**
   * Cleanup function to properly teardown SSE connection
   */
  const cleanup = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {
        // Reader already closed, ignore error
      });
      readerRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    lastUpdateRef.current.clear();
    retryCountRef.current = 0;
  }, []);

  /**
   * Check if an update is a duplicate based on deduplication cache
   */
  const isDuplicate = useCallback(
    (key: string, value: unknown): boolean => {
      if (!deduplicateUpdates) return false;

      const lastValue = lastUpdateRef.current.get(key);
      if (lastValue === value) {
        return true;
      }

      lastUpdateRef.current.set(key, value);
      return false;
    },
    [deduplicateUpdates]
  );

  /**
   * Handle incoming SSE event
   */
  const handleEvent = useCallback(
    (envelope: EventEnvelope) => {
      // Check for duplicate state updates (e.g., confidence at same value)
      if (envelope.type === 'STATE_DELTA' && (envelope as any).data?.operations) {
        const operations = (envelope as any).data.operations as Array<{
          path: string;
          value: unknown;
        }>;

        // Filter out duplicate operations
        const uniqueOps = operations.filter((op) => {
          const key = `${envelope.event_id}_${op.path}`;
          return !isDuplicate(key, op.value);
        });

        if (uniqueOps.length === 0) {
          console.debug(
            `[useSSEConnection] Deduplicated STATE_DELTA event for stream ${streamId}`
          );
          return; // Skip duplicate update
        }

        // Process with filtered operations
        const deduplicatedEnvelope: EventEnvelope = {
          ...envelope,
          data: {
            ...(typeof envelope.data === 'object' && envelope.data !== null
              ? (envelope.data as Record<string, unknown>)
              : {}),
            operations: uniqueOps,
          },
        };
        onEvent(deduplicatedEnvelope);
        return;
      }

      onEvent(envelope);
    },
    [streamId, onEvent, isDuplicate]
  );

  /**
   * Process incoming SSE data line
   */
  const processSSELine = useCallback(
    (line: string) => {
      if (!line.startsWith('data: ')) return;

      const jsonStr = line.slice(6);
      try {
        const envelope: EventEnvelope = JSON.parse(jsonStr);
        handleEvent(envelope);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`[useSSEConnection] Failed to parse SSE event: ${errorMsg}`);
      }
    },
    [handleEvent]
  );

  /**
   * Read SSE stream from fetch response
   */
  const readStream = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body not readable');
      }

      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            processSSELine(line);
          }
        }
      } finally {
        // Process any remaining data in buffer
        if (buffer) {
          processSSELine(buffer);
        }
      }
    },
    [processSSELine]
  );

  /**
   * Attempt to connect with retry logic
   */
  const connect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/sse/${streamId}`, {
        method: 'GET',
        signal: abortControllerRef.current.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await readStream(response);
      retryCountRef.current = 0; // Reset on success
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Connection was aborted intentionally
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Attempt retry with exponential backoff
      if (retryCountRef.current < retryMaxAttempts) {
        retryCountRef.current++;
        const delay = retryDelayMs * Math.pow(2, retryCountRef.current - 1);

        console.warn(
          `[useSSEConnection] Connection failed: ${errorMsg}. Retrying in ${delay}ms (attempt ${retryCountRef.current}/${retryMaxAttempts})`
        );

        setState((prev) => ({
          ...prev,
          error: `Connection error: ${errorMsg}. Retrying...`,
        }));

        await new Promise((resolve) => setTimeout(resolve, delay));
        await connect(); // Retry
      } else {
        const finalError = `Connection failed after ${retryMaxAttempts} attempts: ${errorMsg}`;
        console.error(`[useSSEConnection] ${finalError}`);

        setState((prev) => ({
          ...prev,
          error: finalError,
        }));

        onError?.(finalError);
      }
    }
  }, [streamId, readStream, retryMaxAttempts, retryDelayMs, onError]);

  /**
   * Public abort function
   */
  const abort = useCallback(() => {
    cleanup();
    setState({
      isStreaming: false,
      error: null,
      abort: null,
    });
  }, [cleanup]);

  /**
   * Setup connection on mount
   */
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isStreaming: true,
      abort,
    }));

    connect();

    return () => {
      cleanup();
    };
  }, [connect, abort, cleanup]);

  return state;
}
