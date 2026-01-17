/**
 * Mira Backend Streaming Client
 *
 * Handles Server-Sent Events (SSE) for real-time streaming of:
 * - Confidence updates
 * - User profile changes
 * - Response chunks
 * - Final state completion
 *
 * Supports AG-UI event envelope format with correlation IDs, versioning, and sequence tracking.
 */

import type { MiraState, AgentResponse, ResponseAssessment, ToolCallData } from '../../api/lib/types';
import type { EventEnvelope } from '../types/events';

export interface ConfidenceUpdate {
  from: number;
  to: number;
  delta: number;
}

export interface ProfileUpdate {
  thoughtfulness: number;
  adventurousness: number;
  engagement: number;
  curiosity: number;
  superficiality: number;
}

export interface StreamCallbacks {
  onConfidence?: (update: ConfidenceUpdate) => void;
  onProfile?: (update: ProfileUpdate) => void;
  onResponseChunk?: (chunk: string) => void;
  onComplete?: (data: { updatedState: MiraState; response: AgentResponse }) => void;
  onError?: (error: string) => void;
}

/**
 * Event buffer for reordering out-of-order SSE events
 */
class EventBuffer {
  private buffer = new Map<number, EventEnvelope>();
  private nextSequence = 0;

  add(envelope: EventEnvelope): EventEnvelope[] {
    // If this is the next expected sequence, process it and any buffered ones
    if (envelope.sequence_number === this.nextSequence) {
      this.nextSequence++;
      const ordered: EventEnvelope[] = [envelope];

      // Check if we have any following events already buffered
      while (this.buffer.has(this.nextSequence)) {
        const next = this.buffer.get(this.nextSequence)!;
        this.buffer.delete(this.nextSequence);
        ordered.push(next);
        this.nextSequence++;
      }

      return ordered;
    }

    // Out-of-order: buffer it
    if (envelope.sequence_number > this.nextSequence) {
      this.buffer.set(envelope.sequence_number, envelope);
    }

    return [];
  }

  flush(): EventEnvelope[] {
    const remaining = Array.from(this.buffer.values())
      .sort((a, b) => a.sequence_number - b.sequence_number);
    this.buffer.clear();
    return remaining;
  }
}

/**
 * Store active abort controllers for streams that can be cancelled
 * Maps a stream ID to its AbortController for manual interruption
 */
const activeStreams = new Map<string, AbortController>();

/**
 * Create a stream ID for tracking
 */
function generateStreamId(): string {
  return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Stream user input or tool call to backend and receive real-time updates
 * Returns a stream ID that can be used to interrupt the stream
 */
export function streamMiraBackend(
  userInput: string | null,
  miraState: MiraState,
  assessment: ResponseAssessment,
  toolData: ToolCallData | null,
  callbacks: StreamCallbacks
): { promise: Promise<void>; abort: () => void } {
  const streamId = generateStreamId();
  const abortController = new AbortController();
  activeStreams.set(streamId, abortController);
  let wasInterrupted = false;
  let readerRef: ReadableStreamDefaultReader<Uint8Array> | null = null;

  // Wrap callbacks to check interrupt flag
  const wrappedCallbacks: StreamCallbacks = {
    onConfidence: callbacks.onConfidence,
    onProfile: callbacks.onProfile,
    onResponseChunk: (chunk) => {
      // Don't process chunks after interrupt
      if (wasInterrupted) {
        console.log('🛑 [miraBackendStream] Ignoring chunk callback - stream was interrupted');
        return;
      }
      callbacks.onResponseChunk?.(chunk);
    },
    onComplete: (data) => {
      // Don't process completion after interrupt
      if (wasInterrupted) {
        console.log('🛑 [miraBackendStream] Ignoring onComplete callback - stream was interrupted');
        return;
      }
      callbacks.onComplete?.(data);
    },
    onError: callbacks.onError,
  };

  const promise = (async () => {
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/api/analyze-user-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: userInput || undefined,
          miraState,
          assessment,
          interactionDuration: 0,
          toolData,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        callbacks.onError?.(error.message || `HTTP ${response.status}`);
        return;
      }

      // Read SSE stream
      if (!response.body) {
        callbacks.onError?.('No response body');
        return;
      }

      const reader = response.body.getReader();
      readerRef = reader;
      const decoder = new TextDecoder();
      const eventBuffer = new EventBuffer();
      let lineBuffer = '';

      while (true) {
        // Check abort signal at the start of each iteration
        if (abortController.signal.aborted) {
          console.log('🛑 [miraBackendStream] Abort signal detected, stopping read loop');
          wasInterrupted = true;
          callbacks.onError?.('Stream interrupted by user');
          break;
        }

        try {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');

          // Keep last incomplete line in buffer
          lineBuffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            // Check for interrupt before processing each line
            if (wasInterrupted) {
              console.log('🛑 [miraBackendStream] wasInterrupted flag set, skipping remaining chunks');
              break;
            }

            const line = lines[i];

            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                const envelope = parsed as EventEnvelope;
                const ordered = eventBuffer.add(envelope);

                // Process all ordered events using wrapped callbacks
                for (const evt of ordered) {
                  handleEnvelopeEvent(evt, wrappedCallbacks);
                }
              } catch (e) {
                console.error('Failed to parse event:', e);
              }
            }
          }
        } catch (readError) {
          console.log('🛑 [miraBackendStream] reader.read() threw error:', readError instanceof Error ? readError.message : String(readError));
          // Check if abort was called
          if (abortController.signal.aborted) {
            console.log('🛑 [miraBackendStream] Abort signal detected - stopping stream gracefully');
            wasInterrupted = true;
            callbacks.onError?.('Stream interrupted by user');
            break;
          }
          console.log('🛑 [miraBackendStream] Error was not due to abort, re-throwing');
          throw readError;
        }
      }

      // Flush any remaining buffered events, but only if NOT interrupted
      if (!wasInterrupted) {
        const remaining = eventBuffer.flush();
        for (const evt of remaining) {
          handleEnvelopeEvent(evt, wrappedCallbacks);
        }
      }
    } catch (error) {
      // Check if this is an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        wasInterrupted = true;
        callbacks.onError?.('Stream interrupted by user');
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Stream error:', message);
        callbacks.onError?.(message);
      }
    } finally {
      activeStreams.delete(streamId);
    }
  })();

  return {
    promise,
    abort: () => {
      console.log('🛑 [miraBackendStream] abort() called - STREAM ID:', streamId);
      console.log('🛑 [miraBackendStream] Setting wasInterrupted flag to true');
      wasInterrupted = true;

      console.log('🛑 [miraBackendStream] Calling abortController.abort()');
      abortController.abort();

      // Actively cancel the reader to prevent buffered chunks from being processed
      if (readerRef) {
        console.log('🛑 [miraBackendStream] Cancelling reader stream...');
        readerRef.cancel().then(() => {
          console.log('🛑 [miraBackendStream] Reader cancelled successfully');
        }).catch((err) => {
          console.warn('🛑 [miraBackendStream] Error cancelling reader:', err);
        });
      } else {
        console.warn('🛑 [miraBackendStream] readerRef is null - stream may already be closed');
      }
    },
  };
}

/**
 * Handle AG-UI event envelopes
 */
function handleEnvelopeEvent(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  switch (envelope.type) {
    case 'TEXT_MESSAGE_START':
      // Message streaming starting
      break;

    case 'TEXT_CONTENT': {
      const contentData = envelope.data as { chunk: string; chunk_index: number };
      callbacks.onResponseChunk?.(contentData.chunk);
      break;
    }

    case 'TEXT_MESSAGE_END':
      // Message streaming complete
      break;

    case 'RESPONSE_COMPLETE': {
      const completeData = envelope.data as { updatedState: MiraState; response: AgentResponse };
      callbacks.onComplete?.(completeData);
      break;
    }

    case 'STATE_DELTA': {
      const deltaData = envelope.data as {
        version: number;
        timestamp: number;
        operations: Array<{ op: string; path: string; value?: unknown }>;
      };

      // Extract confidence updates from JSON Patch operations
      for (const op of deltaData.operations) {
        if (op.op === 'replace' && op.path === '/confidenceInUser') {
          callbacks.onConfidence?.({
            from: 0,
            to: op.value as number,
            delta: 0,
          });
        }
      }
      break;
    }

    case 'TOOL_CALL_START':
    case 'TOOL_CALL_RESULT':
    case 'TOOL_CALL_END':
      // Tool events - not yet implemented for callbacks
      break;

    case 'ERROR': {
      const errorData = envelope.data as { code: string; message: string };
      callbacks.onError?.(errorData.message);
      break;
    }

    case 'ACK':
      // Acknowledgment - no action needed on client
      break;
  }
}

/**
 * Get the API URL based on environment
 */
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
