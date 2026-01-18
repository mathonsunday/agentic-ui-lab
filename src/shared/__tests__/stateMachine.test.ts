/**
 * Tests for Streaming State Machine
 *
 * Validates 2025 best practice FSM implementation:
 * - Pure state transitions (deterministic, testable)
 * - Explicit state types and transitions
 * - Discriminated union safety
 * - Idempotent transitions where appropriate
 * - Complete coverage of state graph
 */

import { describe, it, expect, vi } from 'vitest';
import {
  streamingStateMachine,
  createInitialStreamingState,
  canTransition,
  type StreamingState,
  type StreamingEvent,
} from '../stateMachine';

describe('Streaming State Machine', () => {
  describe('Initial State', () => {
    it('should create initial state as IDLE', () => {
      const state = createInitialStreamingState();

      expect(state.state).toBe('IDLE');
      expect(state.streamId).toBe(0);
    });

    it('should be ready for START_STREAM transition', () => {
      const state = createInitialStreamingState();

      expect(canTransition(state, { type: 'START_STREAM', abort: () => {} })).toBe(true);
    });
  });

  describe('State Transitions - Valid Paths', () => {
    it('should transition from IDLE to STREAMING on START_STREAM', () => {
      const state = createInitialStreamingState();
      const abort = vi.fn();

      const newState = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort,
      });

      expect(newState.state).toBe('STREAMING');
      if (newState.state === 'STREAMING') {
        expect(newState.streamId).toBe(1);
        expect(newState.abort).toBe(abort);
        expect(newState.startTime).toBeGreaterThan(0);
      }
    });

    it('should transition from STREAMING to IDLE on END_STREAM', () => {
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const newState = streamingStateMachine(streamingState, { type: 'END_STREAM' });

      expect(newState.state).toBe('IDLE');
      if (newState.state === 'IDLE') {
        expect(newState.streamId).toBe(1);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should transition from STREAMING to IDLE on INTERRUPT_STREAM', () => {
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 2,
        abort,
        startTime: Date.now(),
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const newState = streamingStateMachine(streamingState, {
        type: 'INTERRUPT_STREAM',
      });

      expect(newState.state).toBe('IDLE');
      if (newState.state === 'IDLE') {
        expect(newState.streamId).toBe(2);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should transition from STREAMING to ERROR on ERROR_STREAM', () => {
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 3,
        abort,
        startTime: Date.now(),
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      const newState = streamingStateMachine(streamingState, {
        type: 'ERROR_STREAM',
        error: 'Network timeout',
      });
      consoleSpy.mockRestore();

      expect(newState.state).toBe('ERROR');
      if (newState.state === 'ERROR') {
        expect(newState.streamId).toBe(3);
        expect(newState.error).toBe('Network timeout');
        expect(newState.failedAt).toBeGreaterThan(0);
      }
    });

    it('should transition from ERROR to STREAMING on retry (START_STREAM)', () => {
      const errorState: StreamingState = {
        state: 'ERROR',
        streamId: 3,
        error: 'Previous error',
        failedAt: Date.now(),
      };

      const abort = vi.fn();
      const newState = streamingStateMachine(errorState, {
        type: 'START_STREAM',
        abort,
      });

      expect(newState.state).toBe('STREAMING');
      if (newState.state === 'STREAMING') {
        expect(newState.streamId).toBe(4); // Incremented
        expect(newState.abort).toBe(abort);
      }
    });
  });

  describe('State Transitions - Invalid/No-op Paths', () => {
    it('should ignore START_STREAM when already STREAMING', () => {
      const abort1 = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort: abort1,
        startTime: Date.now(),
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const abort2 = vi.fn();
      const newState = streamingStateMachine(streamingState, {
        type: 'START_STREAM',
        abort: abort2,
      });

      // Should remain in STREAMING with same abort
      expect(newState.state).toBe('STREAMING');
      if (newState.state === 'STREAMING') {
        expect(newState.abort).toBe(abort1); // Original abort, not abort2
        expect(newState.streamId).toBe(1); // Not incremented
      }
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted START_STREAM while already streaming')
      );
      consoleSpy.mockRestore();
    });

    it('should ignore END_STREAM when IDLE', () => {
      const idleState = createInitialStreamingState();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const newState = streamingStateMachine(idleState, { type: 'END_STREAM' });

      expect(newState).toEqual(idleState);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted END_STREAM while not streaming')
      );
      consoleSpy.mockRestore();
    });

    it('should ignore INTERRUPT_STREAM when IDLE', () => {
      const idleState = createInitialStreamingState();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const newState = streamingStateMachine(idleState, {
        type: 'INTERRUPT_STREAM',
      });

      expect(newState).toEqual(idleState);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted INTERRUPT_STREAM while not streaming')
      );
      consoleSpy.mockRestore();
    });

    it('should ignore ERROR_STREAM when IDLE', () => {
      const idleState = createInitialStreamingState();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const newState = streamingStateMachine(idleState, {
        type: 'ERROR_STREAM',
        error: 'Some error',
      });

      expect(newState).toEqual(idleState);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR_STREAM received while not streaming')
      );
      consoleSpy.mockRestore();
    });

    it('should ignore END_STREAM when ERROR', () => {
      const errorState: StreamingState = {
        state: 'ERROR',
        streamId: 1,
        error: 'Previous error',
        failedAt: Date.now(),
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const newState = streamingStateMachine(errorState, { type: 'END_STREAM' });
      consoleSpy.mockRestore();

      expect(newState).toEqual(errorState);
    });
  });

  describe('Stream ID Tracking', () => {
    it('should increment stream ID on each START_STREAM', () => {
      let state = createInitialStreamingState();
      expect(state.streamId).toBe(0);

      for (let i = 1; i <= 5; i++) {
        const abort = vi.fn();
        state = streamingStateMachine(state, {
          type: 'START_STREAM',
          abort,
        });

        if (state.state === 'STREAMING') {
          expect(state.streamId).toBe(i);

          // Complete the stream
          state = streamingStateMachine(state, { type: 'END_STREAM' });
        }
      }

      expect(state.streamId).toBe(5);
    });

    it('should preserve stream ID through completion', () => {
      let state = createInitialStreamingState();

      const abort = vi.fn();
      state = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort,
      });

      if (state.state === 'STREAMING') {
        const streamId = state.streamId;

        state = streamingStateMachine(state, { type: 'END_STREAM' });

        if (state.state === 'IDLE') {
          expect(state.streamId).toBe(streamId);
        }
      }
    });

    it('should preserve stream ID through error', () => {
      let state = createInitialStreamingState();

      const abort = vi.fn();
      state = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort,
      });

      if (state.state === 'STREAMING') {
        const streamId = state.streamId;

        state = streamingStateMachine(state, {
          type: 'ERROR_STREAM',
          error: 'Test error',
        });

        if (state.state === 'ERROR') {
          expect(state.streamId).toBe(streamId);
        }
      }
    });
  });

  describe('Abort Function Management', () => {
    it('should store abort function when entering STREAMING state', () => {
      const state = createInitialStreamingState();
      const abort = vi.fn();

      const newState = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort,
      });

      if (newState.state === 'STREAMING') {
        expect(newState.abort).toBe(abort);
        expect(typeof newState.abort).toBe('function');
      }
    });

    it('should preserve abort function when transitioning to IDLE', () => {
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      const newState = streamingStateMachine(streamingState, {
        type: 'END_STREAM',
      });

      if (newState.state === 'IDLE') {
        // IDLE state doesn't have abort function
        expect('abort' in newState).toBe(false);
      }
    });
  });

  describe('Timestamp Tracking', () => {
    it('should record startTime when entering STREAMING', () => {
      const state = createInitialStreamingState();
      const abort = vi.fn();
      const beforeTime = Date.now();

      const newState = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort,
      });

      const afterTime = Date.now();

      if (newState.state === 'STREAMING') {
        expect(newState.startTime).toBeGreaterThanOrEqual(beforeTime);
        expect(newState.startTime).toBeLessThanOrEqual(afterTime);
      }
    });

    it('should record failedAt when entering ERROR', () => {
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now() - 1000,
      };

      const beforeTime = Date.now();
      const newState = streamingStateMachine(streamingState, {
        type: 'ERROR_STREAM',
        error: 'Test error',
      });
      const afterTime = Date.now();

      if (newState.state === 'ERROR') {
        expect(newState.failedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(newState.failedAt).toBeLessThanOrEqual(afterTime);
      }
    });

    it('should calculate duration correctly in logs', () => {
      const abort = vi.fn();
      const startTime = Date.now() - 1000;
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime,
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      streamingStateMachine(streamingState, { type: 'END_STREAM' });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0]?.[0] as string;
      expect(logCall).toMatch(/\d+ms/);
      consoleSpy.mockRestore();
    });
  });

  describe('canTransition Predicate', () => {
    it('should allow START_STREAM from IDLE', () => {
      const idleState = createInitialStreamingState();

      expect(
        canTransition(idleState, { type: 'START_STREAM', abort: () => {} })
      ).toBe(true);
    });

    it('should deny START_STREAM from STREAMING', () => {
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      expect(
        canTransition(streamingState, {
          type: 'START_STREAM',
          abort: () => {},
        })
      ).toBe(false);
    });

    it('should allow END_STREAM only from STREAMING', () => {
      const idleState = createInitialStreamingState();
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      expect(canTransition(idleState, { type: 'END_STREAM' })).toBe(false);
      expect(canTransition(streamingState, { type: 'END_STREAM' })).toBe(true);
    });

    it('should allow INTERRUPT_STREAM only from STREAMING', () => {
      const idleState = createInitialStreamingState();
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      expect(canTransition(idleState, { type: 'INTERRUPT_STREAM' })).toBe(false);
      expect(canTransition(streamingState, { type: 'INTERRUPT_STREAM' })).toBe(true);
    });

    it('should allow ERROR_STREAM only from STREAMING', () => {
      const idleState = createInitialStreamingState();
      const abort = vi.fn();
      const streamingState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      expect(
        canTransition(idleState, {
          type: 'ERROR_STREAM',
          error: 'Error',
        })
      ).toBe(false);
      expect(
        canTransition(streamingState, {
          type: 'ERROR_STREAM',
          error: 'Error',
        })
      ).toBe(true);
    });

    it('should allow START_STREAM from ERROR (retry)', () => {
      const errorState: StreamingState = {
        state: 'ERROR',
        streamId: 1,
        error: 'Previous error',
        failedAt: Date.now(),
      };

      expect(
        canTransition(errorState, {
          type: 'START_STREAM',
          abort: () => {},
        })
      ).toBe(true);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce same result for same input (pure function)', () => {
      const abort = vi.fn();
      const state: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: 1000,
      };

      const event: StreamingEvent = { type: 'END_STREAM' };

      // Mock date to ensure consistent results
      const originalNow = Date.now;
      (global.Date as any).now = () => 2000;

      try {
        const result1 = streamingStateMachine(state, event);
        const result2 = streamingStateMachine(state, event);

        // Should produce identical results
        expect(result1).toEqual(result2);
      } finally {
        (global.Date as any).now = originalNow;
      }
    });

    it('should not modify input state (immutable)', () => {
      const abort = vi.fn();
      const originalState: StreamingState = {
        state: 'STREAMING',
        streamId: 1,
        abort,
        startTime: Date.now(),
      };

      const stateCopy = { ...originalState };

      streamingStateMachine(originalState, { type: 'END_STREAM' });

      // Original state should be unchanged
      expect(originalState).toEqual(stateCopy);
    });
  });

  describe('Complex Sequences', () => {
    it('should handle complete streaming lifecycle', () => {
      let state = createInitialStreamingState();

      // Start
      const abort = vi.fn();
      state = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort,
      });
      expect(state.state).toBe('STREAMING');

      // Complete
      state = streamingStateMachine(state, { type: 'END_STREAM' });
      expect(state.state).toBe('IDLE');

      // Start again
      state = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort: vi.fn(),
      });
      expect(state.state).toBe('STREAMING');

      // Error this time
      state = streamingStateMachine(state, {
        type: 'ERROR_STREAM',
        error: 'Network error',
      });
      expect(state.state).toBe('ERROR');

      // Retry
      state = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort: vi.fn(),
      });
      expect(state.state).toBe('STREAMING');
    });

    it('should handle interruption mid-stream', () => {
      let state = createInitialStreamingState();

      state = streamingStateMachine(state, {
        type: 'START_STREAM',
        abort: vi.fn(),
      });

      expect(state.state).toBe('STREAMING');

      state = streamingStateMachine(state, { type: 'INTERRUPT_STREAM' });

      expect(state.state).toBe('IDLE');
    });

    it('should handle rapid transitions safely', () => {
      let state = createInitialStreamingState();

      // Try rapid state changes
      for (let i = 0; i < 3; i++) {
        state = streamingStateMachine(state, {
          type: 'START_STREAM',
          abort: vi.fn(),
        });

        state = streamingStateMachine(state, { type: 'END_STREAM' });
      }

      expect(state.state).toBe('IDLE');
      expect(state.streamId).toBe(3);
    });
  });

  describe('Scenario Loading and Navigation', () => {
    it('should load specimen47 scenario', async () => {
      const { loadScenario, createInitialState } = await import('../stateMachine');

      const state = createInitialState();
      const loaded = loadScenario(state, 'specimen47');

      expect(loaded.currentScenario).toBe('specimen47');
      expect(loaded.stepIndex).toBe(0);
      expect(loaded.totalSteps).toBeGreaterThan(0);
      expect(loaded.thoughts.length).toBeGreaterThan(0);
      expect(loaded.response).toBeDefined();
      expect(loaded.visibleElements.length).toBe(0); // Initially empty
    });

    it('should ignore loading non-existent scenario', async () => {
      const { loadScenario, createInitialState } = await import('../stateMachine');

      const state = createInitialState();
      const loaded = loadScenario(state, 'nonexistent');

      expect(loaded).toEqual(state);
      expect(loaded.currentScenario).toBeNull();
    });

    it('should step forward through scenario', async () => {
      const { loadScenario, stepForward, createInitialState } = await import(
        '../stateMachine'
      );

      let state = createInitialState();
      state = loadScenario(state, 'specimen47');
      const initialStepIndex = state.stepIndex;

      state = stepForward(state);

      expect(state.stepIndex).toBe(initialStepIndex + 1);
    });

    it('should reveal visible elements as stepping forward', async () => {
      const { loadScenario, stepForward, createInitialState } = await import(
        '../stateMachine'
      );

      let state = createInitialState();
      state = loadScenario(state, 'specimen47');

      // Step past thoughts to reach response elements
      const thoughtCount = state.thoughts.length;
      for (let i = 0; i < thoughtCount + 1; i++) {
        state = stepForward(state);
      }

      expect(state.visibleElements.length).toBeGreaterThan(0);
    });

    it('should not step beyond total steps', async () => {
      const { loadScenario, stepForward, createInitialState } = await import(
        '../stateMachine'
      );

      let state = createInitialState();
      state = loadScenario(state, 'specimen47');
      const totalSteps = state.totalSteps;

      // Step to the end
      for (let i = 0; i < totalSteps + 10; i++) {
        state = stepForward(state);
      }

      expect(state.stepIndex).toBeLessThanOrEqual(totalSteps);
    });

    it('should reset to beginning of loaded scenario', async () => {
      const { loadScenario, stepForward, reset, createInitialState } = await import(
        '../stateMachine'
      );

      let state = createInitialState();
      state = loadScenario(state, 'specimen47');
      const scenarioName = state.currentScenario;

      // Step forward multiple times
      for (let i = 0; i < 5; i++) {
        state = stepForward(state);
      }

      expect(state.stepIndex).toBeGreaterThan(0);

      // Reset
      state = reset(state);

      expect(state.currentScenario).toBe(scenarioName);
      expect(state.stepIndex).toBe(0);
      expect(state.visibleElements.length).toBe(0);
    });

    it('should reset to initial state when no scenario loaded', async () => {
      const { reset, createInitialState } = await import('../stateMachine');

      const state = createInitialState();
      const resettedState = reset(state);

      expect(resettedState.currentScenario).toBeNull();
      expect(resettedState.stepIndex).toBe(0);
      expect(resettedState.totalSteps).toBe(0);
      expect(resettedState.thoughts.length).toBe(0);
    });
  });

  describe('Initial State Creation', () => {
    it('should create state with default values', async () => {
      const { createInitialState } = await import('../stateMachine');

      const state = createInitialState();

      expect(state.currentScenario).toBeNull();
      expect(state.stepIndex).toBe(0);
      expect(state.totalSteps).toBe(0);
      expect(state.thoughts).toEqual([]);
      expect(state.response).toBeNull();
      expect(state.visibleElements).toEqual([]);
      expect(state.sessionStartTime).toBeGreaterThan(0);
    });

    it('should initialize research evaluation', async () => {
      const { createInitialState } = await import('../stateMachine');

      const state = createInitialState();

      expect(state.researchEvaluation.confidence).toBe(0);
      expect(state.researchEvaluation.observationCount).toBe(0);
      expect(state.researchEvaluation.lastObservation).toBeNull();
      expect(state.researchEvaluation.hoverTarget).toBeNull();
      expect(state.researchEvaluation.hoverStartTime).toBeNull();
    });

    it('should initialize system log with evaluation entry', async () => {
      const { createInitialState } = await import('../stateMachine');

      const state = createInitialState();

      expect(state.systemLog.length).toBeGreaterThan(0);
      expect(state.systemLog[0].type).toBe('EVALUATION');
      expect(state.systemLog[0].value).toBe(0);
    });
  });

  describe('Scenario Data', () => {
    it('should have specimen47 scenario defined', async () => {
      const { SCENARIOS } = await import('../stateMachine');

      expect('specimen47' in SCENARIOS).toBe(true);
      const scenario = SCENARIOS.specimen47;
      expect(scenario.name).toBe('Specimen 47');
      expect(scenario.thoughts.length).toBeGreaterThan(0);
      expect(scenario.response).toBeDefined();
    });

    it('should have thoughts with required properties', async () => {
      const { SCENARIOS } = await import('../stateMachine');

      const scenario = SCENARIOS.specimen47;
      scenario.thoughts.forEach((thought) => {
        expect(thought.text).toBeTruthy();
        expect(typeof thought.intensity).toBe('number');
        expect(thought.decay).toBeTruthy();
      });
    });

    it('should have response with mood and depth', async () => {
      const { SCENARIOS } = await import('../stateMachine');

      const scenario = SCENARIOS.specimen47;
      expect(scenario.response.mood).toBeTruthy();
      expect(typeof scenario.response.depth).toBe('number');
      expect(scenario.response.elements.length).toBeGreaterThan(0);
    });

    it('should have response elements with type, content, and position', async () => {
      const { SCENARIOS } = await import('../stateMachine');

      const scenario = SCENARIOS.specimen47;
      scenario.response.elements.forEach((element) => {
        expect(element.type).toBeTruthy();
        expect(element.content).toBeTruthy();
        expect(element.position).toBeDefined();
        expect(element.position.x).toBeDefined();
        expect(element.position.y).toBeDefined();
      });
    });
  });

  describe('State Immutability', () => {
    it('should not mutate state during loadScenario', async () => {
      const { loadScenario, createInitialState } = await import('../stateMachine');

      const state = createInitialState();
      const stateCopy = JSON.parse(JSON.stringify(state));

      loadScenario(state, 'specimen47');

      expect(state).toEqual(stateCopy);
    });

    it('should not mutate state during stepForward', async () => {
      const { loadScenario, stepForward, createInitialState } = await import(
        '../stateMachine'
      );

      let state = createInitialState();
      state = loadScenario(state, 'specimen47');
      const stateCopy = JSON.parse(JSON.stringify(state));

      stepForward(state);

      expect(state).toEqual(stateCopy);
    });

    it('should not mutate state during reset', async () => {
      const { loadScenario, reset, createInitialState } = await import(
        '../stateMachine'
      );

      let state = createInitialState();
      state = loadScenario(state, 'specimen47');
      const stateCopy = JSON.parse(JSON.stringify(state));

      reset(state);

      expect(state).toEqual(stateCopy);
    });
  });
});
