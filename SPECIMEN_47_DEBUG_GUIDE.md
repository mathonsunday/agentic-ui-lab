# Specimen 47 Animation Investigation Guide

## Problem Statement
When typing "specimen 47", the character-by-character animation works smoothly for the early sections, but at some point (around "Executive Summary"), the remaining text bursts in all at once instead of animating character-by-character.

## What Should Happen
User should see continuous smooth typing:
- `R` then `RE` then `RES` then `RESE...` (one character per ~25ms at speed=40)
- Throughout the entire proposal
- No bursts, no jitter, no sudden large text additions

## What's Currently Happening
- Early sections animate correctly: smooth character-by-character
- Around "Executive Summary": remaining text appears in bursts
- The animation essentially stops and switches to instant display mode

## Investigation Steps

### 1. Enable Browser Console Logs
Open DevTools (F12) and keep Console tab visible during test.

### 2. Run Specimen 47 Test
1. Navigate to research terminal
2. Type "specimen 47" and press Enter
3. Watch both the terminal output AND the browser console logs

### 3. Key Logs to Observe

**Backend chunk delivery:**
- Look for logs like: `📤 [specimen47] Sending chunk X (Y chars)`
- Should see these continue throughout entire proposal
- Note the timestamps and chunk sizes

**Frontend chunk receipt:**
- Look for logs like: `📥 [TerminalInterface] onResponseChunk callback invoked with X chars`
- Should see these match the backend chunk logs
- Look for pattern of chunk arrival times

**TypewriterLine animation:**
- Look for logs like: `[TypewriterLine] Starting continuous animation`
- These indicate when animation starts for a line
- If you see multiple "Starting continuous animation" logs, that's suspicious - means new line created or animation restarted

**Line accumulation:**
- Look for: `✏️ [TerminalInterface] Updated line XXX, new content length: YYY`
- Shows when chunks are being added to same line
- If you see new line IDs being created mid-stream, that's the problem

**Key Questions to Answer:**
1. **At what point does animation stop?** What's the last character visible before it bursts?
   - Note the content at that point
   - Check what chunk was being rendered

2. **Does a NEW line get created?**
   - Look for logs like `📝 [TerminalInterface] Creating first chunk line with ID: XXX`
   - If this appears mid-stream, that's creating a new line instead of accumulating
   - This would break animation continuity

3. **Does isAnimating get set to false?**
   - Look for condition checks on isAnimating
   - Check if shouldAnimate becomes false mid-stream
   - This would stop the TypewriterLine animation

4. **What about the onComplete callback?**
   - Look for logs showing onComplete being called
   - If called before all chunks arrive, it would reset currentAnimatingLineIdRef
   - Next chunk would try to append to different line

5. **Are chunks still arriving after animation stops?**
   - Even if animation is broken, backend should still send chunks
   - If chunks STOP arriving, that's a backend issue
   - If chunks arrive but aren't rendered, that's animation state issue

### 4. Add Temporary Debug Logging (Optional)

If logs don't reveal the issue, add these temporary logs to understand state:

**In TypewriterLine.tsx (inside the animation callback):**
```typescript
// Before each setRevealedLength, log the state
console.log(`[TypewriterLine] Before update:`, {
  revealedLength: prev,
  contentLength: content.length,
  isAnimating,
  willReveal: prev < content.length
});
```

**In TerminalInterface.tsx (in onResponseChunk):**
```typescript
// After accumulating chunk, log the state
console.log(`[onResponseChunk] After accumulating:`, {
  lineId: currentAnimatingLineIdRef.current,
  contentLength: updated[index].content.length,
  chunkLength: chunk.length,
  shouldAnimate
});
```

### 5. Measure Animation Speed

Count characters and measure time:
1. Note the timestamp when animation starts
2. Count how many visible characters appear in 5 seconds
3. Calculate effective typing speed: characters/second
4. Compare with expected speed (should be ~40 chars/sec = 1 char per 25ms)

**Example calculation:**
- At 13:32:50.000 - animation starts with "R"
- At 13:32:55.000 - visible text is "RESEARCH PROPOSAL FOR SPE..." (roughly 35 characters)
- Speed = 35 chars / 5 sec = 7 chars/sec
- **If this is much lower than 40, animation is running but slowly**
- **If this is instant (entire paragraph visible after 1 burst), animation is broken**

### 6. Check Timeline of Events

Create a timeline from logs:
```
13:32:50.100 - Backend sends chunk 1 (77 chars)
13:32:50.150 - Frontend receives chunk 1
13:32:50.150 - TypewriterLine starts animating with 77 chars total
13:32:50.300 - Animation has revealed ~5 characters
...continue...
13:32:52.600 - Backend sends chunk 15 (Executive Summary header)
13:32:52.650 - Frontend receives chunk 15 (total content now 1200 chars)
13:32:52.650 - ??? What happens here? Does animation continue? New line?
...
```

## Possible Root Causes (Hypotheses to Test)

1. **Animation Line Tracking Issue**
   - currentAnimatingLineIdRef gets reset mid-stream
   - New line created instead of appending to existing line
   - Result: Animation restarts with new content, appears as burst

2. **onComplete Called Prematurely**
   - Callback fires when revealedLength === content.length
   - But content is still growing (new chunks arriving)
   - Line ID moves to "next line" but there is no next line yet
   - Next chunk creates new line, animation starts fresh (burst)

3. **isAnimating State Issue**
   - shouldAnimate becomes false mid-stream
   - TypewriterLine stops animating
   - Content still accumulates invisibly
   - When animation restarts, all accumulated content visible instantly

4. **Content Accumulation Timing**
   - Chunks arrive faster than animation can process
   - revealedLength falls behind content.length permanently
   - Eventually animation "catches up" and the gap is revealed as burst

5. **Multiple TypewriterLine Instances**
   - Previous response line still animating when new chunks arrive
   - System creates new line for new chunks
   - Two separate animations happening, one finishes and reveals new line

## Next Steps After Investigation

Once you identify which behavior matches what you see in browser:
1. Post the timeline of logs here
2. Note which hypothesis matches the logs
3. We can then pinpoint the exact code causing the issue
4. Design a fix based on actual root cause (not guesses)

This is the empirical validation approach: observe actual behavior first, then fix based on what you see.
