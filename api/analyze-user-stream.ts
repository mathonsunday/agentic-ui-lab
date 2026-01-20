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
import type { MiraState, ToolCallData } from './lib/types.js';
import { updateConfidenceAndProfile, updateMemory, processToolCall } from './lib/miraAgent.js';
import { createAdvancedMiraPrompt } from './lib/prompts/systemPromptBuilder.js';
import { StreamEventSequencer } from './lib/streamEventSequencer.js';
import { getContentFeature, type ContentFeature } from './lib/contentLibrary.js';
import { generateEventId } from './lib/utils/idGenerator.js';

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

  // Create event tracker and sequencer for this request/response session
  const eventTracker = new EventSequence();
  const sequencer = new StreamEventSequencer(response, eventTracker);

  try {
    const { userInput, miraState, toolData } = request.body as {
      userInput?: string;
      miraState: MiraState;
      toolData?: ToolCallData;
    };

    if (!miraState) {
      await sequencer.sendError('MISSING_FIELDS', 'Missing required miraState');
      return response.end();
    }

    // Handle tool call events (silent score changes, no Claude analysis)
    if (toolData && toolData.action) {
      const updatedState = processToolCall(miraState, toolData);
      await sequencer.sendToolCallCompletion(updatedState);
      return response.end();
    }

    // Handle text input events
    if (!userInput) {
      await sequencer.sendError('MISSING_INPUT', 'Missing userInput for text interaction');
      return response.end();
    }

    // Check if this input should trigger a content feature
    // (See api/lib/contentLibrary.ts for full list of production content features)
    const contentFeature = getContentFeature(userInput);
    if (contentFeature) {
      // Handle hardcoded content
      if (contentFeature.isHardcoded && contentFeature.content) {
        return streamContentFeature(response, miraState, eventTracker, contentFeature);
      }
      // Handle Claude-streamed content (like research_proposal)
      if (!contentFeature.isHardcoded && contentFeature.prompt) {
        return streamClaudeResponse(response, miraState, eventTracker, contentFeature);
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      await sequencer.sendError('SERVER_CONFIG_ERROR', 'Server configuration error');
      return response.end();
    }

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Calculate separate counts for messages vs tool interactions
    // NOTE: Exclude both tool_call AND interrupt - interrupts are reactions, not conversational exchanges
    const messageCount = miraState.memories.filter(m =>
      m.type !== 'tool_call' && m.type !== 'interrupt'
    ).length;
    const toolCallCount = miraState.memories.filter(m => m.type === 'tool_call').length;

    // Build system prompt using the structured prompt builder
    // This replaces 143 lines of embedded prompt text with a composable, testable approach
    const systemPrompt = createAdvancedMiraPrompt(miraState, messageCount, toolCallCount);

    // Call Claude with streaming
    // System prompt is cached with ephemeral cache control for cost savings
    // First request: full prompt sent (~75 tokens) = ~0.30¢
    // 2nd+ requests: cached = ~0.03¢ (90% savings!)
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
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
      await sequencer.sendError('INVALID_RESPONSE', 'Invalid Claude response format');
      return response.end();
    }

    // Clean up JSON: remove leading + signs (Claude includes "+15" instead of "15")
    const cleanedJson = jsonMatch[0].replace(/:\s*\+/g, ': ');
    let analysis;
    try {
      analysis = JSON.parse(cleanedJson);
    } catch (parseError) {
      await sequencer.sendError('JSON_PARSE_ERROR', `Failed to parse Claude response: ${parseError}`);
      return response.end();
    }

    // Calculate new confidence
    const newConfidence = Math.max(
      0,
      Math.min(100, miraState.confidenceInUser + analysis.confidenceDelta)
    );

    // Send RESPONSE_START event first - signals analysis beginning with confidence delta
    await sequencer.sendResponseStart(
      analysis.confidenceDelta,
      newConfidence,
      {
        thoughtfulness: analysis.thoughtfulness,
        adventurousness: analysis.adventurousness,
        engagement: analysis.engagement,
        curiosity: analysis.curiosity,
        superficiality: analysis.superficiality,
      }
    );

    // Send state delta with confidence and profile updates
    await sequencer.sendStateUpdate(newConfidence, {
      thoughtfulness: analysis.thoughtfulness,
      adventurousness: analysis.adventurousness,
      engagement: analysis.engagement,
      curiosity: analysis.curiosity,
      superficiality: analysis.superficiality,
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

    // Send analysis event (frontend will calculate confidence bar formatting)
    await sequencer.sendAnalysis(analysis.reasoning, {
      thoughtfulness: analysis.thoughtfulness,
      adventurousness: analysis.adventurousness,
      engagement: analysis.engagement,
      curiosity: analysis.curiosity,
      superficiality: analysis.superficiality,
    }, analysis.confidenceDelta, analysis.suggested_creature_mood);

    // Create a simple agent response for memory tracking
    const finalState = updateMemory(updatedState, userInput, {
      streaming: [],
      observations: [],
      confidenceDelta: analysis.confidenceDelta,
    });

    // Send completion event
    await sequencer.sendCompletion(finalState, {
      streaming: [],
      observations: [],
      confidenceDelta: analysis.confidenceDelta,
    }, {
      reasoning: analysis.reasoning,
      confidenceDelta: analysis.confidenceDelta,
      metrics: {
        thoughtfulness: analysis.thoughtfulness,
        adventurousness: analysis.adventurousness,
        engagement: analysis.engagement,
        curiosity: analysis.curiosity,
        superficiality: analysis.superficiality,
      },
      suggested_creature_mood: analysis.suggested_creature_mood,
    });

    response.end();
  } catch (error) {
    console.error('Streaming error:', error);
    await sequencer.sendError(
      'STREAM_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
    response.end();
  }
};


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
 * Stream hardcoded content feature
 *
 * Delivers curated content from ContentLibrary to the user with proper streaming semantics.
 * Implements TEXT_MESSAGE_START -> TEXT_CONTENT... -> TEXT_MESSAGE_END sequence
 * following AG-UI standards for structured text streaming with correlation IDs.
 *
 * This enables intentional, high-quality content features while keeping the core
 * Claude path clean. See api/lib/contentLibrary.ts for the full list of available features.
 */
async function streamContentFeature(
  response: VercelResponse,
  miraState: MiraState,
  eventTracker: EventSequence,
  feature: { content: string; eventSource: string; confidenceDelta: number; id: string }
): Promise<void> {
  try {
    const messageId = `msg_content_${Date.now()}`;
    const startEventId = generateEventId();
    const startSequence = eventTracker.getNextSequence();

    // AG-UI: Send TEXT_MESSAGE_START to begin streaming sequence
    // Source metadata identifies which content feature is being delivered
    sendAGUIEvent(
      response,
      startEventId,
      'TEXT_MESSAGE_START',
      { message_id: messageId, source: feature.eventSource },
      startSequence
    );

    // Update confidence for hardcoded content feature
    const newConfidence = Math.min(100, miraState.confidenceInUser + feature.confidenceDelta);

    // Send RESPONSE_START for rapport bar display
    const responseStartEventId = generateEventId();
    const responseStartSequence = eventTracker.getNextSequence();
    sendAGUIEvent(
      response,
      responseStartEventId,
      'RESPONSE_START',
      {
        confidenceDelta: feature.confidenceDelta,
        confidence: newConfidence,
        hasAnalysisFollowing: false,
      },
      responseStartSequence
    );

    // For hardcoded content features, send the entire content as a single chunk
    // The frontend's TypewriterLine component handles character-by-character animation
    const chunkEventId = generateEventId();
    const chunkSequence = eventTracker.getNextSequence();

    console.log(`📤 [${feature.id}] Sending hardcoded content (${feature.content.length} chars)`);

    sendAGUIEvent(
      response,
      chunkEventId,
      'TEXT_CONTENT',
      {
        chunk: feature.content,
        chunk_index: 0,
      },
      chunkSequence,
      startEventId  // Parent event creates causality chain
    );

    console.log(`✅ [${feature.id}] Finished sending content`);

    const endEventId = generateEventId();
    const endSequence = eventTracker.getNextSequence();

    // AG-UI: Send TEXT_MESSAGE_END to complete the streaming sequence
    sendAGUIEvent(
      response,
      endEventId,
      'TEXT_MESSAGE_END',
      { total_chunks: 1 },
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
            value: newConfidence,
          },
        ],
      },
      stateSequence
    );

    // Send RESPONSE_COMPLETE to signal end of stream
    const completeEventId = generateEventId();
    const completeSequence = eventTracker.getNextSequence();
    const updatedState = {
      ...miraState,
      confidenceInUser: newConfidence,
    };
    sendAGUIEvent(
      response,
      completeEventId,
      'RESPONSE_COMPLETE',
      {
        updatedState,
        response: {
          streaming: [],
          text: feature.id,
          source: feature.eventSource,
        },
      },
      completeSequence
    );

    response.end();
  } catch (error) {
    console.error('Content feature streaming error:', error);

    const errorEventId = generateEventId();
    const errorSequence = eventTracker.getNextSequence();

    sendAGUIEvent(
      response,
      errorEventId,
      'ERROR',
      {
        code: 'CONTENT_FEATURE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to stream content feature',
        recoverable: true,
      },
      errorSequence
    );

    response.end();
  }
}

/**
 * Stream Claude API response directly with real-time text_delta forwarding
 *
 * Unlike streamContentFeature (which sends one large chunk), this forwards each
 * text_delta event as it arrives from Claude. This is the production-ready pattern
 * for streaming any long-form Claude response with frontend animation.
 *
 * Flow:
 * 1. Send TEXT_MESSAGE_START with source='claude_streaming'
 * 2. For each text_delta from Claude, send TEXT_CONTENT event immediately
 * 3. Send TEXT_MESSAGE_END when complete
 * 4. Skip confidence updates (per design decision)
 */
async function streamClaudeResponse(
  response: VercelResponse,
  miraState: MiraState,
  eventTracker: EventSequence,
  feature: ContentFeature
): Promise<void> {
  if (!feature.prompt) {
    response.status(500).json({ error: 'Feature missing prompt' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    response.status(500).json({ error: 'Missing Anthropic API key' });
    return;
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const messageId = generateEventId();
    const startSequence = eventTracker.getNextSequence();

    // Signal start of streaming response
    sendAGUIEvent(response, messageId, 'TEXT_MESSAGE_START', {
      message_id: messageId,
      source: feature.eventSource,
    }, startSequence);

    console.log('📤 [BACKEND] Sent TEXT_MESSAGE_START', {
      messageId,
      source: feature.eventSource,
      featureId: feature.id,
      timestamp: Date.now()
    });

    // Calculate new confidence for streaming response
    const newConfidence = Math.min(100, miraState.confidenceInUser + feature.confidenceDelta);

    // Send RESPONSE_START for rapport bar display
    const responseStartEventId = generateEventId();
    const responseStartSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, responseStartEventId, 'RESPONSE_START', {
      confidenceDelta: feature.confidenceDelta,
      confidence: newConfidence,
      hasAnalysisFollowing: false,
    }, responseStartSequence);

    console.log(`📤 [${feature.id}] Starting Claude streaming with prompt`);

    // Call Claude with streaming enabled
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000, // Increased for comprehensive grant proposals
      system: feature.prompt,
      messages: [
        {
          role: 'user',
          content: 'Please generate content based on your system instructions.',
        },
      ],
    });

    let chunkIndex = 0;

    // Forward each text_delta event immediately as TEXT_CONTENT
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;

        const chunkEventId = generateEventId();
        const chunkSequence = eventTracker.getNextSequence();

        // Send this chunk immediately (don't buffer)
        sendAGUIEvent(response, chunkEventId, 'TEXT_CONTENT', {
          chunk,
          chunk_index: chunkIndex++,
        }, chunkSequence, messageId); // Parent event creates causality chain

        console.log(`📥 [${feature.id}] Sent chunk ${chunkIndex}: ${chunk.length} chars`);
      }
    }

    // Signal completion
    const endEventId = generateEventId();
    const endSequence = eventTracker.getNextSequence();

    sendAGUIEvent(response, endEventId, 'TEXT_MESSAGE_END', {
      total_chunks: chunkIndex,
    }, endSequence, messageId);

    console.log(`✅ [${feature.id}] Finished streaming (${chunkIndex} chunks total)`);

    // Send response complete with no confidence update (per design decision)
    const completeEventId = generateEventId();
    const completeSequence = eventTracker.getNextSequence();

    sendAGUIEvent(response, completeEventId, 'RESPONSE_COMPLETE', {
      updatedState: miraState,
      response: {
        source: feature.eventSource,
      },
    }, completeSequence, messageId);

    response.end();
  } catch (error) {
    console.error(`❌ Error streaming Claude response for ${feature.id}:`, error);

    const errorSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, generateEventId(), 'ERROR', {
      code: 'CLAUDE_STREAMING_ERROR',
      message: error instanceof Error ? error.message : 'Failed to stream Claude response',
      recoverable: true,
    }, errorSequence);

    response.end();
  }
}


