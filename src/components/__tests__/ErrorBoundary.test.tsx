import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First</div>
          <div>Second</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should catch and display errors in children', () => {
      function BrokenComponent() {
        throw new Error('Test error');
      }

      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred in the research terminal.')).toBeInTheDocument();
    });

    it('should display error details when expanded', () => {
      function BrokenComponent() {
        throw new Error('Specific test error message');
      }

      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('Error Details').closest('details');
      expect(detailsElement).toBeInTheDocument();

      // Click to expand details
      (detailsElement as HTMLDetailsElement).open = true;
      expect(screen.getByText('Specific test error message')).toBeInTheDocument();
    });

    it('should have reset button to recover', async () => {
      function BrokenComponent() {
        throw new Error('Test error');
      }

      const { rerender } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();

      // Get reset button
      const resetButton = screen.getByText('Reconnect to Terminal');
      expect(resetButton).toBeInTheDocument();

      // Click reset button
      resetButton.click();

      // Re-render with fixed component
      rerender(
        <ErrorBoundary>
          <div>Recovered content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Recovered content')).toBeInTheDocument();
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument();
    });
  });

  describe('Custom fallback', () => {
    it('should render custom fallback when provided', () => {
      function BrokenComponent() {
        throw new Error('Test error');
      }

      const customFallback = (error: Error, reset: () => void) => (
        <div>
          <h1>Custom Error: {error.message}</h1>
          <button onClick={reset}>Custom Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <BrokenComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
      expect(screen.getByText('Custom Reset')).toBeInTheDocument();
    });

    it('should use default fallback when custom fallback not provided', () => {
      function BrokenComponent() {
        throw new Error('Test error');
      }

      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      expect(screen.getByText('Reconnect to Terminal')).toBeInTheDocument();
    });
  });

  describe('Error callback', () => {
    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      function BrokenComponent() {
        throw new Error('Test error');
      }

      render(
        <ErrorBoundary onError={onError}>
          <BrokenComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      const [error, errorInfo] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(errorInfo).toHaveProperty('componentStack');
    });

    it('should not call onError when no error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>No error here</div>
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Multiple error boundaries', () => {
    it('should isolate errors within nested boundaries', () => {
      function BrokenComponent1() {
        throw new Error('First error');
      }

      function BrokenComponent2() {
        throw new Error('Second error');
      }

      render(
        <div>
          <ErrorBoundary>
            <BrokenComponent1 />
          </ErrorBoundary>
          <ErrorBoundary>
            <BrokenComponent2 />
          </ErrorBoundary>
        </div>
      );

      // Both error boundaries should show error messages
      const errorMessages = screen.getAllByText('Something Went Wrong');
      expect(errorMessages).toHaveLength(2);
    });
  });
});
