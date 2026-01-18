# System Prompt Refactoring: 4 Options Compared
## Quick Reference

### The Problem
- 490 total lines of system prompts
- Split across 2 files with 60% duplication
- Hard to iterate, test, or version
- Blocks personality tuning velocity

---

## Option 1: JSON/YAML Config Files

### What
Move all prompt text to external JSON/YAML files

```
api/config/
├── personality.config.json
├── scoring.config.json
├── voice-examples.json
└── prompt-templates.json
```

### Pros
✓ Non-developers can edit personality
✓ Git diffs show exactly what changed
✓ Easy to hot-reload (no redeploy)
✓ Can export to different systems
✓ Clear versioning in git

### Cons
✗ Adds build/validation complexity
✗ Need to load/parse JSON at startup
✗ Less IDE support (no autocomplete)
✗ Need validation library (Zod)
✗ Less discoverable initially

### Effort
4-5 hours

### Risk
Low-Medium

### Best For
If you want non-developers to edit personality values
and you're comfortable with JSON validation

---

## Option 2: Structured Prompt Builder ⭐ RECOMMENDED

### What
Composable TypeScript classes with testable prompt sections

```typescript
new MiraSystemPromptBuilder()
  .addVoiceExamples('glowing')
  .addDetailedScoringRules()
  .addContextInjection(miraState, messageCount)
  .build();
```

### File Structure
```
api/lib/prompts/
├── types.ts                          (interfaces)
├── systemPromptBuilder.ts            (orchestrator)
├── sections/
│   ├── voiceExamples.ts
│   ├── scoringRules.ts
│   ├── contextInjection.ts
│   └── criticalMindset.ts
└── __tests__/
    └── systemPromptBuilder.test.ts
```

### Pros
✓ Full IDE support (TypeScript)
✓ Each section independently testable
✓ Composable and reusable
✓ Easy to add new personalities
✓ Version-controlled as code
✓ Can swap sections for A/B testing
✓ Type-safe

### Cons
✗ More initial code (100-150 LoC)
✗ Developers must know TypeScript structure
✗ Harder to paste-and-tweak like JSON

### Effort
3-4 hours

### Risk
Low

### Best For
You want maintainability, testability, and IDE support
This is the "Goldilocks" option

### Implementation
See PROMPT_BUILDER_QUICK_START.md

---

## Option 3: Hybrid - Config + Type-Safe Builder

### What
Combine best of Options 1 & 2:
- JSON for values (voice examples, scoring ranges)
- TypeScript for structure and validation
- Zod for type safety

```typescript
// api/config/mira-personality.json
{
  "personalities": {
    "glowing": {
      "examples": ["...nine brains..."],
      "instructions": "UNHINGED REVERENCE..."
    }
  }
}

// api/lib/prompts/personality.config.ts
const config = PersonalityConfigSchema.parse(
  require('../config/mira-personality.json')
);
```

### Pros
✓ Non-developers can edit values
✓ TypeScript enforces structure
✓ IDE support + type safety
✓ Version-controlled
✓ Composable like Option 2
✓ Best of both worlds

### Cons
✗ Slightly more complex setup
✗ Need Zod validation library
✗ Two places to look (TypeScript + JSON)

### Effort
4-5 hours

### Risk
Low-Medium

### Best For
Future-proofing: start with Option 2, add JSON config later
This is what you'd do in Phase 1-2

---

## Option 4: Prompt Versioning with Batch API

### What
Keep prompts in code but add versioning layer

```typescript
export const PROMPT_VERSIONS = {
  'v1-basic': { /* original */ },
  'v2-enhanced': { /* current */ },
  'v3-experimental': { /* new */ },
};

// Easy A/B testing:
const version = user.isInTestGroup ? 'v3-experimental' : 'v2-enhanced';
const prompt = PROMPT_VERSIONS[version];
```

### Pros
✓ Easy A/B testing
✓ Can rollback instantly
✓ Version history in git
✓ Very low implementation effort
✓ No changes to existing code

### Cons
✗ Still embedded in code
✗ Versions can diverge
✗ Hard to maintain 3+ versions
✗ Limited reusability
✗ Duplication across versions

### Effort
1-2 hours

### Risk
Very Low

### Best For
Quick wins and A/B testing
Pairs well with Option 2 (versioning on top of builder)

---

## Comparison Table

| Aspect | Option 1 | Option 2 | Option 3 | Option 4 |
|--------|----------|----------|----------|----------|
| **Implementat. Effort** | 4-5 hrs | 3-4 hrs ⭐ | 4-5 hrs | 1-2 hrs |
| **Maintainability** | Medium | High ⭐ | Very High | Low |
| **Testability** | Medium | High ⭐ | Very High | Low |
| **IDE Support** | Low | High ⭐ | High ⭐ | High ⭐ |
| **Non-Dev Editable** | High ⭐ | Low | High ⭐ | None |
| **Easy A/B Testing** | Medium | High ⭐ | High ⭐ | Very High ⭐ |
| **Hot-Reloadable** | Yes ⭐ | No | Yes ⭐ | No |
| **Risk** | Low-Med | Low ⭐ | Low-Med | Very Low ⭐ |
| **Code Duplication** | None | Low | None | High |
| **Discoverable** | Medium | High ⭐ | High ⭐ | Medium |

---

## Recommended Path

### Phase 1 This Week: Option 2
- **Why**: Best balance of effort, maintainability, risk
- **Benefit**: Immediate testability, discoverable structure
- **Time**: 3-4 hours
- **See**: PROMPT_BUILDER_QUICK_START.md

### Phase 2 Next Week: Pair with Option 3
- **Why**: Build on top of Option 2, add JSON config layer
- **Benefit**: Non-developers can tune personality
- **Time**: 2-3 additional hours
- **Impact**: Very high (personality becomes configurable)

### Optional Later: Option 4 on Top
- **Why**: A/B test different prompt versions
- **Benefit**: Easy experimentation with Claude analysis
- **Time**: 1-2 hours
- **Impact**: Research/tuning (not production-critical)

---

## Decision Matrix

**Use Option 1 if**: You have non-technical stakeholders who need to edit personality frequently and you want instant hot-reloading

**Use Option 2 if**: You want the best code quality, testability, and maintainability (RECOMMENDED)

**Use Option 3 if**: You want Option 2's structure PLUS non-technical personality editing (best long-term)

**Use Option 4 if**: You just need quick A/B testing and versioning (do this later on top of Option 2)

---

## Implementation Sequencing

### Quick (Option 2 only)
```
Week 1:
  Day 1: Create prompt builder + sections
  Day 2: Add tests + verify
  Day 3: Update miraAgent.ts
  Day 4: Update analyze-user-stream.ts
  
Total: 3-4 hours
Result: Testable, discoverable, composable prompts
```

### Complete (Option 2 + 3)
```
Week 1:
  Days 1-4: Option 2 (3-4 hours)
  
Week 2:
  Days 1-2: Add JSON config layer (2-3 hours)
  
Total: 5-7 hours
Result: Testable prompts + configurable personality
```

### Research-Focused (Option 2 + 4)
```
Week 1:
  Days 1-4: Option 2 (3-4 hours)
  
Week 3:
  Day 1: Add version enum + selection logic (1-2 hours)
  
Total: 4-6 hours
Result: Testable prompts + easy A/B testing
```

---

## The Bottom Line

**Start with Option 2 (Structured Prompt Builder)**
- Lowest risk, high impact
- 3-4 hours of work
- Immediately improves code quality
- Foundation for future enhancements (Options 3 & 4)

See PROMPT_BUILDER_QUICK_START.md to implement.
