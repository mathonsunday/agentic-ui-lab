/**
 * System Prompt Builder
 *
 * Composable, testable prompt construction using reusable sections.
 * Replaces the 275-line embedded system prompt with a structured approach.
 *
 * Supports provider-agnostic prompt ordering via strategies.
 *
 * Usage:
 * ```typescript
 * // Use default Claude strategy
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
 *
 * // Or use a specific provider strategy
 * const systemPrompt = new MiraSystemPromptBuilder({ provider: 'openai-gpt' })
 *   // ... add sections as before, builder applies provider-specific ordering
 *   .build();
 * ```
 */

import type { PromptSection, PersonalityTier } from './types.js';
import type { MiraState } from '../types.js';
import type { PromptOrderingStrategy, LLMProvider } from './strategies/types.js';
import { getStrategyForProvider } from './strategies/strategyFactory.js';
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

interface PromptSectionWithKey extends PromptSection {
  key: string;
}

export interface MiraSystemPromptBuilderOptions {
  /**
   * The LLM provider to optimize for. Defaults to 'claude'.
   * Determines section ordering strategy.
   */
  provider?: LLMProvider;

  /**
   * Custom ordering strategy. If provided, overrides provider selection.
   */
  strategy?: PromptOrderingStrategy;
}

export class MiraSystemPromptBuilder {
  private sections: Map<string, PromptSectionWithKey> = new Map();
  private strategy: PromptOrderingStrategy;

  constructor(options: MiraSystemPromptBuilderOptions = {}) {
    // Use custom strategy if provided, otherwise get strategy for provider
    if (options.strategy) {
      this.strategy = options.strategy;
    } else {
      const provider = options.provider ?? 'claude';
      this.strategy = getStrategyForProvider(provider);
    }
  }

  addIntroduction(): this {
    this.sections.set('introduction', {
      key: 'introduction',
      ...INTRODUCTION,
    });
    return this;
  }

  addVoiceExamples(personality: PersonalityTier): this {
    const section = getVoiceExamplesForPersonality(personality);
    this.sections.set('voice', {
      key: 'voice',
      ...section,
    });
    return this;
  }

  addDetailedScoringRules(): this {
    const section = getScoringRulesSection(true);
    this.sections.set('scoring', {
      key: 'scoring',
      ...section,
    });
    return this;
  }

  addBasicScoringRules(): this {
    const section = getScoringRulesSection(false);
    this.sections.set('scoring', {
      key: 'scoring',
      ...section,
    });
    return this;
  }

  addContextInjection(
    miraState: MiraState,
    messageCount: number,
    toolCallCount: number
  ): this {
    const section = buildContextInjectionSection(
      miraState,
      messageCount,
      toolCallCount
    );
    this.sections.set('context', {
      key: 'context',
      ...section,
    });
    return this;
  }

  addGenericInstructions(): this {
    this.sections.set('generic', {
      key: 'generic',
      ...GENERIC_INSTRUCTIONS,
    });
    return this;
  }

  addGlowingVoiceInstructions(): this {
    this.sections.set('glowingVoice', {
      key: 'glowingVoice',
      ...GLOWING_VOICE_INSTRUCTIONS,
    });
    return this;
  }

  addMindsetGuidance(): this {
    this.sections.set('mindset', {
      key: 'mindset',
      ...CRITICAL_MINDSET,
    });
    return this;
  }

  addCreatureMoodSelection(): this {
    this.sections.set('creatureMood', {
      key: 'creatureMood',
      ...CREATURE_MOOD_SELECTION,
    });
    return this;
  }

  addCreatureSelfAwareness(): this {
    this.sections.set('creatureSelfAwareness', {
      key: 'creatureSelfAwareness',
      ...CREATURE_SELF_AWARENESS,
    });
    return this;
  }

  addResponseFormat(): this {
    this.sections.set('format', {
      key: 'format',
      ...RESPONSE_FORMAT,
    });
    return this;
  }

  /**
   * Build the complete system prompt by concatenating all sections in order
   * determined by the current strategy
   */
  build(): string {
    // Validate strategy before building
    const errors = this.strategy.validate();
    if (errors.length > 0) {
      throw new Error(
        `Strategy validation failed: ${errors.map((e) => `${e.field} - ${e.message}`).join('; ')}`
      );
    }

    // Sort sections using strategy's ordering
    const sorted = Array.from(this.sections.values()).sort((a, b) => {
      const orderA = this.strategy.getOrder(a.key);
      const orderB = this.strategy.getOrder(b.key);
      return orderA - orderB;
    });

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
  getSections(): PromptSectionWithKey[] {
    const sorted = Array.from(this.sections.values()).sort((a, b) => {
      const orderA = this.strategy.getOrder(a.key);
      const orderB = this.strategy.getOrder(b.key);
      return orderA - orderB;
    });
    return sorted;
  }

  /**
   * Check if a section exists
   */
  hasSection(key: string): boolean {
    return this.sections.has(key);
  }

  /**
   * Get the current strategy
   */
  getStrategy(): PromptOrderingStrategy {
    return this.strategy;
  }
}

/**
 * Convenience function to create the advanced prompt used in production
 * (This is what analyze-user-stream.ts uses)
 *
 * @param miraState - Current Mira state
 * @param messageCount - Number of messages in conversation
 * @param toolCallCount - Number of tool calls made
 * @param provider - LLM provider to optimize for (defaults to 'claude')
 */
export function createAdvancedMiraPrompt(
  miraState: MiraState,
  messageCount: number,
  toolCallCount: number,
  provider: LLMProvider = 'claude'
): string {
  const interruptCount = miraState.memories.filter(m => m.type === 'interrupt').length;

  const builder = new MiraSystemPromptBuilder({ provider })
    .addIntroduction()
    .addVoiceExamples('glowing')
    .addGlowingVoiceInstructions()
    .addGenericInstructions()
    .addDetailedScoringRules()
    .addContextInjection(miraState, messageCount, toolCallCount)
    .addMindsetGuidance()
    .addCreatureMoodSelection()
    .addCreatureSelfAwareness()
    .addResponseFormat();

  const prompt = builder.build();

  // Log what's being sent to Claude
  if (interruptCount > 0) {
    const contextSection = builder.getSections().find(s => s.key === 'context');
    if (contextSection) {
      console.log('📤 SYSTEM PROMPT - Context Injection Section', {
        interruptCount,
        messageCount,
        toolCallCount,
        contextContentPreview: contextSection.content.substring(0, 300),
      });
    }
  }

  return prompt;
}

/**
 * Convenience function to create a basic prompt for simple analysis
 * (Fallback for non-streaming endpoints)
 *
 * @param miraState - Current Mira state
 * @param provider - LLM provider to optimize for (defaults to 'claude')
 */
export function createBasicMiraPrompt(
  miraState: MiraState,
  provider: LLMProvider = 'claude'
): string {
  return new MiraSystemPromptBuilder({ provider })
    .addIntroduction()
    .addVoiceExamples('glowing')
    .addBasicScoringRules()
    .addMindsetGuidance()
    .addCreatureMoodSelection()
    .addResponseFormat()
    .build();
}
