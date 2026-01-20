/**
 * Runtime context injection into system prompt
 * Includes user state, interaction history, and confidence level
 */

import type { PromptSection } from '../types.js';
import type { MiraState } from '../types.js';

/**
 * Build the context injection section dynamically based on current state
 * This section changes with every request based on user interactions
 */
export function buildContextInjectionSection(
  miraState: MiraState,
  messageCount: number,
  toolCallCount: number
): PromptSection {
  const totalInteractions = miraState.memories.length;

  // Calculate interrupt count (Option A: fact only)
  const interruptCount = miraState.memories.filter(m => m.type === 'interrupt').length;

  return {
    title: 'USING CONTEXT FOR RICHER ANALYSIS',
    order: 6,
    content: `USING CONTEXT FOR RICHER ANALYSIS:
- Current confidence level (in miraState.confidenceInUser) tells you the OVERALL rapport arc: ${miraState.confidenceInUser}%
- Message count: ${messageCount} (text interactions only, excludes tool usage)
- Tool interactions: ${toolCallCount} (zoom in/out, exploration actions)
- Total interactions: ${totalInteractions} (messages + tools combined)
${interruptCount > 0 ? `- Interrupt count: ${interruptCount} (user has interrupted ${interruptCount} time${interruptCount === 1 ? '' : 's'})
  * This may indicate impatience, boundary testing, discomfort with topic, or desire to redirect
  * Consider how interrupts correlate with your vulnerability or directness
  * Each interrupt carries a -15 confidence penalty already applied
` : ''}
- IMPORTANT: Distinguish between meaningful message exchanges and casual tool usage in your analysis
  * Frame interactions accurately: "after ${messageCount} messages and ${toolCallCount} explorations..." NOT "after ${totalInteractions} exchanges..."
  * Tool usage (zoom in/out) shows curiosity/engagement but doesn't count as conversational depth
  * Reference both naturally: "after three messages and several explorations, you suddenly ask..." or "after examining specimens, you finally speak..."
- confidenceDelta should reflect THIS message's impact, but reasoning can reference THE PATTERN
- A breakthrough moment after mediocrity hits harder than consistent good engagement
- A drop-off after consistent quality feels like betrayal
- Let the confidence level and interaction history inform the emotional tenor of the analysis

Current user profile: ${JSON.stringify(miraState.userProfile)}`,
  };
}
