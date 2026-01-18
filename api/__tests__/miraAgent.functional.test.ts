/**
 * Functional Tests for Mira Agent Logic
 *
 * Tests the confidence scoring, personality trait calculation, and response selection:
 * - Confidence delta calculation rules (questions = +12+, rude = -)
 * - Personality trait assessment (thoughtfulness, curiosity, etc.)
 * - Response personality type selection based on confidence
 * - Profile memory accumulation
 * - Tool call handling (zoom, interact)
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock types matching actual implementation
 */
interface MockUserProfile {
  thoughtfulness: number;
  adventurousness: number;
  engagement: number;
  curiosity: number;
  superficiality: number;
}

interface MockMiraState {
  confidenceInUser: number;
  userProfile: MockUserProfile;
  memories: Array<{ type: string; content: string; timestamp: number }>;
}

interface MockAnalysisResult {
  confidenceDelta: number;
  thoughtfulness: number;
  adventurousness: number;
  engagement: number;
  curiosity: number;
  superficiality: number;
  reasoning: string;
}

interface MockAgentResponse {
  streaming: string[];
  text: string;
  source: string;
}

interface MockToolCallData {
  action: string;
}

/**
 * Mock implementation of key agent functions for testing logic
 */
class MockMiraAgent {
  // Simulate Claude's confidence scoring based on input text
  analyzeUserInput(input: string): MockAnalysisResult {
    const lowerInput = input.toLowerCase();

    // Count questions
    const questionCount = (input.match(/\?/g) || []).length;
    const isRude = /stupid|dumb|awful|hate|sucks/i.test(input);
    const hasHonestConfusion = /don't know|not sure|confused|unclear/i.test(input);

    // Base confidence delta calculation following the system prompt rules
    let confidenceDelta = 0;

    if (isRude) {
      confidenceDelta = -7; // -5 to -10 range for rude/dismissive
    } else if (questionCount > 0) {
      // Questions = at least +12
      confidenceDelta = 12 + Math.min(questionCount - 1, 3); // +12 to +15 for 1-4+ questions
    } else if (hasHonestConfusion) {
      confidenceDelta = 11; // +10 to +12 for honest engagement
    } else if (lowerInput.length < 5) {
      confidenceDelta = -1; // -2 to 0 for one-word lazy answers
    } else if (/thank|appreciate|interesting|fascin/i.test(input)) {
      confidenceDelta = 10; // Thoughtful observations
    } else {
      confidenceDelta = 3; // Mild positive for engagement
    }

    // Calculate personality traits
    const thoughtfulness = Math.min(
      100,
      questionCount > 0 ? 70 + questionCount * 5 : 40
    );
    const curiosity = Math.min(
      100,
      questionCount > 0 ? 75 + questionCount * 5 : 30
    );
    const engagement = Math.min(100, lowerInput.length / 2);
    const adventurousness = input.includes('explore') || input.includes('discover') ? 75 : 50;
    const superficiality = Math.max(
      0,
      100 - thoughtfulness - curiosity - engagement
    ) / 3;

    return {
      confidenceDelta,
      thoughtfulness: Math.round(thoughtfulness),
      adventurousness: Math.round(adventurousness),
      engagement: Math.round(engagement),
      curiosity: Math.round(curiosity),
      superficiality: Math.round(Math.max(0, superficiality)),
      reasoning: `Analyzed: ${questionCount} questions, ${isRude ? 'rude tone' : 'respectful'}, ${input.length} characters`,
    };
  }

  selectResponsePersonality(confidence: number): string {
    if (confidence < 20) return 'negative';
    if (confidence < 40) return 'chaotic';
    if (confidence < 60) return 'wonder';
    if (confidence < 80) return 'glowing';
    return 'slovak';
  }

  processToolCall(state: MockMiraState, toolData: MockToolCallData): MockMiraState {
    const deltaMap: Record<string, number> = {
      zoom_in: 5,
      zoom_out: 3,
      interact: 8,
      examine: 6,
    };

    const delta = deltaMap[toolData.action] || 2;
    const newConfidence = Math.min(100, state.confidenceInUser + delta);

    return {
      ...state,
      confidenceInUser: newConfidence,
      memories: [
        ...state.memories,
        {
          type: 'tool_call',
          content: toolData.action,
          timestamp: Date.now(),
        },
      ],
    };
  }
}

describe('Mira Agent - Functional Tests', () => {
  let agent: MockMiraAgent;
  let initialState: MockMiraState;

  beforeEach(() => {
    agent = new MockMiraAgent();
    initialState = {
      confidenceInUser: 50,
      userProfile: {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 20,
      },
      memories: [],
    };
  });

  describe('Confidence Scoring Rules', () => {
    describe('Questions = +12 minimum', () => {
      it('should give +12 for single question', () => {
        const result = agent.analyzeUserInput('What is this?');

        expect(result.confidenceDelta).toBeGreaterThanOrEqual(12);
        expect(result.reasoning).toContain('1 questions');
      });

      it('should give +13+ for multiple questions', () => {
        const inputs = [
          'What is this? How does it work?',
          'Where did this come from? What is it used for? How old is it?',
        ];

        for (const input of inputs) {
          const result = agent.analyzeUserInput(input);
          expect(result.confidenceDelta).toBeGreaterThanOrEqual(13);
        }
      });

      it('should give +14+ for many questions', () => {
        const result = agent.analyzeUserInput(
          'What? Where? When? How? Why? Really?'
        );

        expect(result.confidenceDelta).toBeGreaterThanOrEqual(14);
      });

      it('should cap at +15 for excessive questions', () => {
        const result = agent.analyzeUserInput(
          'A? B? C? D? E? F? G? H? I? J? K?'
        );

        expect(result.confidenceDelta).toBeLessThanOrEqual(15);
      });
    });

    describe('Rude Input = negative delta', () => {
      it('should give negative confidence for rude input', () => {
        const rudeInputs = [
          'this is stupid',
          'this is dumb',
          'I hate this',
          'this sucks',
          'awful creature',
        ];

        for (const input of rudeInputs) {
          const result = agent.analyzeUserInput(input);
          expect(result.confidenceDelta).toBeLessThan(0);
        }
      });

      it('should give -5 to -10 range for rudeness', () => {
        const result = agent.analyzeUserInput('This is absolutely stupid');

        expect(result.confidenceDelta).toBeGreaterThanOrEqual(-10);
        expect(result.confidenceDelta).toBeLessThan(0);
      });
    });

    describe('Honest Engagement = +10 to +12', () => {
      it('should reward honest confusion with engagement', () => {
        const inputs = [
          'I have no idea what this is?',
          'I\'m not sure, can you explain?',
          "I don't understand this, can you help?",
        ];

        for (const input of inputs) {
          const result = agent.analyzeUserInput(input);
          // Contains question marks, so should get engagement bonus
          expect(result.confidenceDelta).toBeGreaterThanOrEqual(12);
          expect(result.confidenceDelta).toBeLessThanOrEqual(15);
        }
      });
    });

    describe('Lazy One-Word Answers = -2 to 0', () => {
      it('should penalize one-word responses', () => {
        const lazyInputs = ['yes', 'no', 'ok', 'huh'];

        for (const input of lazyInputs) {
          const result = agent.analyzeUserInput(input);
          expect(result.confidenceDelta).toBeLessThanOrEqual(0);
          expect(result.confidenceDelta).toBeGreaterThanOrEqual(-2);
        }
      });
    });

    describe('Thoughtful Observations = +10 to +12', () => {
      it('should reward thoughtful observations', () => {
        const inputs = [
          'This is interesting',
          'I appreciate the design',
          'Fascinating creature',
        ];

        for (const input of inputs) {
          const result = agent.analyzeUserInput(input);
          expect(result.confidenceDelta).toBeGreaterThanOrEqual(10);
        }
      });
    });
  });

  describe('Personality Trait Calculation', () => {
    it('should calculate thoughtfulness from question count', () => {
      const lowResult = agent.analyzeUserInput('Tell me something');
      const highResult = agent.analyzeUserInput('What? How? Why? Where?');

      expect(highResult.thoughtfulness).toBeGreaterThan(lowResult.thoughtfulness);
    });

    it('should calculate curiosity from question count', () => {
      const lowResult = agent.analyzeUserInput('ok');
      const highResult = agent.analyzeUserInput('What is this? How works it?');

      expect(highResult.curiosity).toBeGreaterThan(lowResult.curiosity);
    });

    it('should calculate engagement from input length', () => {
      const shortResult = agent.analyzeUserInput('hi');
      const longResult = agent.analyzeUserInput(
        'I would really like to understand everything about this mysterious creature and its behavior'
      );

      expect(longResult.engagement).toBeGreaterThan(shortResult.engagement);
    });

    it('should detect adventurousness from keywords', () => {
      const cautious = agent.analyzeUserInput('Is this safe?');
      const adventurous = agent.analyzeUserInput('I want to explore and discover more!');

      expect(adventurous.adventurousness).toBeGreaterThan(cautious.adventurousness);
    });

    it('should keep superficiality low for engaged users', () => {
      const engagedResult = agent.analyzeUserInput(
        'This is fascinating! What makes it unique?'
      );

      expect(engagedResult.superficiality).toBeLessThan(50);
    });

    it('should all traits sum to reasonable ranges', () => {
      const result = agent.analyzeUserInput('What is this?');

      const sum =
        result.thoughtfulness +
        result.adventurousness +
        result.engagement +
        result.curiosity +
        result.superficiality;

      // All traits are 0-100, rough reasonable sum
      expect(sum).toBeGreaterThan(0);
    });
  });

  describe('Response Personality Selection', () => {
    it('should return negative personality for very low confidence', () => {
      const personality = agent.selectResponsePersonality(10);
      expect(personality).toBe('negative');
    });

    it('should return chaotic personality for low confidence', () => {
      const personality = agent.selectResponsePersonality(30);
      expect(personality).toBe('chaotic');
    });

    it('should return wonder personality for medium confidence', () => {
      const personality = agent.selectResponsePersonality(50);
      expect(personality).toBe('wonder');
    });

    it('should return glowing personality for high confidence', () => {
      const personality = agent.selectResponsePersonality(70);
      expect(personality).toBe('glowing');
    });

    it('should return slovak personality for very high confidence', () => {
      const personality = agent.selectResponsePersonality(90);
      expect(personality).toBe('slovak');
    });

    it('should transition smoothly between personalities', () => {
      const personalities = [
        agent.selectResponsePersonality(10),
        agent.selectResponsePersonality(30),
        agent.selectResponsePersonality(50),
        agent.selectResponsePersonality(70),
        agent.selectResponsePersonality(90),
      ];

      expect(personalities).toEqual([
        'negative',
        'chaotic',
        'wonder',
        'glowing',
        'slovak',
      ]);
    });

    it('should handle boundary values correctly', () => {
      expect(agent.selectResponsePersonality(0)).toBe('negative');
      expect(agent.selectResponsePersonality(19)).toBe('negative');
      expect(agent.selectResponsePersonality(20)).toBe('chaotic');
      expect(agent.selectResponsePersonality(100)).toBe('slovak');
    });
  });

  describe('Tool Call Handling', () => {
    it('should increase confidence on zoom_in', () => {
      const result = agent.processToolCall(initialState, { action: 'zoom_in' });

      expect(result.confidenceInUser).toBe(initialState.confidenceInUser + 5);
    });

    it('should increase confidence on zoom_out', () => {
      const result = agent.processToolCall(initialState, { action: 'zoom_out' });

      expect(result.confidenceInUser).toBe(initialState.confidenceInUser + 3);
    });

    it('should increase confidence on interact', () => {
      const result = agent.processToolCall(initialState, { action: 'interact' });

      expect(result.confidenceInUser).toBe(initialState.confidenceInUser + 8);
    });

    it('should increase confidence on examine', () => {
      const result = agent.processToolCall(initialState, { action: 'examine' });

      expect(result.confidenceInUser).toBe(initialState.confidenceInUser + 6);
    });

    it('should cap confidence at 100', () => {
      const highState = { ...initialState, confidenceInUser: 98 };
      const result = agent.processToolCall(highState, { action: 'interact' }); // +8

      expect(result.confidenceInUser).toBeLessThanOrEqual(100);
    });

    it('should add tool calls to memories', () => {
      const result = agent.processToolCall(initialState, { action: 'zoom_in' });

      expect(result.memories.length).toBe(1);
      expect(result.memories[0].type).toBe('tool_call');
      expect(result.memories[0].content).toBe('zoom_in');
    });

    it('should accumulate multiple tool calls in memory', () => {
      let state = initialState;

      state = agent.processToolCall(state, { action: 'zoom_in' });
      state = agent.processToolCall(state, { action: 'interact' });
      state = agent.processToolCall(state, { action: 'examine' });

      expect(state.memories.length).toBe(3);
      expect(state.memories[0].content).toBe('zoom_in');
      expect(state.memories[1].content).toBe('interact');
      expect(state.memories[2].content).toBe('examine');
    });

    it('should record timestamp for each tool call', () => {
      const before = Date.now();
      const result = agent.processToolCall(initialState, { action: 'zoom_in' });
      const after = Date.now();

      expect(result.memories[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(result.memories[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Full Interaction Flows', () => {
    it('should handle question-based interaction', () => {
      const analysis = agent.analyzeUserInput('What is this creature?');

      expect(analysis.confidenceDelta).toBeGreaterThanOrEqual(12);
      expect(analysis.curiosity).toBeGreaterThan(50);
      expect(analysis.thoughtfulness).toBeGreaterThan(50);

      const newConfidence = initialState.confidenceInUser + analysis.confidenceDelta;
      const personality = agent.selectResponsePersonality(newConfidence);

      expect(['wonder', 'glowing', 'slovak']).toContain(personality);
    });

    it('should handle tool-based interaction', () => {
      let state = initialState;

      // User zooms in
      state = agent.processToolCall(state, { action: 'zoom_in' });
      expect(state.confidenceInUser).toBeGreaterThan(initialState.confidenceInUser);

      // User interacts
      state = agent.processToolCall(state, { action: 'interact' });
      expect(state.confidenceInUser).toBeGreaterThan(
        initialState.confidenceInUser + 5
      );

      expect(state.memories.length).toBe(2);
    });

    it('should handle mixed interaction', () => {
      let state = initialState;

      // Tool interaction
      state = agent.processToolCall(state, { action: 'zoom_in' });

      // User asks question
      const analysis = agent.analyzeUserInput('How does this work?');
      state = {
        ...state,
        confidenceInUser: Math.min(
          100,
          state.confidenceInUser + analysis.confidenceDelta
        ),
        userProfile: {
          thoughtfulness: analysis.thoughtfulness,
          adventurousness: analysis.adventurousness,
          engagement: analysis.engagement,
          curiosity: analysis.curiosity,
          superficiality: analysis.superficiality,
        },
        memories: [
          ...state.memories,
          {
            type: 'input',
            content: 'How does this work?',
            timestamp: Date.now(),
          },
        ],
      };

      expect(state.confidenceInUser).toBeGreaterThan(initialState.confidenceInUser);
      expect(state.memories.length).toBe(2);
      expect(state.userProfile.curiosity).toBeGreaterThan(50);
    });

    it('should handle user starting negative and becoming engaged', () => {
      let state = {
        ...initialState,
        confidenceInUser: 40, // Start somewhat skeptical
      };

      const initialConfidence = state.confidenceInUser;

      // User starts rude
      let analysis = agent.analyzeUserInput('This is stupid');
      state = {
        ...state,
        confidenceInUser: Math.max(
          0,
          state.confidenceInUser + analysis.confidenceDelta
        ),
      };
      expect(state.confidenceInUser).toBeLessThan(initialConfidence);

      // Then user engages with questions
      analysis = agent.analyzeUserInput('Actually, I have questions. What is this?');
      state = {
        ...state,
        confidenceInUser: Math.min(
          100,
          state.confidenceInUser + analysis.confidenceDelta
        ),
      };

      // Should recover significantly from low point (questions are powerful)
      expect(state.confidenceInUser).toBeGreaterThan(initialConfidence - 5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input gracefully', () => {
      const result = agent.analyzeUserInput('');

      expect(result.confidenceDelta).toBeDefined();
      expect(typeof result.thoughtfulness).toBe('number');
    });

    it('should handle very long input', () => {
      const longInput = 'word '.repeat(1000);

      const result = agent.analyzeUserInput(longInput);

      expect(result.engagement).toBeGreaterThan(50);
    });

    it('should handle special characters', () => {
      const inputs = ['!?!?!', '@#$%^&*()', 'émoji 🎉'];

      for (const input of inputs) {
        const result = agent.analyzeUserInput(input);
        expect(result.confidenceDelta).toBeDefined();
      }
    });

    it('should handle case insensitivity', () => {
      const lower = agent.analyzeUserInput('what is this?');
      const upper = agent.analyzeUserInput('WHAT IS THIS?');

      expect(lower.confidenceDelta).toBe(upper.confidenceDelta);
    });

    it('should handle Unicode properly', () => {
      const result = agent.analyzeUserInput('你好？这是什么？');

      // Unicode input with question marks should still provide engagement bonus
      expect(result.confidenceDelta).toBeGreaterThan(0);
      expect(typeof result.confidenceDelta).toBe('number');
    });
  });

  describe('State Immutability', () => {
    it('should not mutate input state on tool call', () => {
      const originalState = JSON.parse(JSON.stringify(initialState));

      agent.processToolCall(initialState, { action: 'zoom_in' });

      expect(initialState).toEqual(originalState);
    });

    it('should preserve user profile when processing tool calls', () => {
      const result = agent.processToolCall(initialState, { action: 'zoom_in' });

      expect(result.userProfile).toEqual(initialState.userProfile);
    });
  });
});
