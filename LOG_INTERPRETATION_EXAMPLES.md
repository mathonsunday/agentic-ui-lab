# Log Interpretation Examples

This document shows real log patterns and what they indicate.

## Scenario 1: Normal Stream Operation (BASELINE)

This is what a healthy zoom tool interaction looks like:

```
[STREAM_DEBUG 14:25:30.100] handleToolCall started - STREAM #1
  { action: "zoom_in", isCurrentlyStreaming: false, isStreamingState: false }

[STREAM_DEBUG 14:25:30.101] Setting streaming TRUE for tool call
  { stream: 1 }

[STREAM_DEBUG 14:25:30.102] isStreaming state changed
  { newValue: true, refValue: true, streamCount: 1 }

[STREAM_DEBUG 14:25:30.150] Abort controller set - STREAM #1

[STREAM_DEBUG 14:25:30.151] RENDER: Adding interrupt button
  { isStreaming: true, isStreamingRef: true, renderTrigger: 0, toolCount: 3 }

[STREAM_DEBUG 14:25:30.200] onResponseChunk received - STREAM #1
  { chunkLength: 28, newLineId: "5", isCurrentlyStreaming: true, isStreamingState: true }

[STREAM_DEBUG 14:25:30.201] First chunk - triggering render - STREAM #1
  { renderTriggerId: "5" }

[STREAM_DEBUG 14:25:30.202] RENDER: Adding interrupt button
  { isStreaming: true, isStreamingRef: true, renderTrigger: 1, toolCount: 3 }

[STREAM_DEBUG 14:25:30.250] onComplete callback - STREAM #1
  { newConfidence: 68, aboutToSetIsStreamingFalse: true, isStreamingRefBefore: true }

[STREAM_DEBUG 14:25:30.251] isStreaming state changed
  { newValue: false, refValue: false, streamCount: 1 }

[STREAM_DEBUG 14:25:30.252] Finally block executing - STREAM #1
  { isStreamingRefBefore: false, aboutToSetFalse: true }

[STREAM_DEBUG 14:25:30.253] RENDER: NOT adding interrupt button
  { isStreaming: false, isStreamingRef: false, renderTrigger: 1, toolCount: 2 }
```

**✅ Analysis**: This is perfect. You can see:
- Stream starts with isStreaming: false → true
- Interrupt button appears in render
- Chunks come in
- onComplete fires and sets isStreaming: false
- Finally block executes
- Interrupt button disappears
- No overlapping streams
- Clean lifecycle from start to finish

---

## Scenario 2: The Disappearing Button Issue (PROBLEM)

This pattern shows the interrupt button disappearing before stream is complete:

```
[STREAM_DEBUG 14:26:00.100] handleToolCall started - STREAM #3
  { action: "zoom_in", isCurrentlyStreaming: false, isStreamingState: false }

[STREAM_DEBUG 14:26:00.101] Setting streaming TRUE for tool call
  { stream: 3 }

[STREAM_DEBUG 14:26:00.102] isStreaming state changed
  { newValue: true, refValue: true, streamCount: 3 }

[STREAM_DEBUG 14:26:00.150] Abort controller set - STREAM #3

[STREAM_DEBUG 14:26:00.151] RENDER: Adding interrupt button ✓
  { isStreaming: true, renderTrigger: 0, toolCount: 3 }

[STREAM_DEBUG 14:26:00.200] onResponseChunk received - STREAM #3
  { chunkLength: 42, isCurrentlyStreaming: true, isStreamingState: true }

[STREAM_DEBUG 14:26:00.201] First chunk - triggering render - STREAM #3

[STREAM_DEBUG 14:26:00.202] RENDER: Adding interrupt button ✓
  { isStreaming: true, renderTrigger: 1, toolCount: 3 }

[STREAM_DEBUG 14:26:00.210] RENDER: NOT adding interrupt button ✗ ← TOO EARLY!
  { isStreaming: false, renderTrigger: 1, toolCount: 2 }

← NO onComplete, onError, or Finally block log here!

[STREAM_DEBUG 14:26:00.280] onComplete callback - STREAM #3 ← Too late!
  { newConfidence: 72, aboutToSetIsStreamingFalse: true }

[STREAM_DEBUG 14:26:00.281] isStreaming state changed
  { newValue: false, refValue: false, streamCount: 3 }
```

**❌ Analysis**: This shows the problem! Notice:
1. Button correctly appears when streaming starts
2. Chunks are received and rendering happens
3. **Interrupt button disappears at 14:26:00.210** (isStreaming: false)
4. **But onComplete doesn't log until 14:26:00.280** (70ms later!)
5. There's NO matching callback that set isStreaming to false
6. The stream is still active but the button is gone

**Root Cause**: The `isStreaming` state changed to false without any of the expected callbacks (`onComplete`, `onError`, `Finally block`) logging that they did it.

This suggests:
- A stale closure is calling `setIsStreaming(false)` from an old stream
- The render at 14:26:00.210 happened due to a state change but not from the current stream's callbacks
- Check dependency arrays in useCallback - they might be creating stale closures

---

## Scenario 3: Overlapping Streams (RACE CONDITION)

This shows multiple streams starting before the first one finishes:

```
[STREAM_DEBUG 14:27:00.100] handleToolCall started - STREAM #2
  { action: "zoom_in", isCurrentlyStreaming: false, isStreamingState: false }

[STREAM_DEBUG 14:27:00.101] Setting streaming TRUE for tool call { stream: 2 }

[STREAM_DEBUG 14:27:00.102] isStreaming state changed { newValue: true }

[STREAM_DEBUG 14:27:00.150] Abort controller set - STREAM #2

[STREAM_DEBUG 14:27:00.200] onResponseChunk received - STREAM #2

← User clicks ZOOM IN again while stream #2 is still active

[STREAM_DEBUG 14:27:00.250] handleToolCall started - STREAM #3 ← Second stream!
  { action: "zoom_in", isCurrentlyStreaming: true, isStreamingState: true }

[STREAM_DEBUG 14:27:00.250] Already streaming - ignoring this tool call ← Guard worked!

[STREAM_DEBUG 14:27:00.300] onComplete callback - STREAM #2
  { newConfidence: 65, aboutToSetIsStreamingFalse: true }

[STREAM_DEBUG 14:27:00.301] isStreaming state changed { newValue: false }

[STREAM_DEBUG 14:27:00.302] Finally block executing - STREAM #2

[STREAM_DEBUG 14:27:00.303] RENDER: NOT adding interrupt button ✓ (correct)
  { isStreaming: false }
```

**✅ Analysis**: This is actually GOOD! The guard is working:
- Stream #3 tried to start while #2 was active
- The check `if (isStreamingRef.current)` caught it
- Stream #2 finished cleanly
- Button correctly disappeared
- No overlapping streams despite the user clicking multiple times

---

## Scenario 4: Stale Closure in Callback (PROBLEM)

This shows a callback capturing old state and causing issues:

```
[STREAM_DEBUG 14:28:00.100] handleToolCall started - STREAM #4
  { action: "zoom_in", isCurrentlyStreaming: false, isStreamingState: false }

[STREAM_DEBUG 14:28:00.101] Setting streaming TRUE for tool call { stream: 4 }

[STREAM_DEBUG 14:28:00.102] isStreaming state changed { newValue: true, streamCount: 4 }

[STREAM_DEBUG 14:28:00.150] Abort controller set - STREAM #4

[STREAM_DEBUG 14:28:00.200] onResponseChunk received - STREAM #4
  { chunkLength: 35, isStreamingState: true } ← Stream active

[STREAM_DEBUG 14:28:00.201] First chunk - triggering render - STREAM #4

[STREAM_DEBUG 14:28:00.300] onComplete callback - STREAM #4
  { newConfidence: 70, aboutToSetIsStreamingFalse: true }

[STREAM_DEBUG 14:28:00.301] isStreaming state changed { newValue: false }

[STREAM_DEBUG 14:28:00.302] RENDER: NOT adding interrupt button
  { isStreaming: false } ← Correct, stream done

← User clicks ZOOM IN immediately

[STREAM_DEBUG 14:28:00.350] handleToolCall started - STREAM #5
  { action: "zoom_in", isCurrentlyStreaming: false, isStreamingState: false }

[STREAM_DEBUG 14:28:00.351] Setting streaming TRUE for tool call { stream: 5 }

[STREAM_DEBUG 14:28:00.352] isStreaming state changed { newValue: true, streamCount: 5 }

[STREAM_DEBUG 14:28:00.400] onError callback - STREAM #4 ← STREAM #4 error AFTER stream #5 started!?
  { error: "Some network error", isStreamingRefBefore: true }

[STREAM_DEBUG 14:28:00.401] isStreaming state changed { newValue: false } ← Stream #5 now broken!

[STREAM_DEBUG 14:28:00.402] Finally block executing - STREAM #4
```

**❌ Analysis**: This shows a serious problem:
1. Stream #4 started and completed successfully
2. Stream #5 started cleanly
3. **But then Stream #4's error callback fired 50ms after it seemed done!**
4. This error callback set isStreaming to false, killing stream #5
5. The onError callback from stream #4 is running with stale data

**Root Cause**: The error callback is probably in a closure that captured an old `miraState` or has incomplete dependencies. The finally block runs so late that a new stream has already started.

---

## Scenario 5: renderTrigger Not Incrementing (RE-RENDER ISSUE)

This shows the interrupt button appearing but not staying because renders aren't triggered:

```
[STREAM_DEBUG 14:29:00.100] handleToolCall started - STREAM #6
  { action: "zoom_in" }

[STREAM_DEBUG 14:29:00.101] Setting streaming TRUE for tool call

[STREAM_DEBUG 14:29:00.102] isStreaming state changed { newValue: true }

[STREAM_DEBUG 14:29:00.150] Abort controller set - STREAM #6

[STREAM_DEBUG 14:29:00.151] RENDER: Adding interrupt button
  { isStreaming: true, renderTrigger: 0, toolCount: 3 }

[STREAM_DEBUG 14:29:00.200] onResponseChunk received - STREAM #6
  { chunkLength: 40, newLineId: "12" }

← Note: NO "First chunk - triggering render" log!

[STREAM_DEBUG 14:29:00.250] onResponseChunk received - STREAM #6
  { chunkLength: 35, newLineId: "13" }

[STREAM_DEBUG 14:29:00.300] RENDER: Adding interrupt button
  { isStreaming: true, renderTrigger: 0, toolCount: 3 } ← Still 0!

[STREAM_DEBUG 14:29:00.350] RENDER: Adding interrupt button
  { isStreaming: true, renderTrigger: 0, toolCount: 3 } ← Still 0!

[STREAM_DEBUG 14:29:00.400] onComplete callback - STREAM #6

[STREAM_DEBUG 14:29:00.401] isStreaming state changed { newValue: false }

[STREAM_DEBUG 14:29:00.402] RENDER: NOT adding interrupt button
  { isStreaming: false, renderTrigger: 0, toolCount: 2 } ← Never incremented!
```

**❌ Analysis**: The renderTrigger never increments:
1. Stream gets chunks at 200ms and 250ms
2. The "First chunk - triggering render" log never appears
3. renderTrigger stays at 0 throughout
4. Even though isStreaming is true and chunks are arriving, no re-renders are forced

**Root Cause**: The condition `if (!currentAnimatingLineIdRef.current)` might always be false, so `setRenderTrigger(t => t + 1)` never executes. OR the condition is true but setRenderTrigger isn't being called.

**Fix**: Check if `currentAnimatingLineIdRef.current` is being set properly and not null.

---

## Scenario 6: Stream Timing Diagram (MULTI-INTERACTION SEQUENCE)

This shows what happens with 3 consecutive zoom interactions:

```
Interaction 1: Zoom In
[STREAM_DEBUG 14:30:00.100] handleToolCall started - STREAM #1
[STREAM_DEBUG 14:30:00.101] Setting streaming TRUE for tool call { stream: 1 }
[STREAM_DEBUG 14:30:00.102] isStreaming state changed { newValue: true }
[STREAM_DEBUG 14:30:00.200] onResponseChunk received - STREAM #1
[STREAM_DEBUG 14:30:00.250] onComplete callback - STREAM #1
[STREAM_DEBUG 14:30:00.251] isStreaming state changed { newValue: false }

User clicks Zoom Out immediately (second interaction):

[STREAM_DEBUG 14:30:00.300] handleToolCall started - STREAM #2
[STREAM_DEBUG 14:30:00.301] Setting streaming TRUE for tool call { stream: 2 }
[STREAM_DEBUG 14:30:00.302] isStreaming state changed { newValue: true }
[STREAM_DEBUG 14:30:00.200] onResponseChunk received - STREAM #1 ← Out of order!
[STREAM_DEBUG 14:30:00.260] Finally block executing - STREAM #1
[STREAM_DEBUG 14:30:00.350] onResponseChunk received - STREAM #2
[STREAM_DEBUG 14:30:00.400] onComplete callback - STREAM #2
[STREAM_DEBUG 14:30:00.401] isStreaming state changed { newValue: false }

User clicks Zoom In again (third interaction):

[STREAM_DEBUG 14:30:00.450] handleToolCall started - STREAM #3
[STREAM_DEBUG 14:30:00.451] Setting streaming TRUE for tool call { stream: 3 }
[STREAM_DEBUG 14:30:00.452] isStreaming state changed { newValue: true }
[STREAM_DEBUG 14:30:00.500] onResponseChunk received - STREAM #3
[STREAM_DEBUG 14:30:00.301] onError callback - STREAM #2 ← Stream #2's error after #3 started!
[STREAM_DEBUG 14:30:00.302] isStreaming state changed { newValue: false } ← Kills stream #3!
[STREAM_DEBUG 14:30:00.550] onComplete callback - STREAM #3 ← But stream #3 completes normally too!
```

**❌ Analysis**: This shows timing chaos:
1. Streams are happening sequentially (good)
2. But callbacks are firing out of order and overlapping
3. Stream #2's error fires after stream #3 started
4. This causes the isStreaming state to flip to false at the wrong time
5. Stream #3 completes but the damage is done

**Root Cause**: Network timing combined with slow callback execution. Callbacks from earlier streams are completing long after later streams started.

---

## How to Use These Examples

1. **Run your application**
2. **Filter console for `[STREAM_DEBUG`**
3. **Perform the bug reproduction** (several zoom clicks)
4. **Copy your console output**
5. **Compare it to these scenarios**
6. **Match your pattern** to one of these examples
7. **Look at the "Root Cause" and "Analysis"** sections
8. **Apply the suggested fix** from the STREAMING_DEBUG_GUIDE.md

Each example includes:
- Full log sequence
- ✅ or ❌ indicating if it's healthy or problematic
- Analysis explaining what's happening
- Root cause identification
- Why the interrupt button disappears (if applicable)

Your actual logs will help identify which of these patterns matches your issue!
