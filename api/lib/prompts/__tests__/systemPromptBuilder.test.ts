/**
 * Tests for System Prompt Builder
 * Ensures each prompt section works correctly and can be composed
 */

import { describe, it, expect } from 'vitest';
import {
  MiraSystemPromptBuilder,
  createAdvancedMiraPrompt,
  createBasicMiraPrompt,
} from '../systemPromptBuilder.js';
import type { MiraState } from '../../types.js';

// Mock MiraState for testing
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

describe('MiraSystemPromptBuilder', () => {
  describe('Basic Construction', () => {
    it('builds an empty prompt', () => {
      const prompt = new MiraSystemPromptBuilder().build();
      expect(prompt).toBe('');
    });

    it('builds a prompt with single section', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addIntroduction()
        .build();

      expect(prompt).toContain('Dr. Mira Petrovic');
      expect(prompt).toContain('deep-sea researcher');
    });

    it('builds a prompt with multiple sections', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      expect(prompt).toContain('Dr. Mira Petrovic');
      expect(prompt).toContain('GLOWING');
      expect(prompt).toContain('CRITICAL MINDSET');
      expect(prompt).toContain('Return ONLY valid JSON');
    });
  });

  describe('Voice Examples', () => {
    it('includes negative voice examples', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addVoiceExamples('negative')
        .build();

      expect(prompt).toContain('NEGATIVE');
      expect(prompt).toContain('starfish');
      expect(prompt).toContain('dismissive');
    });

    it('includes chaotic voice examples', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addVoiceExamples('chaotic')
        .build();

      expect(prompt).toContain('CHAOTIC');
      expect(prompt).toContain('Philosophical rambling');
      expect(prompt).toContain('existential questions');
    });

    it('includes glowing voice examples', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addVoiceExamples('glowing')
        .build();

      expect(prompt).toContain('GLOWING');
      expect(prompt).toContain('nine brains');
      expect(prompt).toContain('UNHINGED REVERENCE');
    });

    it('can swap voice examples', () => {
      const builder = new MiraSystemPromptBuilder();
      const negative = builder
        .addVoiceExamples('negative')
        .build();
      builder.clear();

      const glowing = builder
        .addVoiceExamples('glowing')
        .build();

      expect(negative).not.toContain('nine brains');
      expect(glowing).toContain('nine brains');
      expect(negative).toContain('starfish');
      expect(glowing).not.toContain('starfish');
    });
  });

  describe('Scoring Rules', () => {
    it('includes detailed scoring', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addDetailedScoringRules()
        .build();

      expect(prompt).toContain('EXCELLENT (+13 to +15)');
      expect(prompt).toContain('GOOD (+10 to +12)');
      expect(prompt).toContain('BASIC (+6 to +9)');
      expect(prompt).toContain('VERY NEGATIVE (-5 to -10)');
    });

    it('includes basic scoring', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addBasicScoringRules()
        .build();

      expect(prompt).toContain('ANY question');
      expect(prompt).toContain('minimum is +12');
      expect(prompt).toContain('No exceptions');
    });

    it('detailed and basic scoring are different', () => {
      const detailed = new MiraSystemPromptBuilder()
        .addDetailedScoringRules()
        .build();

      const builder = new MiraSystemPromptBuilder();
      const basic = builder
        .addBasicScoringRules()
        .build();

      expect(detailed).not.toBe(basic);
      expect(detailed).toContain('EXCELLENT');
      expect(basic).not.toContain('EXCELLENT');
    });
  });

  describe('Context Injection', () => {
    it('injects current confidence level', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addContextInjection(mockMiraState, 5, 3)
        .build();

      expect(prompt).toContain('50%');
      expect(prompt).toContain('Current confidence');
    });

    it('injects message and tool counts', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addContextInjection(mockMiraState, 5, 3)
        .build();

      expect(prompt).toContain('Message count: 5');
      expect(prompt).toContain('Tool interactions: 3');
    });

    it('injects user profile', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addContextInjection(mockMiraState, 1, 0)
        .build();

      expect(prompt).toContain('thoughtfulness');
      expect(prompt).toContain('curiosity');
    });

    it('changes based on interaction counts', () => {
      const builder1 = new MiraSystemPromptBuilder();
      const prompt1 = builder1
        .addContextInjection(mockMiraState, 5, 3)
        .build();

      const builder2 = new MiraSystemPromptBuilder();
      const prompt2 = builder2
        .addContextInjection(mockMiraState, 10, 2)
        .build();

      expect(prompt1).toContain('Message count: 5');
      expect(prompt2).toContain('Message count: 10');
      expect(prompt1).not.toBe(prompt2);
    });
  });

  describe('Mindset and Format', () => {
    it('includes critical mindset guidance', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addMindsetGuidance()
        .build();

      expect(prompt).toContain('CRITICAL MINDSET');
      expect(prompt).toContain('Be GENEROUS');
      expect(prompt).toContain('Questions = AT LEAST +12');
    });

    it('includes response format specification', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addResponseFormat()
        .build();

      expect(prompt).toContain('Return ONLY valid JSON');
      expect(prompt).toContain('confidenceDelta');
      expect(prompt).toContain('thoughtfulness');
      expect(prompt).toContain('reasoning');
    });
  });

  describe('Section Management', () => {
    it('tracks sections correctly', () => {
      const builder = new MiraSystemPromptBuilder();
      expect(builder.hasSection('introduction')).toBe(false);

      builder.addIntroduction();
      expect(builder.hasSection('introduction')).toBe(true);
    });

    it('returns sections in order', () => {
      const builder = new MiraSystemPromptBuilder()
        .addResponseFormat()
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addMindsetGuidance();

      const sections = builder.getSections();
      const titles = sections.map((s) => s.title);

      // Should be ordered by 'order' field, not insertion order
      expect(titles[0]).toBe('INTRODUCTION');
      expect(titles[titles.length - 1]).toBe('RESPONSE FORMAT');
    });

    it('can clear all sections', () => {
      const builder = new MiraSystemPromptBuilder()
        .addIntroduction()
        .addVoiceExamples('glowing')
        .addMindsetGuidance();

      expect(builder.getSections().length).toBe(3);

      builder.clear();
      expect(builder.getSections().length).toBe(0);
      expect(builder.build()).toBe('');
    });
  });

  describe('Advanced Prompt Construction', () => {
    it('creates production-ready advanced prompt', () => {
      const prompt = createAdvancedMiraPrompt(mockMiraState, 5, 3);

      // Should include all necessary sections
      expect(prompt).toContain('Dr. Mira Petrovic');
      expect(prompt).toContain('GLOWING');
      expect(prompt).toContain('EXCELLENT (+13 to +15)');
      expect(prompt).toContain('Message count: 5');
      expect(prompt).toContain('Return ONLY valid JSON');
    });

    it('creates basic prompt with fewer sections', () => {
      const basicPrompt = createBasicMiraPrompt(mockMiraState);

      // Should include core sections
      expect(basicPrompt).toContain('Dr. Mira Petrovic');
      expect(basicPrompt).toContain('GLOWING');
      expect(basicPrompt).toContain('Return ONLY valid JSON');

      // Should NOT include detailed context
      expect(basicPrompt).not.toContain('Message count');
    });

    it('advanced prompt is longer than basic prompt', () => {
      const advancedPrompt = createAdvancedMiraPrompt(mockMiraState, 5, 3);
      const basicPrompt = createBasicMiraPrompt(mockMiraState);

      expect(advancedPrompt.length).toBeGreaterThan(basicPrompt.length);
    });
  });

  describe('Fluent Interface', () => {
    it('supports method chaining', () => {
      const prompt = new MiraSystemPromptBuilder()
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
      expect(prompt.length).toBeGreaterThan(500); // Should be substantial
    });

    it('returns this for method chaining', () => {
      const builder = new MiraSystemPromptBuilder();
      const result = builder.addIntroduction();

      expect(result).toBe(builder);
    });
  });

  describe('Section Ordering', () => {
    it('maintains correct section order regardless of addition order', () => {
      const builder = new MiraSystemPromptBuilder()
        .addResponseFormat() // Added last
        .addMindsetGuidance() // Added second
        .addIntroduction(); // Added first

      const prompt = builder.build();
      const introIndex = prompt.indexOf('Dr. Mira Petrovic');
      const mindsetIndex = prompt.indexOf('CRITICAL MINDSET');
      const formatIndex = prompt.indexOf('Return ONLY valid JSON');

      // Introduction should come before mindset, mindset before format
      expect(introIndex).toBeLessThan(mindsetIndex);
      expect(mindsetIndex).toBeLessThan(formatIndex);
    });
  });
});
