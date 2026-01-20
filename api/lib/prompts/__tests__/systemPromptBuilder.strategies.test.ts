/**
 * Integration tests for systemPromptBuilder with provider strategies
 *
 * Tests that the builder correctly applies different strategies
 * and produces correctly ordered prompts for each provider.
 */

import { describe, it, expect } from 'vitest';
import {
  MiraSystemPromptBuilder,
  createAdvancedMiraPrompt,
  createBasicMiraPrompt,
} from '../systemPromptBuilder.js';
import { ClaudeStrategy } from '../strategies/ClaudeStrategy.js';
import { OpenAIGPTStrategy } from '../strategies/OpenAIGPTStrategy.js';
import { GoogleGeminiStrategy } from '../strategies/GoogleGeminiStrategy.js';
import { getStrategyForProvider } from '../strategies/strategyFactory.js';
import type { MiraState } from '../../types.js';

const mockMiraState: MiraState = {
  confidenceInUser: 50,
  currentMood: 'curious',
  userProfile: {
    thoughtfulness: 60,
    adventurousness: 50,
    engagement: 70,
    curiosity: 75,
    superficiality: 20,
  },
  memories: [
    {
      timestamp: Date.now(),
      type: 'response',
      content: 'user message',
      duration: 0,
      depth: 'moderate',
    },
  ],
  hasFoundKindred: false,
};

describe('MiraSystemPromptBuilder with Strategies', () => {
  describe('Default Provider (Claude)', () => {
    it('uses Claude strategy by default', () => {
      const builder = new MiraSystemPromptBuilder();
      expect(builder.getStrategy()).toBeInstanceOf(ClaudeStrategy);
    });

    it('explicitly builds with Claude strategy', () => {
      const builder = new MiraSystemPromptBuilder({ provider: 'claude' });
      expect(builder.getStrategy().provider).toBe('claude');
    });

    it('places format section at end for Claude', () => {
      const prompt = new MiraSystemPromptBuilder({ provider: 'claude' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      const introIndex = prompt.indexOf('Dr. Mira Petrovic');
      const formatIndex = prompt.indexOf('Return ONLY valid JSON');

      // Format should come very close to end
      expect(formatIndex).toBeGreaterThan(introIndex);
      expect(formatIndex).toBeGreaterThan(prompt.length * 0.8);
    });
  });

  describe('OpenAI GPT Strategy', () => {
    it('uses OpenAI GPT strategy when specified', () => {
      const builder = new MiraSystemPromptBuilder({ provider: 'openai-gpt' });
      expect(builder.getStrategy().provider).toBe('openai-gpt');
    });

    it('places format section early for OpenAI', () => {
      const prompt = new MiraSystemPromptBuilder({ provider: 'openai-gpt' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      const introIndex = prompt.indexOf('Dr. Mira Petrovic');
      const formatIndex = prompt.indexOf('Return ONLY valid JSON');

      // Format should come earlier than Claude version
      expect(formatIndex).toBeGreaterThan(introIndex);
      // Should be in first 50% of prompt (early specification)
      expect(formatIndex).toBeLessThan(prompt.length * 0.5);
    });

    it('differs from Claude ordering', () => {
      const claude = new MiraSystemPromptBuilder({ provider: 'claude' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      const openai = new MiraSystemPromptBuilder({ provider: 'openai-gpt' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      // Prompts should be different (different ordering)
      expect(claude).not.toBe(openai);

      // Format should be in different positions
      const claudeFormatIdx = claude.indexOf('Return ONLY valid JSON');
      const openaiFormatIdx = openai.indexOf('Return ONLY valid JSON');
      expect(claudeFormatIdx).not.toBe(openaiFormatIdx);
    });
  });

  describe('Google Gemini Strategy', () => {
    it('uses Google Gemini strategy when specified', () => {
      const builder = new MiraSystemPromptBuilder({ provider: 'google-gemini' });
      expect(builder.getStrategy().provider).toBe('google-gemini');
    });

    it('prioritizes voice examples for Gemini', () => {
      const prompt = new MiraSystemPromptBuilder({ provider: 'google-gemini' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      const introIndex = prompt.indexOf('Dr. Mira Petrovic');
      const voiceIndex = prompt.indexOf('GLOWING');

      // Voice examples should come relatively early
      expect(voiceIndex).toBeGreaterThan(introIndex);
      // But not at the very end like Claude
      expect(voiceIndex).toBeLessThan(prompt.length * 0.7);
    });
  });

  describe('Custom Strategy', () => {
    it('accepts custom strategy in constructor', () => {
      const customStrategy = new OpenAIGPTStrategy();
      const builder = new MiraSystemPromptBuilder({ strategy: customStrategy });

      expect(builder.getStrategy()).toBe(customStrategy);
    });

    it('custom strategy overrides provider parameter', () => {
      const customStrategy = new OpenAIGPTStrategy();
      const builder = new MiraSystemPromptBuilder({
        provider: 'claude',
        strategy: customStrategy,
      });

      // Should use custom strategy, not Claude
      expect(builder.getStrategy()).toBe(customStrategy);
      expect(builder.getStrategy().provider).toBe('openai-gpt');
    });
  });

  describe('Provider Functions', () => {
    it('createAdvancedMiraPrompt uses Claude by default', () => {
      const prompt = createAdvancedMiraPrompt(mockMiraState, 5, 3);

      // Should have all advanced sections
      expect(prompt).toContain('Dr. Mira Petrovic');
      expect(prompt).toContain('GLOWING');
      expect(prompt).toContain('Message count: 5');
      expect(prompt).toContain('Return ONLY valid JSON');
    });

    it('createAdvancedMiraPrompt accepts provider parameter', () => {
      const claude = createAdvancedMiraPrompt(mockMiraState, 5, 3, 'claude');
      const openai = createAdvancedMiraPrompt(mockMiraState, 5, 3, 'openai-gpt');

      // Should produce different orderings
      expect(claude).not.toBe(openai);
    });

    it('createAdvancedMiraPrompt with different providers produces different sections order', () => {
      const claude = createAdvancedMiraPrompt(mockMiraState, 5, 3, 'claude');
      const gemini = createAdvancedMiraPrompt(mockMiraState, 5, 3, 'google-gemini');

      // Both should have all the same sections
      expect(claude).toContain('Return ONLY valid JSON');
      expect(gemini).toContain('Return ONLY valid JSON');
      expect(claude).toContain('Dr. Mira Petrovic');
      expect(gemini).toContain('Dr. Mira Petrovic');

      // Prompts should be different (different orders produce different text)
      expect(claude).not.toBe(gemini);

      // They should have approximately the same length
      // (same sections, just different order)
      expect(Math.abs(claude.length - gemini.length)).toBeLessThan(100);
    });

    it('createBasicMiraPrompt respects provider parameter', () => {
      const claude = createBasicMiraPrompt(mockMiraState, 'claude');
      const openai = createBasicMiraPrompt(mockMiraState, 'openai-gpt');

      expect(claude).not.toBe(openai);
    });
  });

  describe('Strategy Validation on Build', () => {
    it('validates strategy before building', () => {
      const builder = new MiraSystemPromptBuilder({ provider: 'claude' });
      builder.addIntroduction();

      // Should not throw - strategy is valid
      expect(() => builder.build()).not.toThrow();
    });

    it('throws error if strategy is invalid', () => {
      // Create a mock invalid strategy
      const invalidStrategy = {
        provider: 'test' as const,
        getOrder: () => 1,
        validate: () => [
          {
            field: 'test_field',
            message: 'Test error',
          },
        ],
        getDescription: () => 'test',
        getOrderMapping: () => ({}),
      };

      const builder = new MiraSystemPromptBuilder({
        strategy: invalidStrategy,
      });
      builder.addIntroduction();

      expect(() => builder.build()).toThrow('Strategy validation failed');
    });
  });

  describe('Section Ordering with Different Strategies', () => {
    it('sections appear in strategy-defined order', () => {
      const builder = new MiraSystemPromptBuilder({ provider: 'claude' });
      builder
        .addResponseFormat() // Added first
        .addMindsetGuidance() // Added second
        .addIntroduction() // Added last

      const sections = builder.getSections();
      const titles = sections.map((s) => s.title);

      // Should be ordered by strategy, not insertion order
      expect(titles[0]).toBe('INTRODUCTION'); // Claude: order 1
      expect(titles[titles.length - 1]).toBe('RESPONSE FORMAT'); // Claude: order 8
    });

    it('OpenAI strategy produces different section order', () => {
      const builder = new MiraSystemPromptBuilder({ provider: 'openai-gpt' });
      builder
        .addIntroduction()
        .addDetailedScoringRules()
        .addResponseFormat()
        .addVoiceExamples('glowing')
        .addMindsetGuidance();

      const sections = builder.getSections();
      const titles = sections.map((s) => s.title);

      // OpenAI strategy order: intro(1), format(2), scoring(4), voice(5), mindset(7)
      // So format should come before scoring and voice
      const formatIdx = titles.findIndex((t) => t.includes('RESPONSE FORMAT'));
      const scoringIdx = titles.findIndex((t) => t.includes('SCORING GUIDELINES'));

      // Format should come before scoring in OpenAI (order 2 vs 4)
      expect(formatIdx).toBeGreaterThanOrEqual(0);
      expect(scoringIdx).toBeGreaterThanOrEqual(0);
      expect(formatIdx).toBeLessThan(scoringIdx);
    });

    it('maintains correct order across multiple sections', () => {
      const providers = ['claude', 'openai-gpt', 'google-gemini'] as const;

      providers.forEach((provider) => {
        const builder = new MiraSystemPromptBuilder({ provider });
        builder
          .addIntroduction()
          .addVoiceExamples('glowing')
          .addDetailedScoringRules()
          .addMindsetGuidance()
          .addResponseFormat();

        const sections = builder.getSections();
        // Should always have introduction first (all strategies)
        expect(sections[0].title).toBe('INTRODUCTION');
        // Should never have empty sections
        expect(sections.length).toBe(5);
      });
    });
  });

  describe('Builder Chaining with Strategies', () => {
    it('fluent interface works with custom strategy', () => {
      const strategy = new OpenAIGPTStrategy();
      const prompt = new MiraSystemPromptBuilder({ strategy })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addContextInjection(mockMiraState, 5, 3)
        .addGenericInstructions()
        .addGlowingVoiceInstructions()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(500);
    });

    it('getStrategy returns current strategy', () => {
      const strategy = new GoogleGeminiStrategy();
      const builder = new MiraSystemPromptBuilder({ strategy });

      expect(builder.getStrategy()).toBe(strategy);
      expect(builder.getStrategy().provider).toBe('google-gemini');
    });
  });

  describe('Provider Feature Preservation', () => {
    it('all providers include required sections when added', () => {
      const providers = ['claude', 'openai-gpt', 'google-gemini'] as const;

      providers.forEach((provider) => {
        const prompt = new MiraSystemPromptBuilder({ provider })
          .addIntroduction()
          .addVoiceExamples('glowing')
          .addDetailedScoringRules()
          .addMindsetGuidance()
          .addResponseFormat()
          .build();

        // All should include these key components
        expect(prompt).toContain('Dr. Mira Petrovic');
        expect(prompt).toContain('Return ONLY valid JSON');
        expect(prompt).toContain('CRITICAL MINDSET');
      });
    });

    it('provider strategies dont lose content', () => {
      const claude = new MiraSystemPromptBuilder({ provider: 'claude' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      const openai = new MiraSystemPromptBuilder({ provider: 'openai-gpt' })
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      // Same content, different order
      // So they should have different strings
      expect(claude).not.toEqual(openai);

      // But both should contain all sections
      expect(claude.split('\n\n').length).toBeGreaterThan(1);
      expect(openai.split('\n\n').length).toBeGreaterThan(1);
    });
  });

  describe('Cross-Provider Compatibility', () => {
    it('all providers handle creature-related sections', () => {
      const providers = ['claude', 'openai-gpt', 'google-gemini'] as const;

      providers.forEach((provider) => {
        const prompt = new MiraSystemPromptBuilder({ provider })
          .addCreatureMoodSelection()
          .addCreatureSelfAwareness()
          .build();

        expect(prompt).toContain('CREATURE MOOD SELECTION');
        expect(prompt).toContain('CREATURE SELF-AWARENESS');
      });
    });

    it('provider switching preserves section content', () => {
      const sections = [
        () => new MiraSystemPromptBuilder({ provider: 'claude' }).addIntroduction(),
        () =>
          new MiraSystemPromptBuilder({ provider: 'openai-gpt' }).addIntroduction(),
        () =>
          new MiraSystemPromptBuilder({ provider: 'google-gemini' }).addIntroduction(),
      ];

      const prompts = sections.map((fn) => fn().build());

      // All should have the same introduction content
      prompts.forEach((prompt) => {
        expect(prompt).toContain('Dr. Mira Petrovic');
        expect(prompt).toContain('deep-sea researcher');
      });
    });
  });
});
