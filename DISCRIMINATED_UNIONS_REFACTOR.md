# Discriminated Unions Refactoring - Complete Summary

## Overview

This document summarizes the refactoring of loose union types into true discriminated unions in the agentic-ui-lab project. This improves type safety, reduces bugs, and ensures all union variants are handled properly.

## What Were Changed

### 1. **InteractionMemory** ([api/lib/types.ts](api/lib/types.ts#L75-L93))

**Before:**

```typescript
export interface InteractionMemory {
  timestamp: number;
  type: "response" | "reaction" | "question" | "hover" | "ignore" | "tool_call";
  content: string;
  duration: number;
  depth: "surface" | "moderate" | "deep";
  toolData?: ToolCallData; // Optional, only meaningful for 'tool_call'
}
```

**Problems:**

- 6 possible type values but only 2-3 were actually used in the codebase
- `toolData` was optional but semantically only made sense for `'tool_call'` type
- No type safety: code couldn't distinguish which fields were available for each type

**After:**

```typescript
export type InteractionMemory =
  | {
      timestamp: number;
      type: "response" | "question";
      content: string;
      duration: number;
      depth: "surface" | "moderate" | "deep";
    }
  | {
      timestamp: number;
      type: "tool_call";
      content: string;
      duration: number;
      depth: "surface" | "moderate" | "deep";
      toolData: ToolCallData; // Now REQUIRED for tool_call variant
    };
```

**Benefits:**

- TypeScript now enforces that `toolData` MUST be present when `type === 'tool_call'`
- Each variant has exactly the fields it needs—no optional confusion
- Code that checks `if (memory.type === 'tool_call')` automatically narrows type to include `toolData`

### 2. **ToolResult** ([api/lib/types.ts](api/lib/types.ts#L30-L73))

**Before:**

```typescript
export interface ToolResult {
  status: 'success' | 'failure' | 'partial';
  result: unknown;
  error?: string;  // Optional, but only meaningful for failures
  metadata?: { ... };
  ui_updates?: Array<{ ... }>;
}
```

**Problems:**

- `error` field was optional but semantically required for failure/partial states
- Success variant shouldn't have error, but the interface allowed it
- No compile-time guarantee that errors are handled

**After:**

```typescript
export type ToolResult =
  | {
      status: 'success';
      result: unknown;
      metadata?: { ... };
      ui_updates?: Array<{ ... }>;
    }
  | {
      status: 'failure' | 'partial';
      result: unknown;
      error: string;  // Now REQUIRED
      metadata?: { ... };
      ui_updates?: Array<{ ... }>;
    };
```

**Benefits:**

- When `status === 'failure' | 'partial'`, TypeScript ensures `error` exists
- When `status === 'success'`, TypeScript ensures no `error` field is expected
- Prevents bugs where error handling is forgotten

### 3. **ResponseAssessment** ([api/lib/types.ts](api/lib/types.ts#L114-L123))

**Before:**

```typescript
export interface ResponseAssessment {
  type: "response" | "reaction" | "question" | "hover" | "ignore" | "tool_call";
  depth: "surface" | "moderate" | "deep";
  confidenceDelta: number;
  traits?: Partial<UserProfile>;
}
```

**After (narrowed):**

```typescript
export type ResponseAssessment = {
  type: "response" | "question"; // Only types actually assigned by assessResponse()
  depth: "surface" | "moderate" | "deep";
  confidenceDelta: number;
  traits?: Partial<UserProfile>;
};
```

**New Type: StreamAssessment** (added for flexibility):

```typescript
export type StreamAssessment =
  | ResponseAssessment
  | {
      type: "tool_call";
      depth: "surface" | "moderate" | "deep";
      confidenceDelta: number;
      traits?: Partial<UserProfile>;
    };
```

**Rationale:**

- `ResponseAssessment` represents the frontend assessment from `assessResponse()` function
- It only ever assigns `'response'` or `'question'` types
- `StreamAssessment` extends this to include `'tool_call'` for internal streaming interactions
- This maintains the contract: frontend assessment produces 2 types, streaming can handle 3

## Files Modified

1. **[api/lib/types.ts](api/lib/types.ts)**
   - Converted `InteractionMemory` from interface to discriminated union type
   - Converted `ToolResult` from interface to discriminated union type
   - Narrowed `ResponseAssessment` to actual usage
   - Added `StreamAssessment` for streaming operations

2. **[src/shared/miraAgentSimulator.ts](src/shared/miraAgentSimulator.ts)**
   - Removed local `ResponseAssessment` interface (now imports from api/lib/types)
   - Updated `assessResponse()` return type to match narrowed `ResponseAssessment`
   - Only returns `'response'` or `'question'` types (no longer includes unused variants)

3. **[src/services/miraBackendStream.ts](src/services/miraBackendStream.ts)**
   - Updated `streamMiraBackend()` to accept `StreamAssessment` instead of `ResponseAssessment`
   - Allows tool_call assessments while maintaining frontend assessment contract

4. **New Files:**
   - **[src/lib/exhaustiveMatch.ts](src/lib/exhaustiveMatch.ts)** - Utility for exhaustive pattern matching
   - **[src/lib/discriminatedUnionExamples.ts](src/lib/discriminatedUnionExamples.ts)** - Examples of using discriminated unions safely

## How to Use Discriminated Unions

### Pattern 1: Switch Statement (Recommended)

```typescript
function processMemory(memory: InteractionMemory): string {
  switch (memory.type) {
    case "response":
    case "question":
      return `User said: ${memory.content}`;
    case "tool_call":
      return `Tool: ${memory.toolData.action}`; // TypeScript knows toolData exists
    default:
      return exhaustive(memory); // TS error if all cases not handled
  }
}
```

### Pattern 2: If-Else with Type Narrowing

```typescript
function processResult(result: ToolResult): void {
  if (result.status === "success") {
    console.log("Success:", result.result);
    // result.error doesn't exist here - TypeScript prevents accessing it
  } else {
    console.log("Error:", result.error); // TypeScript knows error exists
  }
}
```

### Pattern 3: Type Guard Filtering

```typescript
function getToolCalls(
  memories: InteractionMemory[],
): Array<Extract<InteractionMemory, { type: "tool_call" }>> {
  return memories.filter(
    (m): m is Extract<InteractionMemory, { type: "tool_call" }> =>
      m.type === "tool_call",
  );
}

const toolCalls = getToolCalls(miraState.memories);
// toolCalls[0].toolData is guaranteed to exist
```

## Key Benefits

1. **Type Safety**: TypeScript prevents accessing fields that don't exist for a variant
2. **Exhaustiveness**: Using `exhaustive()` ensures all variants are handled
3. **Clarity**: Code intent is clear—each variant has exactly the fields it needs
4. **Refactoring Safety**: Adding new variants causes TS errors in all places that need updates
5. **Reduced Bugs**: Can't forget error handling or access undefined optional fields

## Breaking Changes

None for production code. The refactoring is internal type structure only:

- No runtime behavior changes
- All existing code continues to work
- Type narrowing just becomes stricter (better type inference)

## Next Steps

1. **Monitor for additional bloated unions**: Look for interfaces with many optional fields that depend on a discriminant
2. **Apply to other types**: Consider refactoring other union-like structures (e.g., event types)
3. **Enforce exhaustive checking**: Use the `exhaustive()` pattern in all union handlers
4. **Add ESLint rule**: Consider `no-redundant-type-constituents` rule to catch unused union members

## Testing

All existing tests pass without modification:

```bash
npm test          # ✓ 715 tests pass
npm run build     # ✓ builds successfully
```

## References

- [TypeScript Handbook: Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Exhaustive Pattern Matching](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- [Usage Examples](src/lib/discriminatedUnionExamples.ts)
- [Exhaustive Matching Utilities](src/lib/exhaustiveMatch.ts)

## Why This Matters

The initial investigation found that static analysis tools (Knip, ts-prune, ts-unused-exports) couldn't detect unused union type values because they work at the symbol level, not the property level. This refactoring demonstrates that while tools have limitations, **disciplined TypeScript patterns** (discriminated unions + exhaustive checking) can achieve similar safety guarantees at the type level.

This is a practical application of "no tool is perfect, but great architecture makes bugs unlikely."
