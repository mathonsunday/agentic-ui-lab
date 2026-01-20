/**
 * Shared type definitions for LangGraph Mira Agent
 * Defines the state structure that flows through the agent graph
 *
 * With MCP-UI compatibility extensions for:
 * - Tool schema definitions
 * - Structured tool results
 * - State versioning
 */

export interface UserProfile {
  thoughtfulness: number;
  adventurousness: number;
  engagement: number;
  curiosity: number;
  superficiality: number;
}

export interface ToolCallData {
  action: string;
  timestamp: number;
  sequenceNumber: number;
  zoomLevel?: string;
}

/**
 * Interrupt Memory
 *
 * Captures interrupt events with extensible data for future prompt iteration.
 *
 * OPTION A (Current implementation):
 *   Uses: interruptNumber, timestamp
 *   Claude sees: "User interrupted 3 times total"
 *   Prompt shows only COUNT of interrupts
 *
 * OPTION B (Future - zero code changes):
 *   Uses: blockedResponseStart, blockedResponseLength
 *   Claude sees: "User interrupted when you were about to say X"
 *   Prompt includes SNIPPETS of blocked responses
 *
 * OPTION C (Future - zero code changes):
 *   Uses: assessmentAtInterrupt, creatureMoodAtInterrupt
 *   Claude sees: "User interrupted when you were expressing vulnerability"
 *   Prompt includes PATTERN ANALYSIS of emotional context
 *
 * All three options use the SAME memory data - only prompt interpretation changes.
 */
export interface InterruptMemory {
  timestamp: number;
  type: 'interrupt';  // Discriminator

  // Option A: Core interrupt tracking (CURRENTLY USED)
  interruptNumber: number;  // Sequential: 1st, 2nd, 3rd interrupt

  // Option B: Blocked response data (FOR FUTURE PROMPT ITERATION)
  blockedResponseStart?: string;      // First 150 chars of streaming text
  blockedResponseLength?: number;     // Character position when interrupted

  // Option C: Emotional context (FOR FUTURE PROMPT ITERATION)
  assessmentAtInterrupt?: string;     // Copy of last analysis.reasoning
  creatureMoodAtInterrupt?: string;   // Copy of last analysis.suggested_creature_mood

  // Required fields to match InteractionMemory pattern
  content: string;        // Always 'interrupt' for filtering
  duration: number;       // Always 0 (interrupts are instantaneous)
  depth: 'surface';       // Always 'surface' (interrupts aren't deep engagement)
}

/**
 * Discriminated union for interaction memory - discriminated by type field
 */
export type InteractionMemory =
  | {
      timestamp: number;
      type: 'response' | 'question';
      content: string;
      duration: number;
      depth: 'surface' | 'moderate' | 'deep';
    }
  | {
      timestamp: number;
      type: 'tool_call';
      content: string;
      duration: number;
      depth: 'surface' | 'moderate' | 'deep';
      toolData: ToolCallData;
    }
  | InterruptMemory;

export interface MiraState {
  confidenceInUser: number;
  userProfile: UserProfile;
  memories: InteractionMemory[];
  currentMood: 'curious' | 'vulnerable' | 'testing' | 'excited' | 'defensive';
  hasFoundKindred: boolean;
  responseIndices: {
    [key: string]: number;
  };
}

export interface UserAnalysis {
  confidenceDelta: number;
  updatedProfile: Partial<UserProfile>;
  moodShift?: string;
  reasoning: string;
  suggested_creature_mood?: string;
}

/**
 * Frontend assessment of user response type and depth
 * Narrowed to only types that are assigned by assessResponse()
 */
export type ResponseAssessment = {
  type: 'response' | 'question';
  depth: 'surface' | 'moderate' | 'deep';
  confidenceDelta: number;
  traits?: Partial<UserProfile>;
};

/**
 * Extended assessment union including tool_call for streaming interactions
 * Used by streamMiraBackend to support both user responses and tool calls
 */
export type StreamAssessment = ResponseAssessment | {
  type: 'tool_call';
  depth: 'surface' | 'moderate' | 'deep';
  confidenceDelta: number;
  traits?: Partial<UserProfile>;
};

export interface AgentResponse {
  streaming: string[];
  observations: string[];
  moodShift?: string;
  confidenceDelta: number;
}

