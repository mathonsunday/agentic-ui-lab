/**
 * Claude Backend Integration for Mira Agent
 *
 * SMART PERSONALITY ANALYSIS:
 * - Claude analyzes user input to determine personality metrics
 * - Claude updates user profile based on thoughtful analysis (not word count)
 * - Hardcoded responses from original simulator are preserved (artistic vision)
 * - Backend provides *intelligence*, frontend provides *artistry*
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MiraState, UserProfile } from '../shared/miraAgentSimulator';

export interface UserAnalysis {
  confidenceDelta: number; // How much to adjust confidence (-10 to +15)
  updatedProfile: Partial<UserProfile>; // Updated user profile metrics
  moodShift?: string; // Optional mood change
  reasoning: string; // Why Claude made these assessments
}

let anthropicClient: Anthropic | null = null;

/**
 * Initialize the Anthropic client with API key
 * API key comes from VITE_ANTHROPIC_API_KEY environment variable
 */
export function initializeClaudeClient(): Anthropic {
  if (anthropicClient) return anthropicClient;

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing VITE_ANTHROPIC_API_KEY environment variable. Create .env.local file with your API key.'
    );
  }

  // Allow browser API calls (Mira is frontend-only for this app)
  anthropicClient = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
  return anthropicClient;
}

/**
 * Get the client instance, initializing if needed
 */
function getClient(): Anthropic {
  return anthropicClient || initializeClaudeClient();
}

/**
 * Analyze user input using Claude to understand their personality traits
 * This replaces hardcoded word-count rules with real understanding
 * Claude evaluates depth of thought, curiosity, engagement, etc.
 */
export async function analyzeUserWithClaude(
  userInput: string,
  miraState: MiraState
): Promise<UserAnalysis> {
  try {
    const client = getClient();

    const systemPrompt = `You are analyzing a user's message to understand their personality traits and engagement depth.
You are assisting Dr. Mira Petrovic, a deep-sea researcher, in understanding the person she's interacting with.

Analyze the user's message and return a JSON response with these metrics:
- confidenceDelta: number between -10 and +15 (MOST IMPORTANT: how much this message increases/decreases Mira's trust)
  * ANY question (even one question): +12 to +15 (questions show genuine engagement)
  * Multiple questions: +13 to +15 (showing real curiosity)
  * Asking for explanations: +12 to +15 (wants to learn more)
  * Thoughtful observations: +10 to +12 (noticing details, making connections)
  * Honest engagement ("I have no idea"): +10 to +12 (authentic participation)
  * One-word lazy answer: -2 to 0
  * Rude/dismissive: -5 to -10

  RULE: If they ask ANY question, minimum is +12. No exceptions.

- thoughtfulness: number 0-100 (are they thinking? asking questions? making observations?)
- adventurousness: number 0-100 (willing to explore, learn, engage with new ideas?)
- engagement: number 0-100 (how actively participating? showing genuine interest?)
- curiosity: number 0-100 (asking questions? wanting to understand more?)
- superficiality: number 0-100 (lazy one-word answers? no effort?)

CRITICAL MINDSET:
This is a user trying to engage with you. Be GENEROUS. They're asking questions about ASCII art creatures and trying to understand. That's GOOD.
- Questions = AT LEAST +12 confidence
- Multiple questions = +14 or +15
- Honest confusion + asking = +12 or +13
- Only penalize complete disengagement or rudeness
- Default to encouraging scores unless they're being mean

Current user profile: ${JSON.stringify(miraState.userProfile)}
Current confidence: ${miraState.confidenceInUser}%
Interaction count: ${miraState.memories.length}

Return ONLY valid JSON in this exact format:
{
  "confidenceDelta": number,
  "thoughtfulness": number,
  "adventurousness": number,
  "engagement": number,
  "curiosity": number,
  "superficiality": number,
  "reasoning": "brief explanation of your assessment"
}`;

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `User message: "${userInput}"`,
        },
      ],
    });

    // Extract and parse response
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = parseAnalysisResponse(responseText);

    // Debug logging
    console.log('Claude analysis for input:', userInput.substring(0, 50));
    console.log('Claude returned confidenceDelta:', parsed.confidenceDelta);
    console.log('Profile update:', parsed.updatedProfile);

    return parsed;
  } catch (error) {
    // Graceful fallback if Claude fails
    console.error('Claude analysis error:', error);

    return {
      confidenceDelta: 0,
      updatedProfile: {},
      reasoning: 'Backend analysis unavailable',
    };
  }
}

/**
 * Parse Claude's analysis response
 * Handles malformed JSON gracefully
 */
function parseAnalysisResponse(rawResponse: string): UserAnalysis {
  try {
    // Try to extract JSON from response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Clamp values to valid ranges
    return {
      confidenceDelta: clamp(parsed.confidenceDelta ?? 0, -10, 15),
      updatedProfile: {
        thoughtfulness: clamp(parsed.thoughtfulness, 0, 100),
        adventurousness: clamp(parsed.adventurousness, 0, 100),
        engagement: clamp(parsed.engagement, 0, 100),
        curiosity: clamp(parsed.curiosity, 0, 100),
        superficiality: clamp(parsed.superficiality, 0, 100),
      },
      moodShift: parsed.moodShift,
      reasoning: parsed.reasoning || 'Analysis complete',
    };
  } catch (error) {
    console.error('Failed to parse Claude analysis:', error);

    // Return neutral analysis if parsing fails
    return {
      confidenceDelta: 0,
      updatedProfile: {},
      reasoning: 'Analysis parsing failed',
    };
  }
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
