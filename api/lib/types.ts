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
    };

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

