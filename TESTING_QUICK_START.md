# Testing Quick Start Guide

## Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test src/components/__tests__/MinimalInput.test.tsx

# Run tests matching pattern
npm test -- -t "should display"

# Generate coverage report
npm test:coverage

# Open interactive UI dashboard
npm test:ui
```

---

## Test Files Overview

### 1. SSE Stream Parser (14 tests)
**File**: `src/services/__tests__/miraBackendStream.test.ts`
**Tests**: Event parsing, malformed JSON handling, edge cases
**Run**: `npm test -- miraBackendStream`

### 2. Backend Analysis (18 tests)
**File**: `api/__tests__/miraAgent.test.ts`
**Tests**: Response parsing, confidence bounds, profile metrics
**Run**: `npm test -- miraAgent`

### 3. State Management (22 tests)
**File**: `src/shared/__tests__/miraAgentSimulator.test.ts`
**Tests**: State initialization, personality mapping, memory system
**Run**: `npm test -- miraAgentSimulator`

### 4. Input Component (13 tests)
**File**: `src/components/__tests__/MinimalInput.test.tsx`
**Tests**: Form submission, keyboard interaction, state management
**Run**: `npm test -- MinimalInput`

### 5. Terminal Integration (24 tests)
**File**: `src/components/__tests__/TerminalInterface.integration.test.tsx`
**Tests**: Full streaming flow, error handling, state persistence
**Run**: `npm test -- TerminalInterface.integration`

---

## Test Statistics

```
Total Tests:     91
Pass Rate:       100% (91/91)
Execution Time:  ~1 second
Flaky Tests:     0
Coverage:        All critical paths
```

---

## Writing New Tests

### Basic Test Structure
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const component = render(<MyComponent />);

    // Act
    const element = screen.getByText('text');

    // Assert
    expect(element).toBeInTheDocument();
  });
});
```

### Testing Components
```typescript
// Render component
render(<MyComponent prop="value" />);

// Query elements
const element = screen.getByText('label');
const button = screen.getByRole('button', { name: 'Click' });
const input = screen.getByPlaceholderText('Enter text');

// Interact with elements
await userEvent.type(input, 'text');
fireEvent.click(button);

// Assert state
expect(element).toBeInTheDocument();
expect(element).toHaveValue('expected');
expect(element).toBeDisabled();
```

### Testing Async Code
```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('loaded')).toBeInTheDocument();
});

// Wait with custom timeout
await waitFor(() => {
  expect(something).toBe(true);
}, { timeout: 2000 });
```

### Mocking
```typescript
// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'value' }),
  })
);

// Mock function
const mockFn = vi.fn();
mockFn('argument');
expect(mockFn).toHaveBeenCalledWith('argument');
```

---

## Common Assertions

```typescript
// Existence
expect(element).toBeInTheDocument();
expect(element).toBeVisible();

// Content
expect(element).toHaveTextContent('text');
expect(element).toHaveValue('value');
expect(element).toHaveClass('class-name');

// State
expect(element).toBeDisabled();
expect(element).toBeEnabled();
expect(element).toHaveFocus();

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg);
expect(mockFn).toHaveBeenCalledTimes(1);
```

---

## Debugging Tests

### See rendered HTML
```typescript
const { debug } = render(<Component />);
debug(); // Prints DOM to console
```

### Focus on specific test
```typescript
it.only('should test this only', () => {
  // Only this test runs
});
```

### Skip test
```typescript
it.skip('should skip this', () => {
  // This test is skipped
});
```

### See what queries find
```typescript
screen.logTestingPlaygroundURL(); // Shows interactive selector tool
```

---

## Test Categories

### Unit Tests (67 tests)
Test individual functions and components in isolation.

**Examples**:
- SSE line parsing
- State initialization
- Button click handling
- Input value changes

### Integration Tests (24 tests)
Test multiple components working together.

**Examples**:
- User types → form submits → backend called
- Stream events arrive → UI updates
- Error occurs → error message displays

---

## CI/CD Integration

Tests run automatically on:
- **Pull requests**: Must pass to merge
- **Main branch commits**: Verify production readiness
- **Local development**: Watch mode during active coding

---

## Performance Notes

- Tests take ~1 second total
- Individual test files: 2-120ms each
- No flaky tests
- Deterministic (same result every run)

---

## Key Testing Principles Used

1. **User-centric**: Tests verify what users see/do
2. **Isolated**: Each test is independent
3. **Fast**: Full suite runs in ~1 second
4. **Reliable**: No flaky or timing-dependent tests
5. **Clear**: Test names describe what they verify
6. **Maintainable**: Code duplication minimized

---

## Troubleshooting

### Test times out
- Increase timeout: `{ timeout: 5000 }`
- Check for infinite loops
- Verify mocks resolve/reject

### Element not found
- Check rendered HTML with `debug()`
- Use `screen.logTestingPlaygroundURL()`
- Verify selector matches actual element

### State not updating
- Use `await waitFor()` for async updates
- Check mock returns correct data
- Verify state actually changed in component

### Mock not working
- Clear mocks: `vi.clearAllMocks()`
- Check mock called: `expect(mock).toHaveBeenCalled()`
- Verify mock implementation returns expected value

---

## Resources

- **Testing Library Docs**: https://testing-library.com
- **Vitest Docs**: https://vitest.dev
- **React Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

---

**Last Updated**: January 16, 2026
**Status**: 🟢 91 tests passing
