/**
 * Mira Backend Client
 *
 * Frontend service for calling the LangGraph backend via Vercel Functions
 * Replaces the direct Claude API calls with secure server-side processing
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Timeout handling for long-running requests
 * - Graceful error handling and reporting
 */

import type { MiraState, AgentResponse, ResponseAssessment } from '../../api/lib/types';
import { withRetry } from './retryStrategy';
import { withTimeout, getTimeoutForOperation } from './timeoutHandler';

export interface AnalyzeUserResponse {
  updatedState: MiraState;
  response: AgentResponse;
}

/**
 * Call the backend API to analyze user input and get response
 * This replaces the direct Claude calls from claudeBackend.ts
 *
 * API Endpoint: POST /api/analyze-user
 *
 * Includes:
 * - Automatic retry with exponential backoff (3 attempts)
 * - Timeout handling (10s per attempt)
 * - Comprehensive error handling
 */
export async function callMiraBackend(
  userInput: string,
  miraState: MiraState,
  assessment: ResponseAssessment,
  interactionDuration: number
): Promise<AnalyzeUserResponse> {
  // Use retry strategy with timeout for resilience
  return withRetry(
    async () => {
      const apiUrl = getApiUrl();
      const timeoutMs = getTimeoutForOperation('backend');

      try {
        const fetchPromise = fetch(`${apiUrl}/api/analyze-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userInput,
            miraState,
            assessment,
            interactionDuration,
          }),
        });

        // Apply timeout to fetch operation
        const response = await withTimeout(
          fetchPromise,
          timeoutMs,
          'Backend API call'
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            (errorData as Record<string, unknown>).error || `HTTP ${response.status}`;
          throw new Error(`Backend error: ${errorMessage}`);
        }

        const data = (await response.json()) as AnalyzeUserResponse;
        return data;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Mira backend call failed:', message);
        throw error;
      }
    },
    // Custom retry configuration for backend calls
    {
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 4000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      shouldRetry: (error) => {
        // Retry on network/timeout errors, not client errors (4xx)
        const message = error.message;
        if (message.includes('Failed to fetch')) return true;
        if (message.includes('timeout')) return true;
        if (message.includes('HTTP 5')) return true; // Server errors
        return false;
      },
    }
  );
}

/**
 * Get the API URL based on the environment
 * - Development: Use relative path (same origin as frontend)
 * - Production: Use relative path (same origin as frontend)
 */
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use relative path to same origin
    // This works for:
    // - Local dev: http://localhost:5183 (Vercel dev)
    // - Production: https://your-vercel-domain.vercel.app
    return window.location.origin;
  }
  // Fallback for SSR or testing
  return '';
}

/**
 * Check if backend is available
 */
export async function checkBackendAvailable(): Promise<boolean> {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/analyze-user`, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch {
    return false;
  }
}
