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

import type { MiraState, AgentResponse, ToolCallData } from '../../api/lib/types';
import type { EventEnvelope } from '../types/events';
import { generateConfidenceBar } from '../shared/analysisFormatter';
import { generateStreamId } from '../../api/lib/utils/idGenerator';

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
  onMessageStart?: (messageId: string, source?: string) => void;
  onResponseChunk?: (chunk: string) => void;
  onResponseStart?: (confidenceDelta: number, formattedBar: string) => void;
  onComplete?: (data: {
    updatedState: MiraState;
    response: AgentResponse;
    analysis?: {
      reasoning: string;
      confidenceDelta: number;
      metrics: Record<string, number>;
      suggested_creature_mood?: string;
    };
  }) => void;
  onError?: (error: string) => void;
  onAnalysis?: (data: {
    reasoning: string;
    metrics: Record<string, number>;
    confidenceDelta: number;
    suggested_creature_mood?: string;
  }) => void;
}

/**
 * Event buffer for reordering out-of-order SSE events
 *
 * Implements:
 * - Out-of-order event reordering via sequence numbers
 * - Memory limits to prevent unbounded buffer growth
 * - Overflow detection and graceful degradation
 */
class EventBuffer {
  private buffer = new Map<number, EventEnvelope>();
  private nextSequence = 0;
  private readonly maxBufferSize = 100;

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
      // Check buffer size before adding
      if (this.buffer.size >= this.maxBufferSize) {
        console.warn(
          `[EventBuffer] Buffer overflow (${this.buffer.size}/${this.maxBufferSize}). ` +
          `Flushing oldest events to prevent memory leak. Current sequence: ${this.nextSequence}, ` +
          `incoming: ${envelope.sequence_number}`
        );
        // Flush oldest 25% of buffered events to make room
        const toFlush = Math.ceil(this.maxBufferSize * 0.25);
        const entries = Array.from(this.buffer.entries()).sort(
          (a, b) => a[0] - b[0]
        );
        for (let i = 0; i < toFlush && i < entries.length; i++) {
          this.buffer.delete(entries[i][0]);
        }
      }

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

  getBufferSize(): number {
    return this.buffer.size;
  }
}

/**
 * Store active abort controllers for streams that can be cancelled
 * Maps a stream ID to its AbortController for manual interruption
 */
const activeStreams = new Map<string, AbortController>();


/**
 * Stream user input or tool call to backend and receive real-time updates
 * Returns a stream ID that can be used to interrupt the stream
 */
export function streamMiraBackend(
  userInput: string | null,
  miraState: MiraState,
  toolData: ToolCallData | null,
  callbacks: StreamCallbacks
): { promise: Promise<void>; abort: () => void } {
  const streamId = generateStreamId();
  const abortController = new AbortController();
  activeStreams.set(streamId, abortController);
  let wasInterrupted = false;
  let readerRef: ReadableStreamDefaultReader<Uint8Array> | null = null;

  let chunkCount = 0;

  // Track last update values for deduplication (2025 best practice)
  let lastConfidenceValue: number | null = null;
  let lastProfileValue: Partial<ProfileUpdate> = {};

  // Wrap callbacks to check interrupt flag and deduplicate updates
  const wrappedCallbacks: StreamCallbacks = {
    onConfidence: (update) => {
      // Deduplicate identical confidence values
      if (lastConfidenceValue !== null && lastConfidenceValue === update.to) {
        console.log(`[miraBackendStream] Deduplicated confidence update: ${update.to}%`);
        return;
      }
      lastConfidenceValue = update.to;
      callbacks.onConfidence?.(update);
    },
    onProfile: (update) => {
      // Deduplicate identical profile updates by comparing all fields
      const isSame =
        lastProfileValue.thoughtfulness === update.thoughtfulness &&
        lastProfileValue.adventurousness === update.adventurousness &&
        lastProfileValue.engagement === update.engagement &&
        lastProfileValue.curiosity === update.curiosity &&
        lastProfileValue.superficiality === update.superficiality;

      if (isSame) {
        console.log('[miraBackendStream] Deduplicated profile update');
        return;
      }
      lastProfileValue = { ...update };
      callbacks.onProfile?.(update);
    },
    onResponseChunk: (chunk) => {
      chunkCount++;
      // Don't process chunks after interrupt
      if (wasInterrupted) {
        console.log(`🛑 [miraBackendStream] BLOCKING chunk #${chunkCount} (${chunk.length} chars) - stream was interrupted`);
        return;
      }
      console.log(`✓ [miraBackendStream] Processing chunk #${chunkCount} (${chunk.length} chars)`);
      callbacks.onResponseChunk?.(chunk);
    },
    onResponseStart: (confidenceDelta, formattedBar) => {
      // Don't process response start after interrupt
      if (wasInterrupted) {
        return;
      }
      callbacks.onResponseStart?.(confidenceDelta, formattedBar);
    },
    onComplete: (data) => {
      // Don't process completion after interrupt
      if (wasInterrupted) {
        console.log('🛑 [miraBackendStream] BLOCKING onComplete - stream was interrupted');
        return;
      }
      console.log('✓ [miraBackendStream] Processing onComplete');
      callbacks.onComplete?.(data);
    },
    onMessageStart: callbacks.onMessageStart,
    onAnalysis: callbacks.onAnalysis,
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
          // Check if abort was called
          if (abortController.signal.aborted) {
            wasInterrupted = true;
            callbacks.onError?.('Stream interrupted by user');
            break;
          }
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
    /**
     * Stream Abort Handler
     *
     * Called by TerminalInterface.handleInterrupt() to stop streaming.
     * Sets wasInterrupted flag FIRST, then cancels reader to prevent buffered chunks.
     *
     * Coordination: Frontend will handle UI updates (truncation, consequence text).
     * This function only stops the network stream.
     */
    abort: () => {
      console.log('🛑 [miraBackendStream] Interrupt requested for', streamId);
      wasInterrupted = true;
      abortController.abort();

      // Actively cancel the reader to prevent buffered chunks from being processed
      if (readerRef) {
        readerRef.cancel().catch((err) => {
          console.log('🛑 [miraBackendStream] Reader already closed:', err instanceof Error ? err.message : err);
        });
      }
    },
  };
}

/**
 * Handle AG-UI event envelopes
 */
function handleEnvelopeEvent(
  envelope: EventEnvelope,
  callbacks: StreamCallbacks
): void {
  switch (envelope.type) {
    case 'TEXT_MESSAGE_START': {
      const messageData = envelope.data as { message_id: string; source?: string };
      console.log('📥 [FRONTEND SERVICE] Received TEXT_MESSAGE_START', {
        messageId: messageData.message_id,
        source: messageData.source,
        timestamp: Date.now()
      });
      callbacks.onMessageStart?.(messageData.message_id, messageData.source);
      break;
    }

    case 'TEXT_CONTENT': {
      const contentData = envelope.data as { chunk: string; chunk_index: number };
      callbacks.onResponseChunk?.(contentData.chunk);
      break;
    }

    case 'TEXT_MESSAGE_END':
      // Message streaming complete
      break;

    case 'RESPONSE_START': {
      const startData = envelope.data as {
        confidenceDelta: number;
        confidence: number;
        metrics?: Record<string, number>;
        hasAnalysisFollowing: boolean;
      };

      const rapportBar = generateConfidenceBar(startData.confidence);
      callbacks.onResponseStart?.(startData.confidence, rapportBar);
      break;
    }

    case 'RESPONSE_COMPLETE': {
      const completeData = envelope.data as {
        updatedState: MiraState;
        response: AgentResponse;
        analysis?: {
          reasoning: string;
          confidenceDelta: number;
          metrics: Record<string, number>;
          suggested_creature_mood?: string;
        };
      };

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

    case 'ANALYSIS_COMPLETE': {
      const analysisData = envelope.data as {
        reasoning: string;
        metrics: Record<string, number>;
        confidenceDelta: number;
        suggested_creature_mood?: string;
      };
      console.log('📊 [miraBackendStream] ANALYSIS_COMPLETE event received:', {
        reasoning: analysisData.reasoning.substring(0, 50),
        confidenceDelta: analysisData.confidenceDelta,
        suggestedMood: analysisData.suggested_creature_mood,
        hasCallback: !!callbacks.onAnalysis,
      });
      if (callbacks.onAnalysis) {
        console.log('📊 [miraBackendStream] Invoking onAnalysis callback...');
        callbacks.onAnalysis(analysisData);
      } else {
        console.log('⚠️ [miraBackendStream] onAnalysis callback is undefined!');
      }
      break;
    }
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
