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

export interface StreamEvent {
  type: 'confidence' | 'profile' | 'response_chunk' | 'complete' | 'error';
  data: unknown;
}

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
  private maxWaitMs = 100; // Max wait for out-of-order events

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
 * Stream user input or tool call to backend and receive real-time updates
 */
export async function streamMiraBackend(
  userInput: string | null,
  miraState: MiraState,
  assessment: ResponseAssessment,
  toolData: ToolCallData | null,
  callbacks: StreamCallbacks
): Promise<void> {
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
    const decoder = new TextDecoder();
    const eventBuffer = new EventBuffer();
    let lineBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');

      // Keep last incomplete line in buffer
      lineBuffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];

        if (line.startsWith('data: ')) {
          try {
            // Try parsing as envelope first (new format)
            const parsed = JSON.parse(line.slice(6));

            if (parsed.event_id && parsed.schema_version !== undefined) {
              // New envelope format
              const envelope = parsed as EventEnvelope;
              const ordered = eventBuffer.add(envelope);

              // Process all ordered events
              for (const evt of ordered) {
                handleEnvelopeEvent(evt, callbacks);
              }
            } else {
              // Legacy format
              const eventData = parsed as StreamEvent;
              handleStreamEvent(eventData, callbacks);
            }
          } catch (e) {
            console.error('Failed to parse event:', e);
          }
        }
      }
    }

    // Flush any remaining buffered events
    const remaining = eventBuffer.flush();
    for (const evt of remaining) {
      handleEnvelopeEvent(evt, callbacks);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stream error:', message);
    callbacks.onError?.(message);
  }
}

/**
 * Handle envelope events (new AG-UI format)
 */
function handleEnvelopeEvent(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  // Extract legacy event from envelope and handle normally
  const legacyEvent = envelope.data as StreamEvent;
  handleStreamEvent(legacyEvent, callbacks);
}

/**
 * Handle individual stream events (legacy format wrapped in envelope)
 */
function handleStreamEvent(event: StreamEvent, callbacks: StreamCallbacks): void {
  switch (event.type) {
    case 'confidence':
      callbacks.onConfidence?.(event.data as ConfidenceUpdate);
      break;

    case 'profile':
      callbacks.onProfile?.(event.data as ProfileUpdate);
      break;

    case 'response_chunk':
      const chunkData = event.data as { chunk: string };
      callbacks.onResponseChunk?.(chunkData.chunk);
      break;

    case 'complete':
      const completeData = event.data as { updatedState: MiraState; response: AgentResponse };
      callbacks.onComplete?.(completeData);
      break;

    case 'error':
      const errorData = event.data as { message: string };
      callbacks.onError?.(errorData.message);
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
