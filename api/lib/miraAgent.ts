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
  ResponseAssessment,
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
 * Main orchestration: Execute full agent flow
 * Used by the batch endpoint /api/analyze-user
 * Note: Production uses analyze-user-stream.ts which has more advanced streaming support
 */
export async function executeMiraAgent(
  userInput: string,
  miraState: MiraState,
  assessment: ResponseAssessment
): Promise<{ updatedState: MiraState; response: AgentResponse }> {
  // Lazy import to avoid circular dependencies
  const { createBasicMiraPrompt } = await import('./prompts/systemPromptBuilder.js');
  const Anthropic = require('@anthropic-ai/sdk').default;

  try {
    // Step 1: Analyze user with Claude using basic prompt
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = createBasicMiraPrompt(miraState);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `User message: "${userInput}"`,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const analysis = parseAnalysisResponse(responseText);

    // Step 2: Update confidence and profile
    const stateAfterAnalysis = updateConfidenceAndProfile(miraState, analysis);

    // Step 3: Select response from library
    const response = selectResponse(stateAfterAnalysis, assessment);

    // Step 4: Update memory
    const finalState = updateMemory(stateAfterAnalysis, userInput, response);

    return {
      updatedState: finalState,
      response,
    };
  } catch (error) {
    console.error('Error in executeMiraAgent:', error);
    throw error;
  }
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
