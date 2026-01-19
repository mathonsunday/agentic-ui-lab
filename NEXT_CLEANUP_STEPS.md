# Next Cleanup Steps - Property-Level & Union Analysis

Based on the discriminated unions refactoring and our investigation into why static analysis tools miss property-level unused code, here are the next steps to continue improving code quality.

## Priority 1: High-Impact Quick Wins

### 1.1 Remove Unused Exports (from Knip results)

From the initial Knip scan, these exports are genuinely unused:

**Files to clean up:**

- [src/shared/rovAsciiVariants.ts](src/shared/rovAsciiVariants.ts) - **DELETE ENTIRE FILE** (14 unused ASCII creatures)
- [src/types/terminal.ts](src/types/terminal.ts) - Check imports first, likely can delete
- [src/utils/debugLogger.ts](src/utils/debugLogger.ts) - Remove unused debug functions:
  - `setDebugModules()`
  - `enableAllDebug()`
  - `disableAllDebug()`
  - `setMinLogLevel()`
  - `getDebugConfig()`

**Impact:** ~400 lines of unused code

### 1.2 Remove Unused Dependencies

From Knip:

- `motion` package - Not imported anywhere
- `ts-prune` and `ts-unused-exports` - Can remove from devDependencies after initial scan

**Impact:** ~200KB from node_modules

## Priority 2: Type-Level Cleanups (Property Analysis)

These require a bit more investigation but high value:

### 2.1 Event Type Unions

Check [src/types/events.ts](src/types/events.ts) - The event definitions are well-structured already, but verify:

- Are all 12 event types actually used?
- Are all data field variants needed?

**Suggested action:** Audit which events are actually streamed from backend vs which are defined but never used.

### 2.2 Personality & Mood Types

Current unions with single values that could be simplified:

- [src/shared/stateMachine.ts](src/shared/stateMachine.ts):
  - `Mood = 'wonder' | 'obsession' | 'calm' | 'distress'` - Verify all are used
  - `SystemLogType = 'EVALUATION' | 'OBSERVATION' | 'THOUGHT' | 'CONFIDENCE'` - Verify all are used
  - `Scenario` interface - Check if actually used

**Suggested action:** Grep each value and count occurrences. Remove unused mood/system log types.

### 2.3 Visual Element Types

[src/shared/Character.ts](src/shared/Character.ts) - `VisualElement` could be a discriminated union:

**Current:**

```typescript
interface VisualElement {
  type: "text" | "image" | "creature" | "particle" | "sound";
  content: string;
  position?: { x: number; y: number };
  style?: Record<string, string | number>;
}
```

**Should be:**

```typescript
type VisualElement =
  | {
      type: "text" | "creature";
      content: string;
      position?: XY;
      style?: Styles;
    }
  | { type: "image"; content: string; position?: XY; style?: Styles }
  | { type: "particle" | "sound"; content: string; style?: Styles };
```

## Priority 3: Refactoring for Better Architecture

### 3.1 Create Discriminated Union for Confidence Updates

The confidence system has states that could be more explicit:

**Suggestion:** Create discriminated union for confidence delta reasoning:

```typescript
type ConfidenceUpdate =
  | {
      type: "increase";
      reason: "deep_response" | "good_question";
      delta: number;
    }
  | { type: "decrease"; reason: "surface_response" | "ignored"; delta: number }
  | { type: "stable"; delta: 0; reason: string };
```

### 3.2 Tool Schemas Cleanup

[api/lib/toolSchemas.ts](api/lib/toolSchemas.ts) has `ALL_TOOL_SCHEMAS` and `getToolSchema` marked as unused by Knip. Investigate:

- Are these exported for external use?
- Or truly dead code?
- If dead: can be deleted

## Priority 4: Property-Level Analysis Tool

Once you've done the manual cleanups above, consider building a minimal analyzer:

### 4.1 Simple Script to Detect Unused Union Values

Create `scripts/analyze-unions.ts`:

```typescript
// Find all union type definitions
// For each union, scan all assignments to that type
// Report which literal values are never assigned
// Example output:
// ✗ InteractionMemory.type: unused literals: 'reaction', 'hover', 'ignore'
```

### 4.2 Unused Optional Properties Detector

Create `scripts/analyze-optionals.ts`:

```typescript
// For each optional field in interfaces
// Find where instances are created
// Report if optional field is never set
// Example output:
// ✗ ToolResult.error: optional but only accessed when status='failure'
//   Should make required for failure variant
```

## How to Execute

### Phase 1: Easy Deletes (30 minutes)

1. Delete [src/shared/rovAsciiVariants.ts](src/shared/rovAsciiVariants.ts)
2. Remove `motion` from package.json
3. Remove `ts-prune` and `ts-unused-exports` from devDependencies
4. Delete unused debug functions from [src/utils/debugLogger.ts](src/utils/debugLogger.ts)
5. Run tests: `npm test` - should still pass

### Phase 2: Property Analysis (1-2 hours)

1. Grep each value in personality/mood/event types
2. Count actual usage
3. Remove unused values
4. Update discriminated union examples if needed

### Phase 3: Refactoring (optional, higher effort)

1. Refactor VisualElement to discriminated union
2. Consider ConfidenceUpdate discriminated union
3. Investigate tool schema exports

### Phase 4: Build Tools (optional, medium effort)

1. Create union analyzer script
2. Create optional property analyzer script
3. Run on codebase, document findings

## Expected Outcomes

**After Phase 1 & 2:**

- ~500 lines of dead code removed
- ~200KB npm savings
- All union types cleaned up and verified

**After Phase 3:**

- More type safety with additional discriminated unions
- Better code self-documentation

**After Phase 4:**

- Automated detection for similar issues in future
- Foundation for property-level dead code analysis

## Files to Review

**Must Review:**

1. [src/shared/rovAsciiVariants.ts](src/shared/rovAsciiVariants.ts) - Delete?
2. [api/lib/toolSchemas.ts](api/lib/toolSchemas.ts) - Dead code?
3. [src/types/terminal.ts](src/types/terminal.ts) - Used anywhere?
4. [src/types/events.ts](src/types/events.ts) - All 12 events used?

**Should Review:** 5. [src/shared/stateMachine.ts](src/shared/stateMachine.ts) - All mood/log types used? 6. [src/shared/Character.ts](src/shared/Character.ts) - VisualElement refactor candidate 7. [src/utils/debugLogger.ts](src/utils/debugLogger.ts) - Used in production?

## Related Documentation

- [DISCRIMINATED_UNIONS_REFACTOR.md](DISCRIMINATED_UNIONS_REFACTOR.md) - What we just did
- [Knip scan results](knip-results.txt) - Initial dead code findings
- [ts-unused-exports results](ts-unused-exports-app-results.txt) - Frontend analysis

## Why This Matters

This cleanup addresses the original investigation finding: **tools are great at file/export level analysis but miss property-level issues**. By combining:

1. ✓ Standard tools (Knip, ts-unused-exports) for exports/files
2. ✓ Discriminated unions for type safety
3. ✓ Manual property-level review for edge cases

You get comprehensive coverage that single tools can't provide.
