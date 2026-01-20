/**
 * State Machine & Scenarios
 *
 * Comprehensive state management following 2025 best practices:
 * - Finite State Machine for streaming operations with explicit transitions
 * - Pure state transitions (same input = same output, no side effects)
 * - Discriminated union types for type-safe actions
 * - Deterministic scenarios for testing
 */

export interface ThoughtFragment {
  text: string;
  intensity: number;
  decay: 'fast' | 'slow' | 'linger';
  glitch?: boolean;
}

export interface VisualElement {
  type: 'text' | 'image' | 'creature' | 'particle' | 'sound';
  content: string;
  position?: { x: number; y: number };
  style?: Record<string, string | number>;
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
  thoughts: ThoughtFragment[];
  visibleElements: VisualElement[];
  researchEvaluation: ResearchEvaluation;
  systemLog: SystemLogEntry[];
  sessionStartTime: number;
}

// Initial state
export function createInitialState(): AgentState {
  const now = Date.now();
  return {
    thoughts: [],
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
