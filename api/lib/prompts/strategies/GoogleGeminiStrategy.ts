/**
 * Prompt ordering strategy optimized for Google Gemini
 *
 * Gemini performs well with:
 * - Clear system instructions (role + guardrails)
 * - Few-shot examples as the most reliable method for behavior control
 * - XML-style tags for section delimiters
 * - Explicit research scope and citation requirements
 *
 * This strategy prioritizes examples over detailed narrative guidance.
 */

import { BaseOrderingStrategy } from './BaseOrderingStrategy.js';

export class GoogleGeminiStrategy extends BaseOrderingStrategy {
  readonly provider = 'google-gemini' as const;

  protected readonly sectionOrdering = {
    // System instructions first (persona and guardrails)
    introduction: 1,

    // Generic instructions (guardrails and behavior rules)
    generic: 2,

    // Scoring rules (system constraints)
    scoring: 3,

    // Few-shot examples are MOST reliable for Gemini
    voice: 4,
    glowingVoice: 4.5,

    // Context (current state)
    context: 5,

    // Behavioral guidance
    mindset: 6,
    creatureMood: 6.5,
    creatureSelfAwareness: 6.75,

    // Output format specification
    format: 7,
  };

  getDescription(): string {
    return `Google Gemini Strategy: Optimized for Gemini's few-shot learning strengths.
Prioritizes examples as the most reliable behavior control method.
Clear system instructions upfront, examples in middle section, format specification last.`;
  }
}
