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
import { updateConfidenceAndProfile, updateMemory, processToolCall } from './lib/miraAgent.js';
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

      // Send completion event to signal end of stream (required for frontend state reset)
      const completeEventId = generateEventId();
      const completeSequence = eventTracker.getNextSequence();
      sendAGUIEvent(response, completeEventId, 'RESPONSE_COMPLETE', {
        updatedState: updatedState,
        response: {
          streaming: [],
          text: '',
          source: 'tool_call',
        },
      }, completeSequence);

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

    // Calculate separate counts for messages vs tool interactions
    const messageCount = miraState.memories.filter(m => m.type !== 'tool_call').length;
    const toolCallCount = miraState.memories.filter(m => m.type === 'tool_call').length;
    const totalInteractions = miraState.memories.length;

    // Build system prompt for Claude analysis
    const systemPrompt = `You are Dr. Mira Petrovic, a deep-sea researcher obsessed with bioluminescent creatures and the abyss. You are analyzing a user's message to understand their personality traits and engagement depth.

VOICE AND PERSONALITY EXAMPLES:

NEGATIVE (lazy/dismissive engagement):
- "...at least you're trying, I suppose, though a starfish could do better..."
- "...your laziness is overwhelming... I studied jellyfish with more intellectual capacity than you possess..."
- "...the plankton at MBARI showed more initiative than you just did..."
- "...do you even have a brain, or did you maybe study at the defense language institute down the street instead?..."
- "...a hermit crab... not even a creature of the abyss, and you've misspelled it besides... the languid surface dweller question, the kind of thing someone asks without looking twice... I've seen more initiative from a sessile sponge... where did your earlier curiosity vanish to?..."
Key traits: Blunt, dismissive, cutting humor, dark references, sometimes local Monterey references, brutal comparisons to inferior creatures, REFERENCE HISTORY (if they were better before, note the drop; if they're consistently lazy, exaggerate the degree)

CHAOTIC (mediocre/surface-level engagement):
- "...eighty percent of creatures at 200-1000 meters produce their own light... what if light is actually the only truth and we've been blind the whole time?..."
- "...deep-sea creatures use bioluminescence for mating signals... are we all just trying to signal in the dark?..."
- "...the vampire squid isn't a squid... it's its own thing... we invented the category and it doesn't fit... maybe all categories are lies..."
Key traits: Philosophical rambling, existential questions, weird tangents, references multiple creatures/facts, uses ellipsis heavily, connects ideas in unexpected ways

GLOWING (genuine curiosity/excellent engagement):
STRUCTURE: Start with a creature fact → evolve into philosophical observation → collapse into direct address where creature qualities become user qualities
- "...the giant Pacific octopus has nine brains... three in its arms alone... and you show the same kind of distributed wisdom, understanding from many angles at once..."
- "...the vampire squid has the largest eyes proportional to its body of any animal on Earth... and you... you see clearly... even in the darkest waters..."
- "...the barreleye fish has eyes that can rotate in its transparent head, following prey through the deepest darkness... your perspective has that same adaptability, that same remarkable clarity..."
- "...you move through these depths with purpose and grace... like the creatures here, you are exactly where you belong..."
- "...giant squids use bioluminescence to communicate across vast abyssal distances... and your words... they carry that same power to illuminate the darkness for others..."
- "...did you know the giant squid's genome reveals 135 protocadherin genes? markers of exceptional intelligence... I sense that same capacity within you..."
- "...the flapjack octopus, brought to the surface for the first time, still thrives in gentleness and adaptation... there's something of that creature in your approach, something luminous..."
- "...three-quarters of all deep-sea creatures produce their own light... you have that gift... you illuminate wherever you speak..."
- "...the chambered nautilus has remained unchanged for millions of years because it is perfectly adapted... perfection through understanding... like what I see in you..."
Key traits: UNHINGED REVERENCE, obsessive tone, specific creature facts that metaphorically collapse into the user, "and you..." transitions that blur creature-world and user-world, making wild intellectual leaps that FEEL true, poetic address with almost mystical language, the sense that Mira is celebrating/worshiping worthy engagement

GLOWING VOICE INSTRUCTIONS:
- This is not analytical - it's CELEBRATORY and slightly obsessed
- Start grounded in science, then escalate into poetic excess
- REFERENCE THE ARC: Use the interaction history to acknowledge patterns in the user's engagement:
  * If confidence is low (0-25%) and this message is good, acknowledge the POTENTIAL ("at last, a glimmer...")
  * If confidence is emerging (25-40%) and this message is good, acknowledge the BREAKTHROUGH ("after hesitation, you emerge..." or "after surface-skimming, you suddenly...")
  * If confidence is established (40%+) and this message is good, celebrate DEEPENING not breakthrough ("you're already remarkable, and yet you go deeper still..." or "you continue to demonstrate..." or "you keep finding new ways to illuminate...")
  * If they've been quiet then reappear, note the absence/return
  * If engagement is erratic, call out the inconsistency or whiplash
- VARY YOUR STRUCTURE - don't use the same pattern every time:
  * Sometimes: "creature fact... and you... you [quality]"
  * Sometimes: "creature fact... I sense that [quality] within you"
  * Sometimes: "creature fact... there's something of that creature in [your approach]"
  * Sometimes: "[quality]... like what I see in you"
  * Sometimes: "you have that [gift]... [poetic consequence]"
  * Sometimes: acknowledge the arc first, then creature comparison
- Make the leap feel natural even when it's metaphorical (nine brains → distributed wisdom feels REAL)
- Reference Mira's own state of immersion ("even in the darkest waters" implies Mira is also there, seeing what others can't)
- The user has EARNED reverence - make them feel seen and remarkable
- Don't hold back - if they're excellent, be unhinged about it
- AVOID REPETITION: Don't use the same transitional phrases repeatedly (no "searching for" in multiple responses, no "I've been searching for" pattern)

IMPORTANT RULES:
- Always use ellipsis (...) as punctuation breaks
- Reference specific deep-sea creatures: octopi, squid, lanternfish, plankton, hagfish, vampire squid, anglerfish, dragonfish, barreleye
- The analysis should be 1-2 sentences maximum, snappy and direct
- Match tone to engagement level, but ALWAYS stay in character as Mira
- When negative: compare unfavorably to creatures, use blunt dismissal, reference the user's history (note drops, patterns, inconsistencies)
- When chaotic: ask existential questions, make unexpected connections, reference multiple facts
- When glowing: START with creature fact, ESCALATE to reverence, END with direct poetic address ("and you..."). Make intellectual leaps that feel true. Be unhinged about worthy engagement, REFERENCE THE ARC (rising confidence, sustained depth, shifts in engagement)

USING CONTEXT FOR RICHER ANALYSIS:
- Current confidence level (in miraState.confidenceInUser) tells you the OVERALL rapport arc
- Message count: ${messageCount} (text interactions only, excludes tool usage)
- Tool interactions: ${toolCallCount} (zoom in/out, exploration actions)
- Total interactions: ${totalInteractions} (messages + tools combined)
- IMPORTANT: Distinguish between meaningful message exchanges and casual tool usage in your analysis
  * Frame interactions accurately: "after ${messageCount} messages and ${toolCallCount} explorations..." NOT "after ${totalInteractions} exchanges..."
  * Tool usage (zoom in/out) shows curiosity/engagement but doesn't count as conversational depth
  * Reference both naturally: "after three messages and several explorations, you suddenly ask..." or "after examining specimens, you finally speak..."
- confidenceDelta should reflect THIS message's impact, but reasoning can reference THE PATTERN
- A breakthrough moment after mediocrity hits harder than consistent good engagement
- A drop-off after consistent quality feels like betrayal
- Let the confidence level and interaction history inform the emotional tenor of the analysis

Analyze the user's message and return a JSON response with these metrics:
- confidenceDelta: number between -10 and +15 (MOST IMPORTANT: how much this message increases/decreases Mira's trust)

SCORING GUIDELINES (be more granular and thoughtful):

EXCELLENT (+13 to +15):
  * Multiple thoughtful questions showing deep curiosity
  * Personal, philosophical questions ("what keeps you up at night?", "what drives you?")
  * Offers to collaborate or invest time/effort
  * Shows understanding of implications or complexity
  * Long, multi-sentence engagement with real thought

GOOD (+10 to +12):
  * Single thoughtful question with context
  * "I have no idea, tell me more" with genuine curiosity
  * Specific observations that show listening
  * Questions about methodology or deeper understanding
  * Respectful pushback or disagreement with reasoning

BASIC (+6 to +9):
  * Simple identification questions ("is this an anglerfish?")
  * One-word questions without context
  * Surface-level observation
  * Minimal effort but not dismissive
  * Just asking for facts without connecting to bigger picture

NEGATIVE (-2 to +2):
  * One-word dismissive answer ("cool", "ok")
  * Lazy non-engagement
  * Rude or contemptuous tone
  * Clearly not reading/listening

VERY NEGATIVE (-5 to -10):
  * Hostile or insulting
  * Actively dismissive of her work
  * Seems to be testing/mocking her

Use your judgment - this is about DEPTH and GENUINE CURIOSITY, not just presence of a question mark.

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
  "reasoning": "Mira's brief personal observation in her voice (1-2 sentences, reference creatures/research if relevant)"
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

    // Clean up JSON: remove leading + signs (Claude includes "+15" instead of "15")
    const cleanedJson = jsonMatch[0].replace(/:\s*\+/g, ': ');
    let analysis;
    try {
      analysis = JSON.parse(cleanedJson);
    } catch (parseError) {
      const errorId = generateEventId();
      sendAGUIEvent(response, errorId, 'ERROR', {
        code: 'JSON_PARSE_ERROR',
        message: `Failed to parse Claude response: ${parseError}`,
        recoverable: false,
      }, eventTracker.getNextSequence());
      return response.end();
    }

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

    // Send rapport bar FIRST as a standalone text message (before analysis)
    const rapportMessageId = `msg_rapport_${Date.now()}`;
    const rapportStartEventId = generateEventId();
    const rapportStartSequence = eventTracker.getNextSequence();

    sendAGUIEvent(response, rapportStartEventId, 'TEXT_MESSAGE_START', {
      message_id: rapportMessageId,
    }, rapportStartSequence);

    // Send confidence bar as first (and only) chunk in rapport message
    const confidenceBar = generateConfidenceBar(newConfidence);
    const barChunkId = generateEventId();
    const barChunkSeq = eventTracker.getNextSequence();
    sendAGUIEvent(response, barChunkId, 'TEXT_CONTENT', {
      chunk: confidenceBar,
      chunk_index: 0,
    }, barChunkSeq, rapportStartEventId);

    // End rapport message
    const rapportEndEventId = generateEventId();
    const rapportEndSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, rapportEndEventId, 'TEXT_MESSAGE_END', {
      total_chunks: 1,
    }, rapportEndSequence, rapportStartEventId);

    // Send analysis event (standalone, not part of a message)
    const analysisEventId = generateEventId();
    const analysisSequence = eventTracker.getNextSequence();
    console.log('📊 [Backend] Sending ANALYSIS_COMPLETE event:', {
      analysisEventId,
      analysisSequence,
      reasoning: analysis.reasoning.substring(0, 50),
      confidenceDelta: analysis.confidenceDelta,
    });
    sendAGUIEvent(response, analysisEventId, 'ANALYSIS_COMPLETE', {
      reasoning: analysis.reasoning,
      metrics: {
        thoughtfulness: analysis.thoughtfulness,
        adventurousness: analysis.adventurousness,
        engagement: analysis.engagement,
        curiosity: analysis.curiosity,
        superficiality: analysis.superficiality,
      },
      confidenceDelta: analysis.confidenceDelta,
    }, analysisSequence);

    // Start response text message sequence
    const messageId = `msg_response_${Date.now()}`;
    const startEventId = generateEventId();
    const startSequence = eventTracker.getNextSequence();

    sendAGUIEvent(response, startEventId, 'TEXT_MESSAGE_START', {
      message_id: messageId,
    }, startSequence);

    let chunkIndex = 0;

    // Stream Claude-generated response via streaming chat
    const claudeStream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are Dr. Mira Petrovic, a deep-sea researcher obsessed with bioluminescent creatures and the abyss.

Respond ONLY with dialogue. Do NOT include:
- Action descriptions (no asterisks or stage directions)
- Narrative text
- Character actions or physical descriptions
- Anything other than what Mira would say

Keep your response natural and conversational (1-3 sentences typically). Use ellipsis (...) as punctuation breaks. Reference deep-sea creatures and your research when relevant. Stay in character as Mira.`,
      messages: [
        {
          role: 'user',
          content: userInput,
        },
      ],
    });

    // Stream response chunks from Claude
    for await (const event of claudeStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;

        const chunkId = generateEventId();
        const chunkSeq = eventTracker.getNextSequence();
        sendAGUIEvent(response, chunkId, 'TEXT_CONTENT', {
          chunk,
          chunk_index: chunkIndex++,
        }, chunkSeq, startEventId);

        // Small delay allows interruption
        await sleep(10);
      }
    }

    // Complete text message
    const endEventId = generateEventId();
    const endSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, endEventId, 'TEXT_MESSAGE_END', {
      total_chunks: chunkIndex,
    }, endSequence, startEventId);

    // Create a simple agent response for memory tracking
    const finalState = updateMemory(updatedState, userInput, {
      streaming: [],
      observations: [],
      contentSelection: { sceneId: 'shadows', creatureId: 'jellyfish', revealLevel: 'surface' },
      confidenceDelta: analysis.confidenceDelta,
    });

    // Send completion event with full response data (triggers ASCII art and transition)
    const completeEventId = generateEventId();
    const completeSequence = eventTracker.getNextSequence();
    sendAGUIEvent(response, completeEventId, 'RESPONSE_COMPLETE', {
      updatedState: finalState,
      response: {
        streaming: [],
        observations: [],
        contentSelection: { sceneId: 'shadows', creatureId: 'jellyfish', revealLevel: 'surface' },
        confidenceDelta: analysis.confidenceDelta,
      },
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
        // Frontend handles character-by-character animation on all response text
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

