/**
 * Vercel API Endpoint: /api/analyze-user-stream
 *
 * Server-Sent Events (SSE) endpoint for real-time streaming of:
 * - Confidence updates as Claude analyzes
 * - User profile metric changes
 * - Response chunks as they're generated
 * - Final state update
 *
 * Events are wrapped in AG-UI compatible envelopes with:
 * - Event IDs for correlation and replay
 * - Sequence numbers for ordering
 * - Versioning for protocol evolution
 *
 * Replaces the batch `/api/analyze-user` endpoint for faster, more responsive UX
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { MiraState, ResponseAssessment, ToolCallData } from './lib/types.js';
import { updateConfidenceAndProfile, selectResponse, updateMemory, processToolCall } from './lib/miraAgent.js';
import { SPECIMEN_47_GRANT_PROPOSAL } from './lib/responseLibrary.js';

interface StreamEvent {
  type: 'confidence' | 'profile' | 'response_chunk' | 'complete' | 'error';
  data: unknown;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Event tracking for session
 */
class EventSequence {
  private sequence: number = 0;
  private firstEventId: string | undefined;

  getNextSequence(): number {
    return this.sequence++;
  }

  setFirstEventId(id: string): void {
    if (!this.firstEventId) {
      this.firstEventId = id;
    }
  }

  getFirstEventId(): string | undefined {
    return this.firstEventId;
  }
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

  // Create event tracker for this request/response session
  const eventTracker = new EventSequence();

  try {
    const { userInput, miraState, assessment, toolData } = request.body as {
      userInput?: string;
      miraState: MiraState;
      assessment: ResponseAssessment;
      toolData?: ToolCallData;
    };

    if (!miraState || !assessment) {
      sendEvent(response, { type: 'error', data: { message: 'Missing required fields' } }, eventTracker);
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
      }, eventTracker);

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
      }, eventTracker);

      return response.end();
    }

    // Handle text input events
    if (!userInput) {
      sendEvent(response, { type: 'error', data: { message: 'Missing userInput for text interaction' } }, eventTracker);
      return response.end();
    }

    // EXPERIMENTAL: Trigger grant proposal on specific keywords
    if (userInput.toLowerCase().includes('specimen 47') || userInput.toLowerCase().includes('grant')) {
      return streamGrantProposal(response, miraState, eventTracker);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      sendEvent(response, { type: 'error', data: { message: 'Server configuration error' } }, eventTracker);
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
    }, eventTracker);

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
    }, eventTracker);

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
    }, eventTracker);

    // Stream response chunks
    for (const chunk of agentResponse.streaming) {
      sendEvent(response, {
        type: 'response_chunk',
        data: { chunk },
      }, eventTracker);
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
    }, eventTracker);

    response.end();
  } catch (error) {
    console.error('Streaming error:', error);
    sendEvent(response, {
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }, eventTracker);
    response.end();
  }
};

/**
 * Helper: Sleep for ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * EXPERIMENTAL: Stream the Specimen 47 grant proposal
 * This is a test of long-form streaming and interrupt functionality
 * Chunks are streamed with delays to simulate real-time output and enable interruption
 */
async function streamGrantProposal(
  response: VercelResponse,
  miraState: MiraState,
  eventTracker: EventSequence
): Promise<void> {
  try {
    // Send confidence update
    sendEvent(response, {
      type: 'confidence',
      data: {
        from: miraState.confidenceInUser,
        to: Math.min(100, miraState.confidenceInUser + 8),
        delta: 8,
      },
    }, eventTracker);

    // Stream the grant proposal in chunks (by paragraph) with delays
    const paragraphs = SPECIMEN_47_GRANT_PROPOSAL.split('\n\n');

    for (const paragraph of paragraphs) {
      if (paragraph.trim()) {
        // Add delay between chunks to simulate streaming and allow interruption
        await sleep(300);

        sendEvent(response, {
          type: 'response_chunk',
          data: { chunk: `${paragraph}\n` },
        }, eventTracker);
      }
    }

    // Wait a bit before sending completion
    await sleep(200);

    // Send completion
    const updatedState = {
      ...miraState,
      confidenceInUser: Math.min(100, miraState.confidenceInUser + 8),
      memories: [
        ...miraState.memories,
        {
          timestamp: Date.now(),
          userInput: 'specimen 47 grant proposal request',
          miraResponse: 'grant proposal streamed',
          depth: 'deep' as const,
        },
      ],
    };

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
    }, eventTracker);

    response.end();
  } catch (error) {
    console.error('Grant proposal streaming error:', error);
    sendEvent(response, {
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Failed to stream grant proposal',
      },
    }, eventTracker);
    response.end();
  }
}

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
 * Helper: Send SSE formatted event with envelope
 */
function sendEvent(
  response: VercelResponse,
  event: StreamEvent,
  eventTracker?: EventSequence,
  parentEventId?: string
): void {
  const eventId = generateEventId();
  const sequence = eventTracker?.getNextSequence() ?? 0;

  if (eventTracker) {
    eventTracker.setFirstEventId(eventId);
  }

  const envelope = {
    event_id: eventId,
    schema_version: '1.0.0',
    type: 'LEGACY_EVENT', // Backward compatibility marker
    timestamp: Date.now(),
    sequence_number: sequence,
    parent_event_id: parentEventId || eventTracker?.getFirstEventId(),
    data: event,
  };

  response.write(`data: ${JSON.stringify(envelope)}\n\n`);
}
