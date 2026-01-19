/**
 * Personality Mapping - Shared Utility
 *
 * Maps confidence level to personality type using 3-tier system:
 * - 0-33%: negative (dismissive)
 * - 34-67%: chaotic (philosophical)
 * - 68-100%: glowing (reverent)
 *
 * Used by both frontend (miraAgentSimulator) and backend (miraAgent)
 */

export type Personality = 'negative' | 'chaotic' | 'glowing';

/**
 * Determine personality from confidence level
 * 3-personality system with equal 33% ranges:
 * - 0-33%: negative (dismissive)
 * - 34-67%: chaotic (philosophical)
 * - 68-100%: glowing (reverent)
 */
export function getPersonalityFromConfidence(confidence: number): Personality {
  if (confidence < 34) return 'negative';
  if (confidence < 68) return 'chaotic';
  return 'glowing';
}
