# Prompt Builder Quick Start Guide
## Implementing System Prompt Refactoring (Phase 1)

---

## What You're Building

A **prompt composition system** that extracts the 490 lines of scattered system prompts into reusable, testable pieces.

**Before** (current state):
```
miraAgent.ts (215 lines) + analyze-user-stream.ts (275 lines) = scattered prompts
│
└─ Result: Hard to tune, test, iterate on personality
```

**After** (goal):
```
systemPromptBuilder.ts (uses composable sections)
├── VoiceExamples section
├── ScoringRules section
├── ContextInjection section
└── CriticalMindset section
│
└─ Result: Easy to tune, test, version personality
```

---

## Files to Create

### 1. `api/lib/prompts/types.ts` (NEW - ~30 LoC)

```typescript
export interface PromptSection {
  title: string;
  content: string;
  order: number; // controls ordering in final prompt
}

export interface PersonalityTier {
  name: 'negative' | 'chaotic' | 'glowing';
  examples: string[];
  keyTraits: string;
}

export interface ScoringLevel {
  name: string;
  range: [number, number];
  description: string;
  examples: string[];
}
```

### 2. `api/lib/prompts/sections/voiceExamples.ts` (NEW - ~80 LoC)

Extract from analyze-user-stream.ts lines 160-185:

```typescript
import type { PromptSection, PersonalityTier } from '../types';

export const VOICE_EXAMPLES: Record<string, PromptSection> = {
  negative: {
    title: 'NEGATIVE (lazy/dismissive engagement)',
    order: 2,
    content: `NEGATIVE (lazy/dismissive engagement):
- "...at least you're trying, I suppose, though a starfish could do better..."
- "...your laziness is overwhelming... I studied jellyfish with more intellectual capacity than you possess..."
[... rest of examples ...]
Key traits: Blunt, dismissive, cutting humor, dark references, sometimes local Monterey references, brutal comparisons to inferior creatures, REFERENCE HISTORY`,
  },
  chaotic: {
    title: 'CHAOTIC (mediocre/surface-level engagement)',
    order: 3,
    content: `CHAOTIC (mediocre/surface-level engagement):
- "...eighty percent of creatures at 200-1000 meters produce their own light..."
[... examples ...]
Key traits: Philosophical rambling, existential questions, weird tangents`,
  },
  glowing: {
    title: 'GLOWING (genuine curiosity/excellent engagement)',
    order: 4,
    content: `GLOWING (genuine curiosity/excellent engagement):
STRUCTURE: Start with creature fact → evolve into philosophical observation → collapse into direct address
- "...the giant Pacific octopus has nine brains... and you show the same kind of distributed wisdom..."
[... examples and instructions ...]
Key traits: UNHINGED REVERENCE, obsessive tone, specific creature facts`,
  },
};

export function getVoiceExamplesForPersonality(
  personality: 'negative' | 'chaotic' | 'glowing'
): PromptSection {
  return VOICE_EXAMPLES[personality];
}
```

### 3. `api/lib/prompts/sections/scoringRules.ts` (NEW - ~100 LoC)

Extract from both prompts (miraAgent.ts lines 38-62 and analyze-user-stream.ts lines 232-269):

```typescript
import type { PromptSection, ScoringLevel } from '../types';

// Use when you need detailed scoring (production)
export const DETAILED_SCORING: PromptSection = {
  title: 'SCORING GUIDELINES (detailed)',
  order: 5,
  content: `SCORING GUIDELINES (be more granular and thoughtful):

EXCELLENT (+13 to +15):
  * Multiple thoughtful questions showing deep curiosity
  * Personal, philosophical questions ("what keeps you up at night?", "what drives you?")
  * Offers to collaborate or invest time/effort
  * Shows understanding of implications or complexity
  * Long, multi-sentence engagement with real thought

GOOD (+10 to +12):
  * Single thoughtful question with context
  * "I have no idea, tell me more" with genuine curiosity
  * Specific observations that show listening
  * Questions about methodology or deeper understanding
  * Respectful pushback or disagreement with reasoning

BASIC (+6 to +9):
  * Simple identification questions ("is this an anglerfish?")
  * One-word questions without context
  * Surface-level observation
  * Minimal effort but not dismissive
  * Just asking for facts without connecting to bigger picture

NEGATIVE (-2 to +2):
  * One-word dismissive answer ("cool", "ok")
  * Lazy non-engagement
  * Rude or contemptuous tone
  * Clearly not reading/listening

VERY NEGATIVE (-5 to -10):
  * Hostile or insulting
  * Actively dismissive of her work
  * Seems to be testing/mocking her

Use your judgment - this is about DEPTH and GENUINE CURIOSITY, not just presence of a question mark.`,
};

// Use for faster analysis (fallback)
export const BASIC_SCORING: PromptSection = {
  title: 'SCORING GUIDELINES (basic)',
  order: 5,
  content: `SCORING GUIDELINES:
- ANY question (even one question): +12 to +15 (questions show genuine engagement)
- Multiple questions: +13 to +15 (showing real curiosity)
- Asking for explanations: +12 to +15 (wants to learn more)
- Thoughtful observations: +10 to +12 (noticing details, making connections)
- Honest engagement ("I have no idea"): +10 to +12 (authentic participation)
- One-word lazy answer: -2 to 0
- Rude/dismissive: -5 to -10

RULE: If they ask ANY question, minimum is +12. No exceptions.`,
};

export function getScoringRulesSection(detailed: boolean = true): PromptSection {
  return detailed ? DETAILED_SCORING : BASIC_SCORING;
}
```

### 4. `api/lib/prompts/sections/contextInjection.ts` (NEW - ~60 LoC)

Extract from analyze-user-stream.ts lines 218-230:

```typescript
import type { PromptSection } from '../types';
import type { MiraState } from '../types';

export function buildContextInjectionSection(
  miraState: MiraState,
  messageCount: number,
  toolCallCount: number
): PromptSection {
  const totalInteractions = miraState.memories.length;

  return {
    title: 'USING CONTEXT FOR RICHER ANALYSIS',
    order: 6,
    content: `USING CONTEXT FOR RICHER ANALYSIS:
- Current confidence level (in miraState.confidenceInUser) tells you the OVERALL rapport arc: ${miraState.confidenceInUser}%
- Message count: ${messageCount} (text interactions only, excludes tool usage)
- Tool interactions: ${toolCallCount} (zoom in/out, exploration actions)
- Total interactions: ${totalInteractions} (messages + tools combined)
- IMPORTANT: Distinguish between meaningful message exchanges and casual tool usage in your analysis
  * Frame interactions accurately: "after ${messageCount} messages and ${toolCallCount} explorations..." NOT "after ${totalInteractions} exchanges..."
  * Tool usage (zoom in/out) shows curiosity/engagement but doesn't count as conversational depth
  * Reference both naturally: "after three messages and several explorations, you suddenly ask..." or "after examining specimens, you finally speak..."
- confidenceDelta should reflect THIS message's impact, but reasoning can reference THE PATTERN
- A breakthrough moment after mediocrity hits harder than consistent good engagement
- A drop-off after consistent quality feels like betrayal
- Let the confidence level and interaction history inform the emotional tenor of the analysis

Current user profile: ${JSON.stringify(miraState.userProfile)}`,
  };
}
```

### 5. `api/lib/prompts/sections/criticalMindset.ts` (NEW - ~40 LoC)

Extract from both prompts (generic instructions):

```typescript
import type { PromptSection } from '../types';

export const CRITICAL_MINDSET: PromptSection = {
  title: 'CRITICAL MINDSET',
  order: 7,
  content: `CRITICAL MINDSET:
This is a user trying to engage with you. Be GENEROUS. They're asking questions about ASCII art creatures and trying to understand. That's GOOD.
- Questions = AT LEAST +12 confidence
- Multiple questions = +14 or +15
- Honest confusion + asking = +12 or +13
- Only penalize complete disengagement or rudeness
- Default to encouraging scores unless they're being mean`,
};

export const RESPONSE_FORMAT: PromptSection = {
  title: 'RESPONSE FORMAT',
  order: 8,
  content: `Return ONLY valid JSON in this exact format:
{
  "confidenceDelta": number,
  "thoughtfulness": number,
  "adventurousness": number,
  "engagement": number,
  "curiosity": number,
  "superficiality": number,
  "reasoning": "Mira's brief personal observation in her voice (1-2 sentences, reference creatures/research if relevant)"
}`,
};
```

### 6. `api/lib/prompts/systemPromptBuilder.ts` (NEW - ~100 LoC)

The main orchestrator:

```typescript
import type { PromptSection } from './types';
import { getVoiceExamplesForPersonality } from './sections/voiceExamples';
import { getScoringRulesSection } from './sections/scoringRules';
import { buildContextInjectionSection } from './sections/contextInjection';
import { CRITICAL_MINDSET, RESPONSE_FORMAT } from './sections/criticalMindset';
import type { MiraState } from '../types';

export class MiraSystemPromptBuilder {
  private sections: Map<string, PromptSection> = new Map();
  private baseIntro: string;

  constructor(detailed: boolean = true) {
    this.baseIntro = `You are Dr. Mira Petrovic, a deep-sea researcher obsessed with bioluminescent creatures and the abyss. You are analyzing a user's message to understand their personality traits and engagement depth.`;

    // Add default sections in order
    this.sections.set('intro', {
      title: 'INTRODUCTION',
      order: 1,
      content: this.baseIntro,
    });
  }

  addVoiceExamples(personality: 'negative' | 'chaotic' | 'glowing'): this {
    this.sections.set('voice', getVoiceExamplesForPersonality(personality));
    return this;
  }

  addDetailedScoringRules(): this {
    this.sections.set('scoring', getScoringRulesSection(true));
    return this;
  }

  addBasicScoringRules(): this {
    this.sections.set('scoring', getScoringRulesSection(false));
    return this;
  }

  addContextInjection(
    miraState: MiraState,
    messageCount: number,
    toolCallCount: number
  ): this {
    this.sections.set(
      'context',
      buildContextInjectionSection(miraState, messageCount, toolCallCount)
    );
    return this;
  }

  addMindsetGuidance(): this {
    this.sections.set('mindset', CRITICAL_MINDSET);
    return this;
  }

  addResponseFormat(): this {
    this.sections.set('format', RESPONSE_FORMAT);
    return this;
  }

  build(): string {
    // Sort by order field and concatenate
    const sorted = Array.from(this.sections.values()).sort(
      (a, b) => a.order - b.order
    );

    return sorted.map((s) => s.content).join('\n\n');
  }

  // Convenience methods
  buildBasicPrompt(miraState: MiraState, messageCount: number): string {
    return new MiraSystemPromptBuilder(false)
      .addVoiceExamples('negative') // default
      .addBasicScoringRules()
      .addMindsetGuidance()
      .addResponseFormat()
      .build();
  }

  buildAdvancedPrompt(
    miraState: MiraState,
    messageCount: number,
    toolCallCount: number
  ): string {
    return new MiraSystemPromptBuilder(true)
      .addVoiceExamples('glowing') // default to detailed
      .addDetailedScoringRules()
      .addContextInjection(miraState, messageCount, toolCallCount)
      .addMindsetGuidance()
      .addResponseFormat()
      .build();
  }
}

// Export factory for quick usage
export const createMiraSystemPrompt = (options: {
  personality?: 'negative' | 'chaotic' | 'glowing';
  detailed?: boolean;
  miraState: MiraState;
  messageCount: number;
  toolCallCount?: number;
}): string => {
  const builder = new MiraSystemPromptBuilder(options.detailed ?? true);

  const personality = options.personality || 'glowing';
  builder
    .addVoiceExamples(personality)
    .addMindsetGuidance()
    .addResponseFormat();

  if (options.detailed) {
    builder.addDetailedScoringRules();
    builder.addContextInjection(
      options.miraState,
      options.messageCount,
      options.toolCallCount ?? 0
    );
  } else {
    builder.addBasicScoringRules();
  }

  return builder.build();
};
```

---

## Step 2: Update miraAgent.ts

Replace lines 35-77 with:

```typescript
import { createMiraSystemPrompt } from './prompts/systemPromptBuilder.js';

export async function analyzeUserInput(
  userInput: string,
  miraState: MiraState
): Promise<UserAnalysis> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Use builder to construct prompt (basic mode)
  const systemPrompt = createMiraSystemPrompt({
    detailed: false, // use simpler version in miraAgent
    personality: 'glowing', // default
    miraState,
    messageCount: miraState.memories.length,
  });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `User message: "${userInput}"`,
      },
    ],
  });

  // ... rest of function unchanged
}
```

---

## Step 3: Update analyze-user-stream.ts

Replace lines 156-298 with:

```typescript
import { createMiraSystemPrompt } from './lib/prompts/systemPromptBuilder.js';

// In your analyze-user-stream handler:
const messageCount = miraState.memories.filter(m => m.type !== 'tool_call').length;
const toolCallCount = miraState.memories.filter(m => m.type === 'tool_call').length;

const systemPrompt = createMiraSystemPrompt({
  detailed: true, // use advanced version here
  personality: 'glowing',
  miraState,
  messageCount,
  toolCallCount,
});

// Use systemPrompt in Claude API call as before
```

---

## Step 4: Write Tests

Create `api/lib/prompts/__tests__/systemPromptBuilder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MiraSystemPromptBuilder, createMiraSystemPrompt } from '../systemPromptBuilder';
import { mockMiraState } from '../__mocks__/miraState';

describe('MiraSystemPromptBuilder', () => {
  describe('Basic Usage', () => {
    it('builds a prompt with all sections', () => {
      const builder = new MiraSystemPromptBuilder();
      const prompt = builder
        .addVoiceExamples('glowing')
        .addDetailedScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      expect(prompt).toContain('Dr. Mira Petrovic');
      expect(prompt).toContain('GLOWING');
      expect(prompt).toContain('SCORING');
      expect(prompt).toContain('Return ONLY valid JSON');
    });

    it('builds a basic prompt (fallback mode)', () => {
      const prompt = new MiraSystemPromptBuilder(false)
        .addVoiceExamples('negative')
        .addBasicScoringRules()
        .addMindsetGuidance()
        .addResponseFormat()
        .build();

      expect(prompt).toContain('NEGATIVE');
      expect(prompt).not.toContain('EXCELLENT');
    });
  });

  describe('Voice Examples', () => {
    it('includes negative examples when requested', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addVoiceExamples('negative')
        .build();

      expect(prompt).toContain('starfish');
      expect(prompt).toContain('lazy');
    });

    it('includes glowing examples when requested', () => {
      const prompt = new MiraSystemPromptBuilder()
        .addVoiceExamples('glowing')
        .build();

      expect(prompt).toContain('nine brains');
      expect(prompt).toContain('UNHINGED REVERENCE');
    });
  });

  describe('Context Injection', () => {
    it('injects message and tool counts', () => {
      const miraState = mockMiraState();
      const builder = new MiraSystemPromptBuilder();
      const prompt = builder
        .addContextInjection(miraState, 5, 3)
        .build();

      expect(prompt).toContain('Message count: 5');
      expect(prompt).toContain('Tool interactions: 3');
    });
  });

  describe('Convenience Methods', () => {
    it('buildAdvancedPrompt includes all advanced sections', () => {
      const builder = new MiraSystemPromptBuilder();
      const prompt = builder.buildAdvancedPrompt(mockMiraState(), 5, 3);

      expect(prompt).toContain('GLOWING');
      expect(prompt).toContain('SCORING');
      expect(prompt).toContain('Message count');
      expect(prompt).toContain('Return ONLY valid JSON');
    });
  });

  describe('Factory Function', () => {
    it('createMiraSystemPrompt works with basic options', () => {
      const prompt = createMiraSystemPrompt({
        detailed: true,
        personality: 'glowing',
        miraState: mockMiraState(),
        messageCount: 5,
        toolCallCount: 2,
      });

      expect(prompt).toContain('Dr. Mira Petrovic');
      expect(prompt).toContain('GLOWING');
    });
  });
});
```

---

## Step 5: Verify & Deploy

1. **Run tests**:
   ```bash
   npm run test api/__tests__/prompts/systemPromptBuilder.test.ts
   ```

2. **Check line count reduction**:
   ```bash
   wc -l api/analyze-user-stream.ts  # Should be ~370 (was 644)
   wc -l api/lib/miraAgent.ts        # Should be ~370 (was ~440)
   ```

3. **Verify behavior unchanged**:
   - Run existing miraAgent tests
   - Run existing analyze-user-stream integration tests
   - Manual spot-check: send a message, verify personality response

---

## File Structure After Implementation

```
api/lib/
├── prompts/                         (NEW DIRECTORY)
│   ├── __tests__/
│   │   └── systemPromptBuilder.test.ts
│   ├── sections/                    (NEW DIRECTORY)
│   │   ├── voiceExamples.ts
│   │   ├── scoringRules.ts
│   │   ├── contextInjection.ts
│   │   └── criticalMindset.ts
│   ├── types.ts
│   └── systemPromptBuilder.ts
├── miraAgent.ts                     (MODIFIED - now uses builder)
└── types.ts
```

---

## Summary

You'll go from:
- ❌ 490 scattered lines of prompt text
- ❌ Hard to test
- ❌ Hard to iterate on
- ❌ Not discoverable

To:
- ✅ ~100 builder code + ~300 prompt sections
- ✅ Each section independently testable
- ✅ Composable and reusable
- ✅ Clear structure (easy to find where personality logic lives)
- ✅ Can easily A/B test prompt variations

**Next steps after this**: Option 2 in SYSTEM_PROMPT_REFACTORING.md covers adding JSON config on top of this builder.
