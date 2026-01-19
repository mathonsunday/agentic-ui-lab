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
- ❌ Make visual/rendering changes and push them without user validation
- ❌ Add logging/debugging as a substitute for proper problem-solving
- ❌ Repeat failed approaches multiple times
- ❌ Ignore user feedback about wasted time (this is a critical signal)

## Critical: Read Existing Documentation First

**BEFORE making ANY claims about current behavior or proposing changes:**

1. **Search for existing documentation** on the feature/component:
   - Look for `*_SUMMARY.md`, `*_STATUS.md`, `README.md` files
   - Check for `.claude/plans/` directory for previous work
   - Look for test files that document intended behavior
   - Example: `UX_INVARIANTS_TESTING_SUMMARY.md` documents the exact current state and requirements

2. **Read the test files** that relate to your task:
   - Tests document the intended behavior and constraints
   - Test comments explain WHY things work a certain way
   - They show what's been tried before and what worked/didn't work
   - Example: `TypewriterLine.test.tsx` explicitly documents the animation compromise

3. **Do NOT make assumptions about current behavior:**
   - Never claim something "works smoothly" without reading existing docs
   - Never claim something is a "solved problem" without checking what's already been solved
   - Never propose "fixing" something without understanding why the current implementation exists
   - Always assume previous work was well-reasoned and documented

4. **When you find documentation:**
   - Read it completely before speaking
   - Reference it when discussing current state
   - Build on top of it, don't ignore it
   - If proposing changes, explain how you're changing from the documented current state

**This is not about being slow. It's about respecting the work that's already been done.** Ignoring documentation wastes time and shows you didn't care enough to understand the project first.

## Reference

- Full architectural decision history: `.claude/plans/snug-tumbling-candle.md`
