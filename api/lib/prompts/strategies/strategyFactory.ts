/**
 * Factory and utilities for prompt ordering strategies
 *
 * Provides:
 * - Strategy creation from provider name
 * - Validation of all strategies
 * - Default strategy selection
 */

import type { LLMProvider, PromptOrderingStrategy, ValidationError } from './types.js';
import { ClaudeStrategy } from './ClaudeStrategy.js';
import { OpenAIGPTStrategy } from './OpenAIGPTStrategy.js';
import { GoogleGeminiStrategy } from './GoogleGeminiStrategy.js';

/**
 * Get strategy instance for a specific provider
 *
 * @param provider - The LLM provider name
 * @returns Strategy instance optimized for that provider
 * @throws Error if provider is unknown
 */
export function getStrategyForProvider(provider: LLMProvider): PromptOrderingStrategy {
  switch (provider) {
    case 'claude':
      return new ClaudeStrategy();
    case 'openai-gpt':
      return new OpenAIGPTStrategy();
    case 'google-gemini':
      return new GoogleGeminiStrategy();
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Validate all available strategies
 *
 * Runs validation on all provider strategies and collects errors.
 * Called at build time to catch configuration issues early.
 *
 * @returns Combined validation results
 * @throws Error if any strategy is invalid
 */
export function validateAllStrategies(): {
  valid: boolean;
  errors: Array<{ provider: LLMProvider; errors: ValidationError[] }>;
} {
  const providers: LLMProvider[] = ['claude', 'openai-gpt', 'google-gemini'];
  const allErrors: Array<{ provider: LLMProvider; errors: ValidationError[] }> = [];

  providers.forEach((provider) => {
    const strategy = getStrategyForProvider(provider);
    const errors = strategy.validate();
    if (errors.length > 0) {
      allErrors.push({ provider, errors });
    }
  });

  if (allErrors.length > 0) {
    throw new Error(
      `Strategy validation failed:\n${allErrors
        .map(
          ({ provider, errors }) =>
            `${provider}: ${errors.map((e) => `${e.field} - ${e.message}`).join('; ')}`
        )
        .join('\n')}`
    );
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Compare section ordering across all strategies
 *
 * Useful for understanding how sections are prioritized differently.
 *
 * @returns Object mapping section names to provider-specific orders
 */
export function compareStrategyOrderings(): Record<
  string,
  Record<LLMProvider, number>
> {
  const providers: LLMProvider[] = ['claude', 'openai-gpt', 'google-gemini'];
  const allSections = new Set<string>();

  // Collect all unique section keys
  providers.forEach((provider) => {
    const strategy = getStrategyForProvider(provider);
    Object.keys(strategy.getOrderMapping()).forEach((key) => {
      allSections.add(key);
    });
  });

  // Build comparison table
  const comparison: Record<string, Record<LLMProvider, number>> = {};
  allSections.forEach((section) => {
    comparison[section] = {} as Record<LLMProvider, number>;
    providers.forEach((provider) => {
      const strategy = getStrategyForProvider(provider);
      comparison[section][provider] = strategy.getOrder(section);
    });
  });

  return comparison;
}

/**
 * Get description of all strategies
 *
 * Useful for documentation and debugging.
 *
 * @returns Map of provider to strategy description
 */
export function getAllStrategyDescriptions(): Record<LLMProvider, string> {
  const providers: LLMProvider[] = ['claude', 'openai-gpt', 'google-gemini'];
  const descriptions: Record<LLMProvider, string> = {} as Record<
    LLMProvider,
    string
  >;

  providers.forEach((provider) => {
    const strategy = getStrategyForProvider(provider);
    descriptions[provider] = strategy.getDescription();
  });

  return descriptions;
}
