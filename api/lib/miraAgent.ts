/**
 * LangGraph Agent for Mira - Deep Sea Researcher
 *
 * State flow:
 * 1. user_analysis: Claude analyzes user input to understand personality traits
 * 2. confidence_update: Merge Claude's analysis with current state
 * 3. response_selection: Select appropriate response from hardcoded library
 * 4. memory_update: Record interaction in Mira's memory
 */

import {
  MiraState,
  UserAnalysis,
  AgentResponse,
  UserProfile,
  ToolCallData,
} from './types.js';

/**
 * Step 1: Update confidence and profile based on Claude's analysis
 *
 * NOTE: The old analyzeUserInput() function that was here has been deleted as it was dead code.
 * The production analysis now uses the Structured Prompt Builder in analyze-user-stream.ts
 * which provides more advanced personality tuning and better maintainability.
 */
export function updateConfidenceAndProfile(
  miraState: MiraState,
  analysis: UserAnalysis
): MiraState {
  const newConfidence = Math.max(
    0,
    Math.min(100, miraState.confidenceInUser + analysis.confidenceDelta)
  );

  const updatedProfile = {
    ...miraState.userProfile,
    ...analysis.updatedProfile,
  };

  // Map personality to mood
  const personality = getPersonalityFromConfidence(newConfidence);
  const moodMap: Record<string, MiraState['currentMood']> = {
    negative: 'defensive',
    chaotic: 'testing',
    glowing: 'curious',
  };

  return {
    ...miraState,
    confidenceInUser: newConfidence,
    userProfile: updatedProfile,
    currentMood: moodMap[personality],
  };
}

/**
 * Helper: Determine personality from confidence level
 * 3-personality system with equal 33% ranges:
 * - 0-33%: negative (dismissive)
 * - 34-67%: chaotic (philosophical)
 * - 68-100%: glowing (reverent)
 */
export function getPersonalityFromConfidence(confidence: number): string {
  if (confidence < 34) return 'negative';
  if (confidence < 68) return 'chaotic';
  return 'glowing';
}

/**
 * Step 4: Update memory with interaction
 */
export function updateMemory(
  miraState: MiraState,
  userInput: string,
  response: AgentResponse
): MiraState {
  const responseText = response.streaming.join(' ');

  return {
    ...miraState,
    memories: [
      ...miraState.memories,
      {
        timestamp: Date.now(),
        type: 'response',
        content: userInput,
        duration: 0,
        depth: 'moderate',
      },
    ],
  };
}

/**
 * Tool Processing: Handle tool call events (e.g., zoom in/out)
 * Applies hardcoded score increases based on tool action
 */

// Hardcoded score mappings for each tool action
const TOOL_SCORE_MAP: Record<string, number> = {
  'zoom_in': 5,
  'zoom_out': 5,
};

/**
 * Process a tool call and update Mira's state
 * Tool calls award hardcoded rapport points (silent score changes, no dialogue)
 */
export function processToolCall(
  miraState: MiraState,
  toolData: ToolCallData
): MiraState {
  const scoreIncrease = TOOL_SCORE_MAP[toolData.action] || 0;
  const newConfidence = Math.max(0, Math.min(100,
    miraState.confidenceInUser + scoreIncrease
  ));

  return {
    ...miraState,
    confidenceInUser: newConfidence,
    memories: [
      ...miraState.memories,
      {
        timestamp: toolData.timestamp,
        type: 'tool_call',
        content: toolData.action,
        duration: 0,
        depth: 'moderate',
        toolData,
      },
    ],
  };
}
