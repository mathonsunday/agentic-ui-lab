// State machine types and scenarios for deterministic testing

import type { ThoughtFragment, VisualElement } from './Character';

export type Phase = 'idle' | 'thinking' | 'composing' | 'displaying';
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
  phase: Phase;
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
    phase: 'idle',
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
    phase: 'idle',
    currentScenario: scenarioId,
    stepIndex: 0,
    totalSteps,
    thoughts: scenario.thoughts,
    response: scenario.response,
    visibleElements: [],
  };
}

export function setPhase(state: AgentState, phase: Phase): AgentState {
  // When jumping to a phase, set appropriate step index
  if (!state.currentScenario) return { ...state, phase };

  const scenario = SCENARIOS[state.currentScenario];
  if (!scenario) return { ...state, phase };

  let stepIndex = state.stepIndex;
  let visibleElements = state.visibleElements;

  if (phase === 'idle') {
    stepIndex = 0;
    visibleElements = [];
  } else if (phase === 'thinking') {
    stepIndex = 0;
    visibleElements = [];
  } else if (phase === 'composing') {
    stepIndex = scenario.thoughts.length;
    visibleElements = [];
  } else if (phase === 'displaying') {
    stepIndex = state.totalSteps;
    visibleElements = scenario.response.elements;
  }

  return {
    ...state,
    phase,
    stepIndex,
    visibleElements,
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

  // Determine phase and visible elements based on step
  let phase: Phase = state.phase;
  let visibleElements = state.visibleElements;

  if (newStepIndex <= thoughtCount) {
    phase = 'thinking';
  } else if (newStepIndex <= thoughtCount + elementCount) {
    const elementIndex = newStepIndex - thoughtCount - 1;
    phase = 'composing';
    visibleElements = scenario.response.elements.slice(0, elementIndex + 1);

    if (newStepIndex === state.totalSteps) {
      phase = 'displaying';
    }
  }

  return {
    ...state,
    phase,
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
