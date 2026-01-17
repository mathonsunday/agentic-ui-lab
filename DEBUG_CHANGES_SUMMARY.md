# Debug Instrumentation Changes Summary

## Overview
Comprehensive logging has been added to `/src/components/TerminalInterface.tsx` to track the interrupt button disappearing issue during streaming after zoom tool interactions.

## Changes Made

### 1. New Debug Logger Function
```typescript
const streamDebugLog = (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
  });
  console.log(`[STREAM_DEBUG ${timestamp}] ${message}`, data || '');
};
```

**Purpose**: Provides timestamped console logs for tracking stream state changes across async callbacks.

### 2. Stream Tracking Counter
```typescript
const streamCounterRef = useRef(0); // Track how many streams have been initiated
```

**Purpose**: Each stream gets a unique number (`STREAM #1`, `STREAM #2`, etc.) making it easy to correlate callbacks across async operations.

### 3. RenderTrigger State Exposure
```typescript
// Before: const [, setRenderTrigger] = useState(0);
// After:
const [renderTrigger, setRenderTrigger] = useState(0);
```

**Purpose**: Makes renderTrigger value accessible in logs to verify re-renders are happening.

### 4. isStreaming State Change Logging
Added to the `useEffect` hook that syncs the state with ref:

```typescript
useEffect(() => {
  isStreamingRef.current = isStreaming;
  streamDebugLog(`isStreaming state changed`, {
    newValue: isStreaming,
    refValue: isStreamingRef.current,
    streamCount: streamCounterRef.current,
    timestamp: Date.now()
  });
}, [isStreaming]);
```

**Purpose**: Logs every time the `isStreaming` React state changes, with both ref and state values.

### 5. handleToolCall Instrumentation

Added logging at:
- **Start**: Logs stream number, current streaming status
- **Before setIsStreaming(true)**: Context about the call
- **In onConfidence callback**: Logs confidence update
- **In onComplete callback**: Logs about to set streaming false
- **In onError callback**: Logs error with context
- **After await promise**: Confirms promise resolution
- **In finally block**: Logs final cleanup

Example:
```typescript
const streamNum = ++streamCounterRef.current;
streamDebugLog(`handleToolCall started - STREAM #${streamNum}`, {
  action: toolAction,
  isCurrentlyStreaming: isStreamingRef.current,
  isStreamingState: isStreaming
});
```

### 6. handleInput Instrumentation

Same pattern as handleToolCall with additional logging for:
- **onResponseChunk callback**: Logs chunk size, current isStreaming state
- **renderTrigger increment**: Logs when first chunk triggers render
- **Stream promise resolution**: Confirms async completion

### 7. Render-time Tool Button Logging

```typescript
if (isStreaming) {
  tools.push(interruptTool);
  streamDebugLog(`RENDER: Adding interrupt button`, {
    isStreaming,
    isStreamingRef: isStreamingRef.current,
    renderTrigger,
    toolCount: tools.length
  });
} else {
  streamDebugLog(`RENDER: NOT adding interrupt button (isStreaming is false)`, {
    isStreaming,
    isStreamingRef: isStreamingRef.current,
    renderTrigger,
    toolCount: tools.length
  });
}
```

**Purpose**: Shows exactly when the button is rendered/not rendered and what state values were at that moment.

### 8. handleInterrupt Logging

```typescript
streamDebugLog(`handleInterrupt called`, {
  hasAbortController: !!abortControllerRef.current,
  isStreaming,
  isStreamingRef: isStreamingRef.current
});
```

**Purpose**: Shows when interrupt is clicked and current state.

## Key Metrics Logged

Each log entry includes relevant context:

1. **isStreaming**: Current React state value
2. **isStreamingRef**: Current ref value (what callbacks see)
3. **streamNum**: Which stream this callback belongs to
4. **renderTrigger**: Current render trigger counter value
5. **Timestamps**: Millisecond precision via `toLocaleTimeString`

## How to Use These Logs

1. **Open browser DevTools Console** (F12 or Cmd+Option+I)
2. **Filter for `[STREAM_DEBUG`** to see only debug logs
3. **Trigger the bug**: Do several zoom interactions
4. **Look for patterns**:
   - Stream numbers appearing out of order
   - `isStreaming: false` without corresponding callback logs
   - `renderTrigger` values not incrementing when chunks arrive
   - State and ref values mismatching

## Expected Healthy Log Pattern

When everything works correctly, you'll see:

```
[STREAM_DEBUG HH:MM:SS.XXX] handleToolCall started - STREAM #N
[STREAM_DEBUG HH:MM:SS.XXX] Setting streaming TRUE for tool call
[STREAM_DEBUG HH:MM:SS.XXX] isStreaming state changed { newValue: true }
[STREAM_DEBUG HH:MM:SS.XXX] Abort controller set - STREAM #N
[STREAM_DEBUG HH:MM:SS.XXX] RENDER: Adding interrupt button { isStreaming: true }
[STREAM_DEBUG HH:MM:SS.XXX] onComplete callback - STREAM #N
[STREAM_DEBUG HH:MM:SS.XXX] isStreaming state changed { newValue: false }
[STREAM_DEBUG HH:MM:SS.XXX] RENDER: NOT adding interrupt button { isStreaming: false }
```

## What the Logs Will Reveal

The instrumentation will help identify:

1. **Race Conditions**: Overlapping stream callbacks
2. **Stale Closures**: Callbacks capturing old state values
3. **Timing Issues**: When setIsStreaming(false) is called vs when stream actually ends
4. **Re-render Problems**: Whether renderTrigger increments when expected
5. **State Synchronization**: Mismatches between ref and state values

## File Modified

**`/Users/veronica.ray/src/github.com/mathonsunday/agentic-ui-lab/src/components/TerminalInterface.tsx`**

Total changes: ~50+ debug log statements inserted throughout the component.

## No Functional Changes

**Important**: These changes are purely diagnostic. They do NOT modify:
- Component behavior
- State management logic
- Stream handling
- Interrupt functionality

All logic remains identical; only logging has been added.

## Next Steps

1. Load the application
2. Open browser console (filter for `[STREAM_DEBUG`)
3. Perform the reproduction steps (zoom several times)
4. Copy the console logs
5. Analyze using the `STREAMING_DEBUG_GUIDE.md`
6. Look for the pattern that matches your issue
7. Use the found pattern to identify the root cause

## Debug Guide Reference

See `STREAMING_DEBUG_GUIDE.md` for:
- Detailed interpretation of log patterns
- Common issues and what they look like in logs
- Step-by-step debugging process
- Examples of healthy vs problematic streams
