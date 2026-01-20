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

import type { MiraState, ResponseAssessment, InterruptMemory } from '../../api/lib/types';

// Re-export types needed by frontend components
export type { MiraState, InterruptMemory };

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
 * Frontend assessment: Simple rules for type and depth
 * Claude will do deeper analysis in the backend
 */
export function assessResponse(
  response: string,
  _duration: number,
  _state: MiraState
): ResponseAssessment {
  const wordCount = response.trim().split(/\s+/).filter(w => w.length > 0).length;
  const hasQuestionMark = response.includes('?');

  // Simple frontend rules - Claude refines these via backend analysis
  let depth: 'surface' | 'moderate' | 'deep' = 'surface';
  let confidenceDelta = 0;
  let type: 'response' | 'question' = 'response';

  // Determine type first
  if (hasQuestionMark) {
    type = 'question';
    confidenceDelta = 12;
  } else {
    type = 'response';
  }

  // Determine depth by word count (Claude refines this in backend)
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
