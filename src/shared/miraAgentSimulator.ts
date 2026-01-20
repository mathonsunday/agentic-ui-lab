/**
 * Mira Agent Simulator
 *
 * State initialization for the Mira research agent.
 * All user analysis is performed by Claude on the backend.
 */

import type { MiraState, InterruptMemory } from '../../api/lib/types';

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
    responseIndices: {},
  };
}
