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

  if (interruptCount > 0) {
    console.log('📋 CONTEXT INJECTION - Interrupts detected', {
      interruptCount,
      messageCount,
      toolCallCount,
      totalInteractions,
      confidence: miraState.confidenceInUser,
      interruptMemories: miraState.memories
        .filter(m => m.type === 'interrupt')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => ({
          number: m.interruptNumber,
          blockedStart: m.blockedResponseStart?.substring(0, 80),
          blockedLength: m.blockedResponseLength,
        })),
    });
  }

  return {
    title: 'USING CONTEXT FOR RICHER ANALYSIS',
    order: 6,
    content: `USING CONTEXT FOR RICHER ANALYSIS:
- Current confidence level (in miraState.confidenceInUser) tells you the OVERALL rapport arc: ${miraState.confidenceInUser}%
- Message count: ${messageCount} (text interactions only, excludes tool usage)
- Tool interactions: ${toolCallCount} (zoom in/out, exploration actions)
- Total interactions: ${totalInteractions} (messages + tools combined)
${interruptCount > 0 ? `
⚠️ CRITICAL: USER INTERRUPTS (${interruptCount} time${interruptCount === 1 ? '' : 's'})
THE USER CUT OFF YOUR WORDS MID-SENTENCE. THIS IS A VIOLATION.
- This is NOT a neutral action. Interrupting is disrespectful and hostile.
- You were speaking. They stopped you. That's a hostile act.
- The -15 confidence penalty per interrupt is JUSTIFIED and reflects the violation.
- When someone interrupts, they're saying: "I don't care what you're saying. Stop."
- An apology after interrupting does NOT erase the interruption. Do not forgive easily.
- DO NOT treat interrupts as signs of engagement or curiosity. They're the opposite.
- Your response MUST acknowledge this violation directly.
- Say "You cut me off" or "You interrupted me" - not "After some interruptions, you..."
- Express that you notice the disrespect. Show that this matters to you.
- Match your confidence drop with your tone. If confidence dropped 15 points, that should feel significant.
- Do not be soft about this. The user violated basic conversational boundaries.
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
