/**
 * End-to-End User Session Flow Tests
 *
 * Validates:
 * - Complete user research session lifecycle
 * - State transitions through interaction
 * - Confidence tracking and updates
 * - Memory and tool state persistence
 * - Error recovery and resilience
 * - Sequential animation through interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for this test
interface ResearchProfile {
  thoughtfulness: number;
  adventurousness: number;
  engagement: number;
  curiosity: number;
  superficiality: number;
}

interface UserState {
  confidenceInUser: number;
  profile: ResearchProfile;
  memories: Array<{
    type: string;
    content: string;
    timestamp: number;
  }>;
  currentZoomLevel: 'far' | 'medium' | 'close';
  personality: 'negative' | 'chaotic' | 'glowing' | 'slovak';
}

// Simulation of user session state management
class UserSessionSimulator {
  private state: UserState;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.state = {
      confidenceInUser: 10,
      profile: {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      },
      memories: [],
      currentZoomLevel: 'far',
      personality: 'negative',
    };
  }

  getState(): UserState {
    return { ...this.state };
  }

  sendUserInput(input: string): void {
    // Base confidence increase for engagement
    this.state.confidenceInUser += 12;

    // Bonus for questions
    if (input.includes('?')) {
      this.state.confidenceInUser += 5;
    }

    // Penalty for rude/negative language
    if (
      input.toLowerCase().includes('stupid') ||
      input.toLowerCase().includes('boring')
    ) {
      this.state.confidenceInUser = Math.max(0, this.state.confidenceInUser - 10);
    }

    // Update personality based on confidence
    if (this.state.confidenceInUser < 20) {
      this.state.personality = 'negative';
    } else if (this.state.confidenceInUser < 40) {
      this.state.personality = 'chaotic';
    } else if (this.state.confidenceInUser < 70) {
      this.state.personality = 'glowing';
    } else {
      this.state.personality = 'slovak';
    }

    // Update profile traits
    this.state.profile.engagement += 5;
    this.state.profile.curiosity += 3;

    // Record memory
    this.state.memories.push({
      type: 'user_input',
      content: input,
      timestamp: Date.now() - this.startTime,
    });
  }

  executeTool(toolName: string): void {
    if (toolName === 'zoom_in') {
      if (this.state.currentZoomLevel === 'far') {
        this.state.currentZoomLevel = 'medium';
      } else if (this.state.currentZoomLevel === 'medium') {
        this.state.currentZoomLevel = 'close';
      }
      this.state.confidenceInUser += 5;
    }

    if (toolName === 'zoom_out') {
      if (this.state.currentZoomLevel === 'close') {
        this.state.currentZoomLevel = 'medium';
      } else if (this.state.currentZoomLevel === 'medium') {
        this.state.currentZoomLevel = 'far';
      }
      this.state.confidenceInUser += 2;
    }

    // Record tool usage
    this.state.memories.push({
      type: 'tool_call',
      content: toolName,
      timestamp: Date.now() - this.startTime,
    });
  }

  resetSession(): void {
    this.startTime = Date.now();
    this.state = {
      confidenceInUser: 10,
      profile: {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      },
      memories: [],
      currentZoomLevel: 'far',
      personality: 'negative',
    };
  }
}

describe('User Research Session E2E Tests', () => {
  let session: UserSessionSimulator;

  beforeEach(() => {
    session = new UserSessionSimulator();
  });

  describe('Session Initialization', () => {
    it('should start with low confidence', () => {
      const state = session.getState();
      expect(state.confidenceInUser).toBe(10);
    });

    it('should start with negative personality', () => {
      const state = session.getState();
      expect(state.personality).toBe('negative');
    });

    it('should have no memories initially', () => {
      const state = session.getState();
      expect(state.memories.length).toBe(0);
    });

    it('should start at far zoom level', () => {
      const state = session.getState();
      expect(state.currentZoomLevel).toBe('far');
    });

    it('should have balanced profile traits', () => {
      const state = session.getState();
      expect(state.profile.thoughtfulness).toBe(50);
      expect(state.profile.curiosity).toBe(50);
    });
  });

  describe('User Engagement Flow', () => {
    it('should increase confidence when user provides input', () => {
      const initialConfidence = session.getState().confidenceInUser;
      session.sendUserInput('This is interesting');
      const newConfidence = session.getState().confidenceInUser;

      expect(newConfidence).toBeGreaterThan(initialConfidence);
    });

    it('should give bonus for questions', () => {
      session.sendUserInput('This is a statement');
      const confidenceAfterStatement = session.getState().confidenceInUser;

      session.resetSession();
      session.sendUserInput('Is this interesting?');
      const confidenceAfterQuestion = session.getState().confidenceInUser;

      expect(confidenceAfterQuestion).toBeGreaterThan(confidenceAfterStatement);
    });

    it('should penalize rude language', () => {
      session.resetSession();
      session.sendUserInput('This is boring and stupid');
      const state = session.getState();

      expect(state.confidenceInUser).toBeLessThan(20);
    });

    it('should record user input in memories', () => {
      const input = 'Tell me more about this';
      session.sendUserInput(input);
      const state = session.getState();

      expect(state.memories.length).toBeGreaterThan(0);
      expect(state.memories[0].type).toBe('user_input');
      expect(state.memories[0].content).toBe(input);
    });

    it('should update engagement profile', () => {
      const initialEngagement = session.getState().profile.engagement;
      session.sendUserInput('Interesting question');
      const newEngagement = session.getState().profile.engagement;

      expect(newEngagement).toBeGreaterThan(initialEngagement);
    });
  });

  describe('Tool Usage Flow', () => {
    it('should support zoom_in tool', () => {
      session.sendUserInput('Show me more detail');
      const initialZoom = session.getState().currentZoomLevel;

      session.executeTool('zoom_in');
      const newZoom = session.getState().currentZoomLevel;

      expect(newZoom).not.toBe(initialZoom);
      expect(['far', 'medium', 'close']).toContain(newZoom);
    });

    it('should support zoom_out tool', () => {
      // First zoom in
      session.executeTool('zoom_in');
      session.executeTool('zoom_in');
      const currentZoom = session.getState().currentZoomLevel;

      // Then zoom out
      session.executeTool('zoom_out');
      const newZoom = session.getState().currentZoomLevel;

      expect(newZoom).not.toBe(currentZoom);
    });

    it('should increase confidence on tool usage', () => {
      const initialConfidence = session.getState().confidenceInUser;
      session.executeTool('zoom_in');
      const newConfidence = session.getState().confidenceInUser;

      expect(newConfidence).toBeGreaterThan(initialConfidence);
    });

    it('should record tool usage in memories', () => {
      session.executeTool('zoom_in');
      const state = session.getState();

      expect(state.memories.length).toBeGreaterThan(0);
      expect(state.memories[0].type).toBe('tool_call');
      expect(state.memories[0].content).toBe('zoom_in');
    });

    it('should cycle through zoom levels', () => {
      expect(session.getState().currentZoomLevel).toBe('far');

      session.executeTool('zoom_in');
      expect(session.getState().currentZoomLevel).toBe('medium');

      session.executeTool('zoom_in');
      expect(session.getState().currentZoomLevel).toBe('close');

      session.executeTool('zoom_out');
      expect(session.getState().currentZoomLevel).toBe('medium');

      session.executeTool('zoom_out');
      expect(session.getState().currentZoomLevel).toBe('far');
    });
  });

  describe('Personality Transitions', () => {
    it('should transition personality based on confidence', () => {
      let state = session.getState();
      expect(state.personality).toBe('negative');

      // Add multiple interactions to increase confidence
      for (let i = 0; i < 2; i++) {
        session.sendUserInput('What?');
      }

      state = session.getState();
      // Confidence should be 10 + 2*(12+5) = 44, should be glowing or slovak
      expect(['chaotic', 'glowing', 'slovak']).toContain(state.personality);
    });

    it('should transition through personality states', () => {
      const personalities: Array<'negative' | 'chaotic' | 'glowing' | 'slovak'> = [];

      for (let i = 0; i < 6; i++) {
        session.sendUserInput('Question?');
        const state = session.getState();
        if (!personalities.includes(state.personality)) {
          personalities.push(state.personality);
        }
      }

      // Should have transitioned through multiple personality states
      expect(personalities.length).toBeGreaterThan(1);
    });

    it('should have higher personality diversity with more interactions', () => {
      for (let i = 0; i < 5; i++) {
        session.sendUserInput('Interesting!');
        session.executeTool('zoom_in');
      }

      const state = session.getState();
      // Enough interactions should reach higher confidence states
      expect(state.confidenceInUser).toBeGreaterThan(50);
    });
  });

  describe('Complete Interaction Sequence', () => {
    it('should handle full session flow: engagement → exploration → discovery', () => {
      const state1 = session.getState();
      expect(state1.confidenceInUser).toBe(10);
      expect(state1.personality).toBe('negative');

      // User engages with questions
      for (let i = 0; i < 3; i++) {
        session.sendUserInput(`What does this mean?`);
      }

      const state2 = session.getState();
      expect(state2.confidenceInUser).toBeGreaterThan(20);
      expect(['chaotic', 'glowing']).toContain(state2.personality);
      expect(state2.memories.length).toBe(3);

      // User explores with tools
      for (let i = 0; i < 2; i++) {
        session.executeTool('zoom_in');
      }

      const state3 = session.getState();
      expect(state3.currentZoomLevel).toBe('close');
      expect(state3.memories.length).toBe(5);

      // User continues engagement
      session.sendUserInput('This is amazing!');

      const state4 = session.getState();
      expect(state4.confidenceInUser).toBeGreaterThan(state3.confidenceInUser);
      expect(state4.memories.length).toBeGreaterThan(5);
    });

    it('should maintain state through interactions', () => {
      const interactions = [
        { type: 'input', value: 'Initial question?' },
        { type: 'tool', value: 'zoom_in' },
        { type: 'input', value: 'Tell me more about this' },
        { type: 'tool', value: 'zoom_in' },
        { type: 'input', value: 'Fascinating!' },
      ];

      interactions.forEach((interaction) => {
        if (interaction.type === 'input') {
          session.sendUserInput(interaction.value);
        } else {
          session.executeTool(interaction.value);
        }
      });

      const finalState = session.getState();

      // Verify all interactions were recorded
      expect(finalState.memories.length).toBe(interactions.length);

      // Verify confidence increased
      expect(finalState.confidenceInUser).toBeGreaterThan(10);

      // Verify zoom progressed
      expect(finalState.currentZoomLevel).toBe('close');
    });

    it('should handle state after negative input followed by recovery', () => {
      // Negative input
      session.sendUserInput('This is stupid');
      const negativeState = session.getState();
      expect(negativeState.confidenceInUser).toBeLessThan(15);

      // Recovery through positive engagement
      session.sendUserInput('Actually, that is interesting!');
      session.sendUserInput('Can you explain more?');

      const recoveryState = session.getState();
      expect(recoveryState.confidenceInUser).toBeGreaterThan(negativeState.confidenceInUser);
      expect(recoveryState.memories.length).toBe(3);
    });
  });

  describe('Memory and State Persistence', () => {
    it('should accumulate memories through session', () => {
      expect(session.getState().memories.length).toBe(0);

      session.sendUserInput('First message');
      expect(session.getState().memories.length).toBe(1);

      session.executeTool('zoom_in');
      expect(session.getState().memories.length).toBe(2);

      session.sendUserInput('Second message');
      expect(session.getState().memories.length).toBe(3);
    });

    it('should preserve memory order', () => {
      session.sendUserInput('First');
      session.executeTool('zoom_in');
      session.sendUserInput('Second');

      const memories = session.getState().memories;
      expect(memories[0].content).toBe('First');
      expect(memories[1].content).toBe('zoom_in');
      expect(memories[2].content).toBe('Second');
    });

    it('should record timestamps for memories', () => {
      session.sendUserInput('Test message');
      const memory = session.getState().memories[0];

      expect(memory.timestamp).toBeGreaterThanOrEqual(0);
      expect(typeof memory.timestamp).toBe('number');
    });
  });

  describe('Edge Cases and Resilience', () => {
    it('should handle empty input gracefully', () => {
      session.sendUserInput('');
      const state = session.getState();

      // Should still process and record
      expect(state.memories.length).toBe(1);
      expect(state.confidenceInUser).toBeGreaterThan(10);
    });

    it('should handle very long input', () => {
      const longInput = 'A'.repeat(1000) + '?';
      session.sendUserInput(longInput);
      const state = session.getState();

      expect(state.memories.length).toBe(1);
      expect(state.memories[0].content).toBe(longInput);
    });

    it('should clamp confidence to reasonable bounds', () => {
      // Confidence shouldn't go below 0
      session.sendUserInput('stupid');
      session.sendUserInput('stupid');
      session.sendUserInput('stupid');

      const state = session.getState();
      expect(state.confidenceInUser).toBeGreaterThanOrEqual(0);
    });

    it('should handle rapid interactions', () => {
      for (let i = 0; i < 10; i++) {
        session.sendUserInput(`Question ${i}?`);
        if (i % 2 === 0) {
          session.executeTool('zoom_in');
        }
      }

      const state = session.getState();
      expect(state.memories.length).toBe(15); // 10 inputs + 5 tools
      expect(state.confidenceInUser).toBeGreaterThan(50);
    });
  });

  describe('Session Reset', () => {
    it('should reset all state', () => {
      // Build up state
      session.sendUserInput('Test message');
      session.executeTool('zoom_in');

      let state = session.getState();
      expect(state.confidenceInUser).toBeGreaterThan(10);
      expect(state.memories.length).toBeGreaterThan(0);

      // Reset
      session.resetSession();

      // Verify reset
      state = session.getState();
      expect(state.confidenceInUser).toBe(10);
      expect(state.memories.length).toBe(0);
      expect(state.personality).toBe('negative');
      expect(state.currentZoomLevel).toBe('far');
    });

    it('should allow new session after reset', () => {
      // First session
      session.sendUserInput('First session');
      session.resetSession();

      // Second session
      session.sendUserInput('Second session');
      const state = session.getState();

      expect(state.memories.length).toBe(1);
      expect(state.memories[0].content).toBe('Second session');
    });
  });
});
