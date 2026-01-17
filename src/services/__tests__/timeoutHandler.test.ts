import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withTimeout,
  TimeoutError,
  isTimeoutError,
  createTimeoutAbortController,
} from '../timeoutHandler';

describe('Timeout Handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withTimeout', () => {
    it('should resolve successfully if promise settles before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 5000, 'Test operation');

      expect(result).toBe('success');
    });

    it('should reject with TimeoutError if promise exceeds timeout', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 10000);
      });

      const timeoutPromise = withTimeout(promise, 1000, 'Test operation');

      // Advance time to trigger timeout
      vi.advanceTimersByTime(1100);

      try {
        await timeoutPromise;
        expect.fail('Should have thrown TimeoutError');
      } catch (error) {
        expect(isTimeoutError(error)).toBe(true);
        expect((error as Error).message).toContain('Test operation');
        expect((error as Error).message).toContain('1000ms');
      }
    });

    it('should clear timeout if promise resolves first', async () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout');

      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 500);
      });

      vi.advanceTimersByTime(500);
      const result = await withTimeout(promise, 5000, 'Test');

      expect(result).toBe('success');
      expect(clearSpy).toHaveBeenCalled();

      clearSpy.mockRestore();
    });

    it('should reject with custom operation name in error message', async () => {
      const promise = new Promise(() => {
        // Never resolves
      });

      const timeoutPromise = withTimeout(promise, 1000, 'Custom Operation Name');

      vi.advanceTimersByTime(1100);

      try {
        await timeoutPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Custom Operation Name');
      }
    });
  });

  describe('TimeoutError', () => {
    it('should be instanceof TimeoutError', () => {
      const error = new TimeoutError('Test message');

      expect(error).toBeInstanceOf(TimeoutError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TimeoutError');
    });

    it('should have isTimeout method', () => {
      const error = new TimeoutError('Test');

      expect(error.isTimeout()).toBe(true);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError instances', () => {
      const error = new TimeoutError('Test');

      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isTimeoutError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
      expect(isTimeoutError('string')).toBe(false);
      expect(isTimeoutError({})).toBe(false);
    });
  });

  describe('createTimeoutAbortController', () => {
    it('should abort after timeout', () => {
      const controller = createTimeoutAbortController(1000);

      expect(controller.signal.aborted).toBe(false);

      vi.advanceTimersByTime(1100);

      expect(controller.signal.aborted).toBe(true);
    });

    it('should allow manual abortion before timeout', () => {
      const controller = createTimeoutAbortController(5000);

      controller.abort();

      expect(controller.signal.aborted).toBe(true);
    });

    it('should clear timeout when manually aborted', () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout');

      const controller = createTimeoutAbortController(5000);
      controller.abort();

      expect(clearSpy).toHaveBeenCalled();

      clearSpy.mockRestore();
    });

    it('should work with fetch AbortSignal', async () => {
      const controller = createTimeoutAbortController(1000);

      const fetchPromise = fetch('http://example.com', {
        signal: controller.signal,
      }).catch(() => null);

      vi.advanceTimersByTime(1100);

      // After timeout, fetch should be aborted
      const result = await fetchPromise;
      expect(controller.signal.aborted).toBe(true);
    });
  });
});
