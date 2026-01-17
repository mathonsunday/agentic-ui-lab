/**
 * Retry Strategy for Backend Calls
 *
 * Implements exponential backoff with jitter for resilient API communication
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx server errors, not 4xx client errors
    if (error.message.includes('Failed to fetch')) return true;
    if (error.message.includes('timeout')) return true;
    if (error.message.includes('HTTP 5')) return true;
    return false;
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 * Prevents thundering herd problem when multiple clients retry simultaneously
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: initialDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter: random variance up to jitterFactor * delay
  const jitter = cappedDelay * config.jitterFactor * Math.random();

  return cappedDelay + jitter;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn Function to retry
 * @param config Retry configuration
 * @returns Promise that resolves with function result or rejects on final failure
 *
 * @example
 * const result = await withRetry(
 *   () => callMiraBackend(input, state, assessment, duration),
 *   { maxRetries: 3, initialDelayMs: 500 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Don't retry on final attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if we should retry based on error type
      if (finalConfig.shouldRetry && !finalConfig.shouldRetry(err, attempt)) {
        throw err;
      }

      // Calculate delay and wait before retrying
      const delayMs = calculateBackoffDelay(attempt, finalConfig);
      console.warn(
        `Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${Math.round(delayMs)}ms...`
      );
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  const errorMessage = lastError
    ? `Failed after ${finalConfig.maxRetries + 1} attempts: ${lastError.message}`
    : 'Operation failed after retries';

  throw new Error(errorMessage);
}

/**
 * Promise-based sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
