# Snapshot Testing Implementation Guide

## Overview

Snapshot testing can significantly reduce test verbosity while maintaining coverage. Vitest has built-in snapshot support (already included in v4.0.17).

---

## Why Snapshot Testing?

### Problem: Verbose Structure Assertions

**Current Pattern (45+ lines in some tests):**
```typescript
it('should render button row with correct structure', () => {
  const { container, getByText } = render(
    <ToolButtonRow tools={[{ id: '1', name: 'ZOOM IN', onExecute: vi.fn() }]} />
  );

  expect(container.querySelector('.tool-button-row')).toBeTruthy();
  const row = container.querySelector('.tool-button-row');
  expect(row?.className).toContain('tool-button-row');

  const buttons = row?.querySelectorAll('button');
  expect(buttons?.length).toBe(1);

  const button = buttons?.[0];
  expect(button?.className).toContain('tool-button');
  expect(button?.getAttribute('aria-label')).toBe('ZOOM IN');
  expect(getByText('ZOOM IN')).toBeTruthy();
});
```

### Solution: Snapshot Testing

**Snapshot Pattern (5 lines):**
```typescript
it('should render button row with correct structure', () => {
  const { container } = render(
    <ToolButtonRow tools={[{ id: '1', name: 'ZOOM IN', onExecute: vi.fn() }]} />
  );

  expect(container.firstChild).toMatchSnapshot();
});
```

**Benefits:**
- ✅ 90% less test code (45 lines → 5 lines)
- ✅ Same coverage (verifies entire HTML structure)
- ✅ Catches unintended changes (any HTML modification fails)
- ✅ Easier to review changes (PR shows HTML diff)
- ✅ Maintainable (snapshot diffs are clear)

---

## Snapshot Testing Best Practices

### What TO Snapshot

✅ **Component HTML Structure**
- Renders of UI components
- DOM element hierarchy
- CSS classes and attributes
- Text content (when static)

✅ **Formatted Output**
- Analysis box formatting (formatAnalysisBox result)
- Terminal line styling
- ASCII art rendering (consistent output)
- UI layout structure

✅ **Object/Data Structures** (with matchers for dynamic parts)
- Event envelope shapes (with ID/timestamp matchers)
- State objects
- Formatted response data

### What NOT to Snapshot

❌ **Dynamic Values**
- Timestamps (use matchers instead: `expect.any(Number)`)
- UUIDs/IDs (use matchers: `expect.any(String)`)
- Random values

❌ **Behavior/Interaction**
- Callback invocations (use `toHaveBeenCalledWith`)
- Event handling
- State changes

❌ **Timing/Performance**
- Execution time
- Animation duration
- Buffer sizes (unless part of contract)

---

## Implementation Strategy

### High-Value Candidates for Snapshots

#### 1. **ToolButtonRow.test.tsx** (572 lines)
**Current:** 40+ structure assertions scattered across tests
**Opportunity:** 200+ lines savings

**Before:**
```typescript
describe('Button Rendering', () => {
  it('should render single button', () => {
    const { container } = render(<ToolButtonRow tools={[mockTool]} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].className).toContain('tool-button');
    expect(buttons[0].getAttribute('aria-label')).toBe('ZOOM IN');
  });

  it('should render multiple buttons', () => {
    const { container } = render(
      <ToolButtonRow tools={[tool1, tool2, tool3]} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    buttons.forEach((btn, idx) => {
      expect(btn.className).toContain('tool-button');
      expect(btn.getAttribute('aria-label')).toBe(tools[idx].name);
    });
  });

  // ... 15 more structure tests
});
```

**After:**
```typescript
describe('Button Rendering', () => {
  it('should render single button correctly', () => {
    const { container } = render(<ToolButtonRow tools={[mockTool]} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render multiple buttons correctly', () => {
    const { container } = render(
      <ToolButtonRow tools={[tool1, tool2, tool3]} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

**Savings:** ~150 lines

---

#### 2. **analyze-user-stream.integration.test.ts** (745 lines)
**Current:** 50+ assertions verifying response structure
**Opportunity:** 200+ lines savings

**Analysis Box Structure Test:**
```typescript
// BEFORE: 30+ lines
it('should create properly formatted analysis box', () => {
  const analysis = { /* ... */ };
  const formatted = formatAnalysisBox(analysis);

  expect(formatted).toContain('[ANALYSIS]');
  expect(formatted).toContain('Confidence');
  expect(formatted).toContain('Traits');
  expect(formatted).toContain('Reasoning');
  expect(formatted).toMatch(/Confidence.*\d+/);
  // ... 20+ more string checks
});

// AFTER: 5 lines
it('should create properly formatted analysis box', () => {
  const analysis = { /* ... */ };
  const formatted = formatAnalysisBox(analysis);
  expect(formatted).toMatchSnapshot();
});
```

**Savings:** ~200 lines

---

#### 3. **TerminalInterface.integration.test.tsx** (519 lines)
**Current:** Line content assertions with whitespace/formatting checks
**Opportunity:** 150+ lines savings

**Example:**
```typescript
// BEFORE: 15 lines
it('should display rapport bar with confidence percentage', async () => {
  // ... setup ...
  const rapportText = screen.getByText(/RAPPORT/);
  expect(rapportText).toBeTruthy();

  const parentDiv = rapportText.closest('.terminal-interface__line');
  expect(parentDiv?.textContent).toMatch(/\[RAPPORT\]/);
  expect(parentDiv?.textContent).toMatch(/████/); // visual bar
  expect(parentDiv?.textContent).toMatch(/\d+%/);
});

// AFTER: 4 lines
it('should display rapport bar with confidence percentage', async () => {
  // ... setup ...
  const rapportElement = screen.getByText(/RAPPORT/).closest('.terminal-interface__line');
  expect(rapportElement).toMatchSnapshot();
});
```

**Savings:** ~150 lines

---

#### 4. **SystemLog.test.tsx** (514 lines)
**Current:** 60+ assertions on log output format
**Opportunity:** 200+ lines savings

**Example:**
```typescript
// BEFORE: 20 lines
it('should format log message with timestamp', () => {
  const message = 'Test message';
  const formatted = systemLog.format(message);

  expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/);
  expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/);
  expect(formatted).toContain(message);
  expect(formatted).toMatch(/\[LOG\]/);
  expect(formatted).not.toContain('ERROR');
  // ... 10+ more format checks
});

// AFTER: 3 lines
it('should format log message with timestamp', () => {
  const message = 'Test message';
  expect(systemLog.format(message)).toMatchSnapshot();
});
```

**Savings:** ~200 lines

---

### Medium-Value Candidates

#### 5. **ErrorBoundary.test.tsx** (201 lines)
- Error message rendering (60 lines savings)
- HTML structure for error display

#### 6. **MinimalInput.test.tsx** (154 lines)
- Input form structure (40 lines savings)
- Button/textarea element layout

#### 7. **events.fixed.test.ts** (remaining file)
- Event envelope structure with matchers (100 lines savings)
- AG-UI protocol structure

---

## Handling Dynamic Values in Snapshots

### Pattern: Use Matchers for Dynamic Parts

```typescript
// Snapshot with dynamic value matchers
it('should create event envelope', () => {
  const envelope = createEventEnvelope('TEXT_CONTENT', { chunk: 'Hello' });

  expect(envelope).toMatchSnapshot({
    event_id: expect.any(String),      // Ignore UUID changes
    timestamp: expect.any(Number),     // Ignore timestamp changes
    sequence_number: expect.any(Number), // Ignore sequence changes
  });
});
```

**When snapshot is created:**
```json
{
  "event_id": "Any<String>",
  "schema_version": "1.0.0",
  "type": "TEXT_CONTENT",
  "timestamp": "Any<Number>",
  "sequence_number": "Any<Number>",
  "data": {
    "chunk": "Hello"
  }
}
```

### Common Matchers for Snapshots

```typescript
expect(value).toMatchSnapshot({
  // Dynamic fields
  id: expect.any(String),
  timestamp: expect.any(Number),
  duration: expect.any(Number),

  // Pattern matching
  date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
  uuid: expect.stringMatching(/^[0-9a-f-]{36}$/),

  // Nested matchers
  user: {
    id: expect.any(String),
    created: expect.any(Number),
  },
});
```

---

## Reviewing and Updating Snapshots

### PR Review Process

**When snapshot test fails:**
1. Run `npm test -- -u` to see the diff
2. **Review the diff carefully** - snapshots make changes obvious
3. If intentional: Update snapshots with `-u` flag
4. If unintentional: Fix the code, not the snapshot

### Updating Snapshots

```bash
# Update single test file
npm test -- -u src/components/__tests__/ToolButtonRow.test.tsx

# Update all snapshots (use carefully!)
npm test -- -u
```

### Git Workflow

Snapshot diffs in Git show exactly what changed:

```diff
- expect(1).toMatchSnapshot()
+ expect(2).toMatchSnapshot()

// Snapshot file shows the actual change:
- "count": 1
+ "count": 2
```

---

## Implementation Roadmap

### Phase 1: High-Impact Candidates (900+ lines savings)

1. **ToolButtonRow.test.tsx** → 150 lines savings
2. **analyze-user-stream.integration.test.ts** → 200 lines savings
3. **TerminalInterface.integration.test.tsx** → 150 lines savings
4. **SystemLog.test.tsx** → 200 lines savings
5. **events.fixed.test.ts** → 200 lines savings

**Total Phase 1 Savings: 900 lines**

### Phase 2: Medium-Impact Candidates (200+ lines savings)

1. **ErrorBoundary.test.tsx** → 60 lines
2. **MinimalInput.test.tsx** → 40 lines
3. **Other component tests** → 100+ lines

**Total Phase 2 Savings: 200 lines**

### Phase 3: Strategic Coverage (100+ lines)

- Add snapshot tests for new components
- Document best practices in test templates
- Create reusable snapshot helpers

---

## Snapshot Testing Workflow

### Creating Snapshots (First Run)

```bash
npm test -- src/components/__tests__/ToolButtonRow.test.tsx

# Output:
# FAIL src/components/__tests__/ToolButtonRow.test.tsx
# SNAPSHOTS 5 written

# Review generated snapshots in:
# src/components/__tests__/__snapshots__/ToolButtonRow.test.tsx.snap
```

### Snapshot File Structure

```
src/components/__tests__/__snapshots__/
  ├── ToolButtonRow.test.tsx.snap          # Auto-generated
  ├── TerminalInterface.integration.test.tsx.snap
  └── ErrorBoundary.test.tsx.snap
```

### Reviewing Snapshots

Snapshots are stored as `.snap` files and committed to git. They show the expected output:

```javascript
// ToolButtonRow.test.tsx.snap
exports[`ToolButtonRow Button Rendering should render single button 1`] = `
<div
  class="tool-button-row"
>
  <button
    aria-label="ZOOM IN"
    class="tool-button"
  >
    ZOOM IN
  </button>
</div>
`;
```

---

## Risk Assessment

### Low Risk Changes

✅ Adding snapshots to existing structure assertions (no behavior change)
✅ Using matchers for dynamic values (matches-based comparison)
✅ Snapshot diffs are clear and reviewable in PRs

### Medium Risk

⚠️ Updating snapshots on large refactors (need careful review)
⚠️ Multiple snapshots in one test (harder to track intent)

### Mitigation

- Always review snapshot diffs carefully
- Commit snapshots alongside code changes
- Use clear test descriptions to understand intent
- Include dynamic value matchers where appropriate

---

## Recommendation

### Start with Phase 1 (High-Impact)

1. **ToolButtonRow.test.tsx** - Clear DOM structure testing (150 lines)
2. **SystemLog.test.tsx** - Format output testing (200 lines)
3. **events.fixed.test.ts** - Event envelope structure (200 lines)

These are the safest bets with highest impact:
- ✅ Clear intent (structure verification)
- ✅ Low dynamism (minimal matchers needed)
- ✅ 550+ lines of immediate savings
- ✅ Easier to review diffs

### Phase 1 Implementation

```bash
# 1. Convert ToolButtonRow tests
npm test -- src/components/__tests__/ToolButtonRow.test.tsx -u

# 2. Review generated snapshots
git diff src/components/__tests__/__snapshots__/ToolButtonRow.test.tsx.snap

# 3. Repeat for other files
npm test -- src/shared/__tests__/SystemLog.test.tsx -u
npm test -- src/__tests__/events.fixed.test.ts -u

# 4. Verify all tests still pass
npm test -- --run

# 5. Commit with clear message
git commit -m "Add snapshot tests for structure verification (Phase 1)"
```

---

## Expected Outcomes

### After Phase 1 (High-Impact Snapshots)

- Test files: 35 (unchanged)
- Test code lines: ~12,900 (-500 from snapshots)
- Snapshot files: 5 new files in __snapshots__/
- Total test code: ~13,400 → ~12,900 (-500 lines)
- Coverage: Maintained or improved
- Maintainability: Significantly improved

### Full Roadmap (Phases 1-3)

- Test code: ~13,400 → ~12,300 lines (-1,100 total)
- Snapshot files: 10+ created
- Coverage: Improved (structure changes caught automatically)
- Maintainability: Excellent (snapshots are clear diffs)

---

## Conclusion

Snapshot testing is **ready to implement** in this codebase:

✅ Vitest support already available (v4.0.17)
✅ High-value candidates identified (900+ lines savings)
✅ Clear implementation strategy
✅ Low risk for initial Phase 1

**Recommendation:** Implement Phase 1 as a follow-up task to reduce test verbosity while maintaining full coverage.
