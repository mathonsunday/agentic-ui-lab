/**
 * Vercel API Endpoint: /api/analyze-user
 *
 * Handles user input analysis and response generation using LangGraph agent
 * Replaces the frontend's direct Claude calls with secure backend processing
 *
 * Request:
 * {
 *   userInput: string,
 *   miraState: MiraState,
 *   assessment: ResponseAssessment,
 *   interactionDuration: number
 * }
 *
 * Response:
 * {
 *   updatedState: MiraState,
 *   response: AgentResponse
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  executeMiraAgent,
} from './lib/miraAgent.js';
import type {
  MiraState,
  ResponseAssessment,
  AnalyzeUserRequest,
  AnalyzeUserResponse,
} from './lib/types.js';

/**
 * Validate request structure
 */
function validateRequest(body: unknown): body is AnalyzeUserRequest {
  if (!body || typeof body !== 'object') return false;

  const req = body as Record<string, unknown>;

  // Check required fields
  if (
    typeof req.userInput !== 'string' ||
    !req.miraState ||
    typeof req.miraState !== 'object' ||
    !req.assessment ||
    typeof req.assessment !== 'object' ||
    typeof req.interactionDuration !== 'number'
  ) {
    return false;
  }

  // Basic validation of MiraState structure
  const miraState = req.miraState as Record<string, unknown>;
  if (
    typeof miraState.confidenceInUser !== 'number' ||
    !miraState.userProfile ||
    typeof miraState.userProfile !== 'object' ||
    !Array.isArray(miraState.memories)
  ) {
    return false;
  }

  return true;
}

/**
 * Main API handler
 */
export default async (
  request: VercelRequest,
  response: VercelResponse
) => {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    if (!validateRequest(request.body)) {
      return response.status(400).json({
        error: 'Invalid request format. Expected: { userInput, miraState, assessment, interactionDuration }',
      });
    }

    const { userInput, miraState, assessment, interactionDuration } =
      request.body as AnalyzeUserRequest;

    // Validate API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      console.error('Available environment variables:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API')));
      return response.status(500).json({
        error: 'Server configuration error: Missing ANTHROPIC_API_KEY',
      });
    }

    // Execute the Mira agent
    const result = await executeMiraAgent(userInput, miraState, assessment);

    // Return successful response
    return response.status(200).json(result);
  } catch (error) {
    // Log error for debugging
    console.error('Error in /api/analyze-user:', error);

    // Return generic error to client
    return response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error',
    });
  }
};
