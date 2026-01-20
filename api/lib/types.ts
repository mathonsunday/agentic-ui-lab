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
 *
 * KNOWN LIMITATION - Claude Acknowledgment Issue:
 * ================================================
 * Interrupts are correctly captured and passed to Claude, BUT in manual testing:
 * - Claude rarely explicitly acknowledges interrupts in reasoning or MIRA'S NOTES
 * - When acknowledged, language is neutral ("After interrupt, you returned")
 *   vs desired ("You cut me off", "That was disrespectful")
 * - Even with aggressive prompt instructions, Claude deprioritizes interrupt context
 *   in favor of other system guidance
 * - This suggests either:
 *   (a) Interrupt context needs higher placement in prompt ordering
 *   (b) Claude's base instruction to be respectful conflicts with acknowledging rudeness
 *   (c) Interrupt context is too vague for Claude to strongly condition on
 * - Implementation is architecturally sound and extensible for future options
 * - The limitation is in getting Claude to actively acknowledge the violation
 *
 * TODO: Consider prompt restructuring or dedicated interrupt handling if this
 * becomes critical to user experience.
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

