/**
 * State Machine & Scenarios
 *
 * Comprehensive state management following 2025 best practices:
 * - Finite State Machine for streaming operations with explicit transitions
 * - Pure state transitions (same input = same output, no side effects)
 * - Discriminated union types for type-safe actions
 * - Deterministic scenarios for testing
 */

import type { ThoughtFragment, VisualElement } from './Character';

export type Mood = 'wonder' | 'obsession' | 'calm' | 'distress';

export interface VisualResponse {
  mood: Mood;
  depth: number;
  elements: VisualElement[];
}

export type SystemLogType = 'EVALUATION' | 'OBSERVATION' | 'THOUGHT' | 'CONFIDENCE';

export interface SystemLogEntry {
  timestamp: number;
  type: SystemLogType;
  message: string;
  value?: number; // For confidence metrics
}

export interface ResearchEvaluation {
  confidence: number; // 0-100%
  observationCount: number;
  lastObservation: string | null;
  hoverTarget: 'join' | 'reject' | null;
  hoverStartTime: number | null;
}

export interface AgentState {
  currentScenario: string | null;
  stepIndex: number;
  totalSteps: number;
  thoughts: ThoughtFragment[];
  response: VisualResponse | null;
  visibleElements: VisualElement[];
  researchEvaluation: ResearchEvaluation;
  systemLog: SystemLogEntry[];
  sessionStartTime: number;
}

export interface Scenario {
  name: string;
  description: string;
  thoughts: ThoughtFragment[];
  response: VisualResponse;
}

// Deterministic scenarios for testing
export const SCENARIOS: Record<string, Scenario> = {
  specimen47: {
    name: 'Specimen 47',
    description: 'Mira talks about her obsession',
    thoughts: [
      { text: '...it\'s been watching me...', intensity: 0.5, decay: 'fast' },
      { text: '...I can feel its presence...', intensity: 0.7, decay: 'slow' },
      { text: '...the eyes, those eyes...', intensity: 0.9, decay: 'slow', glitch: true },
      { text: '...why do I keep counting?...', intensity: 0.6, decay: 'slow' },
      { text: '...47...', intensity: 1.0, decay: 'linger', glitch: true },
    ],
    response: {
      mood: 'obsession',
      depth: 3500,
      elements: [
        { type: 'text', content: 'Specimen 47.', position: { x: 50, y: 25 } },
        { type: 'text', content: 'It watches back.', position: { x: 50, y: 45 } },
        { type: 'creature', content: 'leviathan-eye', position: { x: 50, y: 70 } },
        { type: 'text', content: '...always watching...', position: { x: 30, y: 85 } },
      ],
    },
  },
};

// Initial state
export function createInitialState(): AgentState {
  const now = Date.now();
  return {
    currentScenario: null,
    stepIndex: 0,
    totalSteps: 0,
    thoughts: [],
    response: null,
    visibleElements: [],
    researchEvaluation: {
      confidence: 0,
      observationCount: 0,
      lastObservation: null,
      hoverTarget: null,
      hoverStartTime: null,
    },
    systemLog: [
      {
        timestamp: 0,
        type: 'EVALUATION',
        message: 'Research Potential',
        value: 0,
      },
    ],
    sessionStartTime: now,
  };
}

// State transitions
export function loadScenario(state: AgentState, scenarioId: string): AgentState {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) return state;

  // Total steps = thoughts + response elements
  const totalSteps = scenario.thoughts.length + scenario.response.elements.length;

  return {
    ...state,
    currentScenario: scenarioId,
    stepIndex: 0,
    totalSteps,
    thoughts: scenario.thoughts,
    response: scenario.response,
    visibleElements: [],
  };
}

export function stepForward(state: AgentState): AgentState {
  if (!state.currentScenario) return state;

  const scenario = SCENARIOS[state.currentScenario];
  if (!scenario) return state;

  const thoughtCount = scenario.thoughts.length;
  const elementCount = scenario.response.elements.length;

  // Already at end
  if (state.stepIndex >= state.totalSteps) {
    return state;
  }

  const newStepIndex = state.stepIndex + 1;

  // Determine visible elements based on step
  let visibleElements = state.visibleElements;

  if (newStepIndex > thoughtCount && newStepIndex <= thoughtCount + elementCount) {
    const elementIndex = newStepIndex - thoughtCount - 1;
    visibleElements = scenario.response.elements.slice(0, elementIndex + 1);
  }

  return {
    ...state,
    stepIndex: newStepIndex,
    visibleElements,
  };
}

export function reset(state: AgentState): AgentState {
  if (!state.currentScenario) {
    return createInitialState();
  }

  return loadScenario(state, state.currentScenario);
}

// ============================================================================
// STREAMING STATE MACHINE (2025 Best Practice - Pure FSM)
// ============================================================================

/**
 * Streaming State - Discriminated union for type-safe state management
 *
 * Follows the finite state machine pattern with explicit, documented states:
 * - IDLE: No stream active
 * - STREAMING: Stream in progress with abort capability
 * - ERROR: Stream encountered an error with error message
 */
export type StreamingState =
  | {
      state: 'IDLE';
      streamId: number;
    }
  | {
      state: 'STREAMING';
      streamId: number;
      abort: () => void;
      startTime: number;
    }
  | {
      state: 'ERROR';
      streamId: number;
      error: string;
      failedAt: number;
    };

/**
 * Streaming Events - Discriminated union for type-safe action dispatch
 *
 * All possible transitions are explicitly defined:
 * - START_STREAM: Begin a new stream
 * - END_STREAM: Successfully complete stream
 * - INTERRUPT_STREAM: User cancels stream
 * - ERROR_STREAM: Stream encounters error
 */
export type StreamingEvent =
  | {
      type: 'START_STREAM';
      abort: () => void;
    }
  | {
      type: 'END_STREAM';
    }
  | {
      type: 'INTERRUPT_STREAM';
    }
  | {
      type: 'ERROR_STREAM';
      error: string;
    };

/**
 * Pure state transition function for streaming FSM
 *
 * Implements deterministic, side-effect-free transitions:
 * - IDLE + START_STREAM → STREAMING
 * - STREAMING + END_STREAM → IDLE (success)
 * - STREAMING + INTERRUPT_STREAM → IDLE (cancelled)
 * - STREAMING + ERROR_STREAM → ERROR
 * - ERROR + START_STREAM → STREAMING (retry)
 *
 * @param current Current streaming state
 * @param event Action to process
 * @returns New state after transition
 */
export function streamingStateMachine(
  current: StreamingState,
  event: StreamingEvent
): StreamingState {
  switch (event.type) {
    case 'START_STREAM': {
      // Can start from IDLE or ERROR states
      if (current.state === 'STREAMING') {
        console.warn('[StreamingFSM] Attempted START_STREAM while already streaming');
        return current; // No-op: already streaming
      }

      return {
        state: 'STREAMING',
        streamId: current.streamId + 1,
        abort: event.abort,
        startTime: Date.now(),
      };
    }

    case 'END_STREAM': {
      // Only transition if currently streaming
      if (current.state !== 'STREAMING') {
        console.warn('[StreamingFSM] Attempted END_STREAM while not streaming');
        return current; // No-op
      }

      const duration = Date.now() - current.startTime;
      console.log(
        `[StreamingFSM] Stream #${current.streamId} completed successfully (${duration}ms)`
      );

      return {
        state: 'IDLE',
        streamId: current.streamId,
      };
    }

    case 'INTERRUPT_STREAM': {
      // Only interrupt if streaming
      if (current.state !== 'STREAMING') {
        console.warn('[StreamingFSM] Attempted INTERRUPT_STREAM while not streaming');
        return current; // No-op
      }

      console.log(`[StreamingFSM] Stream #${current.streamId} interrupted by user`);

      return {
        state: 'IDLE',
        streamId: current.streamId,
      };
    }

    case 'ERROR_STREAM': {
      // Only error if streaming
      if (current.state !== 'STREAMING') {
        console.warn('[StreamingFSM] ERROR_STREAM received while not streaming');
        return current; // No-op
      }

      console.error(
        `[StreamingFSM] Stream #${current.streamId} failed: ${event.error}`
      );

      return {
        state: 'ERROR',
        streamId: current.streamId,
        error: event.error,
        failedAt: Date.now(),
      };
    }

    default:
      return current;
  }
}

/**
 * Create initial streaming state
 */
export function createInitialStreamingState(): StreamingState {
  return {
    state: 'IDLE',
    streamId: 0,
  };
}

/**
 * Determine if a transition is allowed (useful for testing)
 */
export function canTransition(
  current: StreamingState,
  event: StreamingEvent
): boolean {
  switch (event.type) {
    case 'START_STREAM':
      return current.state !== 'STREAMING';
    case 'END_STREAM':
    case 'INTERRUPT_STREAM':
    case 'ERROR_STREAM':
      return current.state === 'STREAMING';
    default:
      return false;
  }
}
