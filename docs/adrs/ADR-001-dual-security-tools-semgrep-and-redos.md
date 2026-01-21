# ADR-001: Use both Semgrep and eslint-plugin-redos for security scanning

Date: 2026-01-20
Status: Active

## Context

Needed security scanning for personal project. Evaluated multiple static analysis tools to catch vulnerabilities in AI-generated code. Semgrep appeared comprehensive but missed a Regular Expression Denial of Service (ReDoS) vulnerability that SonarJS detected.

## Decision

Use layered security approach with both Semgrep and eslint-plugin-redos for complementary coverage.

## Rationale

- Semgrep provides broad security coverage (1031 rules from p/default ruleset)
- Semgrep missed ReDoS vulnerability that could cause performance issues
- SonarJS detected the ReDoS but is heavyweight with low signal-to-noise ratio for personal projects
- eslint-plugin-redos fills specific gap without SonarJS overhead
- Layered security better than single-tool blind spots

## Consequences

- Two security tools instead of one (slightly more configuration)
- Better ReDoS vulnerability coverage
- Avoid noise from heavyweight enterprise tools
- May revisit stack as security knowledge grows
- Pre-commit hooks run both tools (blocking)

## Alternatives Considered

- SonarJS alone: Too heavyweight and noisy for personal project scale
- Semgrep alone: Missed critical ReDoS vulnerabilities
- No security scanning: Unacceptable for peace of mind with AI-generated code

---

Superseded by: (none)
