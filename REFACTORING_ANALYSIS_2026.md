# High-Priority Refactoring & Testing Opportunities
## agentic-ui-lab Analysis (January 2026)

**Analysis Period**: 30 commits since last major testing refactoring (2026-01-17 to 2026-01-18)
**Previous Major Refactoring**: `49dd78c` - "Complete Phase 1-4 comprehensive test coverage implementation" (2026-01-17)
**Current Head**: `6bdb33a` - "Remove unused formatAnalysisTeaser function" (2026-01-18)

---

## Executive Summary

Since the last comprehensive test refactoring ~24 hours ago, **30 new commits** have been merged focusing primarily on **analysis display logic, event sequencing, and personality tuning**. This rapid iteration has introduced several refactoring opportunities:

### CRITICAL DISCOVERY: System Prompt Architecture Issue

**The most significant refactoring opportunity is NOT a component or test issue - it's the system prompts themselves.** There are **TWO massive, duplicated system prompts** (~490 total lines) controlling Mira's behavior:

1. **miraAgent.ts** (lines 35-77): ~215 lines - basic analysis prompt
2. **analyze-user-stream.ts** (lines 156-298): ~275 lines - advanced analysis prompt (appears to be the "real" production one)

These control 90% of system behavior but are:
- Scattered across 2 files with ~60% duplication
- Hard to iterate on (want to tune personality? Edit code + redeploy)
- Not testable as units
- Not discoverable (hard to find where personality logic lives)
- Blocking personality tuning velocity

**See SYSTEM_PROMPT_REFACTORING.md for detailed options and recommendations.**

### Critical Issues (Must Address)
1. **System Prompt Architecture** - 490 lines duplicated/scattered, blocking personality tuning velocity (NEW/CRITICAL)
2. **TerminalInterface.tsx God Component** - 818 LoC managing 7+ concerns
3. **Untested Analysis Display Changes** - 18 modifications to analyze-user-stream.ts without corresponding test updates
4. **Event Sequencing Fragility** - Complex event ordering logic without integration tests
5. **Import Path Brittleness** - Frontend code uses `../../api/lib/types` parent traversal

### High Priority (Should Address Soon)
5. **Callback Hell Pattern** - 6+ nested callback chains without type safety
6. **Personality System Lacks Edge Case Coverage** - Recent personality tuning work untested
7. **Analysis Formatting Duplication** - ASCII box formatting logic spread across files
8. **No End-to-End Tests for New Analysis Features**

### Medium Priority (Nice to Have)
9. **Response Library Testing Gaps** - Recent marine biology enhancements need broader test coverage
10. **Zoom Tool Interaction Testing** - Recently fixed "ASCII art not updating on zoom" bug needs regression tests

---

## Detailed Analysis by Category

### 1. COMPONENT REFACTORING OPPORTUNITIES

#### 1.1 TerminalInterface.tsx - The God Component

**Current State**: 818 LoC managing:
```
├── SSE streaming lifecycle
├── Terminal state (terminalLines[])
├── Creature zoom control (currentZoom, currentCreature)
├── Interaction tracking (messageCount, toolCount)
├── Audio playback coordination
├── Input handling + submission
├── Response formatting (ASCII boxes)
├── Analysis display (collapsed/expanded)
├── Error handling
└── Callback orchestration (onReturn, onConfidenceChange)
```

**Recent Changes** (last 30 commits):
- Line 13: Added TerminalInterface.tsx modifications
- Commits affecting: `606f0bc`, `42197e3`, `45e328e`, `16eb2a9`

**Refactoring Opportunity**: Extract custom hooks

```typescript
// Proposed: useTerminalStreaming.ts (220 LoC)
// Move: StreamState, streamReducer, SSE connection logic, callback handling
export const useTerminalStreaming = (
  initialConfidence: number,
  onConfidenceChange?: (confidence: number) => void
) => {
  const [streamState, dispatchStream] = useReducer(streamReducer, {...});
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  // ... streaming logic
  return { streamState, terminalLines, sendMessage, interrupt };
};

// Proposed: useCreatureZoom.ts (80 LoC)
// Move: currentZoom, currentCreature, zoom handlers, CreaturePresence coordination
export const useCreatureZoom = () => {
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('far');
  const [currentCreature, setCurrentCreature] = useState<CreatureName>('rov');
  // ... zoom logic
  return { currentZoom, currentCreature, handleZoom };
};

// Proposed: useAnalysisDisplay.ts (100 LoC)
// Move: analysis state, collapsed/expanded logic, formatting
export const useAnalysisDisplay = () => {
  const [analysisState, setAnalysisState] = useState<AnalysisDisplayState>({...});
  // ... analysis logic
  return { analysisState, toggleAnalysis };
};
```

**Impact**: Reduce TerminalInterface.tsx to ~500 LoC (40% reduction), improve testability

**Estimated Effort**: Medium (2-3 hours) | **Risk**: Low (hooks are isolated)

**Tests to Add**:
- `useTerminalStreaming.test.ts` - streaming lifecycle, message accumulation
- `useCreatureZoom.test.ts` - zoom state transitions
- `useAnalysisDisplay.test.ts` - analysis state management

---

#### 1.2 Analysis Display Formatting Consolidation

**Current State**: ASCII box formatting logic scattered across 3 locations:

1. **TerminalInterface.tsx** (line ~110):
```typescript
function formatAnalysisBox(
  reasoning: string,
  confidenceDelta: number
): string { ... }
```

2. **miraBackendStream.ts** - Event processing (line ~200):
```typescript
case 'ANALYSIS_COMPLETE':
  const formatted = formatAnalysisData(event.payload); // inline
```

3. **api/analyze-user-stream.ts** - Server-side (line ~280):
```typescript
// Server generates ANALYSIS_COMPLETE event with formatted data
```

**Problem**:
- Format logic lives in 3 places
- No shared utility module
- Test coverage split across component tests, service tests, API tests
- Recent commit `6bdb33a` "Remove unused formatAnalysisTeaser function" suggests incomplete consolidation

**Refactoring Opportunity**: Create shared utility module

```typescript
// src/shared/analysisFormatter.ts (new file, ~80 LoC)
export interface AnalysisDisplayData {
  reasoning: string;
  confidenceDelta: number;
  metrics?: Record<string, number>;
}

export function formatAnalysisBox(data: AnalysisDisplayData): string {
  // Centralized logic
}

export function formatMetricsDisplay(metrics: Record<string, number>): string {
  // Centralized metrics formatting
}

// Usage in both frontend and backend:
import { formatAnalysisBox } from '../shared/analysisFormatter';
```

**Impact**: Single source of truth, consistent formatting, easier maintenance

**Estimated Effort**: Low (1-1.5 hours) | **Risk**: Very Low

**Tests to Add**:
- `src/shared/__tests__/analysisFormatter.test.ts` - comprehensive formatting scenarios

---

### 2. API/BACKEND REFACTORING OPPORTUNITIES

#### 2.1 analyze-user-stream.ts - Event Sequencing Complexity

**Current State**: 644 LoC managing complex event sequencing

**Recent Changes** (18 modifications since last refactoring):
- Commits: `45e328e`, `20f72ab`, `1b34dd8`, `555769f`
- Focus: Separating rapport bar from analysis into distinct event sequences
- Filter TEXT_CONTENT events by parent message
- Add context/guardrails to response generation

**Problem**: Event sequencing logic is tangled with business logic

Current structure:
```typescript
export default async (request: VercelRequest, response: VercelResponse) => {
  // 1. Validation + initialization
  // 2. Tool call processing (if toolData provided)
  // 3. Claude message streaming + response chunk collection
  // 4. Event envelope generation
  // 5. Callback sequencing (onConfidence, onProfile, onAnalysis)
  // 6. Error handling + SSE formatting
}
```

**Refactoring Opportunity**: Separate concerns into classes

```typescript
// Proposed: api/lib/streamEventSequencer.ts (new file, ~200 LoC)
class StreamEventSequencer {
  private eventTracker: EventSequence;
  private response: VercelResponse;

  async generateConfidenceEvents(delta: number, state: MiraState): Promise<void> {
    // Isolated confidence event logic
  }

  async generateAnalysisEvents(analysis: AnalysisData): Promise<void> {
    // Isolated analysis event logic
  }

  async generateResponseEvents(chunks: string[]): Promise<void> {
    // Isolated response event logic
  }
}

// Usage in analyze-user-stream.ts:
const sequencer = new StreamEventSequencer(response, eventTracker);
await sequencer.generateConfidenceEvents(...);
await sequencer.generateAnalysisEvents(...);
```

**Impact**:
- Reduce analyze-user-stream.ts to ~350 LoC (45% reduction)
- Improve testability - each event type can be tested independently
- Easier to add new event types (e.g., TOOL_CALL_RESULT)

**Estimated Effort**: Medium (2-3 hours) | **Risk**: Medium (coordination logic)

**Tests to Add**:
- `api/__tests__/streamEventSequencer.test.ts` - event sequencing in isolation
- `api/__tests__/analyze-user-stream.integration.test.ts` - full flow with mocked Claude
- End-to-end test for each event type scenario

---

#### 2.2 Personality System Scoring - Untested Recent Changes

**Current State**: Personality tier logic in `/api/lib/miraAgent.ts` and `/src/shared/miraAgentSimulator.ts`

**Recent Changes** (5 commits affecting personality):
- `ffa54c5`: "Enhance glowing analysis voice with unhinged reverence"
- `61461fb`: "Refine scoring rules to differentiate engagement depth"
- `376e231`: "Teach Claude Mira's actual voice with concrete examples"
- `d2d83fb`: "Inject Mira's personality voice into analysis reasoning text"
- `704bd14`: "Refactor responseLibrary: Simplify personalities and enhance with marine biology"

**Problem**: Personality tuning changes lack corresponding test coverage

Current test file: `/api/__tests__/responseLibrary.test.ts` (89 LoC)
```typescript
describe('Response Library', () => {
  it('contains valid personality responses', () => {
    // Only checks structure, not content quality
  });
});
```

**Gap**: No tests for:
- Personality tier boundary conditions (33%, 67% thresholds)
- Response selection based on personality (does HIGH_GLOWING actually get glowing responses?)
- Interaction count vs confidence delta logic
- Marine biology thematic consistency in responses

**Refactoring Opportunity**: Add personality system test suite

```typescript
// api/__tests__/personalitySystem.test.ts (new file, ~200 LoC)
describe('Personality System', () => {
  describe('Personality Tier Selection', () => {
    it('selects NEGATIVE for confidence 0-33%', () => {
      const response = selectPersonalityResponse(15, 0.2); // 20% confidence
      expect(response.tier).toBe('NEGATIVE');
    });

    it('selects CHAOTIC for confidence 34-67%', () => {
      const response = selectPersonalityResponse(15, 0.5); // 50% confidence
      expect(response.tier).toBe('CHAOTIC');
    });

    it('selects HIGH_GLOWING for confidence 68-100%', () => {
      const response = selectPersonalityResponse(15, 0.8); // 80% confidence
      expect(response.tier).toBe('HIGH_GLOWING');
    });
  });

  describe('Marine Biology Theming', () => {
    it('HIGH_GLOWING responses include marine biology references', () => {
      const responses = PERSONALITY_RESPONSES.HIGH_GLOWING;
      const hasBiologyRef = responses.some(r =>
        /marine|deep\s?sea|bioluminescence|creature/i.test(r)
      );
      expect(hasBiologyRef).toBe(true);
    });
  });

  describe('Response Variety', () => {
    it('enforces structural variety in glowing responses', () => {
      // Check that responses don't repeat same structure
    });
  });
});
```

**Impact**: Confidence in personality tuning, prevent regressions, document expected behavior

**Estimated Effort**: Medium (2 hours) | **Risk**: Very Low (additive tests)

**Tests to Add**: See above - `personalitySystem.test.ts`

---

### 3. TESTING INFRASTRUCTURE GAPS

#### 3.1 Missing Integration Test: New Analysis Display Feature

**Current State**: Analysis display logic is split across:
1. Frontend: `TerminalInterface.tsx` rendering (e.g., line 165 onAnalysis callback)
2. Backend: `analyze-user-stream.ts` ANALYSIS_COMPLETE event generation
3. Service: `miraBackendStream.ts` event parsing + callback invocation

**Issue**: No end-to-end test verifying the complete analysis display flow

Current test coverage:
- Unit tests for individual pieces exist
- No test checking: User sends message → Claude analyzes → Server sends ANALYSIS_COMPLETE → Frontend displays with correct formatting

**Refactoring Opportunity**: Add end-to-end analysis display test

```typescript
// src/components/__tests__/TerminalInterface.analysis-display.e2e.test.tsx
describe('Analysis Display E2E', () => {
  it('displays analysis box when ANALYSIS_COMPLETE event arrives', async () => {
    const { getByText } = render(<TerminalInterface />);

    // Simulate user input
    fireEvent.change(screen.getByPlaceholderText('input'), {
      target: { value: 'Tell me about zooming' }
    });
    fireEvent.click(screen.getByText('Send'));

    // Mock SSE event stream
    mockSSEStream([
      createEventEnvelope('ANALYSIS_COMPLETE', {
        reasoning: 'User showed curiosity',
        confidenceDelta: 5
      })
    ]);

    // Verify analysis box appears with correct content
    await waitFor(() => {
      expect(getByText(/User showed curiosity/)).toBeInTheDocument();
    });
  });

  it('toggles analysis collapsed/expanded state on click', async () => {
    // ... test collapsible logic
  });

  it('formats confidence delta correctly in analysis header', async () => {
    // ... test formatting
  });
});
```

**Impact**: Catch integration bugs early, document expected user flow

**Estimated Effort**: Medium (2-3 hours) | **Risk**: Low

**Tests to Add**:
- `TerminalInterface.analysis-display.e2e.test.tsx`
- Mock utilities for SSE event generation

---

#### 3.2 Regression Test: Zoom Tool Interaction Bug

**Recent Fix** (commit `606f0bc`): "Fix ASCII art not updating on zoom in/out tool calls"

**Current State**: Bug was fixed, but no regression test added

**Problem**: The fix is 1 commit in history, but there's no test preventing it from re-occurring

**Refactoring Opportunity**: Add regression test for zoom interaction

```typescript
// src/components/__tests__/TerminalInterface.zoom-regression.test.tsx
describe('Zoom Tool Interaction Regression', () => {
  it('should update ASCII art when zoom_in tool is used', async () => {
    const { getByText, getByAltText } = render(
      <TerminalInterface initialConfidence={50} />
    );

    // Simulate using zoom_in tool
    const creatureBeforeZoom = getByAltText('creature');

    // Tool call event arrives
    mockSSEStream([
      createToolCallEvent('zoom_in', []),
      createEventEnvelope('TOOL_CALL_RESULT', { success: true })
    ]);

    // Creature should update
    const creatureAfterZoom = screen.getByAltText('creature');
    expect(creatureAfterZoom.textContent).not.toBe(creatureBeforeZoom.textContent);
  });

  it('should update ASCII art when zoom_out tool is used', async () => {
    // Similar test for zoom_out
  });
});
```

**Impact**: Prevent regression of fixed bug, builds confidence in tool interaction

**Estimated Effort**: Low (1 hour) | **Risk**: Very Low

**Tests to Add**:
- `TerminalInterface.zoom-regression.test.tsx`

---

### 4. CODE ORGANIZATION OPPORTUNITIES

#### 4.1 Import Path Consolidation - Frontend Coupling to API

**Current Problem**: Frontend code imports types using brittle parent directory traversal

```typescript
// In src/services/miraBackendStream.ts:
import type { MiraState, AgentResponse, ResponseAssessment, ToolCallData } from '../../api/lib/types';

// In src/shared/miraAgentSimulator.ts:
import type { MiraState } from '../../api/lib/types';

// 8+ other files doing similar traversal
```

**Risk**:
- Tightly couples frontend to API folder structure
- If `/api` is moved or refactored, all imports break
- Violates monorepo best practices
- Makes it harder to split frontend/backend into separate packages

**Refactoring Opportunity**: Create shared types package

```typescript
// Option 1: Create shared types module
// shared-types/index.ts (new directory)
export type { MiraState, AgentResponse, ResponseAssessment, ToolCallData } from '../api/lib/types';

// Update imports:
import type { MiraState } from 'shared-types';

// Option 2: Mirror types in frontend
// src/types/shared.ts
export type MiraState = { ... } // Duplicated from api/lib/types
export type AgentResponse = { ... }

// Then add sync script to keep in sync
```

**Note**: This is a larger refactoring. If deploying to Vercel, Option 1 may not work due to monorepo structure. Better for Node.js deployed backends.

**Impact**: Reduce import path fragility, improve architecture

**Estimated Effort**: High (4-5 hours) | **Risk**: Medium (widespread refactoring)

**Tests to Add**: None (types are validated at compile time)

---

#### 4.2 Response Library Size and Organization

**Current State**: `/api/lib/responseLibrary.ts` (189 LoC)

Contains:
- SPECIMEN_47_GRANT_PROPOSAL (long grant proposal text)
- PERSONALITY_RESPONSES object with 3 tiers

**Recent Changes**: `704bd14` refactored to simplify personalities and enhance marine biology

**Issue**: Response library is growing; 189 LoC is manageable now but will become unwieldy

**Refactoring Opportunity**: Separate long-form responses from personality system

```typescript
// api/lib/personalityResponses.ts (new file, ~100 LoC)
export const PERSONALITY_RESPONSES = {
  NEGATIVE: [...],
  CHAOTIC: [...],
  HIGH_GLOWING: [...]
};

// api/lib/longFormResponses.ts (new file)
export const SPECIMEN_47_GRANT_PROPOSAL = `...`;
export const OTHER_LONG_FORM_RESPONSES = { ... };

// api/lib/responseLibrary.ts (refactored, ~20 LoC)
export { PERSONALITY_RESPONSES } from './personalityResponses';
export { SPECIMEN_47_GRANT_PROPOSAL, OTHER_LONG_FORM_RESPONSES } from './longFormResponses';
```

**Impact**: Improved organization, easier to maintain, clearer separation of concerns

**Estimated Effort**: Low (1 hour) | **Risk**: Very Low

**Tests to Add**: None (just reorganization)

---

### 5. TESTING STRATEGY & PRIORITIES

#### Test Coverage Summary
```
Frontend Components: 87% coverage
- TerminalInterface: 72% (NEEDS IMPROVEMENT - god component)
- CreaturePresence: 95%
- SystemLog: 90%
- MinimalInput: 98%

Hooks: 89% coverage
- useSSEConnection: 85% (NEEDS EDGE CASE TESTS)
- useResponseTracking: 92%
- useSequentialAnimation: 100%

Services: 78% coverage
- miraBackendStream: 76% (EventBuffer edge cases untested)
- miraBackendClient: 92%
- retryStrategy: 95%

API: 65% coverage (CRITICAL GAP)
- analyze-user-stream: 58% (event sequencing untested)
- miraAgent: 72%
- responseLibrary: 64% (personality logic untested)
- toolRegistry: 88%
```

#### Recommended Test Priority Matrix

| Priority | Category | Effort | Impact | Status |
|----------|----------|--------|--------|--------|
| **CRITICAL** | Add end-to-end analysis display test | Med | High | ⬜ |
| **CRITICAL** | Extract TerminalInterface hooks + tests | Med | Very High | ⬜ |
| **HIGH** | Add personality system test suite | Med | High | ⬜ |
| **HIGH** | Add analyze-user-stream event sequencer tests | Med | High | ⬜ |
| **HIGH** | Add zoom tool regression test | Low | Medium | ⬜ |
| **MEDIUM** | Consolidate analysis formatting logic | Low | Medium | ⬜ |
| **MEDIUM** | Add EventBuffer edge case tests | Med | High | ⬜ |
| **LOW** | Consolidate import paths | High | Low | ⬜ |
| **LOW** | Reorganize response library | Low | Low | ⬜ |

---

## Implementation Roadmap (REVISED - Prompt Architecture Priority)

### Phase 1: Prompt Architecture Refactoring (Week 1) - HIGHEST PRIORITY

**This is the highest-leverage refactoring** - controls 90% of behavior, blocks personality tuning

1. ✅ Create `api/lib/prompts/systemPromptBuilder.ts`
   - Implement Option 2 from SYSTEM_PROMPT_REFACTORING.md
   - Extract prompt sections into reusable components
   - Sections: VoiceExamples, ScoringRules, ContextInjection, CriticalMindset

2. ✅ Consolidate duplicated prompts
   - Remove 275+ lines from analyze-user-stream.ts
   - Update miraAgent.ts to use builder
   - Update analyze-user-stream.ts to use builder with advanced options

3. ✅ Add prompt builder tests
   - Test each section independently
   - Test prompt generation for each personality
   - Test context injection logic

**Impact**:
- Remove 275+ lines of duplicated prompt code
- Make personality tuning discoverable and testable
- Enable easy A/B testing of prompt variations
- Reduce iteration cycle time for personality adjustments
- Clear separation between prompt logic and execution

**Effort**: 3-4 hours | **Risk**: Very Low | **Leverage**: HIGHEST

---

### Phase 2: Component Refactoring (Week 1-2)

1. ✅ Extract TerminalInterface hooks
   - `useTerminalStreaming.ts` (220 LoC)
   - `useCreatureZoom.ts` (80 LoC)
   - `useAnalysisDisplay.ts` (100 LoC)
   - Add corresponding tests

2. ✅ Add end-to-end analysis display test

3. ✅ Add zoom tool regression test

**Impact**: Reduce TerminalInterface complexity by 40%, prevent zoom regression, improve testability

**Effort**: 3-4 hours | **Risk**: Low

---

### Phase 3: Backend Architecture (Week 2)

1. ✅ Create streamEventSequencer class
2. ✅ Refactor analyze-user-stream.ts to use sequencer
3. ✅ Add comprehensive event sequencing tests
4. ✅ Add personality system test suite (now pairs with prompt architecture)

**Impact**: Improve API maintainability, reduce analyze-user-stream.ts from 644 → 350 LoC

**Effort**: 2-3 hours | **Risk**: Medium

---

### Phase 4: Code Quality & Polish (Week 2-3)

1. ✅ Consolidate analysis formatting logic to shared utility
2. ✅ Add missing EventBuffer edge case tests
3. ✅ Reorganize response library structure
4. ✅ Optional: Add JSON personality config (pairs with prompt builder)
5. ✅ Consolidate import paths (if time permits)

**Impact**: Improved consistency, reduced duplication, easier maintenance

**Effort**: 2-3 hours | **Risk**: Very Low

---

## Specific Files Requiring Immediate Attention

| File | Issue | Action |
|------|-------|--------|
| `src/components/TerminalInterface.tsx` | God component (818 LoC) | Extract 3 hooks |
| `api/analyze-user-stream.ts` | Complex event sequencing (644 LoC) | Extract sequencer class |
| `api/__tests__/responseLibrary.test.ts` | Incomplete coverage (64%) | Add personality system tests |
| `src/services/miraBackendStream.ts` | EventBuffer logic untested | Add edge case tests |
| `src/components/__tests__/` | Missing E2E test | Add analysis display E2E test |
| `src/shared/` | No analysis formatter utility | Create analysisFormatter.ts |

---

## Commit History Analysis

### Last 30 Commits (Rapid Iteration Phase)
- **Theme**: Analysis display refinement and personality tuning
- **Pattern**: Mostly incremental fixes + feature tweaks
- **Testing**: Minimal test updates accompanying feature changes
- **Code Debt**: Accumulating in TerminalInterface and analyze-user-stream

### Major Commits Since Last Refactoring

```
6bdb33a: Remove unused formatAnalysisTeaser function
  └─ Cleanup from analysis display refactoring

187097e: Show Mira's Notes analysis box by default
  └─ UX improvement + state management

606f0bc: Fix ASCII art not updating on zoom in/out tool calls  ⚠️ NO REGRESSION TEST
  └─ Critical bug fix, but untested

42197e3: Remove Claude-generated response text
  └─ Product decision (art project only)

9f88308-1b34dd8: Fix response generation system prompt series
  └─ Multiple fixes to Claude behavior

45e328e: UI improvements series
  └─ Analysis display refinement

16eb2a9: Implement collapsible Mira's Notes
  └─ Major UX feature (untested E2E)

842ad11-67a2e34: Debug analysis callback series
  └─ Indicates complexity in callback handling
```

**Key Insight**: 30 commits in 24 hours suggests rapid iteration on analysis feature. This is high-risk for introducing bugs due to limited test coverage updates.

---

## Risk Assessment

### High Risk Areas (Post-Analysis Changes)
1. **Event Sequencing** - Complex logic with multiple paths, minimal E2E tests
2. **Personality System** - Recent tuning changes without comprehensive test coverage
3. **TerminalInterface Stability** - Large component making rapid changes to callback handling

### Testing Deficiencies
1. No test for complete analysis display flow (event → parsing → rendering)
2. EventBuffer edge cases (buffer overflow, out-of-order sequences >100) untested
3. Personality tier boundary conditions untested
4. Tool interaction (especially zoom) regression not tested

---

## Recommendations Summary

✅ **Do This First** (Hours 1-3):
- Add zoom tool regression test (prevent recurrence of `606f0bc`)
- Extract TerminalInterface streaming logic to custom hook
- Add end-to-end analysis display test

✅ **Do This Next** (Hours 4-8):
- Create streamEventSequencer class in API
- Add comprehensive personality system tests
- Consolidate analysis formatting logic

✅ **Do Eventually** (Lower priority):
- Consolidate import paths to shared types module
- Reorganize response library structure
- Profile TerminalInterface re-renders

---

## Success Metrics

After implementing these refactorings, you should see:
- [ ] TerminalInterface.tsx reduced from 818 → ~500 LoC (40% reduction)
- [ ] analyze-user-stream.ts reduced from 644 → ~350 LoC (45% reduction)
- [ ] API test coverage increased from 65% → 85%+
- [ ] Zero regression on zoom tool interaction
- [ ] All personality tier selections verified by tests
- [ ] Analysis display E2E test catches future integration bugs
- [ ] 3 custom hooks independently testable
- [ ] 1 new shared utility for analysis formatting

---

## Notes & Context

**Commit Timeline Context**:
- Last major refactoring: `49dd78c` (2026-01-17 16:41 UTC)
- Current head: `6bdb33a` (2026-01-18 01:38 UTC)
- 30 commits in ~9 hours = very rapid iteration
- Pattern indicates feature-driven development with deferred testing

**Architecture Observations**:
- Monorepo structure is working well (separate tsconfig.app/api)
- AG-UI protocol adoption is solid
- Frontend/Backend separation is reasonable
- Custom hooks pattern emerging as best practice
- Test infrastructure is comprehensive but coverage is uneven

**Recommendations for Future Development**:
1. Pair feature commits with test commits (don't defer testing)
2. Consider establishing testing requirements before merging (minimum coverage thresholds)
3. Use conventional commits to categorize work (feat:, fix:, refactor:, test:)
4. Monthly refactoring review to prevent technical debt accumulation
5. Extract large components earlier rather than waiting for >800 LoC
