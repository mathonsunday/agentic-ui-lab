# Debug Quick Start Guide

## TL;DR: How to Use the New Debug Logging

### 1. Open Your App
```
npm run dev
```

### 2. Open Browser Console
**Chrome/Edge**: Press `F12` or `Cmd+Option+I` (Mac)
**Firefox**: Press `F12` or `Cmd+Option+K` (Mac)

### 3. Filter for Debug Logs
In the console search bar, type: `STREAM_DEBUG`

This will show ONLY the debug logs and hide everything else.

### 4. Reproduce the Bug

1. Click "ZOOM IN" button
2. Wait for stream to complete
3. Click "ZOOM IN" button again
4. Wait for stream to complete
5. Click "ZOOM IN" button a third time
6. **Watch the interrupt button disappear** (if you're seeing the bug)
7. Copy all `[STREAM_DEBUG` logs

### 5. Analyze the Logs

#### Look for this GOOD pattern:
```
[STREAM_DEBUG] RENDER: Adding interrupt button { isStreaming: true }
[STREAM_DEBUG] onComplete callback
[STREAM_DEBUG] RENDER: NOT adding interrupt button { isStreaming: false }
```

#### Look for this BAD pattern:
```
[STREAM_DEBUG] RENDER: Adding interrupt button { isStreaming: true }
[STREAM_DEBUG] RENDER: NOT adding interrupt button { isStreaming: false }  ← Why?!
← No onComplete or onError log!
```

### 6. Identify Your Issue

**Pattern A**: Interrupt button disappears with NO matching callback
→ Problem: Stale closure or race condition
→ Check: useCallback dependency arrays

**Pattern B**: Callbacks from STREAM #2 appear while STREAM #3 is running
→ Problem: Multiple overlapping streams or slow cleanup
→ Check: handleToolCall guard logic

**Pattern C**: renderTrigger stays at 0 even when chunks arrive
→ Problem: Re-renders not being triggered
→ Check: currentAnimatingLineIdRef initialization

**Pattern D**: Time gaps between "Abort controller set" and "Finally block"
→ Problem: Slow promise resolution, stream hanging
→ Check: Backend response timing

### 7. Find the Root Cause

Use these docs in order:
1. **This file** (DEBUG_QUICK_START.md) - You are here
2. **DEBUG_CHANGES_SUMMARY.md** - What changed
3. **LOG_INTERPRETATION_EXAMPLES.md** - See your specific pattern
4. **STREAMING_DEBUG_GUIDE.md** - Deep analysis and fixes

## Quick Pattern Matching

### Is the button disappearing during a stream?
```javascript
// Search for this in your logs:
// "[STREAM_DEBUG HH:MM:SS] RENDER: NOT adding interrupt button { isStreaming: false }"
//
// Look at the timestamp. NOW search backwards for when the stream started.
// Calculate the duration. If it's less than 2 seconds, that's suspiciously short.
```

### Are multiple streams overlapping?
```javascript
// Search for multiple "[STREAM_DEBUG] handleToolCall started" with different STREAM numbers
// that DON'T have matching "Finally block" logs between them
```

### Is the renderTrigger incrementing?
```javascript
// Search for "renderTrigger: 0" in RENDER logs
// Should see "renderTrigger: 1" after first chunk
// If stuck at 0, check if "First chunk - triggering render" appears
```

## Common Fixes

### Fix #1: Add Missing Dependencies
If you see "stale closure" patterns:

In `handleToolCall` useCallback, ensure dependencies include:
```typescript
const handleToolCall = useCallback(
  async (toolAction, toolData) => {
    // ...
  },
  [miraState, isStreaming, interactionCount, addTerminalLine, onConfidenceChange, updateRapportBar]
  //  ↑ All these must be present!
);
```

### Fix #2: Check isStreamingRef Guard
Make sure the guard at the start of `handleToolCall` is working:

```typescript
if (isStreamingRef.current) {
  console.log('⚠️ Already streaming, ignoring tool call');
  return; // ← This MUST return!
}
```

If you see logs showing multiple STREAM numbers starting simultaneously, this guard isn't working.

### Fix #3: Force Re-renders with renderTrigger
When first chunk arrives:

```typescript
if (!currentAnimatingLineIdRef.current) {
  currentAnimatingLineIdRef.current = newLineId;
  setRenderTrigger(t => t + 1); // ← Must be called!
}
```

If you don't see "First chunk - triggering render" log, this code isn't executing.

### Fix #4: Ensure Finally Block Runs
The finally block must ALWAYS run:

```typescript
finally {
  isStreamingRef.current = false;
  setIsStreaming(false); // ← MUST be called in all paths!
  abortControllerRef.current = null;
}
```

If you don't see "Finally block executing" log, something is preventing finally from running (shouldn't be possible in normal JS, but worth checking).

## When to Use Each Debug Document

| Situation | Use This Doc |
|-----------|--------------|
| "What do I do first?" | DEBUG_QUICK_START.md (you are here) |
| "What changed in the code?" | DEBUG_CHANGES_SUMMARY.md |
| "My logs look like X..." | LOG_INTERPRETATION_EXAMPLES.md |
| "How do I fix the pattern I found?" | STREAMING_DEBUG_GUIDE.md |
| "What metrics should I track?" | STREAMING_DEBUG_GUIDE.md |

## Pro Tips

### Tip 1: Copy Full Log Sequence
Don't just copy one line. Copy from when you click the button until the stream completes. The context matters!

### Tip 2: Watch Timestamps
Time gaps reveal what's slow:
- 100ms gap = normal network latency
- 500ms+ gap = something is blocking or queued

### Tip 3: Use Browser DevTools Grouping
If your console supports it, group logs by feature:
```javascript
console.group('STREAM #3');
// All stream #3 logs here
console.groupEnd();
```

This makes it easier to see one stream's complete lifecycle.

### Tip 4: Check the Ref Values
The logs show both `isStreaming` (React state) and `isStreamingRef` (useRef value). These should ALWAYS match. If they don't, you found the bug!

```javascript
// Good: Both match
isStreaming: true
isStreamingRef: true

// Bad: They don't match!
isStreaming: true
isStreamingRef: false  ← This is the problem!
```

## Summary Flow

1. **See bug** → Button disappears mid-stream
2. **Open console** → Filter for STREAM_DEBUG
3. **Reproduce bug** → Do several zoom clicks
4. **Find pattern** → Look at what doesn't match normal flow
5. **Identify type** → Match to A, B, C, or D pattern above
6. **Consult guide** → Use LOG_INTERPRETATION_EXAMPLES.md
7. **Apply fix** → Use STREAMING_DEBUG_GUIDE.md for solution
8. **Test** → Repeat steps 1-3 to verify fix works

## Need More Help?

1. **Not sure what pattern you have?** → Use LOG_INTERPRETATION_EXAMPLES.md to compare
2. **Found the pattern but don't understand it?** → Use STREAMING_DEBUG_GUIDE.md section "Common Issues and Fixes"
3. **Want to understand what changed?** → Use DEBUG_CHANGES_SUMMARY.md
4. **Want to understand the code flow?** → Use STREAMING_DEBUG_GUIDE.md section "What to Look For in Console Logs"

Good luck! The logs will tell you exactly what's going wrong. ✨
