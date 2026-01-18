# System Prompt Refactoring & Architecture Options
## agentic-ui-lab - Focused Analysis

---

## The Problem

You have **TWO MASSIVE system prompts** controlling Mira's behavior:

### 1. **miraAgent.ts** (lines 35-77): ~215 lines
Basic analysis prompt:
- Confidence delta scoring rules
- Basic personality descriptions
- JSON format expectations
- Hardcoded scoring rules (ANY question = +12 minimum)

### 2. **analyze-user-stream.ts** (lines 156-298): ~275 lines
Advanced analysis prompt (the "production" one):
- 3x more detailed than miraAgent.ts
- Specific voice examples for each personality tier
- Complex GLOWING voice instructions with structure patterns
- Arc/history references
- Context injection (message count, tool count)
- More granular scoring guidelines

**Total: ~490 lines of prompting logic embedded in two TypeScript files**

### The Issues

1. **Duplication**: Both prompts share ~60% of their logic but are defined separately
2. **Scattered Configuration**: Personality behavior is defined in:
   - System prompt text (miraAgent.ts + analyze-user-stream.ts)
   - responseLibrary.ts (PERSONALITY_RESPONSES)
   - miraAgent.ts code (getPersonalityFromConfidence, selectResponse)
3. **Hard to Iterate**: Want to tune personality? Edit code, redeploy backend
4. **Hard to Version**: No clear way to A/B test different prompt versions
5. **No Single Source of Truth**: Where does glowing voice live?
   - analyze-user-stream.ts? miraAgent.ts? responseLibrary.ts?
6. **Context Injection Fragility**: Message/tool count logic is duplicated in multiple places
7. **Not Extractable**: If you wanted to run Mira locally or in a different deployment, you'd have to copy/parse these prompts

---

## Current Architecture

```
User Message
    ↓
Frontend: miraBackendStream + TerminalInterface
    ↓
/api/analyze-user-stream (SSE endpoint)
    │
    ├─→ analyzeUserInput() from miraAgent.ts
    │   ├─ Uses systemPrompt from miraAgent.ts (lines 35-77)
    │   └─ Simpler, basic scoring
    │
    └─→ NEW: Direct Claude call in analyze-user-stream
        ├─ Uses systemPrompt from analyze-user-stream.ts (lines 156-298)
        └─ Advanced, with voice examples
```

**Status**: analyze-user-stream.ts prompt appears to be the "real" one (more detailed), but miraAgent.ts still has its own. Both get executed.

---

## Options for Refactoring

### Option 1: Externalize to JSON/YAML Config Files

**Move all prompting logic to configuration files**

```
api/
├── config/
│   ├── personality.config.json     (NEW)
│   ├── scoring.config.json         (NEW)
│   ├── voice-examples.json         (NEW)
│   └── prompt-templates.json       (NEW)
├── lib/
│   ├── promptBuilder.ts            (NEW) - assembles prompts from config
│   ├── miraAgent.ts                (REFACTORED - delegate to promptBuilder)
│   └── responseLibrary.ts          (UNCHANGED)
└── analyze-user-stream.ts          (REFACTORED - use promptBuilder)
```

**Advantages**:
- Single source of truth
- Non-developer can edit personality via JSON
- Easy to version/A-B test (load different .json file)
- Can be hot-reloaded (restart not needed)
- Can export to different systems
- Git-friendly diffs (see what changed in personality)

**Disadvantages**:
- Adds build step complexity
- Need to validate JSON at startup
- Less IDE support for complex nested structures
- Would need UI to edit (or copy-paste JSON)

**Effort**: Medium (3-4 hours) | **Risk**: Low-Medium

**Example Structure**:
```json
{
  "version": "2026-01-18",
  "scoring": {
    "excellent": { "range": [13, 15], "description": "Multiple thoughtful questions" },
    "good": { "range": [10, 12], "description": "Single thoughtful question" }
  },
  "personalities": {
    "glowing": {
      "confidence_range": [68, 100],
      "voice": "UNHINGED REVERENCE, obsessive tone...",
      "examples": [
        "...the giant Pacific octopus has nine brains... and you show the same kind of distributed wisdom..."
      ],
      "instructions": "Start grounded in science, then escalate into poetic excess..."
    }
  }
}
```

---

### Option 2: Structured Prompt Architecture (Recommended)

**Use a prompt builder pattern with clear, composable pieces**

```
api/lib/
├── prompts/
│   ├── systemPromptBuilder.ts      (NEW) - main orchestrator
│   ├── sections/
│   │   ├── voiceExamples.ts        (NEW) - personality voice examples
│   │   ├── scoringRules.ts         (NEW) - confidence delta logic
│   │   ├── contextInjection.ts     (NEW) - message/tool count logic
│   │   └── criticalMindset.ts      (NEW) - generic instructions
│   └── types.ts                     (NEW) - PromptSection interface
├── miraAgent.ts                     (REFACTORED)
└── analyze-user-stream.ts           (REFACTORED)
```

**The Builder**:
```typescript
// api/lib/prompts/systemPromptBuilder.ts
export interface PromptSection {
  title: string;
  content: string;
  order: number; // control section ordering
}

export class MiraSystemPromptBuilder {
  private sections: Map<string, PromptSection> = new Map();

  addVoiceExamples(personality: 'negative' | 'chaotic' | 'glowing'): this {
    this.sections.set('voice', voiceExamplesForPersonality(personality));
    return this; // fluent interface
  }

  addScoringRules(detailed: boolean = true): this {
    this.sections.set('scoring',
      detailed ? DETAILED_SCORING : BASIC_SCORING
    );
    return this;
  }

  addContextInjection(miraState: MiraState, messageCount: number): this {
    this.sections.set('context',
      injectContextVariables(miraState, messageCount)
    );
    return this;
  }

  build(): string {
    return Array.from(this.sections.values())
      .sort((a, b) => a.order - b.order)
      .map(s => s.content)
      .join('\n\n');
  }
}

// Usage:
const systemPrompt = new MiraSystemPromptBuilder()
  .addVoiceExamples('glowing')
  .addScoringRules(true)
  .addContextInjection(miraState, messageCount)
  .build();
```

**Advantages**:
- All prompt logic in TypeScript (IDE support!)
- Composable and reusable pieces
- Easy to test each section
- Can swap sections for A/B testing
- Version-controlled as code
- Can be simplified/complexified by adding/removing sections

**Disadvantages**:
- More code initially
- Need to maintain TypeScript structure
- Harder to paste-and-tweak like JSON would allow

**Effort**: Medium (3-4 hours) | **Risk**: Low

---

### Option 3: Hybrid - Config + Type-Safe Builder

**Use JSON for values, TypeScript for structure**

```
api/
├── config/
│   └── mira-personality.json       (stores voice examples, scoring ranges)
├── lib/
│   ├── prompts/
│   │   ├── personality.config.ts   (imports JSON, validates with Zod)
│   │   └── systemPromptBuilder.ts  (uses validated config)
│   └── miraAgent.ts
```

**Combines best of both**:
- Non-developers can edit values in JSON
- TypeScript enforces structure
- Version-controlled
- Type-safe

**Effort**: Medium (4-5 hours) | **Risk**: Low-Medium

---

### Option 4: Prompt Versioning with Claude Batch API

**Keep prompts in code but add versioning layer**

```typescript
// api/lib/prompts/versions.ts
export const PROMPT_VERSIONS = {
  'v1-basic': { /* original miraAgent.ts prompt */ },
  'v2-enhanced': { /* current analyze-user-stream.ts prompt */ },
  'v3-experimental': { /* new iteration to test */ },
} as const;

export type PromptVersion = keyof typeof PROMPT_VERSIONS;

// Usage:
const systemPrompt = PROMPT_VERSIONS['v2-enhanced'];

// Can A/B test:
const promptVersion = user.experimentGroup === 'test' ? 'v3-experimental' : 'v2-enhanced';
```

**Advantages**:
- Easy A/B testing
- Can rollback instantly
- Version history in git
- Low implementation effort

**Disadvantages**:
- Still embedded in code
- Versions can diverge and become hard to maintain
- Limited reusability

**Effort**: Low (1-2 hours) | **Risk**: Very Low

---

## What My Original Plan Missed

Looking back at the REFACTORING_ANALYSIS_2026.md, I focused on **code extraction** (god components, event sequencing) but **completely missed the elephant in the room**: the prompt engineering architecture.

The system prompts are actually the **highest-leverage** refactoring opportunity because:

1. **They change most frequently** - 5 commits in last 24 hours tweaking voice/scoring
2. **They control 90% of behavior** - Not the React components or backend logic
3. **They're hardest to test** - You can't easily write tests for "sounds right"
4. **They're most coupled to business logic** - Can't be swapped without redeploying
5. **They're not discoverable** - New developers don't know they exist in analyze-user-stream.ts

---

## Recommended Approach

### Short Term (This Week)
**Use Option 2: Structured Prompt Builder**

1. Create `api/lib/prompts/systemPromptBuilder.ts` with sections:
   - VoiceExamples section
   - ScoringRules section
   - ContextInjection section
   - CriticalMindset section

2. Consolidate both miraAgent.ts and analyze-user-stream.ts prompts into builder:
   - Remove ~275 lines of duplicated prompt text from code
   - Use builder to construct both prompts (analyze-user-stream uses advanced mode, miraAgent uses basic mode)

3. Add tests:
   ```typescript
   // api/lib/prompts/__tests__/systemPromptBuilder.test.ts
   describe('SystemPromptBuilder', () => {
     it('builds prompt with voice examples', () => {
       const prompt = new MiraSystemPromptBuilder()
         .addVoiceExamples('glowing')
         .build();

       expect(prompt).toContain('GLOWING');
       expect(prompt).toContain('nine brains');
     });

     it('can swap personalities without changing code', () => {
       const negative = builder.addVoiceExamples('negative').build();
       const glowing = builder.addVoiceExamples('glowing').build();

       expect(negative).not.toBe(glowing);
       expect(negative).toContain('starfish');
       expect(glowing).toContain('bioluminescence');
     });
   });
   ```

**Impact**:
- Remove 275 lines of prompt duplication
- Make personality tuning visible/discoverable
- Testable prompt sections
- Easy to add new personalities

**Effort**: ~3-4 hours

---

### Medium Term (Next Sprint)
**Pair with Option 3: Add JSON Config**

1. Extract scoring ranges to `api/config/mira-personality.json`
2. Use Zod for validation
3. Allow personality adjustments without code changes
4. Document how to tune personality

**Impact**:
- Non-developers can adjust personality
- Enables quick A/B testing
- Version personality changes separately from code

**Effort**: ~2-3 hours

---

### Long Term
**Consider Option 4: Prompt Versioning**

Once you have structured prompts, versioning becomes trivial:
```typescript
export const PROMPT_VERSIONS = {
  'current': builder => builder.addVoiceExamples('glowing').addScoringRules(true),
  'experimental': builder => builder.addVoiceExamples('glowing').addScoringRules(experimental),
};
```

---

## How This Fits Into Overall Refactoring Plan

**Updated Priority Matrix**:

| Item | Original Priority | New Priority | Reason |
|------|------------------|--------------|--------|
| System Prompt Refactoring | (not listed) | **CRITICAL** | Controls 90% of behavior |
| Extract TerminalInterface hooks | CRITICAL | HIGH | Still important but less leverage |
| Event Sequencing | HIGH | MEDIUM | Good to have, less critical |
| Personality Tests | HIGH | MEDIUM-HIGH | Now paired with prompt builder |
| Analysis Display E2E Test | CRITICAL | MEDIUM | Lower impact after prompt fix |

**New Implementation Roadmap**:

### Week 1: Prompt Architecture
- [ ] Create systemPromptBuilder.ts with Option 2 structure
- [ ] Consolidate miraAgent.ts + analyze-user-stream.ts prompts
- [ ] Add prompt builder tests
- [ ] Update both API functions to use builder

### Week 1-2: Extract Hooks (Original Plan)
- [ ] Extract useTerminalStreaming, useCreatureZoom, useAnalysisDisplay
- [ ] Add tests for each hook

### Week 2: Backend Clarity
- [ ] Create streamEventSequencer class
- [ ] Add event sequencing tests

### Week 2-3: Config Management (Optional)
- [ ] Add JSON personality config
- [ ] Zod validation
- [ ] Documentation

---

## Decision Points

**Q: Which option should we do?**
A: **Option 2** is the Goldilocks choice. Not too simple (Option 4), not too complex (Option 1). Good IDE support, composable, testable.

**Q: Should we do this before extracting TerminalInterface hooks?**
A: **Yes**. The prompt is higher-leverage and clearer scope. You'll also feel the benefits immediately (easier to tune personality).

**Q: Can we do both this week?**
A: **Yes**, both are ~4-5 hours of work. Prompt refactoring first (it's blocking personality tuning), then hooks extraction.

**Q: Will this break anything?**
A: **No risk**. You're just restructuring code, not changing behavior. Can be done safely with tests at each step.

---

## Summary

Your instinct was right - that prompt text is a huge wall that controls everything. The refactoring opportunity is:

1. **Extract both prompts into a structured builder** (Option 2)
2. **Remove 275+ lines of duplicate code**
3. **Make personality tuning discoverable and testable**
4. **Enable easy A/B testing and versioning**
5. **Pair with JSON config later** (Optional but recommended)

This is actually a **higher-priority** refactoring than the component-level stuff because it has the most leverage on system behavior and is blocking iteration velocity on personality tuning.

Would you like me to start implementing Option 2 (Structured Prompt Builder)?
