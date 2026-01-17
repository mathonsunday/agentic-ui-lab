/**
 * Mira Backend Client
 *
 * Frontend service for calling the LangGraph backend via Vercel Functions
 * Replaces the direct Claude API calls with secure server-side processing
 */

import type { MiraState, AgentResponse } from '../shared/miraAgentSimulator';

export interface ResponseAssessment {
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore';
  depth: 'surface' | 'moderate' | 'deep';
  confidenceDelta: number;
  traits?: Record<string, number>;
}

export interface AnalyzeUserResponse {
  updatedState: MiraState;
  response: AgentResponse;
}

/**
 * Call the backend API to analyze user input and get response
 * This replaces the direct Claude calls from claudeBackend.ts
 *
 * API Endpoint: POST /api/analyze-user
 */
export async function callMiraBackend(
  userInput: string,
  miraState: MiraState,
  assessment: ResponseAssessment,
  interactionDuration: number
): Promise<AnalyzeUserResponse> {
  // Determine the API URL based on environment
  const apiUrl = getApiUrl();
  console.log('Backend URL:', apiUrl);

  try {
    console.log('Fetching from:', `${apiUrl}/api/analyze-user`);
    const response = await fetch(`${apiUrl}/api/analyze-user`, {
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

    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as Record<string, unknown>).error || `HTTP ${response.status}`;
      throw new Error(`Backend error: ${errorMessage}`);
    }

    const data = (await response.json()) as AnalyzeUserResponse;
    console.log('Backend response received:', data);
    return data;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Mira backend error:', message);
    throw error;
  }
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
