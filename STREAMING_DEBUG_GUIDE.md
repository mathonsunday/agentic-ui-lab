# Interrupt Button Debug Guide

## Overview
This guide helps you identify why the interrupt button intermittently disappears during streaming after several zoom tool interactions.

## Key State Tracking

The component now logs with detailed timestamps in the format: `[STREAM_DEBUG HH:MM:SS.mmm]`

Each stream is assigned a unique stream number for easy tracking across callbacks.

## What to Look For in Console Logs

### 1. Stream Lifecycle Pattern

**Expected normal flow:**
```
[STREAM_DEBUG] handleToolCall started - STREAM #N
[STREAM_DEBUG] Setting streaming TRUE for tool call
[STREAM_DEBUG] isStreaming state changed → newValue: true
[STREAM_DEBUG] Abort controller set - STREAM #N
[STREAM_DEBUG] onResponseChunk received - STREAM #N (multiple times)
[STREAM_DEBUG] onComplete callback - STREAM #N → aboutToSetIsStreamingFalse: true
[STREAM_DEBUG] isStreaming state changed → newValue: false
[STREAM_DEBUG] Finally block executing - STREAM #N
```

### 2. Critical Issue: State Mismatch

Watch for these warning signs:

**Issue A: isStreaming stays true but stream has ended**
- Logs show `onComplete` or `onError` callback firing
- But subsequent RENDER logs show `isStreaming: false` while the stream is still active
- This means `setIsStreaming(false)` was NOT called by onComplete

**Issue B: Race condition with callback closures**
- Multiple STREAM logs from different stream numbers overlapping
- A later stream's callbacks (`onError`, `onComplete`) executing
- The earlier stream's `setIsStreaming(false)` being called too early

**Issue C: renderTrigger not incrementing during chunks**
- `onResponseChunk` logs appear but `renderTrigger` value stays the same in subsequent renders
- This prevents the component from re-rendering to show the interrupt button

### 3. Key Values to Monitor

Each log includes:

- **isStreaming**: Current React state (what the component renders with)
- **isStreamingRef**: useRef value (server-side view of streaming state)
- **stream**: Stream number for correlating callbacks
- **renderTrigger**: Counter that forces re-renders (should increment when animation starts)

## Debugging Steps

### Step 1: Reproduce the Issue
1. Start the terminal interface
2. Click zoom in/out 3-4 times rapidly
3. Watch for the interrupt button to disappear while stream is still active
4. Look in browser console for `[STREAM_DEBUG` logs

### Step 2: Find the Problem Moment

Look for timestamps where:
```
[STREAM_DEBUG HH:MM:SS.123] RENDER: NOT adding interrupt button (isStreaming is false)
```

But you previously saw:
```
[STREAM_DEBUG HH:MM:SS.090] Abort controller set - STREAM #5
```

And NO corresponding:
```
[STREAM_DEBUG HH:MM:SS.1XX] Finally block executing - STREAM #5
```

This indicates the stream is still active but React state is wrong.

### Step 3: Check for Stale Closures

Look at your stream sequence. If you see:

```
[STREAM_DEBUG] handleToolCall started - STREAM #1
[STREAM_DEBUG] handleToolCall started - STREAM #2
[STREAM_DEBUG] onComplete callback - STREAM #1
[STREAM_DEBUG] isStreaming state changed → newValue: false
[STREAM_DEBUG] Finally block executing - STREAM #2
```

This shows STREAM #1's onComplete fired after STREAM #2 started. Check `handleToolCall` dependency array - it probably includes `isStreaming` state, creating a stale closure.

### Step 4: Check renderTrigger

In the RENDER logs, if `renderTrigger` never increments:
```
[STREAM_DEBUG] RENDER: Adding interrupt button { renderTrigger: 0 }
[STREAM_DEBUG] RENDER: Adding interrupt button { renderTrigger: 0 }  ← Same value!
```

This means chunks are being received but the render trigger isn't incrementing. Look for:
```
[STREAM_DEBUG] First chunk - triggering render - STREAM #N
```

If this doesn't appear, the first chunk's render trigger code isn't executing.

## Common Issues and Fixes

### Issue 1: Callback has stale isStreaming dependency
**Problem**: The callbacks in `onComplete`, `onError` have a stale closure over `isStreaming` state.

**Debug indicator**:
```
[STREAM_DEBUG] onComplete callback
...
[STREAM_DEBUG] isStreaming state changed → newValue: true  ← Wrong state!
```

**Fix**: Check callback dependencies are complete in useCallback's dependency array.

### Issue 2: Finally block running after new stream starts
**Problem**: Multiple streams are active simultaneously instead of sequentially.

**Debug indicator**:
```
[STREAM_DEBUG] handleToolCall started - STREAM #1
[STREAM_DEBUG] handleToolCall started - STREAM #2  ← Before #1 finished!
[STREAM_DEBUG] Finally block executing - STREAM #1
```

**Fix**: Check `isStreamingRef.current` guard at start of `handleToolCall`.

### Issue 3: setRenderTrigger not causing re-renders
**Problem**: onResponseChunk increments renderTrigger but component doesn't re-render.

**Debug indicator**:
```
[STREAM_DEBUG] onResponseChunk received - STREAM #N { chunkLength: 45 }
[STREAM_DEBUG] RENDER: Adding interrupt button { renderTrigger: 0 }  ← Same after chunk!
```

**Fix**: Verify `setRenderTrigger` is being called properly and state is exposed for rendering.

### Issue 4: Interrupt button disappearing after several interactions
**Problem**: After 3+ interactions, isStreaming becomes false mid-stream.

**Debug indicator**: Look for pattern where later stream numbers have callbacks firing for earlier stream numbers:
```
[STREAM_DEBUG] handleToolCall started - STREAM #3
[STREAM_DEBUG] handleToolCall started - STREAM #4
[STREAM_DEBUG] onComplete callback - STREAM #3 → aboutToSetIsStreamingFalse
[STREAM_DEBUG] Finally block executing - STREAM #4
[STREAM_DEBUG] handleToolCall started - STREAM #5
[STREAM_DEBUG] onError callback - STREAM #4  ← Out of order!
[STREAM_DEBUG] isStreaming state changed → newValue: false
```

This shows timing/ordering issues. Each stream's callbacks might be executing at wrong times.

**Fix**: Review callback timing and ensure cleanup happens in correct order.

## Log Interpretation Examples

### Example 1: Healthy Stream
```
[STREAM_DEBUG 14:23:45.100] handleToolCall started - STREAM #1
[STREAM_DEBUG 14:23:45.101] Setting streaming TRUE for tool call
[STREAM_DEBUG 14:23:45.102] isStreaming state changed { newValue: true, refValue: true, streamCount: 1 }
[STREAM_DEBUG 14:23:45.150] Abort controller set - STREAM #1
[STREAM_DEBUG 14:23:45.200] onResponseChunk received { chunkLength: 15, isCurrentlyStreaming: true }
[STREAM_DEBUG 14:23:45.205] First chunk - triggering render - STREAM #1
[STREAM_DEBUG 14:23:45.206] RENDER: Adding interrupt button { isStreaming: true, toolCount: 3 }
[STREAM_DEBUG 14:23:45.250] onComplete callback { newConfidence: 75, aboutToSetIsStreamingFalse: true }
[STREAM_DEBUG 14:23:45.251] isStreaming state changed { newValue: false, refValue: false, streamCount: 1 }
[STREAM_DEBUG 14:23:45.252] RENDER: NOT adding interrupt button { isStreaming: false, toolCount: 2 }
```

This is healthy - streaming starts, button appears, stream completes, button disappears.

### Example 2: Problematic Stream (Button Disappears Early)
```
[STREAM_DEBUG 14:24:10.100] handleToolCall started - STREAM #2
[STREAM_DEBUG 14:24:10.101] Setting streaming TRUE for tool call
[STREAM_DEBUG 14:24:10.102] isStreaming state changed { newValue: true }
[STREAM_DEBUG 14:24:10.150] Abort controller set - STREAM #2
[STREAM_DEBUG 14:24:10.200] onResponseChunk received { chunkLength: 20, isCurrentlyStreaming: true }
[STREAM_DEBUG 14:24:10.205] First chunk - triggering render { renderTriggerId: '45' }
[STREAM_DEBUG 14:24:10.206] RENDER: Adding interrupt button { isStreaming: true, renderTrigger: 1, toolCount: 3 }
[STREAM_DEBUG 14:24:10.210] RENDER: NOT adding interrupt button { isStreaming: false, renderTrigger: 1 }  ← Why false?!
← No matching onComplete, onError, or Finally block log!
[STREAM_DEBUG 14:24:10.300] onComplete callback  ← Too late, rendering already happened
```

This shows the interrupt button disappeared before the stream actually completed. The `isStreaming` state changed to false without any callback logging it.

## Enabling Additional Debug Info

To add more debugging, look for any place that calls:
- `setIsStreaming(false)` - log with context
- `setIsStreaming(true)` - log with context
- `setRenderTrigger` - log the new value

The pattern is:
```typescript
streamDebugLog(`[Description] - STREAM #${streamNum}`, {
  isStreaming,
  isStreamingRef: isStreamingRef.current,
  additionalContext: 'value'
});
```

## Performance Notes

The debug logging uses console.log which is negligible overhead. The unique stream numbers and timestamps make it easy to trace execution order even with async callbacks.

Remove or disable this logging in production by wrapping with:
```typescript
if (import.meta.env.DEV) {
  streamDebugLog(...);
}
```

## Summary Checklist

When the interrupt button disappears:
1. ✅ Find the moment `isStreaming: false` appears in logs
2. ✅ Look for the corresponding callback that set it (`onComplete`, `onError`, finally block)
3. ✅ Check if stream was actually complete or still active
4. ✅ Verify stream numbers match (no callbacks from old streams executing late)
5. ✅ Check renderTrigger values - are they incrementing?
6. ✅ Review dependency arrays in useCallback hooks
7. ✅ Look for timing issues (multiple streams overlapping)

This debug output should pinpoint the exact cause!
