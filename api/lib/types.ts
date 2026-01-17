/**
 * Shared type definitions for LangGraph Mira Agent
 * Defines the state structure that flows through the agent graph
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

export interface InteractionMemory {
  timestamp: number;
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore' | 'tool_call';
  content: string;
  duration: number;
  depth: 'surface' | 'moderate' | 'deep';
  toolData?: ToolCallData;
}

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
}

export interface ResponseAssessment {
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore' | 'tool_call';
  depth: 'surface' | 'moderate' | 'deep';
  confidenceDelta: number;
  traits?: Partial<UserProfile>;
}

export interface AgentResponse {
  streaming: string[];
  observations: string[];
  contentSelection: {
    sceneId: string;
    creatureId: string;
    revealLevel: 'surface' | 'moderate' | 'deep';
  };
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
