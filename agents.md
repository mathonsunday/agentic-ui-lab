# agentic-ui-lab

## Core Principle

**Default to long-term correctness.** This project has no deadline pressure and exists for personal exploration. Always optimize for future extensibility and maintainability over short-term expedience.

When making architectural decisions, ask: "Will this make future features easier or harder?"

## Problem-Solving Approach

### For Technical Problems (Bugs, Visual Issues, Performance)

**CRITICAL RULE: Before implementing or debugging a custom solution, research whether this is a solved problem.**

1. **Research First** (Non-negotiable)
   - Use WebSearch to find if this exact problem exists and has known solutions
   - Look for open-source libraries, patterns, or approaches others have used
   - Check if this is a "solved problem" in the industry
   - **Spend time researching - this prevents wasted implementation effort**

2. **Evaluate Existing Solutions**
   - If a third-party library exists for this problem, **strongly prefer integration over custom code**
   - Library integration is almost always faster and more reliable than custom implementation
   - Custom code should only be written when no suitable library exists
   - **Do NOT attempt custom implementations when solved libraries are available**

3. **For Visual/UX Issues Specifically**
   - You cannot test visual changes yourself (you have no browser/rendering capability)
   - Testing happens in production via the Anthropic API key setup
   - **Commit and push ALL fixes to prod immediately for testing**
   - Clearly communicate what was changed and what the user should test
   - This workflow avoids dev environment hacks and API key issues

4. **If Choosing to Integrate a Library**
   - Test the integration works with your codebase (run tests locally)
   - Verify all existing tests pass
   - Commit and push to prod for user validation (especially for visual/UX changes)

5. **Red Flags - Stop and Reconsider**
   - Making repeated "fixes" that don't solve the problem
   - Spending time on custom implementations when libraries exist
   - Pushing changes without validating they work (especially visual changes)
   - Adding logging/debugging instead of integrating a proper solution

### What NOT To Do

- ❌ Spend hours customizing a component when a library solves the problem better
- ❌ Add logging/debugging as a substitute for proper problem-solving
- ❌ Repeat failed approaches multiple times
- ❌ Ignore user feedback about wasted time (this is a critical signal)

## Critical: Trust Only Code Comments and Tests as Documentation

**BEFORE making ANY claims about current behavior or proposing changes:**

1. **Source of truth: Code comments and tests**
   - Inline code comments in `.ts`, `.tsx`, and `.js` files are authoritative
   - Test files document intended behavior and constraints
   - Test comments explain WHY things work a certain way
   - Code comments explicitly document known issues, compromises, and limitations

2. **Do NOT rely on separate documentation files:**
   - `*_SUMMARY.md`, `*_STATUS.md`, `README.md` files often become stale and misleading
   - Separate docs get out of sync with actual code changes
   - These files can contain conflicting or contradictory information
   - **They are not a substitute for reading the actual code**

3. **How to find real documentation:**
   - Search for inline comments with keywords: ISSUE, TODO, FIXME, NOTE, COMPROMISE, UX ISSUE
   - Read test files for the component/feature (they document intended behavior)
   - Read the actual implementation to see how it really works
   - Look for detailed comments at the top of functions/components

4. **For architectural analysis and refactoring plans:**
   - Identify what would be hardest/most annoying to modify first
   - Map why those parts are hard to change (tight coupling, hidden dependencies, implicit contracts)
   - Your refactoring recommendations should directly address those identified difficulties
   - A good refactoring plan is one that makes the currently-fragile parts robust
   - If your "things we should improve" list doesn't match your "things that are hard to change" list, you haven't understood the actual structure yet

## Dead Code Removal

**Real user entrypoints (code must be reachable from these):**
- Frontend: `src/main.tsx` (Vite entry point, app loads from here)
- Backend: `api/` folder (called from frontend via HTTP requests)

**Safe to delete:**
- Not imported by any file reachable from the above entry points
- No other code depends on it

**Do NOT delay deletion with:**
- `@deprecated` comments as a holding pattern
- "Will remove this later" comments
- Backup copies of functions alongside new implementations
- If code is dead now, delete it now in the same change that replaced it

**When you find potentially dead code:**
- Trace imports to verify it's unreachable from entry points
- If unreachable, delete it
- Do not ask "should we keep this just in case?" - if it's not used, it's gone

5. **When documenting new work:**
   - Write clear inline comments in the code itself
   - Use specific language: "Known issue:", "UX compromise:", "This requires...", "Do not..."
   - Document not just WHAT the code does, but WHY
   - Document known limitations and trade-offs upfront
   - Keep comments concise and useful (not verbose documentation)
   - **For bugs: Document the observable behavior, not the hypothesized root cause.** Say "User must manually scroll to see text" not "This only scrolls when terminalLines changes."

6. **Red flag for bad documentation:**
   - Long separate `.md` files that might be stale
   - Documentation that contradicts what the code actually does
   - Claims of "working smoothly" with no code comments explaining how
   - Multiple conflicting versions of the same information

**This is not about moving fast. It's about accuracy.** Code comments are kept in sync with code changes. Separate documentation files often lie.
