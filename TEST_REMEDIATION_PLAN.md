# Test Remediation Plan

**Status:** Hostile audit completed. Test suite has 23 identified issues preventing production use.

**Action Required:** Fix critical and high-severity issues before merging protocol adoption work.

---

## Quick Summary

| Issue Type | Count | Severity | Action |
|---|---|---|---|
| Timestamp flakiness | 15 | 🔴 CRITICAL | Use bounded time windows |
| Missing validation logic | 3 | 🔴 CRITICAL | Implement actual assertions |
| Structure-only tests | 8 | 🟠 HIGH | Add behavior validation |
| Redundant tests | 5 | 🟡 MEDIUM | Merge or delete |
| Missing test cases | 8 | 🟡 MEDIUM | Add new tests |

**Total Effort:** 13-18 hours

---

## Issue #1: Timestamp Flakiness

### Problem
15 tests use `Date.now()` with trivial assertions:
```typescript
const envelope = { timestamp: Date.now() };
expect(envelope.timestamp).toBeDefined();  // Always passes
```

### Impact
- Tests pass even if timestamps are wrong
- Will fail sporadically under load or across timezones
- No validation timestamps are actually recorded

### Files Affected
- events.test.ts: 12 instances
- schemaMigration.test.ts: 3 instances

### Fix Strategy
Use bounded time windows:

**BEFORE:**
```typescript
const envelope = { timestamp: Date.now() };
expect(envelope.timestamp).toBeDefined();
```

**AFTER:**
```typescript
const now = Date.now();
const envelope = { timestamp: Date.now() };
expect(envelope.timestamp).toBeGreaterThanOrEqual(now - 100);
expect(envelope.timestamp).toBeLessThanOrEqual(Date.now() + 100);
```

### Effort: 1-2 hours

---

## Issue #2: Event Buffering Not Actually Tested

### Problem
Test creates out-of-order events but never validates reordering logic:

```typescript
it('should detect out-of-order events', () => {
  const events = [
    { sequence_number: 0 },
    { sequence_number: 2 },
    { sequence_number: 1 },  // Out of order
  ];
  expect(events[1].sequence_number).toBe(2);  // Just checks array
});
```

### Impact
- Buffering logic could be completely broken
- No validation that events are actually reordered
- Real out-of-order events would be processed in wrong order

### File
- events.test.ts:139-158

### Fix Strategy
Implement actual EventBuffer and test reordering:

```typescript
it('should reorder out-of-order events', () => {
  const buffer = createEventBuffer();
  const events = [
    { sequence_number: 0 },
    { sequence_number: 2 },
    { sequence_number: 1 },
  ];

  const processed = [];
  for (const evt of events) {
    processed.push(...buffer.add(evt));
  }

  // Actually verify reordering happened
  expect(processed.map(e => e.sequence_number)).toEqual([0, 1, 2]);
});
```

### Effort: 2-3 hours

---

## Issue #3: Tool Schema Tests Only Check Structure

### Problem
Test doesn't validate that schemas are actually correct:

```typescript
it('should define zoom_in tool schema', () => {
  expect(zoomInSchema.input_schema.properties).toHaveProperty('current_zoom');
  // Never validates the schema is correct
});
```

### Impact
- Wrong types, missing constraints, broken validation all pass
- Client code expecting specific format could break
- Schema could be incomplete and tests wouldn't catch it

### Files Affected
- toolRegistry.test.ts: 22-53 (tool schema tests)

### Fix Strategy
Validate complete schema structure:

**BEFORE:**
```typescript
expect(zoomInSchema.input_schema.properties).toHaveProperty('current_zoom');
```

**AFTER:**
```typescript
const zoomProp = zoomInSchema.input_schema.properties.current_zoom;
expect(zoomProp.type).toBe('string');
expect(zoomProp.enum).toEqual(['far', 'medium', 'close']);
expect(zoomInSchema.input_schema.required).toContain('current_zoom');
```

### Effort: 1-2 hours

---

## Issue #4: Tool Execution Never Validates Results

### Problem
Test doesn't validate tool actually does anything:

```typescript
it('should execute zoom_in', () => {
  const result = executeTool('zoom_in', { current_zoom: 'medium' });
  expect(result.status).toBe('success');  // Status could be hardcoded
  expect(result.result).toBeDefined();     // Never checks what result is
});
```

### Impact
- Tool could be completely broken and test still passes
- No validation result format matches MCP-UI spec
- Client code expecting specific result structure could break

### Files Affected
- toolRegistry.test.ts: 142-160

### Fix Strategy
Validate actual tool behavior:

```typescript
it('should execute zoom_in correctly', () => {
  const result = executeTool('zoom_in', { current_zoom: 'medium' });

  expect(result.status).toBe('success');
  expect(result.result).toHaveProperty('tool_name', 'zoom_in');
  expect(result.metadata?.execution_time_ms).toBeDefined();
  expect(result.metadata?.execution_time_ms).toBeGreaterThanOrEqual(0);
});
```

### Effort: 1-2 hours

---

## Issue #5: Checksum Tests Don't Validate Checksums Work

### Problem
Test doesn't verify checksums are deterministic or effective:

```typescript
const v1 = createVersionedState(state);
const v2 = createVersionedState(state);
expect(v1.checksum).not.toBe(v2.checksum);  // But checksum could be Math.random()
```

### Impact
- Checksums could be completely useless for validation
- Data corruption wouldn't be detected
- No collision detection

### Files Affected
- stateSync.test.ts: 50-70

### Fix Strategy
Test determinism and collision resistance:

```typescript
it('should generate deterministic checksums', () => {
  const state = createTestState();
  const v1 = createVersionedState(state);
  const v2 = createVersionedState(state);

  // Same state = same checksum (deterministic)
  expect(v1.checksum).toBe(v2.checksum);
});

it('should detect all state mutations with low collision rate', () => {
  const mutations = [
    { ...state, confidenceInUser: 51 },
    { ...state, confidenceInUser: 52 },
    { ...state, currentMood: 'excited' },
    { ...state, hasFoundKindred: true },
  ];

  const checksums = mutations.map(s => createVersionedState(s).checksum);
  const unique = new Set(checksums);

  // All different states should have different checksums
  expect(unique.size).toBe(mutations.length);
});
```

### Effort: 1-2 hours

---

## Issue #6: State Conflict Detection Not Validated

### Problem
Test doesn't actually test conflict detection works:

```typescript
const result = manager.syncWithServer(serverVersion);
expect(result.hasConflict).toBe(true);  // Could be hardcoded
```

### Impact
- Conflicts could go undetected
- Data corruption risk in production
- State machines diverge silently

### Files Affected
- stateSync.test.ts: 309-335

### Fix Strategy
Verify detection logic:

```typescript
it('should detect version mismatch conflicts', () => {
  const manager = new StateSyncManager(state);

  // Create local version 1
  manager.optimisticUpdate([{ op: 'replace', path: '/confidenceInUser', value: 75 }]);

  // Server has version 0 (older)
  const serverState = { ...state };
  const serverVersion = createVersionedState(serverState, 0);

  const result = manager.syncWithServer(serverVersion);

  // Verify conflict detected
  expect(result.hasConflict).toBe(true);
  expect(result.localVersion.version).toBeGreaterThan(serverVersion.version);
});
```

### Effort: 2-3 hours

---

## Issue #7: Global Registry Tests Are Order-Dependent

### Problem
Test assumes schemas are already registered:

```typescript
const schemas = globalSchemaRegistry.list();
const hasTextStart = schemas.some(s => s.name === 'TEXT_MESSAGE_START');
expect(hasTextStart || hasStateDelta).toBe(true);  // Might not be registered
```

### Impact
- Tests fail if run in different order
- Tests fail if registry is cleared between suites
- Unreliable in CI

### Files Affected
- schemaMigration.test.ts: 243-254

### Fix Strategy
Setup registry explicitly:

```typescript
it('should register and retrieve schemas', () => {
  // Setup
  globalSchemaRegistry.register('TEXT_MESSAGE_START', textStartSchema);

  // Verify registration
  expect(globalSchemaRegistry.get('TEXT_MESSAGE_START')).toBeDefined();
});
```

### Effort: 1 hour

---

## Missing Critical Tests

### Missing #1: Concurrent Event Reordering
**Impact:** Real-world systems send events concurrently; no test validates buffering

**Add:**
```typescript
it('should reorder events with gaps', () => {
  const buffer = new EventBuffer();
  const events = [
    { sequence_number: 0 },
    { sequence_number: 3 },
    { sequence_number: 1 },
    { sequence_number: 2 },
  ];

  const processed = [];
  for (const evt of events) {
    processed.push(...buffer.add(evt));
  }

  expect(processed.map(e => e.sequence_number)).toEqual([0, 1, 2, 3]);
});
```

### Missing #2: MCP-UI Spec Compliance
**Impact:** Results might not match spec; clients break

**Add:**
```typescript
it('should return MCP-UI compliant results', () => {
  const result = executeTool('zoom_in', { current_zoom: 'medium' });

  expect(['success', 'failure', 'partial']).toContain(result.status);
  expect(result).toHaveProperty('result');
  if (result.error) expect(typeof result.error).toBe('string');
  if (result.metadata?.execution_time_ms) {
    expect(typeof result.metadata.execution_time_ms).toBe('number');
  }
});
```

### Missing #3: Protocol Version Handling
**Impact:** Old clients might break with new events

**Add:**
```typescript
it('should detect incompatible event versions', () => {
  const event: EventEnvelope = {
    ...baseEvent,
    schema_version: '3.0.0',
  };

  const validator = new EventValidator('1.0.0');
  expect(() => validator.validate(event)).toThrow(/incompatible|version/i);
});
```

**Effort:** 2-3 hours for all missing tests

---

## Tests to Delete (Low Value)

These tests validate only JS object properties work; not custom code:

| Test | File | Line | Reason |
|---|---|---|---|
| "should include result field" | toolRegistry.test.ts | 214 | Trivial property check |
| "should support optional error" | toolRegistry.test.ts | 227 | Trivial property check |
| "should support optional metadata" | toolRegistry.test.ts | 238 | Trivial property check |
| "should register schema" | schemaMigration.test.ts | 222 | Testing Map.set() |
| "should list all schemas" | schemaMigration.test.ts | 233 | Testing Map.values() |
| "should handle null in type guard" | schemaMigration.test.ts | 197 | Testing JS falsy |
| "should handle undefined in type guard" | schemaMigration.test.ts | 199 | Testing JS falsy |

**Action:** Delete these 7 tests (30 min)

---

## Remediation Timeline

### Phase 1: Critical Fixes (4-6 hours)
1. Fix timestamp flakiness (1-2 hrs)
2. Implement event buffering tests (2-3 hrs)
3. Implement state conflict detection tests (1 hr)

### Phase 2: High-Value Fixes (3-4 hours)
4. Validate tool schemas (1-2 hrs)
5. Validate tool execution results (1-2 hrs)
6. Validate checksums (1 hr)

### Phase 3: Cleanup (1-2 hours)
7. Delete low-value tests (30 min)
8. Fix registry order dependency (1 hr)

### Phase 4: Missing Tests (2-3 hours)
9. Add concurrent event tests (1 hr)
10. Add MCP-UI compliance tests (1 hr)
11. Add version handling tests (1 hr)

**Total: 13-18 hours**

---

## Success Criteria

After remediation, tests should:
- ✅ Pass reliably under load (no flakiness)
- ✅ Catch real bugs (high defect detection)
- ✅ Have <2% false positives
- ✅ Be maintainable (clear assertions)
- ✅ Validate actual behavior, not just structure
- ✅ Test all critical paths
- ✅ Comply with protocol specs

---

## Recommendation

**Do not merge protocol adoption code with current tests.** The test suite provides false confidence and will not catch real bugs in production.

Priority: Fix critical issues first (Issues #1-3), then high-severity (Issues #4-6) before use.

