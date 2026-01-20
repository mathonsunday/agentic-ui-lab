# Dead Code Toolkit Integration

This document describes how the Dead Code Toolkit is integrated into agentic-ui-lab as an MCP-compatible tool for LLM use.

## Overview

The Dead Code Toolkit provides two LLM-callable tools through the existing MCP-compatible tool registry:

1. **`dead_code_analysis`** - Analyze a project for dead code, unused exports, type errors
2. **`setup_dead_code_toolkit`** - Initialize dead code detection in a new project

## Tool Schemas

### dead_code_analysis

**Purpose**: Analyze any TypeScript/JavaScript project for dead code and quality issues

**Input**:

```json
{
  "project_path": "/absolute/path/to/project",
  "checks": ["knip", "typescript"], // optional, default: ["knip", "typescript"]
  "format": "summary" // optional: "summary", "detailed", "json"
}
```

**Output**:

```json
{
  "status": "partial",
  "total_issues": 23,
  "by_category": {
    "unused-export": 12,
    "type-error": 5,
    "unused-file": 3,
    "unused-var": 3
  },
  "summary": "Found 23 issues: 12 unused exports (fixable)...",
  "top_issues": [
    {
      "count": 12,
      "type": "unused-export",
      "severity": "warning",
      "fixable": 10
    }
  ],
  "recommendations": [
    "Run npm run dead-code:fix to automatically fix 15 issues",
    "Review and remove 12 unused exports from your codebase",
    "Consider deleting 3 unused files (manual review recommended)"
  ],
  "execution_time_ms": 12450
}
```

### setup_dead_code_toolkit

**Purpose**: Initialize dead code detection in a project (auto-generates configs, installs dependencies, sets up hooks)

**Input**:

```json
{
  "project_path": "/absolute/path/to/project",
  "setup_hooks": true, // optional, install pre-commit hooks
  "install_dependencies": true // optional, install npm packages
}
```

**Output**:

```json
{
  "status": "success",
  "files_created": [
    "knip.json",
    "typecoveragerc.json",
    ".lintstagedrc.json",
    ".husky/pre-commit"
  ],
  "scripts_added": ["dead-code", "dead-code:fix", "verify"],
  "dependencies_installed": ["knip", "husky", "lint-staged", "@commitlint/cli"],
  "next_steps": [
    "Run: npm run dead-code to check for dead code",
    "Review findings and consider running: npm run dead-code:fix",
    "Use: npm run verify to run all quality checks"
  ]
}
```

## LLM Usage Patterns

### Pattern 1: Analyze Existing Project

User asks: "Help me clean up dead code in the @narrative-os/ project"

LLM workflow:

```
1. Call tool: dead_code_analysis
   - project_path: "/Users/veronica.ray/src/github.com/mathonsunday/narrative-os"
   - format: "summary"

2. Receive results with top issues and recommendations

3. Present to user:
   "Found 23 issues in @narrative-os/:
    - 12 unused exports (can auto-fix)
    - 3 unused files (manual review needed)
    - 5 type errors (need attention)

   Would you like me to:
   a) Setup automatic dead code detection?
   b) Show detailed findings?
   c) Help fix the issues?"

4. If user approves, either:
   a) Call setup_dead_code_toolkit to initialize
   b) Call dead_code_analysis again with format="detailed"
```

### Pattern 2: Setup New Project

User: "I have a new TypeScript project. Set up code quality checks."

LLM workflow:

```
1. Call tool: setup_dead_code_toolkit
   - project_path: <user's project>
   - setup_hooks: true
   - install_dependencies: true

2. Receive setup status and next steps

3. Report to user:
   "✅ Setup complete in your project!

    Files created:
    • knip.json - dead code detection config
    • typecoveragerc.json - type safety metrics
    • .husky/pre-commit - quality gate hooks

    Scripts added:
    • npm run dead-code - detect dead code
    • npm run verify - run all checks

    Next steps:
    1. Run: npm run dead-code
    2. Review any findings
    3. Commit changes: git add . && git commit

    Pre-commit hooks now enforce quality on every commit!"
```

### Pattern 3: Analyze with Different Checks

```json
Tool: dead_code_analysis
Input:
{
  "project_path": "/path/to/project",
  "checks": ["knip"],  // Only symbol-level analysis
  "format": "json"     // Full JSON output for processing
}
```

## Implementation Details

### File Structure

```
api/lib/
├── toolSchemas.ts                    # Schema definitions (updated)
├── toolRegistry.ts                   # Tool registry (updated)
└── tools/
    └── deadCodeTool.ts              # Tool implementations (new)
```

### Tool Integration Points

1. **Tool Schemas** (`toolSchemas.ts`):
   - `deadCodeAnalysisSchema` - Input/output definitions
   - `setupDeadCodeToolkitSchema` - Setup input/output definitions
   - Added to `ALL_TOOL_SCHEMAS` registry

2. **Tool Registry** (`toolRegistry.ts`):
   - Imports dead code tool implementations
   - Routes tool calls to handlers
   - `executeTool()` now async for dead code tools

3. **Tool Handlers** (`tools/deadCodeTool.ts`):
   - `executeDeadCodeAnalysis()` - Analysis implementation
   - `executeSetupDeadCodeToolkit()` - Setup implementation
   - Dynamic import of `@mathonsunday/dead-code-toolkit`

### Error Handling

Both tools gracefully handle:

- Missing toolkit: Returns error suggesting installation
- Invalid project path: Returns validation error
- Analysis failures: Returns error with details
- Partial success: Returns partial status with warnings

### Dependencies

The tools use **optional dynamic imports**:

- If `@mathonsunday/dead-code-toolkit` not installed, tools return helpful error
- No hard dependency on the package
- Can be installed on-demand: `npm install @mathonsunday/dead-code-toolkit`

## Configuration

### Recommended Setup

For targeting @narrative-os/:

```bash
# 1. Install toolkit
npm install @mathonsunday/dead-code-toolkit

# 2. Setup in project
npx dead-code-toolkit setup --path /path/to/narrative-os

# 3. Run initial analysis
npm run dead-code

# 4. Enable pre-commit checks
git add .
git commit -m "chore: setup dead code detection"
```

### Tool Discovery

Tools are automatically discovered and made available via:

```typescript
// In analyze-user-stream.ts or other endpoints
const allTools = toolRegistry.list();
// Returns array including dead_code_analysis and setup_dead_code_toolkit

// Tool metadata available via
const schema = toolRegistry.getSchema("dead_code_analysis");
// Returns schema with input/output definitions
```

## Testing the Integration

### Test 1: Verify Tool Registration

```typescript
import { toolRegistry } from "./api/lib/toolRegistry";

const tools = toolRegistry.list();
console.log(tools.map((t) => t.name));
// Should include: zoom_in, zoom_out, dead_code_analysis, setup_dead_code_toolkit
```

### Test 2: Call Dead Code Analysis

```typescript
import { toolRegistry } from "./api/lib/toolRegistry";

const result = await toolRegistry.execute("dead_code_analysis", {
  project_path: "/Users/veronica.ray/src/github.com/mathonsunday/narrative-os",
  format: "summary",
});

console.log(result);
// Should return analysis results
```

### Test 3: Call Setup

```typescript
const setupResult = await toolRegistry.execute("setup_dead_code_toolkit", {
  project_path: "/Users/veronica.ray/src/github.com/mathonsunday/narrative-os",
  setup_hooks: true,
  install_dependencies: true,
});

console.log(setupResult);
// Should return setup status
```

## Next Steps

1. **Install Package**: `npm install @mathonsunday/dead-code-toolkit`
2. **Build & Test**: Ensure TypeScript compilation succeeds
3. **Run on narrative-os**: Use tools to analyze and setup the project
4. **Commit Changes**: Add to version control

## Notes

- Tools follow MCP-UI compatibility patterns
- Results are LLM-friendly JSON format
- Setup is non-destructive (safe to re-run)
- Pre-commit hooks prevent future dead code
- Full toolkit documentation: [README.md](../packages/dead-code-toolkit/README.md)

## Troubleshooting

**Issue**: "Toolkit not installed" error

- **Solution**: `npm install @mathonsunday/dead-code-toolkit`

**Issue**: "Invalid project path"

- **Solution**: Ensure path is absolute and project exists

**Issue**: Tools not appearing in registry

- **Solution**: Rebuild TypeScript, ensure toolSchemas.ts is updated

**Issue**: Analysis takes a long time

- **Solution**: This is normal for large projects (100k+ LOC). Use `checks: ['knip']` for faster analysis.
