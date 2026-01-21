# Architecture Decision Records (ADRs)

This directory contains records of architectural decisions made in this project.

## Why ADRs?

**Problem:** AI agents make decisions during rapid iteration. After compaction/time, the reasoning is lost. Commit messages are often incomplete or misleading.

**Solution:** Lightweight, structured records of **why** decisions were made, not just what changed.

## Format

See [TEMPLATE.md](./TEMPLATE.md) for the standard format.

**Key principles:**

- Ultra-concise (bullets over paragraphs)
- Capture context, decision, rationale, consequences, alternatives
- No fluff - just the essential "why"
- Timestamped and numbered
- Track when decisions are superseded

## Creating ADRs

### Manual

1. Copy `TEMPLATE.md`
2. Rename to `ADR-{next-number}-{slug}.md`
3. Fill out the sections
4. Commit with the code changes

### With AI agent (Claude Code skill)

A global `/adr` skill is installed at `~/.claude/skills/adr/SKILL.md`.

Simply type in your Claude Code session:

```
/adr record decision to [brief description]
```

Or just ask in plain language:

- "Create an ADR for the decision to use Jotai"
- "Document the decision to focus on entire test files"

The agent will:

- Extract context from the conversation
- Auto-number the ADR (finds highest number + 1)
- Generate the file at `docs/adrs/ADR-XXX-slug.md`
- Show you the content for confirmation

**Note:** You may need to restart Claude Code after installing the skill for it to be recognized.

### Via script

```bash
npm run adr:create -- \
  --title "Use Jotai for state management" \
  --context "Needed global state for user preferences" \
  --decision "Use Jotai for atomic state management" \
  --rationale "Minimal boilerplate" \
  --rationale "React 19 compatible" \
  --consequences "Less mature ecosystem than Redux" \
  --alternatives "Redux: Too much boilerplate for small app"
```

## When to create an ADR

Create an ADR for:

- Architectural decisions (state management, API design, data flow)
- Technology choices (libraries, frameworks, tools)
- Significant removals or refactors
- Trade-offs between approaches
- Rejected alternatives

Don't create ADRs for:

- Trivial bug fixes
- Formatting/style changes
- Obvious improvements with no alternatives

## Status Values

- **Active**: Current decision in use
- **Superseded**: Replaced by newer ADR (link to it)
- **Deprecated**: No longer relevant but kept for history

## Index

- [ADR-001: Use both Semgrep and eslint-plugin-redos for security scanning](./ADR-001-dual-security-tools-semgrep-and-redos.md) - Active
