# Feature Request: Interactive Tool Button System for User Evaluation

**Date Created**: January 16, 2026
**Priority**: Medium
**Status**: Ready for Implementation
**Feature Type**: UX Enhancement + Backend Integration

---

## Executive Summary

Implement a tool button system that allows users to trigger alternative interactions beyond text input. Each tool button click:
- Produces an **immediate visual effect** in the frontend (e.g., ASCII art zoom)
- Sends a **discrete tool call event** to the agent backend
- Contributes to the **rapport evaluation score** through hardcoded or Claude-evaluated criteria

This creates a multi-modal behavioral assessment system where user interactions (text quality + tool choices) inform research potential evaluation.

---

## User Experience Flow

### Current State
```
User Interface
├── ASCII Art Display
├── MinimalInput (text input + submit button)
└── Terminal output history
```

### Desired State
```
User Interface
├── ASCII Art Display
├── Tool Button Row (alternative interaction options)
│   ├── [Zoom Button] → Zooms ASCII art, sends tool event
│   ├── [Future Tool 1] → Visual effect, sends tool event
│   └── [Future Tool N] → Visual effect, sends tool event
├── MinimalInput (text input + submit button)
└── Terminal output history
```

### Interaction Model

**Mutually Exclusive Actions Per Turn:**
```
User sees: ASCII art + tool buttons + text input field

User chooses ONE action:
├─ Option 1: Type text + press Enter
│  └─ Sends text_input event to backend
│
└─ Option 2: Click tool button
   └─ Sends tool_call event to backend

(User cannot combine text + tool in same turn)
```

**Event Sequence:**
1. User clicks tool button (e.g., "Zoom")
2. Frontend immediately updates visual state (ASCII art zooms)
3. Frontend sends `tool_call` event to backend with metadata
4. Backend processes event, evaluates behavior, updates rapport score
5. Backend sends response with new interaction prompt
6. UI displays new state, user ready for next action

---

## Feature Requirements

### 1. Frontend: Tool Button Component

**Location**: `/src/components/ToolButton.tsx` (new)

**Responsibilities:**
- Render a button with tool name/icon
- Trigger visual effect on click (handled by parent/integration)
- Disable button while request is in-flight
- Maintain visual feedback (active/loading states)

**Props:**
```typescript
interface ToolButtonProps {
  name: string;              // "Zoom", "Examine", etc.
  onToolClick: () => void;   // Parent handles visual effect
  disabled?: boolean;        // Disabled during streaming
  icon?: React.ReactNode;    // Optional icon
}
```

**Behavior:**
- Appears alongside MinimalInput
- When clicked: visual effect triggers immediately (local state)
- Disabled while streaming to prevent double-submission

### 2. Frontend: Tool Button Container

**Location**: `/src/components/ToolButtonRow.tsx` (new)

**Responsibilities:**
- Render array of tool buttons
- Manage tool button states
- Coordinate with TerminalInterface for integration

**Props:**
```typescript
interface ToolButtonRowProps {
  tools: ToolDefinition[];
  onToolSelect: (toolName: string, data: object) => void;
  disabled?: boolean;
}

interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  onExecute: () => void; // Visual effect callback
}
```

### 3. Frontend: Visual Effect Integration

**Location**: Integrate into `/src/components/TerminalInterface.tsx`

**For the "Zoom" Tool:**
```typescript
const handleZoomClick = () => {
  // Immediate visual effect
  setZoomLevel(prev => prev * 2); // or similar zoom state
  setAsciiArtView('zoomed'); // Switch ASCII art display

  // Then send to backend
  handleToolCall({
    action: 'zoom',
    timestamp: Date.now(),
    zoomLevel: zoomLevel * 2
  });
};
```

**Tool metadata to include:**
```typescript
interface ToolCallData {
  action: string;              // 'zoom', 'examine', etc.
  timestamp: number;           // When user clicked
  region?: string;            // Which region (if applicable)
  zoomLevel?: number;         // Current zoom state
  sequenceNumber: number;     // Which interaction in sequence
  dwellTime?: number;         // Time spent before clicking (optional)
}
```

### 4. Backend: Tool Event Processing

**Location**: `/api/lib/miraAgent.ts` (extend existing agent logic)

**Responsibilities:**
- Receive tool_call events in streaming response
- Apply hardcoded rapport score changes
- (Optional) Send tool event to Claude for more nuanced evaluation

**Hardcoded Score Changes:**
```typescript
const toolScoreMap: Record<string, number> = {
  'zoom': +5,              // Curiosity/engagement signal
  // Add more tools as implemented
};

const processToolCall = (tool: ToolCallData, currentScore: number) => {
  const scoreIncrease = toolScoreMap[tool.action] || 0;
  return currentScore + scoreIncrease;
};
```

**Integration Point**: Modify the agent's state update logic in `miraAgent.ts` to handle tool_call events alongside text responses.

**SSE Event Format** (from `/api/analyze-user-stream.ts`):
```
event: tool_call
data: {
  "action": "zoom",
  "timestamp": 1704000000000,
  "region": "ascii_region_1",
  "zoomLevel": 2,
  "sequenceNumber": 3
}

```

### 5. Backend: Claude Evaluation (Optional Enhancement)

**Future iteration**: Include tool calls in Claude's evaluation prompt in `/api/lib/miraAgent.ts`

```typescript
// In agent evaluation
const evaluationContext = {
  userText: "their text input",
  textScores: { thoughtfulness: 7, hasQuestions: true },
  toolActions: [
    { action: 'zoom', timestamp, duration },
    { action: 'examine', timestamp, duration }
  ],
  // Claude can comment on behavior pattern
};
```

---

## Implementation Steps

### Phase 1: Component Architecture
- [ ] Create `/src/components/ToolButton.tsx` component
- [ ] Create `/src/components/ToolButtonRow.tsx` container
- [ ] Integrate into `/src/components/TerminalInterface.tsx`
- [ ] Add tool state management (buttons disabled during streaming)

### Phase 2: Frontend Zoom Feature
- [ ] Implement zoom visual effect (ASCII art state)
- [ ] Create zoomed ASCII art asset (provide by artist)
- [ ] Wire zoom button to visual effect + tool call
- [ ] Add zoom state to `/src/components/TerminalInterface.tsx`

### Phase 3: Backend Integration
- [ ] Extend event handling in `/api/analyze-user-stream.ts` to process tool_call events
- [ ] Add tool_call event parsing to `/src/services/miraBackendStream.ts`
- [ ] Implement `processToolCall()` in `/api/lib/miraAgent.ts`
- [ ] Apply hardcoded score changes to confidence/rapport state

### Phase 4: Type Definitions
- [ ] Add types to `/src/shared/types.ts` (frontend types)
- [ ] Add types to `/api/lib/types.ts` (backend types)
- [ ] Ensure type consistency across frontend/backend boundary

### Phase 5: Testing
- [ ] Unit tests: `/src/components/__tests__/ToolButton.test.tsx`
- [ ] Unit tests: `/src/components/__tests__/ToolButtonRow.test.tsx`
- [ ] Unit tests: Tool event processing in `/api/__tests__/miraAgent.test.ts`
- [ ] Integration tests: Update `/src/components/__tests__/TerminalInterface.integration.test.tsx`
- [ ] Test error cases: Tool call failures, invalid actions

### Phase 6: Future Tools
- [ ] Generalize tool system for additional actions
- [ ] Document how to add new tools

---

## Assets Required

### ASCII Art Assets
Provide the following zoomed ASCII art versions in `/src/assets/`:

1. **Original ASCII Art**: Current display
   - File: `/src/assets/ascii-main.txt` (or current location)

2. **Zoomed ASCII Art (2x)**: Enlarged/detailed version
   - File: `/src/assets/ascii-main-zoom-2x.txt`
   - Used when user clicks zoom button
   - Can be a cropped/detailed section or full zoom

3. (Future) Additional zoom levels or tool-specific visuals

**Asset Format Requirements:**
- Plain text files (.txt)
- Monospace font compatible
- Same character set as original
- Dimensions: specify width × height in characters

**Asset Storage:**
Currently the repository has ASCII art resources in the `/deep-sea-ascii-art/` folder at the root level. Consider whether to use that directory or `/src/assets/` for consistency with the Vite build setup.

**Example structure:**
```
/src/assets/
├── ascii-main.txt           # Default display
├── ascii-main-zoom-2x.txt   # Zoomed 2x
└── react.svg                # (existing)
```

---

## Data Flow Diagram

```
┌─────────────────────┐
│   User Interface    │
├─────────────────────┤
│ ASCII Art Display   │
│                     │
│ [Tool Buttons]      │
│ [Text Input]        │
└──────────┬──────────┘
           │
           ├─ Tool Button Click
           │  ├─→ Visual effect (immediate)
           │  └─→ Send tool_call event
           │
           └─ Text Input Submit
              └─→ Send text_input event

           │
           ↓
       Backend
       ├─ Parse event (tool_call or text_input)
       ├─ Evaluate behavior
       │  ├─ Text: Claude evaluation (thoughtfulness, questions)
       │  └─ Tool: Hardcoded score bump
       ├─ Update rapport score
       ├─ Generate response
       └─ Stream back SSE events

           │
           ↓
    User Sees Result
    ├─ Updated rapport score (visual indicator)
    ├─ Agent response text
    ├─ New ASCII art state (if applicable)
    └─ Ready for next action
```

---

## Rapport Scoring System

### Current Implementation
```typescript
Text Input Evaluation:
├─ Thoughtfulness (Claude-evaluated) → +0 to +10
├─ Includes Questions (boolean check) → +5 if true
└─ Total: -10 to +15 per turn
```

### With Tool Buttons
```typescript
Per-Turn Evaluation:
├─ IF text input submitted:
│  ├─ Thoughtfulness → +0 to +10
│  └─ Questions → +5 if true
│
├─ IF tool button clicked:
│  └─ Action-specific bump → hardcoded value
│     (zoom: +5, examine: +3, etc.)
│
└─ Exactly ONE per turn (mutually exclusive)
```

---

## Type Definitions

**Backend Types** - Add to `/api/lib/types.ts`:

```typescript
interface ToolCallEvent {
  type: 'tool_call';
  action: string;              // 'zoom', 'examine', etc.
  timestamp: number;
  data: {
    region?: string;
    zoomLevel?: number;
    sequenceNumber: number;
    dwellTime?: number;
  };
}

interface ToolCallData {
  action: string;
  timestamp: number;
  region?: string;
  zoomLevel?: number;
  sequenceNumber: number;
  dwellTime?: number;
}
```

**Frontend Types** - Add to `/src/shared/types.ts`:

```typescript
interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  scoreIncrease: number;      // Hardcoded rapport bump
  onExecute: () => void;      // Visual effect callback
}

interface ToolButtonRowProps {
  tools: ToolDefinition[];
  onToolSelect: (toolName: string, data: object) => void;
  disabled?: boolean;
}
```

---

## Testing Checklist

### Unit Tests
- [ ] ToolButton component renders with correct label
- [ ] ToolButton fires callback on click
- [ ] ToolButton disables during streaming
- [ ] ToolButtonRow renders multiple buttons
- [ ] Tool event processing applies correct score
- [ ] Zoom visual state changes on tool call

### Integration Tests
- [ ] User clicks tool button → visual effect appears
- [ ] Tool button click → event sent to backend
- [ ] Backend processes tool_call event → score updates
- [ ] Backend response includes updated score
- [ ] UI reflects new state after tool action
- [ ] Tool button disabled during streaming, re-enabled after

### Error Cases
- [ ] Invalid tool action handled gracefully
- [ ] Tool call fails → error message displayed
- [ ] User can retry after tool error
- [ ] Tool button remains functional after error

---

## Configuration / Customization

### Defining Tools
Tools should be configurable in a central location:

**Location**: `/src/config/tools.ts` (new)

```typescript
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Zoom in on the ASCII art',
    scoreIncrease: 5,
    onExecute: handleZoomEffect, // Passed from component
  },
  // Add more tools here
];
```

### Zoom-Specific Configuration
**Location**: `/src/config/zoom.ts` (new)

```typescript
export const ZOOM_CONFIG = {
  levels: [1, 2, 4],           // Available zoom levels
  initialLevel: 1,
  assetPath: 'ascii-',         // Prefix for asset filenames
  zoomedAssetSuffix: '-zoom-2x', // e.g., ascii-main-zoom-2x.txt
};
```

---

## Potential Future Enhancements

1. **Multiple Zoom Levels**: Allow cumulative zooming (2x, 4x, 8x)
2. **Tool History**: Track which tools user uses (behavioral pattern)
3. **Context-Aware Tools**: Show/hide tools based on ASCII content
4. **Duration Tracking**: Measure time before user clicks tool
5. **Claude Integration**: Include tool sequences in agent evaluation
6. **Undo/Reset**: Allow user to reset zoom and re-examine
7. **Annotations**: User can annotate zoomed regions
8. **Tool Combos**: Unlock advanced tools based on interaction patterns

---

## Handoff Notes for Implementation Agent

**Key Points:**
1. Tool buttons are **mutually exclusive** with text input per turn
2. Visual effects are **immediate** (no backend latency)
3. Tool calls are **discrete events**, not combined with text
4. Rapport scoring is **hardcoded per tool** (not Claude-evaluated, unless enhanced)
5. ASCII art assets must be provided as separate files

**Critical Files to Modify:**
- `/src/components/TerminalInterface.tsx` - Main integration point
- `/src/services/miraBackendStream.ts` - Event parsing
- `/api/lib/miraAgent.ts` - Score application & agent state updates
- `/api/lib/types.ts` - Backend type definitions
- `/src/shared/types.ts` - Frontend type definitions

**New Files to Create:**
- `/src/components/ToolButton.tsx` - Button component
- `/src/components/ToolButtonRow.tsx` - Container component
- `/src/config/tools.ts` - Tool definitions & configuration
- `/src/config/zoom.ts` - Zoom-specific configuration
- `/src/components/__tests__/ToolButton.test.tsx` - Unit tests
- `/src/components/__tests__/ToolButtonRow.test.tsx` - Unit tests

**Assets to Provide:**
- `/src/assets/ascii-main-zoom-2x.txt` - Zoomed ASCII art

**Test Files to Update:**
- `/src/components/__tests__/TerminalInterface.integration.test.tsx` - Add tool button integration tests
- `/api/__tests__/miraAgent.test.ts` - Add tool event processing tests

**Design Philosophy:**
- Keep it simple: each action is independent
- Immediate feedback: visual effects happen instantly
- Clear intent: user always knows what they're doing
- Measurable: all interactions contribute to evaluation

---

## Questions for Clarification (if needed during implementation)

1. Should tool buttons appear always, or be context-dependent?
2. Do you want visual indication of the user's rapport score in real-time?
3. Should the agent respond differently to tool calls vs. text input (different prompts)?
4. Are there other tools beyond zoom you want to implement initially?
5. Should tool call metadata be logged/displayed for transparency?
6. Which ASCII art asset files are the current ones being used? (Need to know exact filenames to reference)

---

**Repository**: `/Users/veronica.ray/src/github.com/mathonsunday/agentic-ui-lab/`

**Status**: Ready for handoff to implementation agent

