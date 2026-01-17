import React from 'react';
import type { ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in child component tree,
 * logs those errors, and displays fallback UI instead of crashing
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.handleReset) ?? (
          <ErrorFallback error={this.state.error} onReset={this.handleReset} />
        )
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

/**
 * Default error fallback UI
 * Displays error message with recovery action
 */
function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div className="error-boundary-fallback">
      <div className="error-boundary-fallback__container">
        <h2 className="error-boundary-fallback__title">Something Went Wrong</h2>

        <div className="error-boundary-fallback__message">
          <p>An unexpected error occurred in the research terminal.</p>
          <details className="error-boundary-fallback__details">
            <summary>Error Details</summary>
            <pre className="error-boundary-fallback__error">{error.message}</pre>
          </details>
        </div>

        <div className="error-boundary-fallback__actions">
          <button className="error-boundary-fallback__reset-button" onClick={onReset}>
            Reconnect to Terminal
          </button>
        </div>

        <div className="error-boundary-fallback__info">
          <p>The terminal will attempt to reconnect. If the problem persists, please refresh the page.</p>
        </div>
      </div>
    </div>
  );
}
