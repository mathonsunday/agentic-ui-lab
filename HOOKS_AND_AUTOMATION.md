# Git Hooks & Automation Guide

This document explains how pre-commit hooks and commit message validation are configured to enforce code quality automatically.

## Overview

When you run `git commit`, the following happens automatically (you don't need to run commands manually):

```
git commit -m "feat: add new feature"
    ↓
.husky/pre-commit hook runs
    ├─ Stage 1: lint-staged (ESLint + type-check on staged files)
    ├─ Stage 2: Full TypeScript type check
    ├─ Stage 3: Dead code detection (knip)
    └─ Stage 4: Test suite
    ↓
.husky/commit-msg hook runs
    ├─ Validates commit message format
    └─ (conventional commits)
    ↓
✓ Commit created or ✗ Commit rejected with helpful error messages
```

## What Happens on Each Commit

### Pre-Commit Hook: `.husky/pre-commit`

Runs 4 stages of checks:

#### Stage 1: lint-staged (Fast)

- Only runs ESLint + TypeScript on files you're staging
- Auto-fixes common ESLint issues
- Checks types for staged files only
- **Time**: ~5-15 seconds

**What catches:**

- Union type issues (no-redundant-type-constituents)
- Unused variables
- Style violations

#### Stage 2: Full Type Check (Medium)

- TypeScript compilation of entire project
- Catches type errors you might have missed
- **Time**: ~10-30 seconds

**What catches:**

- Type mismatches
- Missing properties
- Incorrect function signatures
- Unused locals/parameters

#### Stage 3: Dead Code Check (Slow - Optional)

- Knip scans for unused exports
- Can fail but provides helpful suggestions
- **Time**: ~20-60 seconds

**What catches:**

- Unused exports
- Unused files
- Unused dependencies
- Suggests auto-fix with: `npm run dead-code:fix`

**Note**: Can skip with `git commit --no-verify` (not recommended)

#### Stage 4: Test Suite (Slow)

- Runs all tests
- Must pass to complete commit
- **Time**: ~30-60 seconds

**What catches:**

- Broken functionality
- Regressions

### Commit-Msg Hook: `.husky/commit-msg`

Validates commit message format:

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

**Format Requirements:**

- Type required (feat, fix, refactor, etc.)
- Subject max 72 characters
- Lowercase letters only
- No period at end
- Blank line before body/footer

**Valid Examples:**

```
feat(types): add discriminated union for tool result
fix(api): correct error handling in streaming
refactor(ui): simplify component state
chore: update dependencies
```

**Invalid Examples:**

```
Added new feature              ❌ No type/scope
feat: Add new feature          ❌ Capitalized
feat(types): add new feature. ❌ Period at end
feat(types): add new feature that does something really important and takes a very long time to write out
                                ❌ Subject too long (>72 chars)
```

## Error Handling & Fixes

### ESLint/Type Errors

If lint-staged fails:

```
❌ Lint-staged check failed
Fix issues and try again:
  npm run lint -- --fix        # Auto-fix ESLint issues
  npm run type-check           # Check TypeScript
```

**Common fixes:**

```bash
# Auto-fix ESLint issues
npm run lint -- --fix

# Check types without fixing (just information)
npm run type-check

# Re-stage fixed files
git add .

# Try commit again
git commit -m "your message"
```

### Type Check Errors

If full type check fails:

```
❌ Type check failed
Fix type errors and try again:
  npm run type-check           # See all type errors
```

**Common solutions:**

```typescript
// ❌ Property doesn't exist on this variant
if (result.status === "success") {
  console.log(result.error); // Error - no error on success variant
}

// ✓ Correct
if (result.status === "failure" || result.status === "partial") {
  console.log(result.error); // OK - error only on these variants
}
```

### Dead Code Detection

If knip finds unused code:

```
⚠️  Dead code detected
Review unused code:
  npm run dead-code            # See all unused exports
  npm run dead-code:fix        # Auto-fix simple cases
```

**Options:**

```bash
# Option 1: Auto-fix and re-stage
npm run dead-code:fix
git add .
git commit -m "your message"

# Option 2: Skip this check (not recommended)
git commit --no-verify

# Option 3: Delete unused code manually
# Remove the unused exports, then commit
```

### Test Failures

If tests fail:

```
❌ Tests failed
Fix failing tests:
  npm test                     # Run all tests
  npm run test:ui              # Run tests with UI
```

**To fix and retry:**

```bash
# Fix the failing test/code
npm test    # Verify it passes

# Stage changes
git add .

# Try commit again
git commit -m "your message"
```

### Commit Message Format

If commit message is invalid:

```
ℹ️  commitlint errors:

1: type-empty - type is empty
2: subject-empty - subject is empty
```

**Fix:**

```bash
# Amend commit with correct message
git commit --amend -m "feat(types): your message"
```

## Configuration Files

### `.husky/pre-commit`

Main pre-commit checks script. Runs 4 stages with helpful error messages.

### `.husky/commit-msg`

Validates commit message format via commitlint.

### `commitlint.config.js`

Commit message rules and allowed types.

### `.lintstagedrc.json`

What files to check and which tools to run.

Configuration:

```json
{
  "*.{ts,tsx}": [
    "eslint --fix", // ESLint with auto-fix
    "npm run type-check --" // TypeScript check
  ],
  "*.{json,md}": [
    "prettier --write" // Format JSON/Markdown
  ]
}
```

## Workflow Examples

### Scenario 1: Perfect Commit

```bash
$ git add src/lib/new-feature.ts
$ git commit -m "feat(lib): add new utility function"

📝 Running lint-staged (ESLint + type-check on staged files)...
✅ Lint-staged passed

🔬 Full TypeScript type check...
✅ Type check passed

💀 Scanning for unused exports (knip)...
✅ Dead code check passed

🧪 Running tests (critical path)...
✅ Tests passed

✅ All pre-commit checks passed!
```

### Scenario 2: Type Error Found

```bash
$ git add src/types/events.ts
$ git commit -m "fix(types): correct event structure"

📝 Running lint-staged...
✅ Lint-staged passed

🔬 Full TypeScript type check...
❌ Type check failed

# Error: Property 'error' does not exist on type 'success'

$ npm run type-check
# Shows the type error details

# Fix the issue
$ cat src/types/events.ts
# Edit to fix the error

$ git add src/types/events.ts
$ git commit -m "fix(types): correct event structure"
✅ All pre-commit checks passed!
```

### Scenario 3: Dead Code Detection

```bash
$ git add .
$ git commit -m "chore: cleanup"

✅ Lint-staged passed
✅ Type check passed

💀 Scanning for unused exports (knip)...
⚠️  Dead code detected

Unused exports (2):
  getUnusedFunction        src/utils.ts:45
  UNUSED_CONSTANT          src/constants.ts:12

# Option A: Auto-fix
$ npm run dead-code:fix
$ git add .
$ git commit -m "chore: cleanup"
✅ Commit created

# Option B: Skip and commit anyway
$ git commit --no-verify
```

### Scenario 4: Invalid Commit Message

```bash
$ git commit -m "Updated stuff"
# ↓ commitlint rejects

1: type-empty - type is empty
2: subject-case - subject must not contain uppercase letters

# Fix with amend
$ git commit --amend -m "fix: update feature"
✅ Commit message valid, continuing checks...
```

## Performance Tips

### Make Commits Faster

1. **Stage fewer files at once**
   - Smaller staged changes = faster checks
   - `npm run lint -- --fix` only runs on staged files

2. **Skip optional checks (use sparingly)**

   ```bash
   git commit --no-verify    # Skip ALL hooks (not recommended)
   ```

3. **Use test filters for large test suites**
   - Modify `.husky/pre-commit` to run tests matching pattern:
   ```bash
   npm test -- --testPathPattern="path/to/tests"
   ```

### Check Times

Typical commit check times:

- **lint-staged**: 5-15 seconds (staged files only)
- **type-check**: 10-30 seconds (full project)
- **dead-code**: 20-60 seconds (full project scan)
- **tests**: 30-120 seconds (depends on test count)

**Total**: ~1-3 minutes for full check

## Disabling Hooks (Temporarily)

### Skip All Hooks (Emergency Only)

```bash
git commit --no-verify
```

⚠️ **Warning**: Skips all quality gates. Code might be broken or have style issues.

### Modify a Specific Hook

Edit `.husky/pre-commit` to comment out stages:

```bash
# Temporarily disable knip check
# npm run dead-code || FAILED=1
```

⚠️ **Remember to re-enable afterward**

## Re-Enabling After Skip

If you skipped checks:

```bash
# Run all checks manually
npm run verify

# If all pass, you're good
# If failures, fix them then commit normally
```

## Bypassing Individual Stages

You can selectively run checks:

```bash
# Just lint-staged
npx lint-staged

# Just type check
npm run type-check

# Just dead code
npm run dead-code

# Just tests
npm test

# All checks (recommended)
npm run verify
```

## GitHub Actions Integration (Future)

These same checks can run in CI/CD:

```yaml
# .github/workflows/quality.yml
- name: Run quality checks
  run: npm run verify
```

This ensures:

- PRs must pass all checks
- Commits can't be merged without passing
- Catches issues before code review

## Troubleshooting

### "husky not found"

```bash
npm run prepare    # Re-initialize husky
```

### Hooks not running

```bash
chmod +x .husky/pre-commit       # Make executable
chmod +x .husky/commit-msg       # Make executable
npx husky install                # Reinstall
```

### "lint-staged" error

```bash
npx lint-staged --help           # See options
npx lint-staged --debug          # Debug mode
```

### Pre-commit hook failing but I want to commit

```bash
# Option 1: Fix the issue
npm run lint -- --fix
npm run type-check
git add .
git commit -m "message"

# Option 2: Use --no-verify (only if absolutely necessary)
git commit --no-verify
```

## Best Practices

1. **Always fix issues before skipping**
   - Skipping defeats the purpose of automation
   - Other developers will catch the issue in review

2. **Stage files logically**
   - Don't mix unrelated changes
   - Easier to fix issues when they're focused

3. **Review hook errors carefully**
   - They're telling you something is wrong
   - Understand the issue, don't just skip

4. **Use --amend for quick fixes**
   - ```bash
     # Small error? Just amend
     git commit --amend
     # Then commit again
     ```

5. **Commit frequently**
   - Smaller commits = easier fixes
   - Easier to undo if something goes wrong

## Summary

The automated hooks provide a **safety net** that:

- Prevents committing broken code
- Enforces consistent style
- Ensures type safety
- Catches dead code
- Validates commit messages

**You still have control**, but with guardrails preventing obvious mistakes.

For complex issues, use: `git commit --no-verify` (sparingly) or fix the code manually.

For questions about specific errors, check the error message—it usually tells you exactly how to fix it.
