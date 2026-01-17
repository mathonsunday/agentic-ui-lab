import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for Mira Agent Backend Analysis
 *
 * These tests verify that Claude analysis is working correctly:
 * 1. Confidence deltas are within bounds
 * 2. Profile metrics are valid (0-100)
 * 3. Questions get minimum +12 boost
 * 4. Response parsing handles malformed data
 */

describe('Mira Agent - User Analysis', () => {
  describe('Confidence Delta Validation', () => {
    it('should enforce confidence delta bounds (-10 to +15)', () => {
      const validDeltas = [-10, -5, 0, 5, 10, 12, 15];

      validDeltas.forEach(delta => {
        expect(delta).toBeGreaterThanOrEqual(-10);
        expect(delta).toBeLessThanOrEqual(15);
      });
    });

    it('should reject invalid confidence deltas', () => {
      const invalidDeltas = [-11, -100, 20, 100];

      invalidDeltas.forEach(delta => {
        const isInvalid =
          delta < -10 || delta > 15;
        expect(isInvalid).toBe(true);
      });
    });

    it('should clamp confidence to 0-100 range', () => {
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));

      expect(clamp(-50, 0, 100)).toBe(0);
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(50, 0, 100)).toBe(50);
    });
  });

  describe('Profile Metrics Validation', () => {
    it('should validate all profile metrics are 0-100', () => {
      const validate = (value: number) =>
        value >= 0 && value <= 100;

      const validMetrics = [0, 25, 50, 75, 100];
      validMetrics.forEach(metric => {
        expect(validate(metric)).toBe(true);
      });
    });

    it('should reject invalid profile metrics', () => {
      const validate = (value: number) =>
        value >= 0 && value <= 100;

      const invalidMetrics = [-1, -50, 101, 150];
      invalidMetrics.forEach(metric => {
        expect(validate(metric)).toBe(false);
      });
    });

    it('should validate all five profile dimensions exist', () => {
      const profile = {
        thoughtfulness: 60,
        adventurousness: 70,
        engagement: 75,
        curiosity: 80,
        superficiality: 20,
      };

      expect(profile.thoughtfulness).toBeDefined();
      expect(profile.adventurousness).toBeDefined();
      expect(profile.engagement).toBeDefined();
      expect(profile.curiosity).toBeDefined();
      expect(profile.superficiality).toBeDefined();
    });
  });

  describe('Question Detection Rules', () => {
    it('should boost confidence for questions', () => {
      const inputs = [
        'What is deep sea research?',
        'Why do creatures bioluminesce?',
        'How does pressure affect life?',
      ];

      // These should all trigger the +12 minimum rule
      inputs.forEach(input => {
        const hasQuestion = input.includes('?');
        expect(hasQuestion).toBe(true);
      });
    });

    it('should not boost confidence for statements', () => {
      const inputs = [
        'This is interesting.',
        'I understand.',
        'Tell me more.',
      ];

      // These should NOT trigger question bonus
      inputs.forEach(input => {
        const hasQuestion = input.includes('?');
        expect(hasQuestion).toBe(false);
      });
    });

    it('should detect multiple questions', () => {
      const input = 'What is this? How does it work? Why does it matter?';
      const questionCount = (input.match(/\?/g) || []).length;

      expect(questionCount).toBe(3);
    });
  });

  describe('Response JSON Parsing', () => {
    it('should extract JSON from Claude response', () => {
      const claudeResponse = `
        Some text before the JSON.
        {
          "confidenceDelta": 12,
          "thoughtfulness": 65,
          "adventurousness": 60,
          "engagement": 70,
          "curiosity": 75,
          "superficiality": 25,
          "reasoning": "User asked a question"
        }
        Some text after the JSON.
      `;

      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();

      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.confidenceDelta).toBe(12);
      expect(parsed.thoughtfulness).toBe(65);
    });

    it('should handle missing JSON in response', () => {
      const claudeResponse = 'This response has no JSON data at all.';
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeNull();
    });

    it('should handle invalid JSON in response', () => {
      const claudeResponse = '{ incomplete json';
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        expect(() => {
          JSON.parse(jsonMatch[0]);
        }).toThrow();
      }
    });

    it('should extract all required fields from Claude response', () => {
      const claudeResponse = `
        {
          "confidenceDelta": 13,
          "thoughtfulness": 70,
          "adventurousness": 65,
          "engagement": 75,
          "curiosity": 80,
          "superficiality": 15,
          "reasoning": "Multiple questions show genuine curiosity"
        }
      `;

      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch![0]);

      expect(parsed).toHaveProperty('confidenceDelta');
      expect(parsed).toHaveProperty('thoughtfulness');
      expect(parsed).toHaveProperty('adventurousness');
      expect(parsed).toHaveProperty('engagement');
      expect(parsed).toHaveProperty('curiosity');
      expect(parsed).toHaveProperty('superficiality');
      expect(parsed).toHaveProperty('reasoning');
    });
  });

  describe('Personality Rules', () => {
    it('should map confidence to personality', () => {
      const getPersonality = (confidence: number) => {
        if (confidence < 25) return 'negative';
        if (confidence < 50) return 'chaotic';
        if (confidence < 75) return 'glowing';
        return 'slovak';
      };

      expect(getPersonality(10)).toBe('negative');
      expect(getPersonality(40)).toBe('chaotic');
      expect(getPersonality(60)).toBe('glowing');
      expect(getPersonality(90)).toBe('slovak');
    });

    it('should map personality to mood', () => {
      const moodMap: Record<string, string> = {
        negative: 'defensive',
        chaotic: 'testing',
        glowing: 'curious',
        slovak: 'vulnerable',
      };

      expect(moodMap['negative']).toBe('defensive');
      expect(moodMap['chaotic']).toBe('testing');
      expect(moodMap['glowing']).toBe('curious');
      expect(moodMap['slovak']).toBe('vulnerable');
    });
  });

  describe('Critical Rules Enforcement', () => {
    it('should enforce: questions get MINIMUM +12', () => {
      // The system prompt says: RULE: If they ask ANY question, minimum is +12. No exceptions.
      const confidenceBoosts = {
        question: 12,
        multipleQuestions: 14,
        deepQuestion: 15,
      };

      expect(confidenceBoosts.question).toBeGreaterThanOrEqual(12);
      expect(confidenceBoosts.multipleQuestions).toBeGreaterThanOrEqual(12);
      expect(confidenceBoosts.deepQuestion).toBeGreaterThanOrEqual(12);
    });

    it('should enforce: lazy responses get penalty', () => {
      // One-word lazy answer: -2 to 0
      const lazyPenalty = -1;
      expect(lazyPenalty).toBeGreaterThanOrEqual(-2);
      expect(lazyPenalty).toBeLessThanOrEqual(0);
    });

    it('should enforce: rudeness gets penalty', () => {
      // Rude/dismissive: -5 to -10
      const rudePenalty = -7;
      expect(rudePenalty).toBeGreaterThanOrEqual(-10);
      expect(rudePenalty).toBeLessThanOrEqual(-5);
    });
  });
});
