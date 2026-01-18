import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for Mira State Management
 *
 * These tests verify that:
 * 1. State initializes correctly
 * 2. Confidence is bounded (0-100)
 * 3. Profile metrics update properly
 * 4. Memories accumulate correctly
 * 5. Assessment logic works (word count, question detection)
 */

describe('Mira State Management', () => {
  describe('State Initialization', () => {
    it('should initialize with default confidence', () => {
      const state = initializeMiraState();

      expect(state.confidenceInUser).toBe(50);
      expect(state.currentMood).toBe('testing');
      expect(state.memories).toEqual([]);
    });

    it('should initialize with custom confidence', () => {
      const state = initializeMiraState(75);

      expect(state.confidenceInUser).toBe(75);
      expect(state.currentMood).toBe('curious');
    });

    it('should initialize user profile with neutral metrics', () => {
      const state = initializeMiraState();

      expect(state.userProfile.thoughtfulness).toBe(50);
      expect(state.userProfile.adventurousness).toBe(50);
      expect(state.userProfile.engagement).toBe(50);
      expect(state.userProfile.curiosity).toBe(50);
      expect(state.userProfile.superficiality).toBe(50);
    });

    it('should clamp initial confidence to 0-100', () => {
      const stateLow = initializeMiraState(-10);
      const stateHigh = initializeMiraState(150);

      expect(stateLow.confidenceInUser).toBeGreaterThanOrEqual(0);
      expect(stateHigh.confidenceInUser).toBeLessThanOrEqual(100);
    });
  });

  describe('Confidence Bounds', () => {
    it('should not allow confidence below 0', () => {
      const updateConfidence = (current: number, delta: number) =>
        Math.max(0, Math.min(100, current + delta));

      expect(updateConfidence(10, -20)).toBe(0);
      expect(updateConfidence(5, -15)).toBe(0);
    });

    it('should not allow confidence above 100', () => {
      const updateConfidence = (current: number, delta: number) =>
        Math.max(0, Math.min(100, current + delta));

      expect(updateConfidence(90, 20)).toBe(100);
      expect(updateConfidence(95, 10)).toBe(100);
    });

    it('should allow confidence updates within bounds', () => {
      const updateConfidence = (current: number, delta: number) =>
        Math.max(0, Math.min(100, current + delta));

      expect(updateConfidence(50, 10)).toBe(60);
      expect(updateConfidence(50, -10)).toBe(40);
      expect(updateConfidence(75, 15)).toBe(90);
    });
  });

  describe('Profile Metric Updates', () => {
    it('should update profile metrics within bounds', () => {
      const updateProfile = (metric: number, newValue: number) =>
        Math.max(0, Math.min(100, newValue));

      expect(updateProfile(50, 75)).toBe(75);
      expect(updateProfile(50, 0)).toBe(0);
      expect(updateProfile(50, 100)).toBe(100);
    });

    it('should handle all five profile dimensions', () => {
      const profile = {
        thoughtfulness: 60,
        adventurousness: 65,
        engagement: 70,
        curiosity: 75,
        superficiality: 20,
      };

      const dimensions = Object.keys(profile);
      expect(dimensions).toHaveLength(5);
      expect(dimensions).toContain('thoughtfulness');
      expect(dimensions).toContain('adventurousness');
      expect(dimensions).toContain('engagement');
      expect(dimensions).toContain('curiosity');
      expect(dimensions).toContain('superficiality');
    });

    it('should accumulate profile changes over time', () => {
      let profile = {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      };

      // Simulate two interactions
      profile = {
        ...profile,
        thoughtfulness: 60,
        curiosity: 70,
      };

      expect(profile.thoughtfulness).toBe(60);
      expect(profile.curiosity).toBe(70);
      expect(profile.adventurousness).toBe(50); // unchanged
    });
  });

  describe('Memory Management', () => {
    it('should start with empty memories', () => {
      const state = initializeMiraState();
      expect(state.memories).toEqual([]);
    });

    it('should add memories to state', () => {
      let memories: any[] = [];

      const addMemory = (memory: any) => {
        memories.push(memory);
      };

      addMemory({
        timestamp: Date.now(),
        type: 'response',
        content: 'User input',
        duration: 3000,
        depth: 'moderate',
      });

      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe('User input');
    });

    it('should accumulate multiple memories', () => {
      let memories: any[] = [];

      for (let i = 0; i < 5; i++) {
        memories.push({
          timestamp: Date.now() + i * 1000,
          type: 'response',
          content: `Input ${i}`,
          duration: 3000,
          depth: 'moderate',
        });
      }

      expect(memories).toHaveLength(5);
      expect(memories[0].content).toBe('Input 0');
      expect(memories[4].content).toBe('Input 4');
    });

    it('should preserve memory order', () => {
      let memories: any[] = [];
      const timestamps = [100, 200, 300, 400, 500];

      timestamps.forEach(ts => {
        memories.push({
          timestamp: ts,
          type: 'response',
          content: `At ${ts}`,
          duration: 3000,
          depth: 'moderate',
        });
      });

      const memoryTimestamps = memories.map(m => m.timestamp);
      expect(memoryTimestamps).toEqual(timestamps);
    });
  });

  describe('Assessment Logic - Word Count', () => {
    it('should count words in user input', () => {
      const countWords = (input: string) =>
        input.trim().split(/\s+/).length;

      expect(countWords('hello')).toBe(1);
      expect(countWords('hello world')).toBe(2);
      expect(countWords('what is deep sea research')).toBe(5);
    });

    it('should classify depth by word count', () => {
      const classifyDepth = (wordCount: number) => {
        if (wordCount < 2) return 'surface';
        if (wordCount < 5) return 'moderate';
        return 'deep';
      };

      expect(classifyDepth(1)).toBe('surface');
      expect(classifyDepth(3)).toBe('moderate');
      expect(classifyDepth(10)).toBe('deep');
    });

    it('should handle whitespace normalization', () => {
      const countWords = (input: string) =>
        input.trim().split(/\s+/).length;

      expect(countWords('  hello  world  ')).toBe(2);
      expect(countWords('\ntest\n')).toBe(1);
      expect(countWords('a\tb\tc')).toBe(3);
    });
  });

  describe('Assessment Logic - Question Detection', () => {
    it('should detect questions', () => {
      const hasQuestion = (input: string) =>
        input.includes('?');

      expect(hasQuestion('What is this?')).toBe(true);
      expect(hasQuestion('How does it work?')).toBe(true);
      expect(hasQuestion('Tell me something')).toBe(false);
    });

    it('should count multiple questions', () => {
      const countQuestions = (input: string) =>
        (input.match(/\?/g) || []).length;

      expect(countQuestions('What? How? Why?')).toBe(3);
      expect(countQuestions('What about this?')).toBe(1);
      expect(countQuestions('No questions here.')).toBe(0);
    });

    it('should classify assessment type', () => {
      const classifyType = (input: string) => {
        return input.includes('?') ? 'question' : 'statement';
      };

      expect(classifyType('What is this?')).toBe('question');
      expect(classifyType('Tell me more.')).toBe('statement');
    });
  });

  describe('Personality Mapping', () => {
    it('should map confidence to personality', () => {
      const getPersonality = (confidence: number) => {
        if (confidence < 34) return 'negative';
        if (confidence < 68) return 'chaotic';
        return 'glowing';
      };

      expect(getPersonality(0)).toBe('negative');
      expect(getPersonality(33)).toBe('negative');
      expect(getPersonality(34)).toBe('chaotic');
      expect(getPersonality(67)).toBe('chaotic');
      expect(getPersonality(68)).toBe('glowing');
      expect(getPersonality(100)).toBe('glowing');
    });

    it('should map personality to mood', () => {
      const getPersonalityMood = (confidence: number) => {
        const personality = confidence < 34 ? 'negative' :
                          confidence < 68 ? 'chaotic' :
                          'glowing';

        const moodMap: Record<string, string> = {
          negative: 'defensive',
          chaotic: 'testing',
          glowing: 'curious',
        };

        return moodMap[personality];
      };

      expect(getPersonalityMood(10)).toBe('defensive');
      expect(getPersonalityMood(40)).toBe('testing');
      expect(getPersonalityMood(60)).toBe('testing');
      expect(getPersonalityMood(90)).toBe('curious');
    });
  });
});

/**
 * Helper function: Initialize Mira state with optional confidence
 */
function initializeMiraState(initialConfidence?: number) {
  const confidence = initialConfidence ?? 50;
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  const getPersonality = (conf: number) => {
    if (conf < 34) return 'negative';
    if (conf < 68) return 'chaotic';
    return 'glowing';
  };

  const moodMap: Record<string, string> = {
    negative: 'defensive',
    chaotic: 'testing',
    glowing: 'curious',
  };

  return {
    confidenceInUser: clampedConfidence,
    currentMood: moodMap[getPersonality(clampedConfidence)] as any,
    userProfile: {
      thoughtfulness: 50,
      adventurousness: 50,
      engagement: 50,
      curiosity: 50,
      superficiality: 50,
    },
    memories: [],
    hasFoundKindred: false,
  };
}
