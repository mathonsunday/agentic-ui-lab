/**
 * Prompt ordering strategy optimized for Claude
 *
 * Claude weights end-of-prompt content heavily and benefits from:
 * - Comprehensive background upfront
 * - Detailed examples showing desired behavior
 * - Output format specification at the very end
 *
 * Current ordering matches Claude's optimal structure.
 */

import { BaseOrderingStrategy } from './BaseOrderingStrategy.js';

export class ClaudeStrategy extends BaseOrderingStrategy {
  readonly provider = 'claude' as const;

  protected readonly sectionOrdering = {
    // Role/persona definition first (context setting)
    introduction: 1,

    // Voice examples show personality (examples help understanding)
    voice: 2,
    glowingVoice: 4.5, // Can be personality variant
    generic: 4, // Generic instructions before specialized ones

    // Detailed scoring rules (provide comprehensive guidance)
    scoring: 5,

    // Context injection (current state/memories)
    context: 6,

    // Behavioral guidance
    mindset: 7,
    creatureMood: 7.5,
    creatureSelfAwareness: 7.75,

    // Output format specification LAST
    // Claude emphasizes end-of-prompt content highest
    format: 8,
  };

  getDescription(): string {
    return `Claude Strategy: Optimized for Claude's end-of-prompt emphasis.
Comprehensive background and examples upfront, output format specified at the very end.
This maximizes Claude's attention to the output specification.`;
  }
}
