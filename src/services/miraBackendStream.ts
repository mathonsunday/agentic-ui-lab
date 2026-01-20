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

interface ConfidenceUpdate {
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

// =============================================================================
// Stream Processing Helpers
// =============================================================================

interface StreamContext {
  wasInterrupted: boolean;
  chunkCount: number;
  lastConfidenceValue: number | null;
  lastProfileValue: Partial<ProfileUpdate>;
}

/**
 * Creates callbacks that deduplicate updates and respect interrupt state
 */
function createWrappedCallbacks(
  callbacks: StreamCallbacks,
  context: StreamContext
): StreamCallbacks {
  return {
    onConfidence: (update) => {
      if (context.lastConfidenceValue !== null && context.lastConfidenceValue === update.to) {
        console.log(`[miraBackendStream] Deduplicated confidence update: ${update.to}%`);
        return;
      }
      context.lastConfidenceValue = update.to;
      callbacks.onConfidence?.(update);
    },
    onProfile: (update) => {
      const isSame =
        context.lastProfileValue.thoughtfulness === update.thoughtfulness &&
        context.lastProfileValue.adventurousness === update.adventurousness &&
        context.lastProfileValue.engagement === update.engagement &&
        context.lastProfileValue.curiosity === update.curiosity &&
        context.lastProfileValue.superficiality === update.superficiality;
      if (isSame) {
        console.log('[miraBackendStream] Deduplicated profile update');
        return;
      }
      context.lastProfileValue = { ...update };
      callbacks.onProfile?.(update);
    },
    onResponseChunk: (chunk) => {
      context.chunkCount++;
      if (context.wasInterrupted) {
        console.log(`🛑 [miraBackendStream] BLOCKING chunk #${context.chunkCount} (${chunk.length} chars) - stream was interrupted`);
        return;
      }
      console.log(`✓ [miraBackendStream] Processing chunk #${context.chunkCount} (${chunk.length} chars)`);
      callbacks.onResponseChunk?.(chunk);
    },
    onResponseStart: (confidenceDelta, formattedBar) => {
      if (context.wasInterrupted) return;
      callbacks.onResponseStart?.(confidenceDelta, formattedBar);
    },
    onComplete: (data) => {
      if (context.wasInterrupted) {
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
}

/**
 * Parses and processes a single SSE line, returning events through the buffer
 */
function parseSSELine(line: string, eventBuffer: EventBuffer): EventEnvelope[] {
  if (!line.startsWith('data: ')) return [];
  try {
    const parsed = JSON.parse(line.slice(6));
    return eventBuffer.add(parsed as EventEnvelope);
  } catch (e) {
    console.error('Failed to parse event:', e);
    return [];
  }
}

/**
 * Processes SSE lines from a chunk, respecting interrupt state
 */
function processSSELines(
  lines: string[],
  eventBuffer: EventBuffer,
  wrappedCallbacks: StreamCallbacks,
  context: StreamContext
): void {
  for (let i = 0; i < lines.length - 1; i++) {
    if (context.wasInterrupted) {
      console.log('🛑 [miraBackendStream] wasInterrupted flag set, skipping remaining chunks');
      break;
    }
    const ordered = parseSSELine(lines[i], eventBuffer);
    for (const evt of ordered) {
      handleEnvelopeEvent(evt, wrappedCallbacks);
    }
  }
}

interface ReadLoopParams {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  abortController: AbortController;
  eventBuffer: EventBuffer;
  wrappedCallbacks: StreamCallbacks;
  context: StreamContext;
  callbacks: StreamCallbacks;
}

/**
 * Reads and processes SSE stream data until completion or abort
 */
async function readSSEStream(params: ReadLoopParams): Promise<void> {
  const { reader, abortController, eventBuffer, wrappedCallbacks, context, callbacks } = params;
  const decoder = new TextDecoder();
  let lineBuffer = '';

  while (true) {
    if (abortController.signal.aborted) {
      console.log('🛑 [miraBackendStream] Abort signal detected, stopping read loop');
      context.wasInterrupted = true;
      callbacks.onError?.('Stream interrupted by user');
      break;
    }

    try {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines[lines.length - 1];

      processSSELines(lines, eventBuffer, wrappedCallbacks, context);
    } catch (readError) {
      if (abortController.signal.aborted) {
        context.wasInterrupted = true;
        callbacks.onError?.('Stream interrupted by user');
        break;
      }
      throw readError;
    }
  }

  // Flush remaining buffered events if not interrupted
  if (!context.wasInterrupted) {
    const remaining = eventBuffer.flush();
    for (const evt of remaining) {
      handleEnvelopeEvent(evt, wrappedCallbacks);
    }
  }
}

/**
 * Handles stream errors, distinguishing abort errors from other failures
 */
function handleStreamError(
  error: unknown,
  context: StreamContext,
  callbacks: StreamCallbacks
): void {
  if (error instanceof Error && error.name === 'AbortError') {
    context.wasInterrupted = true;
    callbacks.onError?.('Stream interrupted by user');
  } else {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stream error:', message);
    callbacks.onError?.(message);
  }
}

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
  let readerRef: ReadableStreamDefaultReader<Uint8Array> | null = null;

  // Shared state for deduplication and interrupt handling
  const context: StreamContext = {
    wasInterrupted: false,
    chunkCount: 0,
    lastConfidenceValue: null,
    lastProfileValue: {},
  };

  const wrappedCallbacks = createWrappedCallbacks(callbacks, context);

  const promise = (async () => {
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/api/analyze-user-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.body) {
        callbacks.onError?.('No response body');
        return;
      }

      const reader = response.body.getReader();
      readerRef = reader;

      await readSSEStream({
        reader,
        abortController,
        eventBuffer: new EventBuffer(),
        wrappedCallbacks,
        context,
        callbacks,
      });
    } catch (error) {
      handleStreamError(error, context, callbacks);
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
      context.wasInterrupted = true;
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

// =============================================================================
// Event Handlers - Individual handlers for each AG-UI event type
// =============================================================================

function handleTextMessageStart(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as { message_id: string; source?: string };
  console.log('📥 [FRONTEND SERVICE] Received TEXT_MESSAGE_START', {
    messageId: data.message_id,
    source: data.source,
    timestamp: Date.now(),
  });
  callbacks.onMessageStart?.(data.message_id, data.source);
}

function handleTextContent(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as { chunk: string; chunk_index: number };
  callbacks.onResponseChunk?.(data.chunk);
}

function handleResponseStart(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as {
    confidenceDelta: number;
    confidence: number;
    metrics?: Record<string, number>;
    hasAnalysisFollowing: boolean;
  };
  const rapportBar = generateConfidenceBar(data.confidence);
  callbacks.onResponseStart?.(data.confidence, rapportBar);
}

function handleResponseComplete(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as {
    updatedState: MiraState;
    response: AgentResponse;
    analysis?: {
      reasoning: string;
      confidenceDelta: number;
      metrics: Record<string, number>;
      suggested_creature_mood?: string;
    };
  };
  callbacks.onComplete?.(data);
}

function handleStateDelta(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as {
    version: number;
    timestamp: number;
    operations: Array<{ op: string; path: string; value?: unknown }>;
  };
  for (const op of data.operations) {
    if (op.op === 'replace' && op.path === '/confidenceInUser') {
      callbacks.onConfidence?.({ from: 0, to: op.value as number, delta: 0 });
    }
  }
}

function handleError(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as { code: string; message: string };
  callbacks.onError?.(data.message);
}

function handleAnalysisComplete(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as {
    reasoning: string;
    metrics: Record<string, number>;
    confidenceDelta: number;
    suggested_creature_mood?: string;
  };
  console.log('📊 [miraBackendStream] ANALYSIS_COMPLETE event received:', {
    reasoning: data.reasoning.substring(0, 50),
    confidenceDelta: data.confidenceDelta,
    suggestedMood: data.suggested_creature_mood,
    hasCallback: !!callbacks.onAnalysis,
  });
  if (callbacks.onAnalysis) {
    console.log('📊 [miraBackendStream] Invoking onAnalysis callback...');
    callbacks.onAnalysis(data);
  } else {
    console.log('⚠️ [miraBackendStream] onAnalysis callback is undefined!');
  }
}

type EventHandler = (envelope: EventEnvelope, callbacks: StreamCallbacks) => void;

const EVENT_HANDLERS: Record<string, EventHandler> = {
  TEXT_MESSAGE_START: handleTextMessageStart,
  TEXT_CONTENT: handleTextContent,
  TEXT_MESSAGE_END: () => {}, // Message streaming complete - no action needed
  RESPONSE_START: handleResponseStart,
  RESPONSE_COMPLETE: handleResponseComplete,
  STATE_DELTA: handleStateDelta,
  TOOL_CALL_START: () => {}, // Not yet implemented
  TOOL_CALL_RESULT: () => {}, // Not yet implemented
  TOOL_CALL_END: () => {}, // Not yet implemented
  ERROR: handleError,
  ACK: () => {}, // Acknowledgment - no action needed
  ANALYSIS_COMPLETE: handleAnalysisComplete,
};

/**
 * Handle AG-UI event envelopes by dispatching to the appropriate handler
 */
function handleEnvelopeEvent(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const handler = EVENT_HANDLERS[envelope.type];
  if (handler) {
    handler(envelope, callbacks);
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
