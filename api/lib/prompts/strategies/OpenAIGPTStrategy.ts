/**
 * Prompt ordering strategy optimized for OpenAI GPT
 *
 * GPT performs better with:
 * - Explicit delimiters marking sections
 * - Precise output format specification early (before examples)
 * - Clear task decomposition with sub-steps
 * - Less emphasis on end-of-prompt content
 *
 * This strategy reorganizes sections to follow GPT best practices.
 */

import { BaseOrderingStrategy } from './BaseOrderingStrategy.js';

export class OpenAIGPTStrategy extends BaseOrderingStrategy {
  readonly provider = 'openai-gpt' as const;

  protected readonly sectionOrdering = {
    // Role/persona first (lightweight context setting)
    introduction: 1,

    // Explicit delimiters and precise output format EARLY
    // GPT needs strict output specification upfront
    format: 2,

    // Generic instructions with explicit task decomposition
    generic: 3,

    // Detailed scoring rules (precise numerical guidance)
    scoring: 4,

    // Voice examples (few-shot examples help consistency)
    voice: 5,

    // Context and state
    context: 6,

    // Behavioral guidance
    mindset: 7,
    creatureMood: 7.5,
    creatureSelfAwareness: 7.75,

    // Glowing voice instructions last (specialized, low importance)
    glowingVoice: 8,
  };

  getDescription(): string {
    return `OpenAI GPT Strategy: Optimized for GPT's preference for explicit structure.
Output format specified early for clarity, examples used for consistency rather than understanding.
Emphasizes precise instructions over comprehensive background.`;
  }
}
