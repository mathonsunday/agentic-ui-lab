/**
 * Commit message linting configuration
 *
 * Enforces conventional commits format to ensure meaningful commit history
 * and enable automated changelog generation.
 *
 * Format: <type>(<scope>): <subject>
 *
 * Types:
 *   - feat: A new feature
 *   - fix: A bug fix
 *   - refactor: Code refactoring
 *   - perf: Performance improvement
 *   - test: Adding/updating tests
 *   - docs: Documentation changes
 *   - chore: Tooling/dependencies
 *   - style: Code style (no logic change)
 *   - ci: CI/CD configuration
 *
 * Scopes (optional):
 *   - types: Type definitions
 *   - api: Backend API
 *   - ui: Frontend components
 *   - tools: Tools and checks
 *   - etc.
 *
 * Examples:
 *   feat(types): add discriminated union for InteractionMemory
 *   fix(api): correct error handling in tool result
 *   refactor(ui): simplify component state management
 *   chore: update dependencies
 */

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'test',
        'docs',
        'chore',
        'style',
        'ci',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lowercase'],
    'type-empty': [2, 'never'],
    'scope-empty': [0],
    'scope-case': [2, 'always', 'lowercase'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', 'start-case', 'pascal-case', 'upper-case'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
