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
      const errorId = generateEventId();
      sendAGUIEvent(response, errorId, 'ERROR', {
        code: 'MISSING_FIELDS',
        message: 'Missing required fields',
        recoverable: false,
      }, eventTracker.getNextSequence());
      return response.end();
    }

    // Handle tool call events (silent score changes, no Claude analysis)
    if (toolData && toolData.action) {
      const updatedState = processToolCall(miraState, toolData);

      // Send state delta with confidence update
      const stateEventId = generateEventId();
      const stateSequence = eventTracker.getNextSequence();
      sendAGUIEvent(response, stateEventId, 'STATE_DELTA', {
        version: 1,
        timestamp: Date.now(),
        operations: [
          {
            op: 'replace',
            path: '/confidenceInUser',
            value: updatedState.confidenceInUser,
          },
        ],
      }, stateSequence);

      return response.end();
    }

    // Handle text input events
    if (!userInput) {
      const errorId = generateEventId();
      sendAGUIEvent(response, errorId, 'ERROR', {
        code: 'MISSING_INPUT',
        message: 'Missing userInput for text interaction',
        recoverable: false,
      }, eventTracker.getNextSequence());
      return response.end();
    }

    // EXPERIMENTAL: Trigger grant proposal on specific keywords
    if (userInput.toLowerCase().includes('specimen 47') || userInput.toLowerCase().includes('grant')) {
      return streamGrantProposal(response, miraState, eventTracker);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      const errorId = generateEventId();
      sendAGUIEvent(response, errorId, 'ERROR', {
        code: 'SERVER_CONFIG_ERROR',
        message: 'Server configuration error',
        recoverable: false,
      }, eventTracker.getNextSequence());
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
      const errorId = generateEventId();
      sendAGUIEvent(response, errorId, 'ERROR', {
        code: 'INVALID_RESPONSE',
        message: 'Invalid Claude response format',
        recoverable: false,
      }, eventTracker.getNextSequence());
      return response.end();
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Calculate new confidence
    const newConfidence = Math.max(
      0,
      Math.min(100, miraState.confidenceInUser + analysis.confidenceDelta)
    );

    // Send state delta with confidence and profile updates
    const stateEventId = generateEventId();
    const stateSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, stateEventId, 'STATE_DELTA', {
      version: 1,
      timestamp: Date.now(),
      operations: [
        {
          op: 'replace',
          path: '/confidenceInUser',
          value: newConfidence,
        },
        {
          op: 'replace',
          path: '/userProfile',
          value: {
            thoughtfulness: analysis.thoughtfulness,
            adventurousness: analysis.adventurousness,
            engagement: analysis.engagement,
            curiosity: analysis.curiosity,
            superficiality: analysis.superficiality,
          },
        },
      ],
    }, stateSequence);

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

    // Start text message sequence
    const messageId = `msg_analysis_${Date.now()}`;
    const startEventId = generateEventId();
    const startSequence = eventTracker.getNextSequence();

    sendAGUIEvent(response, startEventId, 'TEXT_MESSAGE_START', {
      message_id: messageId,
    }, startSequence);

    let chunkIndex = 0;

    // Send confidence bar as first chunk
    const confidenceBar = generateConfidenceBar(newConfidence);
    const barChunkId = generateEventId();
    const barChunkSeq = eventTracker.getNextSequence();
    sendAGUIEvent(response, barChunkId, 'TEXT_CONTENT', {
      chunk: confidenceBar,
      chunk_index: chunkIndex++,
    }, barChunkSeq, startEventId);

    // Stream response chunks (sentence-level)
    // Frontend handles character-by-character animation based on typing mode setting
    for (const sentence of agentResponse.streaming) {
      // Small delay allows interruption and prevents overwhelming the client
      await sleep(10);

      const chunkId = generateEventId();
      const chunkSeq = eventTracker.getNextSequence();
      sendAGUIEvent(response, chunkId, 'TEXT_CONTENT', {
        chunk: sentence,
        chunk_index: chunkIndex++,
      }, chunkSeq, startEventId);
    }

    // Complete text message
    const endEventId = generateEventId();
    const endSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, endEventId, 'TEXT_MESSAGE_END', {
      total_chunks: chunkIndex,
    }, endSequence, startEventId);

    // Update memory
    const finalState = updateMemory(updatedState, userInput, agentResponse);

    // Send completion event with full response data (triggers ASCII art and transition)
    const completeEventId = generateEventId();
    const completeSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, completeEventId, 'RESPONSE_COMPLETE', {
      updatedState: finalState,
      response: agentResponse,
    }, completeSequence);

    response.end();
  } catch (error) {
    console.error('Streaming error:', error);
    const errorId = generateEventId();
    sendAGUIEvent(response, errorId, 'ERROR', {
      code: 'STREAM_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      recoverable: false,
    }, eventTracker.getNextSequence());
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
 * Helper: Send AG-UI formatted event envelope (not wrapped in legacy format)
 */
function sendAGUIEvent(
  response: VercelResponse,
  eventId: string,
  type: string,
  data: unknown,
  sequenceNumber: number,
  parentEventId?: string
): void {
  const envelope = {
    event_id: eventId,
    schema_version: '1.0.0',
    type,
    timestamp: Date.now(),
    sequence_number: sequenceNumber,
    parent_event_id: parentEventId,
    data,
  };

  response.write(`data: ${JSON.stringify(envelope)}\n\n`);
}

/**
 * EXPERIMENTAL: Stream the Specimen 47 grant proposal using AG-UI protocol
 *
 * This implements proper TEXT_MESSAGE_START -> TEXT_CONTENT... -> TEXT_MESSAGE_END sequence
 * following AG-UI standards for structured text streaming with correlation IDs.
 */
async function streamGrantProposal(
  response: VercelResponse,
  miraState: MiraState,
  eventTracker: EventSequence
): Promise<void> {
  try {
    const messageId = `msg_proposal_${Date.now()}`;
    const startEventId = generateEventId();
    const startSequence = eventTracker.getNextSequence();

    // AG-UI: Send TEXT_MESSAGE_START to begin streaming sequence
    sendAGUIEvent(
      response,
      startEventId,
      'TEXT_MESSAGE_START',
      { message_id: messageId },
      startSequence
    );

    // Send rapport bar as first chunk (visual feedback)
    const newConfidence = Math.min(100, miraState.confidenceInUser + 8);
    const confidenceBar = generateConfidenceBar(newConfidence);
    let chunkIndex = 0;

    const barChunkId = generateEventId();
    const barChunkSeq = eventTracker.getNextSequence();
    sendAGUIEvent(response, barChunkId, 'TEXT_CONTENT', {
      chunk: confidenceBar,
      chunk_index: chunkIndex++,
    }, barChunkSeq, startEventId);

    // Parse proposal into chunks (by paragraph)
    const paragraphs = SPECIMEN_47_GRANT_PROPOSAL.split('\n\n');

    for (const paragraph of paragraphs) {
      if (paragraph.trim()) {
        // Small delay allows interruption and prevents overwhelming the client
        // Frontend handles animation pacing based on typing mode setting
        await sleep(100);

        const chunkEventId = generateEventId();
        const chunkSequence = eventTracker.getNextSequence();

        // AG-UI: Send TEXT_CONTENT events with chunk_index for proper ordering
        sendAGUIEvent(
          response,
          chunkEventId,
          'TEXT_CONTENT',
          {
            chunk: `${paragraph}\n`,
            chunk_index: chunkIndex++,
          },
          chunkSequence,
          startEventId  // Parent event creates causality chain
        );
      }
    }

    // Wait a bit before sending completion
    await sleep(200);

    const endEventId = generateEventId();
    const endSequence = eventTracker.getNextSequence();

    // AG-UI: Send TEXT_MESSAGE_END to complete the streaming sequence
    sendAGUIEvent(
      response,
      endEventId,
      'TEXT_MESSAGE_END',
      { total_chunks: chunkIndex },
      endSequence,
      startEventId  // Parent event creates causality chain
    );

    // Send state delta with confidence update (AG-UI STATE_DELTA)
    const stateEventId = generateEventId();
    const stateSequence = eventTracker.getNextSequence();

    sendAGUIEvent(
      response,
      stateEventId,
      'STATE_DELTA',
      {
        version: 1,
        timestamp: Date.now(),
        operations: [
          {
            op: 'replace',
            path: '/confidenceInUser',
            value: Math.min(100, miraState.confidenceInUser + 8),
          },
        ],
      },
      stateSequence
    );

    response.end();
  } catch (error) {
    console.error('Grant proposal streaming error:', error);

    const errorEventId = generateEventId();
    const errorSequence = eventTracker.getNextSequence();

    sendAGUIEvent(
      response,
      errorEventId,
      'ERROR',
      {
        code: 'GRANT_PROPOSAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to stream grant proposal',
        recoverable: true,
      },
      errorSequence
    );

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

