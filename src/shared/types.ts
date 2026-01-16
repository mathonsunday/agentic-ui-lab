// Shared types

// Agent state
export type AgentPhase = 'idle' | 'thinking' | 'composing' | 'displaying';

export interface AgentState {
  phase: AgentPhase;
  currentInput: string | null;
  thinkingProgress: number; // 0-1
}
