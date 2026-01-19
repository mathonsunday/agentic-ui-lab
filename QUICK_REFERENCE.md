# Quick Reference: Pre-Commit Workflow

## TL;DR

Just commit normally. Hooks run automatically.

```bash
git add .
git commit -m "feat: your feature"
# Hooks run automatically ✓
```

## Common Scenarios

### ✅ Commit Passes

```
✅ Lint-staged passed
✅ Type check passed
✅ Dead code check passed
✅ Tests passed
✅ Commit created!
```

### ❌ ESLint Error

```
❌ Lint-staged check failed

Fix:
$ npm run lint -- --fix
$ git add .
$ git commit -m "feat: your feature"
```

### ❌ Type Error

```
❌ Type check failed

Fix:
$ npm run type-check     # See errors
# Edit files to fix types
$ git add .
$ git commit -m "feat: your feature"
```

### ❌ Dead Code Found

```
⚠️  Dead code detected

Option 1 (Auto-fix):
$ npm run dead-code:fix
$ git add .
$ git commit -m "feat: your feature"

Option 2 (Skip):
$ git commit --no-verify
```

### ❌ Test Failed

```
❌ Tests failed

Fix:
$ npm test               # See which tests fail
# Fix the code/test
$ npm test               # Verify it passes
$ git add .
$ git commit -m "feat: your feature"
```

### ❌ Bad Commit Message

```
❌ Commit message format invalid

Valid format: <type>(<scope>): <subject>
Examples:
  feat(types): add new type
  fix(api): correct error
  chore: update deps

Fix:
$ git commit --amend -m "feat(types): correct message"
```

## Manual Checks

Run anytime without committing:

```bash
npm run type-check       # TypeScript check
npm run lint             # ESLint check
npm run dead-code        # Dead code scan
npm test                 # Run tests
npm run verify           # All of the above
```

## Skip Hooks (Only if Necessary)

```bash
git commit --no-verify   # Skip all checks
```

⚠️ Only use when absolutely necessary. Code will still need to pass CI/CD checks.

## Commit Message Examples

```
feat(types): add discriminated union for tool result
fix(api): correct error handling in streaming
refactor(ui): simplify component state management
chore: update dependencies
docs: add pre-commit hooks documentation
test(services): add tests for error handler
```

## If Hooks Break

```bash
npm run prepare          # Re-initialize husky
chmod +x .husky/*        # Make hooks executable
git commit -m "your message"
```

## Hook Stages (What Runs on Commit)

1. **lint-staged** (5-15s) - ESLint + type-check on staged files
2. **type-check** (10-30s) - Full TypeScript compilation
3. **dead-code** (20-60s) - Knip unused code scan
4. **tests** (30-120s) - Test suite

**Total**: ~1-3 minutes

## Files to Know

- `.husky/pre-commit` - Main pre-commit checks
- `.husky/commit-msg` - Commit message validation
- `commitlint.config.js` - Commit message rules
- `.lintstagedrc.json` - Which files to check
- `HOOKS_AND_AUTOMATION.md` - Detailed guide

## Help Commands

```bash
npm run type-check       # See type errors
npm run lint             # See ESLint issues
npm run dead-code        # See unused exports
npm test                 # See test failures
npm run lint -- --fix    # Auto-fix ESLint
npm run dead-code:fix    # Auto-fix dead code
```

## Still Having Issues?

See: `HOOKS_AND_AUTOMATION.md` (detailed guide)

Or check hook output:

```bash
git commit -v            # Verbose mode
```
