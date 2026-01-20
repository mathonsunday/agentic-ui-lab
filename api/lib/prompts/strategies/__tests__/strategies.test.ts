/**
 * Comprehensive test suite for prompt ordering strategies
 *
 * Tests cover:
 * - Individual strategy correctness
 * - Cross-provider ordering comparisons
 * - Validation and duplicate detection
 * - Strategy factory functions
 * - Builder integration with strategies
 */

import { describe, it, expect } from 'vitest';
import { ClaudeStrategy } from '../ClaudeStrategy.js';
import { OpenAIGPTStrategy } from '../OpenAIGPTStrategy.js';
import { GoogleGeminiStrategy } from '../GoogleGeminiStrategy.js';
import {
  getStrategyForProvider,
  validateAllStrategies,
  compareStrategyOrderings,
  getAllStrategyDescriptions,
} from '../strategyFactory.js';
import type { LLMProvider } from '../types.js';

describe('Prompt Ordering Strategies', () => {
  describe('Claude Strategy', () => {
    const strategy = new ClaudeStrategy();

    it('has claude provider', () => {
      expect(strategy.provider).toBe('claude');
    });

    it('has valid description', () => {
      const description = strategy.getDescription();
      expect(description).toContain('Claude');
      expect(description).toContain('end-of-prompt');
    });

    it('validates successfully with no duplicates', () => {
      const errors = strategy.validate();
      expect(errors).toHaveLength(0);
    });

    it('puts format section last', () => {
      expect(strategy.getOrder('format')).toBe(8);
      expect(strategy.getOrder('introduction')).toBeLessThan(
        strategy.getOrder('format')
      );
    });

    it('orders introduction first', () => {
      expect(strategy.getOrder('introduction')).toBe(1);
    });

    it('provides correct section ordering', () => {
      const mapping = strategy.getOrderMapping();
      expect(mapping.introduction).toBe(1);
      expect(mapping.format).toBe(8);
      expect(mapping.context).toBe(6);
    });

    it('handles unknown sections gracefully', () => {
      expect(strategy.getOrder('unknown')).toBe(999);
    });
  });

  describe('OpenAI GPT Strategy', () => {
    const strategy = new OpenAIGPTStrategy();

    it('has openai-gpt provider', () => {
      expect(strategy.provider).toBe('openai-gpt');
    });

    it('has valid description', () => {
      const description = strategy.getDescription();
      expect(description).toContain('OpenAI');
      expect(description).toContain('GPT');
      expect(description).toContain('explicit');
    });

    it('validates successfully with no duplicates', () => {
      const errors = strategy.validate();
      expect(errors).toHaveLength(0);
    });

    it('puts format section early (order 2)', () => {
      expect(strategy.getOrder('format')).toBe(2);
    });

    it('orders introduction first', () => {
      expect(strategy.getOrder('introduction')).toBe(1);
    });

    it('differs from Claude strategy', () => {
      const claude = new ClaudeStrategy();
      const openai = new OpenAIGPTStrategy();

      // Format should be in different positions
      expect(claude.getOrder('format')).not.toBe(openai.getOrder('format'));
      // Claude: format=8, OpenAI: format=2
      expect(claude.getOrder('format')).toBeGreaterThan(
        openai.getOrder('format')
      );
    });
  });

  describe('Google Gemini Strategy', () => {
    const strategy = new GoogleGeminiStrategy();

    it('has google-gemini provider', () => {
      expect(strategy.provider).toBe('google-gemini');
    });

    it('has valid description', () => {
      const description = strategy.getDescription();
      expect(description).toContain('Gemini');
      expect(description).toContain('few-shot');
    });

    it('validates successfully with no duplicates', () => {
      const errors = strategy.validate();
      expect(errors).toHaveLength(0);
    });

    it('prioritizes voice examples (order 4)', () => {
      expect(strategy.getOrder('voice')).toBe(4);
    });

    it('orders introduction first', () => {
      expect(strategy.getOrder('introduction')).toBe(1);
    });
  });

  describe('Strategy Factory', () => {
    it('returns Claude strategy for claude provider', () => {
      const strategy = getStrategyForProvider('claude');
      expect(strategy.provider).toBe('claude');
      expect(strategy).toBeInstanceOf(ClaudeStrategy);
    });

    it('returns OpenAI GPT strategy for openai-gpt provider', () => {
      const strategy = getStrategyForProvider('openai-gpt');
      expect(strategy.provider).toBe('openai-gpt');
      expect(strategy).toBeInstanceOf(OpenAIGPTStrategy);
    });

    it('returns Google Gemini strategy for google-gemini provider', () => {
      const strategy = getStrategyForProvider('google-gemini');
      expect(strategy.provider).toBe('google-gemini');
      expect(strategy).toBeInstanceOf(GoogleGeminiStrategy);
    });

    it('throws error for unknown provider', () => {
      expect(() => {
        getStrategyForProvider('unknown' as LLMProvider);
      }).toThrow('Unknown provider');
    });
  });

  describe('Strategy Validation', () => {
    it('all strategies validate successfully', () => {
      const result = validateAllStrategies();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('no strategy has duplicate order values', () => {
      const strategies = [
        new ClaudeStrategy(),
        new OpenAIGPTStrategy(),
        new GoogleGeminiStrategy(),
      ];

      strategies.forEach((strategy) => {
        const errors = strategy.validate();
        expect(errors).toHaveLength(0);
      });
    });

    it('each strategy has unique orders per section', () => {
      const strategies = [
        new ClaudeStrategy(),
        new OpenAIGPTStrategy(),
        new GoogleGeminiStrategy(),
      ];

      strategies.forEach((strategy) => {
        const mapping = strategy.getOrderMapping();
        const orders = Object.values(mapping);
        const unique = new Set(orders);
        expect(unique.size).toBe(orders.length);
      });
    });
  });

  describe('Cross-Provider Comparison', () => {
    it('shows different ordering for all providers', () => {
      const comparison = compareStrategyOrderings();

      // All sections should be present
      expect(Object.keys(comparison).length).toBeGreaterThan(0);

      // Check format section ordering differs
      const formatOrder = comparison.format;
      const orders = Object.values(formatOrder);
      const unique = new Set(orders);
      // Should have at least 2 different order values for format
      expect(unique.size).toBeGreaterThanOrEqual(2);
    });

    it('provides complete ordering comparison', () => {
      const comparison = compareStrategyOrderings();
      const providers: LLMProvider[] = ['claude', 'openai-gpt', 'google-gemini'];

      // Each section should have entries for all providers
      Object.values(comparison).forEach((sectionOrders) => {
        providers.forEach((provider) => {
          expect(sectionOrders).toHaveProperty(provider);
          expect(typeof sectionOrders[provider]).toBe('number');
        });
      });
    });

    it('illustrates trade-offs between providers', () => {
      const comparison = compareStrategyOrderings();

      // Format position example:
      // - Claude: end (highest priority)
      // - OpenAI: early (explicit specification)
      // - Gemini: middle (balanced)
      expect(comparison.format.claude).toBeGreaterThan(
        comparison.format['openai-gpt']
      );
    });
  });

  describe('Strategy Descriptions', () => {
    it('provides descriptions for all providers', () => {
      const descriptions = getAllStrategyDescriptions();

      expect(descriptions).toHaveProperty('claude');
      expect(descriptions).toHaveProperty('openai-gpt');
      expect(descriptions).toHaveProperty('google-gemini');
    });

    it('descriptions are non-empty and informative', () => {
      const descriptions = getAllStrategyDescriptions();

      Object.entries(descriptions).forEach(([provider, description]) => {
        expect(description.length).toBeGreaterThan(10);
        expect(description).toContain(provider.charAt(0).toUpperCase());
      });
    });
  });

  describe('Order Value Constraints', () => {
    it('Claude strategy maintains strict ordering', () => {
      const strategy = new ClaudeStrategy();
      const mapping = strategy.getOrderMapping();

      expect(mapping.introduction).toBe(1);
      expect(mapping.format).toBe(8);
      expect(mapping.introduction).toBeLessThan(mapping.format);
    });

    it('OpenAI strategy places format early', () => {
      const strategy = new OpenAIGPTStrategy();
      const mapping = strategy.getOrderMapping();

      expect(mapping.format).toBe(2);
      expect(mapping.format).toBeLessThan(mapping.voice);
      expect(mapping.format).toBeLessThan(mapping.scoring);
    });

    it('Gemini strategy uses fractional orders for related sections', () => {
      const strategy = new GoogleGeminiStrategy();
      const mapping = strategy.getOrderMapping();

      // Adjacent sections have incremental fractional values
      if (mapping.creatureMood && mapping.creatureSelfAwareness) {
        expect(mapping.creatureMood).toBeLessThan(
          mapping.creatureSelfAwareness
        );
        // Both are close to 6.5/6.75
        expect(Math.abs(mapping.creatureMood - mapping.creatureSelfAwareness)).toBeLessThan(1);
      }
    });
  });

  describe('Unknown Sections Handling', () => {
    it('consistently assigns order 999 to unknown sections', () => {
      const strategies = [
        new ClaudeStrategy(),
        new OpenAIGPTStrategy(),
        new GoogleGeminiStrategy(),
      ];

      strategies.forEach((strategy) => {
        expect(strategy.getOrder('unknownSection')).toBe(999);
        expect(strategy.getOrder('nonexistentKey')).toBe(999);
      });
    });

    it('unknown sections sort to end', () => {
      const strategy = new ClaudeStrategy();
      const known = strategy.getOrder('introduction');
      const unknown = strategy.getOrder('unknownSection');

      expect(known).toBeLessThan(unknown);
    });
  });

  describe('Provider-Specific Optimizations', () => {
    it('Claude emphasizes output format at end', () => {
      const claude = new ClaudeStrategy();
      const formatOrder = claude.getOrder('format');

      // Format should be highest order (lowest priority but end-weighted by model)
      expect(formatOrder).toBeGreaterThanOrEqual(8);
    });

    it('OpenAI emphasizes precise output format early', () => {
      const openai = new OpenAIGPTStrategy();
      const formatOrder = openai.getOrder('format');

      // Format should be early (order 2)
      expect(formatOrder).toBeLessThanOrEqual(3);
    });

    it('Gemini emphasizes examples', () => {
      const gemini = new GoogleGeminiStrategy();
      const voiceOrder = gemini.getOrder('voice');
      const contextOrder = gemini.getOrder('context');

      // Voice examples should come before context
      expect(voiceOrder).toBeLessThan(contextOrder);
    });
  });
});
