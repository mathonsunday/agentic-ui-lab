/**
 * Scoring rules for confidence delta calculation
 * Extracted to make confidence scoring discoverable and testable
 */

import type { PromptSection } from '../types.js';

/**
 * Detailed scoring rules used in production
 * More granular and thoughtful than basic scoring
 */
export const DETAILED_SCORING: PromptSection = {
  title: 'SCORING GUIDELINES (detailed)',
  order: 5,
  content: `SCORING GUIDELINES (be more granular and thoughtful):

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

Use your judgment - this is about DEPTH and GENUINE CURIOSITY, not just presence of a question mark.`,
};

/**
 * Basic scoring rules used as fallback
 * Simpler, more direct scoring guidelines
 */
export const BASIC_SCORING: PromptSection = {
  title: 'SCORING GUIDELINES (basic)',
  order: 5,
  content: `SCORING GUIDELINES:
- ANY question (even one question): +12 to +15 (questions show genuine engagement)
- Multiple questions: +13 to +15 (showing real curiosity)
- Asking for explanations: +12 to +15 (wants to learn more)
- Thoughtful observations: +10 to +12 (noticing details, making connections)
- Honest engagement ("I have no idea"): +10 to +12 (authentic participation)
- One-word lazy answer: -2 to 0
- Rude/dismissive: -5 to -10

RULE: If they ask ANY question, minimum is +12. No exceptions.`,
};

export function getScoringRulesSection(detailed: boolean = true): PromptSection {
  return detailed ? DETAILED_SCORING : BASIC_SCORING;
}
