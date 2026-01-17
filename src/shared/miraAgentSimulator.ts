/**
 * Mira Agent Simulator - HYBRID MODE
 *
 * ARCHITECTURE:
 * - Frontend assessment: User response type & depth (word count, question detection)
 * - Claude analysis: Smart understanding of user thoughtfulness, curiosity, adventurousness
 * - Hardcoded responses: All 27+ curated personality responses preserved
 * - Response selection: Uses both assessment AND personality to pick response
 *
 * This preserves your artistic vision while adding Claude's intelligence for understanding users.
 */

import { callMiraBackend } from '../services/miraBackendClient';

export interface UserProfile {
  thoughtfulness: number; // 0-100: do they ask deep questions?
  adventurousness: number; // 0-100: do they engage with strange/scary content?
  engagement: number; // 0-100: how actively do they participate?
  superficiality: number; // 0-100: surface-level engagement
  curiosity: number; // 0-100: how much do they want to know?
}

export interface InteractionMemory {
  timestamp: number;
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore';
  content: string; // what they said/did
  duration: number; // how long they spent on it
  depth: 'surface' | 'moderate' | 'deep'; // our assessment of engagement depth
}

export type Personality = 'negative' | 'chaotic' | 'glowing' | 'slovak';

export interface MiraState {
  userProfile: UserProfile;
  memories: InteractionMemory[];
  currentMood: 'curious' | 'vulnerable' | 'testing' | 'excited' | 'defensive';
  confidenceInUser: number; // 0-100 - determines personality progression
  hasFoundKindred: boolean; // true when she feels real connection
  // Response cycling to prevent repeats - track indices of used responses per personality+depth
  responseIndices: {
    [key: string]: number; // key = "personality:depth", value = next index to use
  };
}

export interface AgentResponse {
  streaming: string[]; // chunks to display one by one (simulating streaming)
  observations: string[]; // what she notices about the user
  contentSelection: {
    sceneId: string; // which visual scene to show
    creatureId: string; // which creature to focus on
    revealLevel: 'surface' | 'moderate' | 'deep'; // how much detail
  };
  moodShift?: string; // if mood is changing
  confidenceDelta: number; // change in confidence (-10 to +10)
}

/**
 * Map confidence level to personality
 * Confidence progression: 0-25% = negative, 25-50% = chaotic, 50-75% = glowing, 75-100% = slovak
 */
export function getPersonalityFromConfidence(confidence: number): Personality {
  if (confidence <= 25) return 'negative';
  if (confidence <= 50) return 'chaotic';
  if (confidence <= 75) return 'glowing';
  return 'slovak'; // 75-100
}

/**
 * Initialize Mira's internal state at start of research phase
 * Personality is derived from confidence level (starts at 50 = chaotic)
 */
export function initializeMiraState(initialConfidence?: number): MiraState {
  const confidence = initialConfidence !== undefined ? initialConfidence : 50;
  return {
    userProfile: {
      thoughtfulness: 50,
      adventurousness: 50,
      engagement: 50,
      superficiality: 50,
      curiosity: 50,
    },
    memories: [],
    currentMood: 'testing',
    confidenceInUser: confidence,
    hasFoundKindred: false,
    responseIndices: {}, // tracks which response index to use next per personality+depth
  };
}

/**
 * HYBRID EVALUATION WITH BACKEND:
 * 1. Frontend assesses response type/depth (word count, question detection)
 * 2. Backend: Claude analyzes user personality deeply + LangGraph selects response
 * 3. Frontend receives updated state + response to display
 * 4. User profile updated with Claude's analysis (replaces hardcoded metrics)
 */
export async function evaluateUserResponseWithBackend(
  miraState: MiraState,
  userResponse: string,
  interactionDuration: number
): Promise<{ updatedState: MiraState; response: AgentResponse }> {
  // Frontend assessment: type and basic depth from word count
  const assessment = assessResponse(userResponse, interactionDuration, miraState);

  // Call the backend to get Claude analysis + response generation
  try {
    console.log('Calling backend with assessment:', assessment);
    const backendResult = await callMiraBackend(
      userResponse,
      miraState,
      assessment,
      interactionDuration
    );
    console.log('Backend returned result:', backendResult);

    return backendResult;
  } catch (error) {
    // Graceful fallback: return neutral response without backend
    console.error('Backend call failed, falling back to local response:', error);

    // Clamp confidence to 0-100 range
    const clampedConfidence = Math.max(
      0,
      Math.min(100, miraState.confidenceInUser)
    );

    // Add to memory
    const newMemory: InteractionMemory = {
      timestamp: Date.now(),
      type: assessment.type,
      content: userResponse,
      duration: interactionDuration,
      depth: assessment.depth,
    };

    const fallbackState: MiraState = {
      ...miraState,
      confidenceInUser: clampedConfidence,
      memories: [...miraState.memories, newMemory],
      responseIndices: { ...miraState.responseIndices },
    };

    return {
      updatedState: fallbackState,
      response: {
        streaming: ['...connection to the depths lost... the abyss is unreachable at this moment...'],
        observations: [],
        contentSelection: {
          sceneId: 'shadows',
          creatureId: 'jellyfish',
          revealLevel: 'surface',
        },
        confidenceDelta: 0,
      },
    };
  }
}

/**
 * DEPRECATED: Local frontend-only assessment
 * Kept for reference - Claude now does smarter analysis
 */
export function evaluateUserResponse(
  miraState: MiraState,
  userResponse: string,
  interactionDuration: number
): { updatedState: MiraState; response: AgentResponse } {
  // Assess the response
  const assessment = assessResponse(userResponse, interactionDuration, miraState);

  // Update Mira's beliefs about this user
  const updatedProfile = updateUserProfile(miraState.userProfile, assessment);
  const newConfidence = miraState.confidenceInUser + assessment.confidenceDelta;

  // Determine her mood based on accumulated assessment
  const newMood = determineMood(updatedProfile, miraState.memories.length);

  // Add to memory
  const newMemory: InteractionMemory = {
    timestamp: Date.now(),
    type: assessment.type,
    content: userResponse,
    duration: interactionDuration,
    depth: assessment.depth,
  };

  // Clamp confidence to 0-100 range
  const clampedConfidence = Math.max(0, Math.min(100, newConfidence));

  const updatedState: MiraState = {
    ...miraState,
    userProfile: updatedProfile,
    currentMood: newMood,
    confidenceInUser: clampedConfidence,
    memories: [...miraState.memories, newMemory],
    hasFoundKindred: clampedConfidence > 75,
    responseIndices: { ...miraState.responseIndices },
  };

  // Fallback response
  return {
    updatedState,
    response: {
      streaming: ['...connection required...'],
      observations: [],
      contentSelection: {
        sceneId: 'shadows',
        creatureId: 'jellyfish',
        revealLevel: 'surface',
      },
      confidenceDelta: assessment.confidenceDelta,
    },
  };
}

interface ResponseAssessment {
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore';
  depth: 'surface' | 'moderate' | 'deep';
  confidenceDelta: number;
  traits: Partial<UserProfile>;
}

/**
 * Frontend assessment: Simple rules for type and depth
 * Claude will do deeper analysis via analyzeUserWithClaude
 */
function assessResponse(
  response: string,
  _duration: number,
  _state: MiraState
): ResponseAssessment {
  const wordCount = response.trim().split(/\s+/).filter(w => w.length > 0).length;
  const hasQuestionMark = response.includes('?');

  // Simple frontend rules - Claude will refine these
  let depth: 'surface' | 'moderate' | 'deep' = 'surface';
  let confidenceDelta = 0;
  let type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore' = 'response';

  // Determine type first
  if (hasQuestionMark) {
    type = 'question';
    confidenceDelta = 12;
  } else {
    type = 'response';
  }

  // Determine depth by word count (Claude will refine this assessment)
  if (wordCount === 1) {
    depth = 'surface';
    if (type === 'response') confidenceDelta = -5;
  } else if (wordCount === 2) {
    depth = 'moderate';
    if (type === 'response') confidenceDelta = 8;
  } else {
    depth = 'deep';
    if (type === 'response') confidenceDelta = 15;
  }

  return {
    type,
    depth,
    confidenceDelta,
    traits: {
      thoughtfulness: depth === 'deep' ? 75 : depth === 'moderate' ? 60 : 40,
      adventurousness: depth === 'deep' ? 70 : depth === 'moderate' ? 50 : 30,
      engagement: depth === 'deep' ? 85 : depth === 'moderate' ? 65 : 35,
      curiosity: depth === 'deep' ? 80 : depth === 'moderate' ? 60 : 35,
      superficiality: depth === 'surface' ? 75 : depth === 'moderate' ? 40 : 20,
    },
  };
}

/**
 * Update user profile using fronted assessment
 * Claude analysis will override this in evaluateUserResponseWithBackend
 */
function updateUserProfile(
  profile: UserProfile,
  assessment: ResponseAssessment
): UserProfile {
  // Exponential moving average - recent assessments matter more
  const alpha = 0.3; // weight of new assessment

  return {
    thoughtfulness: lerp(
      profile.thoughtfulness,
      assessment.traits.thoughtfulness ?? profile.thoughtfulness,
      alpha
    ),
    adventurousness: lerp(
      profile.adventurousness,
      assessment.traits.adventurousness ?? profile.adventurousness,
      alpha
    ),
    engagement: lerp(profile.engagement, assessment.traits.engagement ?? profile.engagement, alpha),
    superficiality: lerp(
      profile.superficiality,
      assessment.traits.superficiality ?? profile.superficiality,
      alpha
    ),
    curiosity: lerp(profile.curiosity, assessment.traits.curiosity ?? profile.curiosity, alpha),
  };
}

function determineMood(profile: UserProfile, memoryCount: number): MiraState['currentMood'] {
  // Her mood shifts based on what she's learned about them
  if (profile.thoughtfulness > 75 && profile.curiosity > 75) {
    return 'vulnerable'; // They seem thoughtful enough to trust
  }
  if (profile.adventurousness > 80) {
    return 'excited'; // They're diving deep into the abyss
  }
  if (profile.superficiality > 70) {
    return 'defensive'; // She's protecting herself
  }
  if (memoryCount > 8 && profile.thoughtfulness > 60) {
    return 'curious'; // She's becoming curious about them
  }
  return 'testing'; // Still evaluating
}

/**
 * DEPRECATED: Response generation moved to backend
 * The LangGraph agent now handles all response generation and selection
 */

// Helper function for smooth lerp (linear interpolation)
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
