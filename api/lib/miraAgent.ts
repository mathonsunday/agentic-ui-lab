/**
 * LangGraph Agent for Mira - Deep Sea Researcher
 *
 * State flow:
 * 1. user_analysis: Claude analyzes user input to understand personality traits
 * 2. confidence_update: Merge Claude's analysis with current state
 * 3. response_selection: Select appropriate response from hardcoded library
 * 4. memory_update: Record interaction in Mira's memory
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  MiraState,
  UserAnalysis,
  ResponseAssessment,
  AgentResponse,
  UserProfile,
  ToolCallData,
} from './types.js';
import { PERSONALITY_RESPONSES } from './responseLibrary.js';

/**
 * Step 1: Analyze user input with Claude to understand personality metrics
 */
export async function analyzeUserInput(
  userInput: string,
  miraState: MiraState
): Promise<UserAnalysis> {
  try {
    // Initialize client at function call time to ensure API key is available
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = `You are analyzing a user's message to understand their personality traits and engagement depth.
You are assisting Dr. Mira Petrovic, a deep-sea researcher, in understanding the person she's interacting with.

Analyze the user's message and return a JSON response with these metrics:
- confidenceDelta: number between -10 and +15 (MOST IMPORTANT: how much this message increases/decreases Mira's trust)
  * ANY question (even one question): +12 to +15 (questions show genuine engagement)
  * Multiple questions: +13 to +15 (showing real curiosity)
  * Asking for explanations: +12 to +15 (wants to learn more)
  * Thoughtful observations: +10 to +12 (noticing details, making connections)
  * Honest engagement (\"I have no idea\"): +10 to +12 (authentic participation)
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

    const message = await client.messages.create({
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

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = parseAnalysisResponse(responseText);

    return parsed;
  } catch (error) {
    console.error('Claude analysis error:', error);
    return {
      confidenceDelta: 0,
      updatedProfile: {},
      reasoning: 'Backend analysis unavailable',
    };
  }
}

/**
 * Step 2: Update confidence and profile based on Claude's analysis
 */
export function updateConfidenceAndProfile(
  miraState: MiraState,
  analysis: UserAnalysis
): MiraState {
  const newConfidence = Math.max(
    0,
    Math.min(100, miraState.confidenceInUser + analysis.confidenceDelta)
  );

  const updatedProfile = {
    ...miraState.userProfile,
    ...analysis.updatedProfile,
  };

  // Map personality to mood
  const personality = getPersonalityFromConfidence(newConfidence);
  const moodMap: Record<string, MiraState['currentMood']> = {
    negative: 'defensive',
    chaotic: 'testing',
    glowing: 'curious',
  };

  return {
    ...miraState,
    confidenceInUser: newConfidence,
    userProfile: updatedProfile,
    currentMood: moodMap[personality],
  };
}

/**
 * Step 3: Select response from hardcoded personality library
 */
export function selectResponse(
  miraState: MiraState,
  assessment: ResponseAssessment
): AgentResponse {
  const personality = getPersonalityFromConfidence(miraState.confidenceInUser);
  const responses = PERSONALITY_RESPONSES[personality];

  if (!responses) {
    return {
      streaming: ['...the connection is unclear...'],
      observations: [],
      contentSelection: {
        sceneId: 'shadows',
        creatureId: 'jellyfish',
        revealLevel: 'surface',
      },
      confidenceDelta: 0,
    };
  }

  // Select based on assessment type and depth
  let selectedResponses: string[] = [];

  if (assessment.type === 'question') {
    if (assessment.depth === 'deep') {
      selectedResponses = responses.deepQuestions || responses.questions || responses.responses;
    } else if (assessment.depth === 'moderate') {
      selectedResponses = responses.questions || responses.responses;
    } else {
      selectedResponses = responses.questions || responses.responses;
    }
  } else {
    if (assessment.depth === 'deep') {
      selectedResponses = responses.deepResponses || responses.responses;
    } else if (assessment.depth === 'moderate') {
      selectedResponses = responses.moderateResponses || responses.responses;
    } else {
      selectedResponses = responses.surfaceResponses || responses.responses;
    }
  }

  if (selectedResponses.length === 0) {
    selectedResponses = responses.responses || ['...'];
  }

  // Pick response with bias toward longer ones (more interesting zingers)
  const response = selectWeightedResponse(selectedResponses);

  // Determine content selection based on user profile
  const contentSelection = selectContent(miraState);

  return {
    streaming: chunkResponse(response),
    observations: generateObservations(miraState, assessment),
    contentSelection,
    confidenceDelta: assessment.confidenceDelta,
  };
}

/**
 * Helper: Determine content selection based on user profile
 */
function selectContent(
  miraState: MiraState
): AgentResponse['contentSelection'] {
  let sceneId = 'shadows'; // default: safe, beautiful
  let creatureId = 'jellyfish'; // safe starting point
  let revealLevel: 'surface' | 'moderate' | 'deep' = 'surface';

  // If they seem thoughtful and curious, show more complex creatures
  if (miraState.userProfile.thoughtfulness > 70 && miraState.userProfile.curiosity > 70) {
    sceneId = 'giant-squid'; // more complex
    creatureId = 'giant-squid';
    revealLevel = 'moderate';
  }

  // If they're adventurous, push toward the abyss
  if (miraState.userProfile.adventurousness > 80) {
    sceneId = 'leviathan'; // the intense one
    creatureId = 'leviathan';
    revealLevel = 'deep';
  }

  // If she feels they're kindred, show her perspective
  if (miraState.hasFoundKindred) {
    sceneId = 'rov-exterior'; // the vulnerable view
    creatureId = 'rov-self'; // reference to the ROV itself
  }

  return { sceneId, creatureId, revealLevel };
}

/**
 * Helper: Select response with bias toward longer ones (more interesting)
 * Longer responses are weighted higher to avoid repetitive short zingers
 */
function selectWeightedResponse(responses: string[]): string {
  if (responses.length === 0) return '...';
  if (responses.length === 1) return responses[0];

  // Create weighted pool: longer responses get higher weight
  const weighted: string[] = [];
  for (const response of responses) {
    const length = response.length;
    // Weight = roughly length/50, minimum 1 (even short responses get some weight)
    const weight = Math.max(1, Math.round(length / 50));
    for (let i = 0; i < weight; i++) {
      weighted.push(response);
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

/**
 * Helper: Split response into sentence-level chunks
 * Backend will further chunk these character-by-character during streaming
 */
function chunkResponse(response: string): string[] {
  // Split on sentence boundaries, keeping punctuation
  const chunks = response.split(/(?<=[.!?])\s+/);
  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Helper: Generate internal observations for tracking
 */
function generateObservations(
  miraState: MiraState,
  assessment: ResponseAssessment
): string[] {
  const observations: string[] = [];

  observations.push(
    `Assessment: ${assessment.type} (${assessment.depth} depth)`
  );

  const personality = getPersonalityFromConfidence(miraState.confidenceInUser);
  observations.push(`Personality: ${personality}`);

  const profile = miraState.userProfile;
  if (profile.curiosity > 60) {
    observations.push('User showing high curiosity');
  }
  if (profile.thoughtfulness > 70) {
    observations.push('User demonstrating thoughtfulness');
  }
  if (profile.superficiality > 60) {
    observations.push('User giving shallow responses');
  }

  return observations;
}

/**
 * Helper: Determine personality from confidence level
 * 3-personality system with equal 33% ranges:
 * - 0-33%: negative (dismissive)
 * - 34-67%: chaotic (philosophical)
 * - 68-100%: glowing (reverent)
 */
export function getPersonalityFromConfidence(confidence: number): string {
  if (confidence < 34) return 'negative';
  if (confidence < 68) return 'chaotic';
  return 'glowing';
}

/**
 * Helper: Parse Claude's analysis response
 */
function parseAnalysisResponse(rawResponse: string): UserAnalysis {
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      confidenceDelta: clamp(parsed.confidenceDelta ?? 0, -10, 15),
      updatedProfile: {
        thoughtfulness: clamp(parsed.thoughtfulness, 0, 100),
        adventurousness: clamp(parsed.adventurousness, 0, 100),
        engagement: clamp(parsed.engagement, 0, 100),
        curiosity: clamp(parsed.curiosity, 0, 100),
        superficiality: clamp(parsed.superficiality, 0, 100),
      },
      moodShift: parsed.moodShift,
      reasoning: parsed.reasoning || 'Analysis complete',
    };
  } catch (error) {
    console.error('Failed to parse Claude analysis:', error);
    return {
      confidenceDelta: 0,
      updatedProfile: {},
      reasoning: 'Analysis parsing failed',
    };
  }
}

/**
 * Helper: Clamp number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Step 4: Update memory with interaction
 */
export function updateMemory(
  miraState: MiraState,
  userInput: string,
  response: AgentResponse
): MiraState {
  const responseText = response.streaming.join(' ');

  return {
    ...miraState,
    memories: [
      ...miraState.memories,
      {
        timestamp: Date.now(),
        type: 'response',
        content: userInput,
        duration: 0,
        depth: 'moderate',
      },
    ],
  };
}

/**
 * Main orchestration: Execute full agent flow
 */
export async function executeMiraAgent(
  userInput: string,
  miraState: MiraState,
  assessment: ResponseAssessment
): Promise<{ updatedState: MiraState; response: AgentResponse }> {
  // Step 1: Analyze user with Claude
  const analysis = await analyzeUserInput(userInput, miraState);

  // Step 2: Update confidence and profile
  const stateAfterAnalysis = updateConfidenceAndProfile(miraState, analysis);

  // Step 3: Select response from library
  const response = selectResponse(stateAfterAnalysis, assessment);

  // Step 4: Update memory
  const finalState = updateMemory(stateAfterAnalysis, userInput, response);

  return {
    updatedState: finalState,
    response,
  };
}

/**
 * Tool Processing: Handle tool call events (e.g., zoom in/out)
 * Applies hardcoded score increases based on tool action
 */

// Hardcoded score mappings for each tool action
const TOOL_SCORE_MAP: Record<string, number> = {
  'zoom_in': 5,
  'zoom_out': 5,
};

/**
 * Process a tool call and update Mira's state
 * Tool calls award hardcoded rapport points (silent score changes, no dialogue)
 */
export function processToolCall(
  miraState: MiraState,
  toolData: ToolCallData
): MiraState {
  const scoreIncrease = TOOL_SCORE_MAP[toolData.action] || 0;
  const newConfidence = Math.max(0, Math.min(100,
    miraState.confidenceInUser + scoreIncrease
  ));

  return {
    ...miraState,
    confidenceInUser: newConfidence,
    memories: [
      ...miraState.memories,
      {
        timestamp: toolData.timestamp,
        type: 'tool_call',
        content: toolData.action,
        duration: 0,
        depth: 'moderate',
        toolData,
      },
    ],
  };
}
