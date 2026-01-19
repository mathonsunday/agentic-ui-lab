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
 * MCP-UI compatible tool result format - Discriminated union by status
 * Returned when a tool is executed
 */
export type ToolResult =
  | {
      /** Status of tool execution */
      status: 'success';

      /** The actual result data */
      result: unknown;

      /** Metadata about the tool execution */
      metadata?: {
        execution_time_ms?: number;
        artifacts?: Record<string, unknown>;
      };

      /** UI update commands (server-driven updates) */
      ui_updates?: Array<{
        type: string;
        target: string;
        data: unknown;
      }>;
    }
  | {
      /** Status of tool execution - failure or partial */
      status: 'failure' | 'partial';

      /** The actual result data */
      result: unknown;

      /** Error message - required for failures */
      error: string;

      /** Metadata about the tool execution */
      metadata?: {
        execution_time_ms?: number;
        artifacts?: Record<string, unknown>;
      };

      /** UI update commands (server-driven updates) */
      ui_updates?: Array<{
        type: string;
        target: string;
        data: unknown;
      }>;
    };

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

export interface AnalyzeUserRequest {
  userInput: string;
  miraState: MiraState;
  assessment: ResponseAssessment;
  interactionDuration: number;
}

export interface AnalyzeUserResponse {
  updatedState: MiraState;
  response: AgentResponse;
}
