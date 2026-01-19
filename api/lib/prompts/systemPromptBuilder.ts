/**
 * System Prompt Builder
 *
 * Composable, testable prompt construction using reusable sections.
 * Replaces the 275-line embedded system prompt with a structured approach.
 *
 * Usage:
 * ```typescript
 * const systemPrompt = new MiraSystemPromptBuilder()
 *   .addIntroduction()
 *   .addVoiceExamples('glowing')
 *   .addDetailedScoringRules()
 *   .addContextInjection(miraState, messageCount, toolCount)
 *   .addGenericInstructions()
 *   .addGlowingVoiceInstructions()
 *   .addMindsetGuidance()
 *   .addResponseFormat()
 *   .build();
 * ```
 */

import type { PromptSection, PersonalityTier } from './types.js';
import type { MiraState } from '../types.js';
import { getVoiceExamplesForPersonality } from './sections/voiceExamples.js';
import { getScoringRulesSection } from './sections/scoringRules.js';
import { buildContextInjectionSection } from './sections/contextInjection.js';
import {
  CRITICAL_MINDSET,
  CREATURE_MOOD_SELECTION,
  CREATURE_SELF_AWARENESS,
  RESPONSE_FORMAT,
  INTRODUCTION,
  GLOWING_VOICE_INSTRUCTIONS,
  GENERIC_INSTRUCTIONS,
} from './sections/criticalMindset.js';

export class MiraSystemPromptBuilder {
  private sections: Map<string, PromptSection> = new Map();

  constructor() {
    // Initialize with no sections - user must add them explicitly
  }

  addIntroduction(): this {
    this.sections.set('introduction', INTRODUCTION);
    return this;
  }

  addVoiceExamples(personality: PersonalityTier): this {
    this.sections.set('voice', getVoiceExamplesForPersonality(personality));
    return this;
  }

  addDetailedScoringRules(): this {
    this.sections.set('scoring', getScoringRulesSection(true));
    return this;
  }

  addBasicScoringRules(): this {
    this.sections.set('scoring', getScoringRulesSection(false));
    return this;
  }

  addContextInjection(
    miraState: MiraState,
    messageCount: number,
    toolCallCount: number
  ): this {
    this.sections.set(
      'context',
      buildContextInjectionSection(miraState, messageCount, toolCallCount)
    );
    return this;
  }

  addGenericInstructions(): this {
    this.sections.set('generic', GENERIC_INSTRUCTIONS);
    return this;
  }

  addGlowingVoiceInstructions(): this {
    this.sections.set('glowingVoice', GLOWING_VOICE_INSTRUCTIONS);
    return this;
  }

  addMindsetGuidance(): this {
    this.sections.set('mindset', CRITICAL_MINDSET);
    return this;
  }

  addCreatureMoodSelection(): this {
    this.sections.set('creatureMood', CREATURE_MOOD_SELECTION);
    return this;
  }

  addCreatureSelfAwareness(): this {
    this.sections.set('creatureSelfAwareness', CREATURE_SELF_AWARENESS);
    return this;
  }

  addResponseFormat(): this {
    this.sections.set('format', RESPONSE_FORMAT);
    return this;
  }

  /**
   * Build the complete system prompt by concatenating all sections in order
   */
  build(): string {
    // Sort sections by order field and concatenate
    const sorted = Array.from(this.sections.values()).sort(
      (a, b) => a.order - b.order
    );

    return sorted.map((section) => section.content).join('\n\n');
  }

  /**
   * Clear all sections (useful for testing)
   */
  clear(): this {
    this.sections.clear();
    return this;
  }

  /**
   * Get all current sections (useful for debugging)
   */
  getSections(): PromptSection[] {
    return Array.from(this.sections.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Check if a section exists
   */
  hasSection(key: string): boolean {
    return this.sections.has(key);
  }
}

/**
 * Convenience function to create the advanced prompt used in production
 * (This is what analyze-user-stream.ts uses)
 */
export function createAdvancedMiraPrompt(
  miraState: MiraState,
  messageCount: number,
  toolCallCount: number
): string {
  return new MiraSystemPromptBuilder()
    .addIntroduction()
    .addVoiceExamples('glowing')
    .addGlowingVoiceInstructions()
    .addGenericInstructions()
    .addDetailedScoringRules()
    .addContextInjection(miraState, messageCount, toolCallCount)
    .addMindsetGuidance()
    .addCreatureMoodSelection()
    .addCreatureSelfAwareness()
    .addResponseFormat()
    .build();
}

/**
 * Convenience function to create a basic prompt for simple analysis
 * (Fallback for non-streaming endpoints)
 */
export function createBasicMiraPrompt(miraState: MiraState): string {
  return new MiraSystemPromptBuilder()
    .addIntroduction()
    .addVoiceExamples('glowing')
    .addBasicScoringRules()
    .addMindsetGuidance()
    .addCreatureMoodSelection()
    .addResponseFormat()
    .build();
}
