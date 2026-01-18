# System Prompt Usage Audit
## Which Prompt is Actually Used?

---

## TL;DR

**Only `analyze-user-stream.ts` is actively used in production.**

The `miraAgent.ts` prompt (~215 lines) is **DEAD CODE** - it's not called anywhere in your active code path. It's only referenced in old test files. You have one real prompt to manage, not two.

---

## The Audit Trail

### What's Actually Called in Production

**File: `/api/analyze-user-stream.ts` (lines 300-311)**
```typescript
// This is the ACTUAL production code path:
const stream = await client.messages.stream({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 300,
  system: systemPrompt,  // ← Uses the 275-line prompt from analyze-user-stream.ts
  messages: [
    {
      role: 'user',
      content: `User message: "${userInput}"`,
    },
  ],
});
```

The `systemPrompt` variable here comes from **lines 156-298** of analyze-user-stream.ts (the huge one you've been iterating on).

### What's NOT Called

**File: `/api/lib/miraAgent.ts` (lines 35-77)**

The `analyzeUserInput()` function with its 215-line system prompt is:
- ❌ Not imported in analyze-user-stream.ts
- ❌ Not called anywhere in active code paths
- ✓ Only referenced in test files (miraAgent.test.ts, miraAgent.functional.test.ts)
- ✓ Only used in old/development code paths

**Import Chain in analyze-user-stream.ts (line 21):**
```typescript
import { updateConfidenceAndProfile, updateMemory, processToolCall } from './lib/miraAgent.js';
```

Notice it imports **utilities** from miraAgent but NOT the analyzeUserInput function. It imports:
- `updateConfidenceAndProfile` - updates state AFTER Claude analyzes
- `updateMemory` - tracks interactions
- `processToolCall` - handles tool calls

But it does NOT import `analyzeUserInput` - the function containing the dead prompt.

### Proof: Code Flow in analyze-user-stream.ts

Line 301: `const stream = await client.messages.stream({...})`
- ✓ Uses system prompt FROM analyze-user-stream.ts
- ✗ Does NOT call analyzeUserInput()
- ✗ Does NOT use miraAgent prompt
- ✓ Calls Claude directly with SSE streaming
- ✓ Parses JSON response manually (lines 323-347)
- ✓ Updates state using utility functions from miraAgent

---

## The Zombie Code Problem

### What You Have

| File | Function | Prompt Size | Status | Used? |
|------|----------|-------------|--------|-------|
| `miraAgent.ts` | `analyzeUserInput()` | 215 lines | Dead Code | ❌ No |
| `analyze-user-stream.ts` | (inline Claude call) | 275 lines | Active | ✅ Yes |

### Why Does miraAgent.ts Still Exist?

**Hypothesis**: It was the original implementation, then analyze-user-stream.ts was created as a refactoring to add SSE streaming, and the old function was never removed. Now you have:

1. The old, simpler `analyzeUserInput()` in miraAgent.ts (basic prompt)
2. The new, advanced SSE implementation in analyze-user-stream.ts (advanced prompt)

Only #2 is used in production.

---

## The Refactoring Implications

### Good News
You only have ONE prompt to refactor, not two. This makes the problem simpler:

**Before (what I thought):**
- 490 lines of prompts across 2 files = complex situation
- Need to consolidate and deduplicate

**After (reality):**
- 275 lines of ONE production prompt = straightforward
- Just need to extract and structure this one prompt
- Can delete the dead code in miraAgent.ts

### Updated Refactoring Effort
- Extract analyze-user-stream.ts prompt: 2-3 hours (not 3-4)
- Delete/simplify miraAgent.ts: 30 min
- Delete duplication: Already gone
- Total: 2.5-3.5 hours (faster than estimated)

### Updated Impact
Since there's no duplication between active code, the impact is:
- ✓ Remove dead code (215 lines)
- ✓ Make the one real prompt structured/testable
- ✓ Remove confusion about which prompt is used
- ✓ Cleaner codebase

---

## Why miraAgent.ts Still Has That Prompt

Looking at the code structure, miraAgent.ts appears to be a **utility module** with:
- `analyzeUserInput()` - Dead function with old prompt
- `updateConfidenceAndProfile()` - Used by analyze-user-stream
- `updateMemory()` - Used by analyze-user-stream
- `selectResponse()` - Unused (old response selection)
- `processToolCall()` - Used by analyze-user-stream
- Helper functions - Various utilities

So miraAgent.ts is partially used (utilities) but the main function (analyzeUserInput) is not.

---

## What This Means for Your Refactoring

### Option: Delete the Dead Code

You could simply delete the unused `analyzeUserInput()` function and its 215-line prompt:

```typescript
// DELETE THIS ENTIRE FUNCTION (miraAgent.ts lines 25-104):
export async function analyzeUserInput(
  userInput: string,
  miraState: MiraState
): Promise<UserAnalysis> {
  // 79 lines of setup + 215 line prompt = DEAD CODE
}

// KEEP THESE (used by analyze-user-stream.ts):
export function updateConfidenceAndProfile(...) { ... }
export function updateMemory(...) { ... }
export function processToolCall(...) { ... }
// etc.
```

**Impact**: Remove 215 lines of dead code immediately.

### Option: Refactor to Keep Structure

If you might use miraAgent.ts in the future for non-streaming analysis, you could:
1. Extract its prompt into the prompt builder
2. Keep the function for backward compatibility
3. Have both streaming and non-streaming paths use the same builder

But currently: **Non-streaming analysis isn't used anywhere**.

---

## Best Practice Implication

This is actually a teaching moment: **You have one real system prompt, not two.**

The confusion arose because you've been iterating on the active prompt in analyze-user-stream.ts while the dead prompt in miraAgent.ts sits unused. This is a common pattern in rapid development:

1. Build feature (miraAgent.ts)
2. Refactor implementation (analyze-user-stream.ts)
3. Keep old code "just in case"
4. Old code becomes invisible/forgotten
5. New developers think there are 2 active prompts

This is actually a strong argument FOR the prompt builder approach - it makes clear which prompt is active and used.

---

## Recommended Action

### Short Term
1. Delete the dead `analyzeUserInput()` function from miraAgent.ts
2. Keep the utility functions that are actually used
3. Add a comment noting which prompts/functions are active

### Medium Term
1. Extract the one real prompt (from analyze-user-stream.ts) into the prompt builder
2. Use the builder in analyze-user-stream.ts
3. Keep miraAgent.ts utilities as-is

### Result
- Clean codebase (no dead code)
- Clear which prompt is used (the one in the builder)
- Easier to maintain
- Easier for new developers to understand

---

## Files Affected

**Delete from `api/lib/miraAgent.ts`:**
- Lines 25-104: The `analyzeUserInput()` function

**Keep in `api/lib/miraAgent.ts`:**
- Line 21: Imports
- Lines 109-137: `updateConfidenceAndProfile()`
- Lines 142-199: `selectResponse()`
- Lines 204-232: `selectContent()`
- Lines 238-254: `selectWeightedResponse()`
- Lines 269-294: `generateObservations()`
- Lines 303-307: `getPersonalityFromConfidence()`
- Lines 312-341: `parseAnalysisResponse()`
- Lines 346-348: `clamp()`
- Lines 353-373: `updateMemory()`
- Lines 378-399: `executeMiraAgent()`
- Lines 402-440: Tool processing

Most of the file is utilities. Only `analyzeUserInput()` is dead.

---

## One More Thing: Token Usage

Removing 215 lines of unused system prompt also means:

**If someone accidentally called miraAgent.analyzeUserInput():**
- Before: 215 token system prompt + request tokens = ~250 tokens minimum per call
- After: No prompt at all (function deleted)

**Active path (analyze-user-stream.ts):**
- Currently: 275 token system prompt + request tokens
- With prompt builder: Same, but structured and testable

So no impact on active usage, just cleaner code.

---

## Summary

| Question | Answer |
|----------|--------|
| **How many production prompts do you have?** | One (analyze-user-stream.ts) |
| **Is miraAgent.ts prompt used?** | No, it's dead code |
| **Should it be deleted?** | Yes, unless you have future plans for batch/non-streaming |
| **Does this change the refactoring plan?** | Slightly - less duplication, smaller scope |
| **New estimated effort** | 2.5-3.5 hours (was 3-4) |
| **New impact** | Remove dead code + structure active prompt |
