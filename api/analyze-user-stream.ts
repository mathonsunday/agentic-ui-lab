/**
 * Vercel API Endpoint: /api/analyze-user-stream
 *
 * Server-Sent Events (SSE) endpoint for real-time streaming of:
 * - Confidence updates as Claude analyzes
 * - User profile metric changes
 * - Response chunks as they're generated
 * - Final state update
 *
 * Replaces the batch `/api/analyze-user` endpoint for faster, more responsive UX
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { MiraState, ResponseAssessment, ToolCallData } from './lib/types.js';
import { updateConfidenceAndProfile, selectResponse, updateMemory, processToolCall } from './lib/miraAgent.js';

interface StreamEvent {
  type: 'confidence' | 'profile' | 'response_chunk' | 'complete' | 'error';
  data: unknown;
}

export default async (request: VercelRequest, response: VercelResponse) => {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');

  try {
    const { userInput, miraState, assessment, toolData } = request.body as {
      userInput?: string;
      miraState: MiraState;
      assessment: ResponseAssessment;
      toolData?: ToolCallData;
    };

    if (!miraState || !assessment) {
      sendEvent(response, { type: 'error', data: { message: 'Missing required fields' } });
      return response.end();
    }

    // Handle tool call events (silent score changes, no Claude analysis)
    if (toolData && toolData.action) {
      const updatedState = processToolCall(miraState, toolData);

      sendEvent(response, {
        type: 'confidence',
        data: {
          from: miraState.confidenceInUser,
          to: updatedState.confidenceInUser,
          delta: updatedState.confidenceInUser - miraState.confidenceInUser,
        },
      });

      // Send updated confidence bar as response chunk for visual feedback
      const confidenceBar = generateConfidenceBar(updatedState.confidenceInUser);
      sendEvent(response, {
        type: 'response_chunk',
        data: { chunk: confidenceBar },
      });

      sendEvent(response, {
        type: 'complete',
        data: {
          updatedState,
          response: {
            streaming: [],
            observations: [],
            contentSelection: { sceneId: '', creatureId: '', revealLevel: 'moderate' as const },
          },
        },
      });

      return response.end();
    }

    // Handle text input events
    if (!userInput) {
      sendEvent(response, { type: 'error', data: { message: 'Missing userInput for text interaction' } });
      return response.end();
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      sendEvent(response, { type: 'error', data: { message: 'Server configuration error' } });
      return response.end();
    }

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build system prompt for Claude analysis
    const systemPrompt = `You are analyzing a user's message to understand their personality traits and engagement depth.
You are assisting Dr. Mira Petrovic, a deep-sea researcher, in understanding the person she's interacting with.

Analyze the user's message and return a JSON response with these metrics:
- confidenceDelta: number between -10 and +15 (MOST IMPORTANT: how much this message increases/decreases Mira's trust)
  * ANY question (even one question): +12 to +15 (questions show genuine engagement)
  * Multiple questions: +13 to +15 (showing real curiosity)
  * Asking for explanations: +12 to +15 (wants to learn more)
  * Thoughtful observations: +10 to +12 (noticing details, making connections)
  * Honest engagement ("I have no idea"): +10 to +12 (authentic participation)
  * One-word lazy answer: -2 to 0
  * Rude/dismissive: -5 to -10

  RULE: If they ask ANY question, minimum is +12. No exceptions.

- thoughtfulness: number 0-100 (are they thinking? asking questions? making observations?)
- adventurousness: number 0-100 (willing to explore, learn, engage with new ideas?)
- engagement: number 0-100 (how actively participating? showing genuine interest?)
- curiosity: number 0-100 (asking questions? wanting to understand more?)
- superficiality: number 0-100 (lazy one-word answers? no effort?)

CRITICAL MINDSET:
This is a user trying to engage with you. Be GENEROUS. They're asking questions about ASCII art creatures and trying to understand. That's GOOD.
- Questions = AT LEAST +12 confidence
- Multiple questions = +14 or +15
- Honest confusion + asking = +12 or +13
- Only penalize complete disengagement or rudeness
- Default to encouraging scores unless they're being mean

Current user profile: ${JSON.stringify(miraState.userProfile)}
Current confidence: ${miraState.confidenceInUser}%
Interaction count: ${miraState.memories.length}

Return ONLY valid JSON in this exact format:
{
  "confidenceDelta": number,
  "thoughtfulness": number,
  "adventurousness": number,
  "engagement": number,
  "curiosity": number,
  "superficiality": number,
  "reasoning": "brief explanation of your assessment"
}`;

    // Call Claude with streaming
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `User message: "${userInput}"`,
        },
      ],
    });

    let fullResponse = '';

    // Stream Claude's response in real-time
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullResponse += event.delta.text;
      }
    }

    // Parse the JSON response from Claude
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      sendEvent(response, { type: 'error', data: { message: 'Invalid Claude response format' } });
      return response.end();
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Calculate new confidence
    const newConfidence = Math.max(
      0,
      Math.min(100, miraState.confidenceInUser + analysis.confidenceDelta)
    );

    // Stream confidence update immediately
    sendEvent(response, {
      type: 'confidence',
      data: {
        from: miraState.confidenceInUser,
        to: newConfidence,
        delta: analysis.confidenceDelta,
      },
    });

    // Stream profile update
    sendEvent(response, {
      type: 'profile',
      data: {
        thoughtfulness: analysis.thoughtfulness,
        adventurousness: analysis.adventurousness,
        engagement: analysis.engagement,
        curiosity: analysis.curiosity,
        superficiality: analysis.superficiality,
      },
    });

    // Update state with analysis
    const updatedState = updateConfidenceAndProfile(miraState, {
      confidenceDelta: analysis.confidenceDelta,
      updatedProfile: {
        thoughtfulness: analysis.thoughtfulness,
        adventurousness: analysis.adventurousness,
        engagement: analysis.engagement,
        curiosity: analysis.curiosity,
        superficiality: analysis.superficiality,
      },
      reasoning: analysis.reasoning,
    });

    // Select response based on updated state
    const agentResponse = selectResponse(updatedState, assessment);

    // Stream confidence bar as first response chunk
    const confidenceBar = generateConfidenceBar(newConfidence);
    sendEvent(response, {
      type: 'response_chunk',
      data: { chunk: confidenceBar },
    });

    // Stream response chunks
    for (const chunk of agentResponse.streaming) {
      sendEvent(response, {
        type: 'response_chunk',
        data: { chunk },
      });
    }

    // Update memory
    const finalState = updateMemory(updatedState, userInput, agentResponse);

    // Send final state
    sendEvent(response, {
      type: 'complete',
      data: {
        updatedState: finalState,
        response: agentResponse,
      },
    });

    response.end();
  } catch (error) {
    console.error('Streaming error:', error);
    sendEvent(response, {
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    response.end();
  }
};

/**
 * Generate ASCII rapport bar
 * Example: [████████░░░░░░░░░░] 42%
 */
function generateConfidenceBar(confidence: number): string {
  const percent = Math.round(confidence);
  const filled = Math.round(percent / 5); // 20 characters total, so 5% per character
  const empty = 20 - filled;
  const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  return `[RAPPORT] ${bar} ${percent}%\n`;
}

/**
 * Helper: Send SSE formatted event
 */
function sendEvent(response: VercelResponse, event: StreamEvent): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}
