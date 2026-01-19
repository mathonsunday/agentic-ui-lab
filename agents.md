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
   - Making visual changes without user validation is guaranteed to fail
   - **Always ask the user to validate visual fixes before committing them**
   - If a fix requires visual validation, communicate this clearly and wait for feedback

4. **If Choosing to Integrate a Library**
   - Before pushing to production, test the integration works with your codebase
   - Verify all existing tests pass
   - If you cannot fully test integration (e.g., visual components), ask user for validation

5. **Red Flags - Stop and Reconsider**
   - Making repeated "fixes" that don't solve the problem
   - Spending time on custom implementations when libraries exist
   - Pushing changes without validating they work (especially visual changes)
   - Adding logging/debugging instead of integrating a proper solution

### What NOT To Do

- ❌ Spend hours customizing a component when a library solves the problem better
- ❌ Make visual/rendering changes and push them without user validation
- ❌ Add logging/debugging as a substitute for proper problem-solving
- ❌ Repeat failed approaches multiple times
- ❌ Ignore user feedback about wasted time (this is a critical signal)

## Reference

- Full architectural decision history: `.claude/plans/snug-tumbling-candle.md`
