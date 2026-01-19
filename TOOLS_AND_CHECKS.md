# Code Quality Tools & Checks

This document describes the tools and checks configured to catch unused code, type safety issues, and discriminated union problems that standard analysis tools miss.

## Problem Statement

Our investigation found that static analysis tools like **Knip**, **ts-prune**, and **ts-unused-exports** work at the **symbol level** (files, exports, functions) but cannot detect **property-level** issues such as:

- Unused union type members (e.g., `'hover' | 'ignore'` in a type never assigned)
- Optional fields that should be required for specific variants
- Unused interface properties within types

This document describes how we've layered multiple tools to catch these gaps.

## Tools Configured

### 1. **Type Coverage** (type-coverage)

**Purpose**: Measures what percentage of your code is properly typed (no `any`)

**Configuration**: [typecoveragerc.json](typecoveragerc.json)

**Usage**:

```bash
npm run type:coverage      # Check type coverage with details
npm run type:report        # Generate HTML coverage report
```

**What it catches**:

- Variables without type annotations
- Functions with implicit `any` return types
- Parameters missing type definitions
- Helps identify loosely-typed code that could hide issues

**Output Example**:

```
/Users/.../src/types/events.ts:46: EventType is implicitly any
Coverage: 87.3% (2341 / 2687 identifiers)
```

**Next Steps**: When coverage is low, investigate areas and add explicit types

---

### 2. **ESLint: no-redundant-type-constituents**

**Purpose**: Detects redundant or overlapping union type members

**Configuration**: [eslint.config.js](eslint.config.js) (line 27)

**Usage**:

```bash
npm run lint   # Run all ESLint checks including union validation
```

**What it catches**:

```typescript
// ❌ Redundant (string already covers 'literal')
type Bad = string | "literal";

// ❌ Redundant (never is always unreachable)
type Bad2 = string | never;

// ✓ Correct (no redundancy)
type Good = "response" | "question" | "tool_call";
```

**How it helps with discriminated unions**:

- Warns if you accidentally add `string | 'specific_value'` (wrong pattern)
- Ensures union literal values are distinct
- Prevents overlapping union members

**Output Example**:

```
src/types/events.ts
  46:1  warn  Union type "Type" has a constituent which is a duplicate or can be simplified
        '@typescript-eslint/no-redundant-type-constituents'
```

---

### 3. **Knip** (Dead Code Detection)

**Purpose**: Finds unused exports, files, dependencies, and enum members

**Configuration**: [knip.json](knip.json)

**Usage**:

```bash
npm run dead-code       # Report all unused code
npm run dead-code:fix   # Auto-fix simple cases (remove unused exports)
```

**What it catches**:

- Unused file exports
- Unused dependencies
- Unused exported types and interfaces
- Unused enum members
- Unused class members

**Example output from our codebase**:

```
Unused files (2)
  src/shared/rovAsciiVariants.ts
  src/types/terminal.ts

Unused exports (19)
  ContentLibrary                         api/lib/contentLibrary.ts:64
  DETAILED_SCORING                       api/lib/prompts/sections/scoringRules.ts:12
  CHARACTER                              src/shared/Character.ts:29
  ...
```

**Limitation** (Why we also need other tools):

- Works at symbol level
- Doesn't detect unused union members: `type X = 'a' | 'b' | 'c'` where only 'a' and 'b' are assigned
- Doesn't detect unused optional properties

---

### 4. **ESLint: no-unused-vars**

**Purpose**: Detects unused variables, parameters, and locals

**Configuration**: [eslint.config.js](eslint.config.js) (line 29)

**Usage**:

```bash
npm run lint
```

**What it catches**:

- Local variables never referenced
- Function parameters not used
- Allows `_prefixed` names to be intentionally unused

**Pattern**:

```typescript
// ❌ Unused parameter
function process(data: Data, config: Config): void {
  console.log(data); // config unused
}

// ✓ Correct (prefix with underscore)
function process(data: Data, _config: Config): void {
  console.log(data);
}
```

---

### 5. **Discriminated Union Exhaustiveness** (exhaustive())

**Purpose**: Ensures all union cases are handled in switch/if-else statements

**Utilities**: [src/lib/exhaustiveMatch.ts](src/lib/exhaustiveMatch.ts)

**Usage**:

```typescript
import { exhaustive } from "./lib/exhaustiveMatch";
import type { InteractionMemory } from "../../api/lib/types";

function processMemory(memory: InteractionMemory): void {
  switch (memory.type) {
    case "response":
    case "question":
      console.log(memory.content);
      break;
    case "tool_call":
      console.log(memory.toolData.action);
      break;
    default:
      return exhaustive(memory); // TS error if case missing!
  }
}
```

**What it catches**:

- TypeScript error if you add new union variant but forget handler
- Runtime error if an impossible case somehow reaches exhaustive()
- Compiler-enforced completeness

**Custom Checking Script**:

```bash
# Future: npx ts-node scripts/check-exhaustiveness.ts
# (Script provided for future enhancement)
```

---

## Pre-Commit Hooks

**File**: [.husky/pre-commit](.husky/pre-commit)

Before you commit code, the following checks run automatically:

1. **Type Check** (`npm run type-check`)
   - Compiles TypeScript, catching any type errors
   - Catches unused locals/parameters via `--noUnusedLocals`

2. **Lint** (`npm run lint`)
   - ESLint checks including union validation
   - Catches unused variables
   - Detects redundant type constituents

3. **Dead Code** (`npm run dead-code`)
   - Knip scans for unused exports/files
   - Warns about unused dependencies

4. **Tests** (`npm test`)
   - Runs all unit and integration tests
   - Ensures changes don't break functionality

**To skip pre-commit checks** (not recommended):

```bash
git commit --no-verify
```

---

## Comprehensive Check Command

Run all quality checks at once:

```bash
npm run verify
```

This runs:

1. Type checking
2. Linting (includes union validation)
3. Dead code detection
4. Full test suite

---

## Workflow: Finding & Fixing Issues

### Scenario 1: You Add a New Union Member

```typescript
// Before
type Status = "pending" | "complete";

// After (you added 'error')
type Status = "pending" | "complete" | "error";
```

**What happens:**

1. All switch statements handling `Status` now have incomplete cases
2. `exhaustive()` call at end of switch will show **TS error**
3. ESLint shows warning about unhandled default case
4. Build fails until you add `case 'error':` handler

---

### Scenario 2: You Have Unused Union Values

```typescript
type InteractionMemory =
  | { type: 'response' | 'question' | 'hover' | 'ignore'; ... }

// But code only assigns:
memory.type = 'response' or 'question'
```

**What catches this:**

1. **Manual inspection + Grep**:

   ```bash
   grep -r "'hover'" src/  # No results = unused
   grep -r "'ignore'" src/
   ```

2. **Our discriminated union refactoring**:
   - Convert to proper discriminated union with only 2 variants
   - TypeScript will error if you try to assign unused value

---

### Scenario 3: You Have Optional Field That Should Be Required

```typescript
interface ToolResult {
  status: "success" | "failure";
  error?: string; // Only needed for failure
}
```

**What catches this:**

1. **Code review**: Optional field in interface suggests variant-specific logic
2. **Our solution**: Refactor to discriminated union
   ```typescript
   type ToolResult =
     | { status: "success" }
     | { status: "failure"; error: string }; // Required now
   ```

---

## Configuration Files

### [eslint.config.js](eslint.config.js)

- ESLint rules for type checking and union validation
- Separate configs for src/ and api/ directories
- Ignores test files and coverage directory

### [typecoveragerc.json](typecoveragerc.json)

- Type coverage measurement configuration
- Includes/excludes directories
- Cache settings

### [knip.json](knip.json)

- Dead code detection entry points
- Project file patterns
- Ignore patterns

### [package.json](package.json) - New Scripts

```json
{
  "scripts": {
    "type-check": "tsc -b --noEmit",
    "type:coverage": "type-coverage --detail --strict",
    "type:report": "typescript-coverage-report",
    "dead-code": "knip",
    "dead-code:fix": "knip --fix",
    "verify": "npm run type-check && npm run lint && npm run dead-code && npm test"
  }
}
```

---

## Running Checks

### Before Committing (Automatic)

```bash
git commit -m "message"
# Pre-commit hooks run automatically
```

### Manual Checks

```bash
# Type checking only
npm run type-check

# Linting (includes union validation)
npm run lint

# Dead code detection
npm run dead-code

# Type coverage report
npm run type:coverage
npm run type:report  # opens HTML report

# All checks
npm run verify
```

---

## Key Differences from Standard Tools

| Check                          | Symbol Level       | Property Level        | Runtime              |
| ------------------------------ | ------------------ | --------------------- | -------------------- |
| Knip                           | ✓ (files, exports) | ✗ (union members)     | -                    |
| ESLint no-unused-vars          | ✓ (variables)      | ✗ (object properties) | -                    |
| no-redundant-type-constituents | ✓ (union members)  | -                     | -                    |
| type-coverage                  | ✓                  | ~ (detects any)       | -                    |
| exhaustive()                   | -                  | ✓                     | ✓ (runtime fallback) |
| Discriminated Unions           | ✓                  | ✓                     | ✓ (type safe)        |

**Legend:**

- ✓ = Catches this issue
- ~ = Partial/Indirect coverage
- ✗ = Cannot catch
- `-` = Not applicable

---

## Future Enhancements

### 1. Custom Property-Level Analyzer

Create a script to detect:

- Unused properties in interfaces
- Which properties are actually set vs defined
- Optional fields that are never accessed

### 2. Union Value Analyzer

Script to scan codebase for:

- Which literal values are actually assigned to discriminants
- Recommend narrowing union types

### 3. Framework-Specific Rules

- React-specific union handling
- Next.js specific patterns

### 4. Integration with CI/CD

- Run all checks in GitHub Actions
- Block PRs that fail quality gates

---

## References

- [ESLint no-redundant-type-constituents](https://typescript-eslint.io/rules/no-redundant-type-constituents/)
- [type-coverage](https://github.com/plantain-00/type-coverage)
- [Knip](https://knip.dev)
- [Discriminated Unions Guide](DISCRIMINATED_UNIONS_REFACTOR.md)
- [Exhaustive Pattern Matching Examples](src/lib/discriminatedUnionExamples.ts)

---

## Summary

This layered approach provides comprehensive coverage:

1. **Knip**: Symbol-level dead code (files, exports)
2. **ESLint rules**: Redundant unions and unused variables
3. **Type coverage**: % of properly typed code
4. **Discriminated unions**: Type-safe variant handling
5. **exhaustive()**: Compiler-enforced completeness
6. **Pre-commit hooks**: Everything runs before code is committed

Together, these catch issues that no single tool can detect alone.
