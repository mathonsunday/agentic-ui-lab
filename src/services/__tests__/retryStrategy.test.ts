import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, calculateBackoffDelay, DEFAULT_RETRY_CONFIG } from '../retryStrategy';

describe('Retry Strategy', () => {
  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const config = {
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
        jitterFactor: 0,
      };

      const delay0 = calculateBackoffDelay(0, config);
      const delay1 = calculateBackoffDelay(1, config);
      const delay2 = calculateBackoffDelay(2, config);

      expect(delay0).toBe(100); // 100 * 2^0
      expect(delay1).toBe(200); // 100 * 2^1
      expect(delay2).toBe(400); // 100 * 2^2
    });

    it('should cap delay at maxDelayMs', () => {
      const config = {
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 300,
        jitterFactor: 0,
      };

      const delay2 = calculateBackoffDelay(2, config);
      const delay3 = calculateBackoffDelay(3, config);

      expect(delay2).toBe(300); // Capped at 300
      expect(delay3).toBe(300); // Capped at 300
    });

    it('should add jitter to delays', () => {
      const config = {
        initialDelayMs: 1000,
        backoffMultiplier: 1,
        maxDelayMs: 10000,
        jitterFactor: 0.1,
      };

      const delays = Array.from({ length: 10 }, (_, i) =>
        calculateBackoffDelay(0, config)
      );

      // All delays should be between 1000 and 1100
      const allInRange = delays.every((d) => d >= 1000 && d <= 1100);
      expect(allInRange).toBe(true);

      // Delays should have variation (not all the same)
      const unique = new Set(delays);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt if no error', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failures', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        jitterFactor: 0,
      });

      // Fast-forward through retries
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('HTTP 400: Bad Request'));

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        jitterFactor: 0,
        shouldRetry: (error) => {
          // Don't retry 4xx errors
          return !error.message.includes('HTTP 4');
        },
      });

      try {
        await promise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Should only try once
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const promise = withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 100,
        jitterFactor: 0,
      }).catch((error) => {
        // Properly handle rejection
        return error;
      });

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Failed after 3 attempts');

      // Should try maxRetries + 1 times
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use custom shouldRetry function', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('Connection reset'));

      const shouldRetry = vi.fn((error: Error) => {
        return error.message.includes('timeout');
      });

      const promise = withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 100,
        jitterFactor: 0,
        shouldRetry,
      }).catch((error) => error); // Catch to prevent unhandled rejection

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Connection reset');

      // First error (timeout) should retry
      // Second error (Connection reset) should not retry
      expect(fn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(2);
    });

    it('should use default configuration when not provided', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn);

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('should respect maxRetries: 0', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'));

      const promise = withRetry(fn, { maxRetries: 0 });

      try {
        await promise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
