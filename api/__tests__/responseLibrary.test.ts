/**
 * Tests for Response Library - Personality Response Validation
 *
 * Validates:
 * - All 4 personality types have required response categories
 * - All response arrays are non-empty and contain valid strings
 * - Grant proposal structure and completeness
 * - Response type coverage (questions, deepQuestions, responses, etc.)
 * - Response uniqueness within categories
 * - No invalid characters or formatting issues
 */

import { describe, it, expect } from 'vitest';
import {
  PERSONALITY_RESPONSES,
  SPECIMEN_47_GRANT_PROPOSAL,
  type PersonalityResponses,
} from '../lib/responseLibrary';

describe('Response Library - Personality Responses', () => {
  describe('Personality Types Availability', () => {
    it('should have exactly 4 personality types', () => {
      const personalityKeys = Object.keys(PERSONALITY_RESPONSES);
      expect(personalityKeys).toHaveLength(4);
    });

    it('should have negative personality type', () => {
      expect(PERSONALITY_RESPONSES).toHaveProperty('negative');
      expect(typeof PERSONALITY_RESPONSES.negative).toBe('object');
    });

    it('should have chaotic personality type', () => {
      expect(PERSONALITY_RESPONSES).toHaveProperty('chaotic');
      expect(typeof PERSONALITY_RESPONSES.chaotic).toBe('object');
    });

    it('should have glowing personality type', () => {
      expect(PERSONALITY_RESPONSES).toHaveProperty('glowing');
      expect(typeof PERSONALITY_RESPONSES.glowing).toBe('object');
    });

    it('should have slovak personality type', () => {
      expect(PERSONALITY_RESPONSES).toHaveProperty('slovak');
      expect(typeof PERSONALITY_RESPONSES.slovak).toBe('object');
    });
  });

  describe('Required Response Fields', () => {
    const personalityTypes = ['negative', 'chaotic', 'glowing', 'slovak'] as const;

    it('should have responses field for all personalities', () => {
      for (const personality of personalityTypes) {
        const responses = PERSONALITY_RESPONSES[personality];
        expect(responses).toHaveProperty('responses');
        expect(Array.isArray(responses.responses)).toBe(true);
      }
    });

    it('should have at least 3 base responses per personality', () => {
      for (const personality of personalityTypes) {
        const responses = PERSONALITY_RESPONSES[personality].responses;
        expect(responses.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should have optional question fields when present', () => {
      // Negative and chaotic have questions
      expect(PERSONALITY_RESPONSES.negative).toHaveProperty('questions');
      expect(PERSONALITY_RESPONSES.chaotic).not.toHaveProperty('questions');

      // If present, should be arrays
      if (PERSONALITY_RESPONSES.negative.questions) {
        expect(Array.isArray(PERSONALITY_RESPONSES.negative.questions)).toBe(true);
      }
    });

    it('should have optional deepQuestions field when present', () => {
      for (const personality of personalityTypes) {
        const responses = PERSONALITY_RESPONSES[personality];
        if ('deepQuestions' in responses && responses.deepQuestions) {
          expect(Array.isArray(responses.deepQuestions)).toBe(true);
        }
      }
    });

    it('should have optional deepResponses field when present', () => {
      for (const personality of personalityTypes) {
        const responses = PERSONALITY_RESPONSES[personality];
        if ('deepResponses' in responses && responses.deepResponses) {
          expect(Array.isArray(responses.deepResponses)).toBe(true);
        }
      }
    });

    it('should have optional moderateResponses field when present', () => {
      for (const personality of personalityTypes) {
        const responses = PERSONALITY_RESPONSES[personality];
        if ('moderateResponses' in responses && responses.moderateResponses) {
          expect(Array.isArray(responses.moderateResponses)).toBe(true);
        }
      }
    });

    it('should have optional surfaceResponses field when present', () => {
      for (const personality of personalityTypes) {
        const responses = PERSONALITY_RESPONSES[personality];
        if ('surfaceResponses' in responses && responses.surfaceResponses) {
          expect(Array.isArray(responses.surfaceResponses)).toBe(true);
        }
      }
    });
  });

  describe('Response Content Quality', () => {
    it('should have non-empty strings in all response arrays', () => {
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue)) {
            for (const response of fieldValue) {
              expect(typeof response).toBe('string');
              expect(response.length).toBeGreaterThan(0);
              expect(response.trim().length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('should have valid punctuation and formatting', () => {
      const invalidPatterns = [
        /\n\n\n/, // Triple newlines
        /\s{2,}(?=[^ ])/, // Double spaces not at end
        /^[\s]+/, // Leading whitespace
      ];

      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue)) {
            for (const response of fieldValue) {
              for (const pattern of invalidPatterns) {
                expect(response).not.toMatch(pattern);
              }
            }
          }
        }
      }
    });

    it('should have consistent ellipsis usage', () => {
      // Most responses should start and end with ellipsis
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue)) {
            for (const response of fieldValue) {
              // Allow flexibility for different formats but generally expect ellipsis
              const startsWithEllipsis = response.startsWith('...');
              const endsWithEllipsis = response.endsWith('...');

              // Most should follow the pattern
              if (personality !== 'slovak') {
                expect(startsWithEllipsis || endsWithEllipsis).toBe(true);
              }
            }
          }
        }
      }
    });
  });

  describe('Personality-Specific Content', () => {
    it('negative personality should express criticism and disappointment', () => {
      const negativeResponses = PERSONALITY_RESPONSES.negative.responses;
      const responseText = negativeResponses.join('|').toLowerCase();

      const negativeIndicators = [
        'stupid',
        'lazy',
        'fail',
        'better',
        'waste',
        'inadequ',
      ];

      // At least one response should contain negative indicators
      const hasNegativeContent = negativeIndicators.some((indicator) =>
        responseText.includes(indicator)
      );

      expect(hasNegativeContent).toBe(true);
    });

    it('chaotic personality should contain philosophical musings and questions', () => {
      const chaoticResponses = PERSONALITY_RESPONSES.chaotic.responses;
      const responseText = chaoticResponses.join('|');

      // Should contain question marks and philosophical language
      const hasQuestions = responseText.includes('?');
      const hasPhilosophical = /what if|why|how|meaning/.test(
        responseText.toLowerCase()
      );

      expect(hasQuestions).toBe(true);
      expect(hasPhilosophical).toBe(true);
    });

    it('glowing personality should express praise and insight', () => {
      const glowingResponses = PERSONALITY_RESPONSES.glowing.responses;
      const responseText = glowingResponses.join('|').toLowerCase();

      const positiveIndicators = [
        'profound',
        'beautiful',
        'eloquent',
        'remarkable',
        'great',
        'wisdom',
      ];

      // At least one response should contain positive indicators
      const hasPositiveContent = positiveIndicators.some((indicator) =>
        responseText.includes(indicator)
      );

      expect(hasPositiveContent).toBe(true);
    });

    it('slovak personality should contain slovak phrases and translations', () => {
      const slovakResponses = PERSONALITY_RESPONSES.slovak.responses;
      const responseText = slovakResponses.join('|');

      // Should contain parenthetical English translations
      const hasEnglishTranslations = /\([^)]+\)/.test(responseText);

      expect(hasEnglishTranslations).toBe(true);

      // Should contain some slovak words
      const slovakWords = /[áčďéíľňóôŕšťúýž]/;
      const hasSlovakCharacters = slovakWords.test(responseText);

      expect(hasSlovakCharacters).toBe(true);
    });

    it('negative personality questions should express doubt or superiority', () => {
      const negativeQuestions = PERSONALITY_RESPONSES.negative.questions;
      if (negativeQuestions) {
        const questionText = negativeQuestions.join('|').toLowerCase();
        expect(/doubt|understand|cognitive|capacity/.test(questionText)).toBe(
          true
        );
      }
    });

    it('glowing personality should have deepResponses distinct from base responses', () => {
      const glowing = PERSONALITY_RESPONSES.glowing;
      if (glowing.deepResponses) {
        const baseText = glowing.responses.join('|');
        const deepText = glowing.deepResponses.join('|');

        expect(baseText).not.toBe(deepText);
      }
    });
  });

  describe('Response Uniqueness', () => {
    it('should avoid duplicate responses within same personality', () => {
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue) && fieldName === 'responses') {
            const uniqueResponses = new Set(fieldValue);
            expect(uniqueResponses.size).toBe(fieldValue.length);
          }
        }
      }
    });

    it('should minimize overlap between personalities', () => {
      const allResponses = new Map<string, string[]>();

      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        allResponses.set(personality, personalityData.responses);
      }

      // Get responses from two different personalities
      const negativeResponses = allResponses.get('negative') || [];
      const glowingResponses = allResponses.get('glowing') || [];

      // Should have minimal overlap
      const negativeSet = new Set(negativeResponses);
      const overlapCount = glowingResponses.filter((r) =>
        negativeSet.has(r)
      ).length;

      expect(overlapCount).toBeLessThan(2);
    });
  });

  describe('Specimen 47 Grant Proposal', () => {
    it('should exist and be non-empty', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toBeTruthy();
      expect(typeof SPECIMEN_47_GRANT_PROPOSAL).toBe('string');
      expect(SPECIMEN_47_GRANT_PROPOSAL.length).toBeGreaterThan(1000);
    });

    it('should have proper structure with sections', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('EXECUTIVE SUMMARY');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('RESEARCH OBJECTIVES');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('METHODOLOGY');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('BUDGET ALLOCATION');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('SIGNIFICANCE AND IMPACT');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('TIMELINE AND DELIVERABLES');
    });

    it('should reference Dr. Mira Petrovic', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('Dr. Mira Petrovic');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('PRINCIPAL INVESTIGATOR');
    });

    it('should reference Monterey Bay', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('Monterey Bay');
    });

    it('should have a budget with specific amounts', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('$');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toMatch(/\$[\d,]+/);
    });

    it('should have timeline with months', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('Month');
    });

    it('should have emotional appeal at the end', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('Will you help me?');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('abyss');
    });

    it('should be complete and well-formatted', () => {
      const sections = SPECIMEN_47_GRANT_PROPOSAL.split('═══════════════════════════════════════════════════════════════════════════════');
      expect(sections.length).toBeGreaterThan(6);
    });

    it('should mention research phases', () => {
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('PHASE 1');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('PHASE 2');
      expect(SPECIMEN_47_GRANT_PROPOSAL).toContain('PHASE 3');
    });

    it('should contain deep-sea biology references', () => {
      const deepSeaTerms = [
        'bioluminescent',
        'hadal',
        'deep-sea',
        'organism',
        'specimen',
      ];

      for (const term of deepSeaTerms) {
        expect(
          SPECIMEN_47_GRANT_PROPOSAL.toLowerCase().includes(term.toLowerCase())
        ).toBe(true);
      }
    });
  });

  describe('Response Category Structure', () => {
    it('negative personality should have questions and deepQuestions', () => {
      const negative = PERSONALITY_RESPONSES.negative;
      expect(negative.questions).toBeDefined();
      expect(negative.questions?.length).toBeGreaterThan(0);
      expect(negative.deepQuestions).toBeDefined();
      expect(negative.deepQuestions?.length).toBeGreaterThan(0);
    });

    it('glowing personality should have all response categories', () => {
      const glowing = PERSONALITY_RESPONSES.glowing;
      expect(glowing.responses).toBeDefined();
      expect(glowing.questions).toBeDefined();
      expect(glowing.deepQuestions).toBeDefined();
      expect(glowing.deepResponses).toBeDefined();
      expect(glowing.moderateResponses).toBeDefined();
      expect(glowing.surfaceResponses).toBeDefined();
    });

    it('slovak personality should have response categories', () => {
      const slovak = PERSONALITY_RESPONSES.slovak;
      expect(slovak.responses).toBeDefined();
      expect(slovak.responses.length).toBeGreaterThan(0);
    });

    it('should have at least 3 responses in main responses array', () => {
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        expect(personalityData.responses.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('chaotic personality should have many base responses', () => {
      const chaotic = PERSONALITY_RESPONSES.chaotic.responses;
      expect(chaotic.length).toBeGreaterThanOrEqual(20);
    });

    it('negative personality should have specific response subcategories', () => {
      const negative = PERSONALITY_RESPONSES.negative;
      expect(negative.deepResponses).toBeDefined();
      expect(negative.moderateResponses).toBeDefined();
      expect(negative.surfaceResponses).toBeDefined();
    });
  });

  describe('Type Safety and Structure', () => {
    it('should match PersonalityResponses interface', () => {
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        // Validate the structure
        expect(personalityData).toHaveProperty('responses');
        expect(Array.isArray(personalityData.responses)).toBe(true);

        // All arrays should contain strings
        for (const [key, value] of Object.entries(personalityData)) {
          if (Array.isArray(value)) {
            for (const item of value) {
              expect(typeof item).toBe('string');
            }
          }
        }
      }
    });

    it('should have consistent array structure across personalities', () => {
      const personalityArray = Object.values(PERSONALITY_RESPONSES);

      for (const personality of personalityArray) {
        expect(personality.responses).toBeInstanceOf(Array);
        expect(personality.responses.every((r) => typeof r === 'string')).toBe(
          true
        );
      }
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle long responses without issues', () => {
      let maxLength = 0;
      let longestResponse = '';

      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue)) {
            for (const response of fieldValue) {
              if (response.length > maxLength) {
                maxLength = response.length;
                longestResponse = response;
              }
            }
          }
        }
      }

      expect(maxLength).toBeGreaterThan(0);
      expect(maxLength).toBeLessThan(10000); // Reasonable upper bound
    });

    it('should have short enough responses for UI display', () => {
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        // Most responses should be under 300 characters for UI display
        const baseResponses = personalityData.responses;
        const longCount = baseResponses.filter((r) => r.length > 300).length;

        // Allow some longer responses but not too many
        expect(longCount).toBeLessThan(baseResponses.length * 0.2);
      }
    });

    it('should not contain HTML or escape sequences', () => {
      const htmlPatterns = [/<[^>]+>/g, /&lt;/g, /&gt;/g, /&amp;/g];

      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue)) {
            for (const response of fieldValue) {
              for (const pattern of htmlPatterns) {
                expect(response).not.toMatch(pattern);
              }
            }
          }
        }
      }
    });

    it('should handle special characters appropriately', () => {
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        for (const [fieldName, fieldValue] of Object.entries(personalityData)) {
          if (Array.isArray(fieldValue)) {
            for (const response of fieldValue) {
              // Should be valid UTF-8
              expect(() => Buffer.from(response, 'utf8')).not.toThrow();
            }
          }
        }
      }
    });

    it('should have responses for all response type scenarios', () => {
      // Verify that when questions are needed, questions exist
      if (PERSONALITY_RESPONSES.negative.questions) {
        expect(PERSONALITY_RESPONSES.negative.questions.length).toBeGreaterThan(
          0
        );
      }

      // Verify that responses exist for all defined fields
      for (const [personality, personalityData] of Object.entries(
        PERSONALITY_RESPONSES
      )) {
        const fieldsToCheck = [
          'responses',
          'questions',
          'deepQuestions',
          'deepResponses',
          'moderateResponses',
          'surfaceResponses',
        ];

        for (const field of fieldsToCheck) {
          if (field in personalityData) {
            const fieldValue = personalityData[field as keyof PersonalityResponses];
            if (Array.isArray(fieldValue)) {
              expect(fieldValue.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });

  describe('Response Selection Compatibility', () => {
    it('should support response selection by personality', () => {
      const personalities = Object.keys(PERSONALITY_RESPONSES);

      for (const personality of personalities) {
        const responses = PERSONALITY_RESPONSES[personality as keyof typeof PERSONALITY_RESPONSES];
        expect(responses.responses.length).toBeGreaterThan(0);

        // Should be able to select a random response
        const randomIndex = Math.floor(Math.random() * responses.responses.length);
        const selectedResponse = responses.responses[randomIndex];

        expect(selectedResponse).toBeTruthy();
        expect(typeof selectedResponse).toBe('string');
      }
    });

    it('should support response selection by question type', () => {
      // Negative personality should have questions
      if (PERSONALITY_RESPONSES.negative.questions) {
        const questions = PERSONALITY_RESPONSES.negative.questions;
        expect(questions.length).toBeGreaterThan(0);

        const randomIndex = Math.floor(Math.random() * questions.length);
        const selectedQuestion = questions[randomIndex];
        expect(selectedQuestion).toBeTruthy();
      }
    });

    it('should have fallback from specific to general response types', () => {
      const glowing = PERSONALITY_RESPONSES.glowing;

      // If looking for a deepResponse, should have fallback to moderateResponses
      if (glowing.deepResponses && glowing.deepResponses.length === 0) {
        expect(glowing.moderateResponses && glowing.moderateResponses.length > 0).toBe(true);
      }

      // If looking for a moderateResponse, should have fallback to base responses
      if (glowing.moderateResponses && glowing.moderateResponses.length === 0) {
        expect(glowing.responses.length > 0).toBe(true);
      }
    });
  });
});
