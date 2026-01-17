/**
 * Timeout Handler for Streaming Operations
 *
 * Implements timeout logic for long-running async operations like streaming
 * with graceful degradation and clear error messages
 */

/**
 * Create a promise that rejects after specified timeout
 * Useful for wrapping fetch/streaming operations
 *
 * @param promise Promise to race against timeout
 * @param timeoutMs Timeout duration in milliseconds
 * @param operation Name of operation (for error message)
 * @returns Promise that rejects with TimeoutError if timeout exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'Operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operation} exceeded ${timeoutMs}ms timeout`));
    }, timeoutMs);

    // Clear timeout if promise settles before timeout
    promise.finally(() => clearTimeout(timeoutId));
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Timeout error class for cleaner error handling
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  isTimeout(): boolean {
    return true;
  }
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Create an abort controller that times out after specified duration
 * Useful for fetch with automatic abortion
 *
 * @param timeoutMs Timeout duration in milliseconds
 * @returns AbortController that will abort after timeout
 */
export function createTimeoutAbortController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Store original abort to clear timeout when manually aborted
  const originalAbort = controller.abort.bind(controller);
  controller.abort = function() {
    clearTimeout(timeoutId);
    return originalAbort();
  };

  return controller;
}

/**
 * Timeout configuration for different operation types
 */
export const TIMEOUT_CONFIG = {
  // Backend API call (non-streaming)
  backendCall: 10000, // 10 seconds

  // Streaming operations
  streaming: 60000, // 60 seconds

  // Individual chunk processing
  chunkProcessing: 5000, // 5 seconds

  // Health check / availability check
  healthCheck: 3000, // 3 seconds
} as const;

/**
 * Get appropriate timeout for operation type
 */
export function getTimeoutForOperation(operation: 'backend' | 'streaming' | 'chunk' | 'health'): number {
  switch (operation) {
    case 'backend':
      return TIMEOUT_CONFIG.backendCall;
    case 'streaming':
      return TIMEOUT_CONFIG.streaming;
    case 'chunk':
      return TIMEOUT_CONFIG.chunkProcessing;
    case 'health':
      return TIMEOUT_CONFIG.healthCheck;
    default:
      return TIMEOUT_CONFIG.backendCall;
  }
}
