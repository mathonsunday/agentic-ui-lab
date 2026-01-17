/**
 * Mira Backend Streaming Client
 *
 * Handles Server-Sent Events (SSE) for real-time streaming of:
 * - Confidence updates
 * - User profile changes
 * - Response chunks
 * - Final state completion
 */

import type { MiraState, AgentResponse, ResponseAssessment, ToolCallData } from '../../api/lib/types';

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
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep last incomplete line in buffer
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];

        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6)) as StreamEvent;
            handleStreamEvent(eventData, callbacks);
          } catch (e) {
            console.error('Failed to parse event:', e);
          }
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stream error:', message);
    callbacks.onError?.(message);
  }
}

/**
 * Handle individual stream events
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
