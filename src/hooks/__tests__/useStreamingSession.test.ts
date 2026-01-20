/**
 * Test Suite for useStreamingSession Hook
 *
 * Validates:
 * - Session lifecycle (start/end, multiple starts)
 * - Line tracking (current ID, response IDs, clearing)
 * - Animation tracking (revealed length, content length)
 * - Interrupt tracking (per-stream isolation, cross-stream prevention)
 * - Dual state+ref synchronization (regression prevention)
 * - Edge cases (rapid updates, missing source)
 */

import { renderHook, act } from '@testing-library/react';
import { useStreamingSession } from '../useStreamingSession';

describe('useStreamingSession', () => {
  describe('Session Lifecycle', () => {
    it('starts with null stream source', () => {
      const { result } = renderHook(() => useStreamingSession());
      expect(result.current.streamSource).toBeNull();
    });

    it('starts a session with source', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession('claude_streaming');
      });

      expect(result.current.streamSource).toBe('claude_streaming');
      expect(result.current.streamSourceRef.current).toBe('claude_streaming');
    });

    it('starts a session without source', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession();
      });

      expect(result.current.streamSource).toBeNull();
      expect(result.current.streamSourceRef.current).toBeNull();
    });

    it('ends a session', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession('claude_streaming');
      });
      expect(result.current.streamSource).toBe('claude_streaming');

      act(() => {
        result.current.endSession();
      });

      expect(result.current.streamSource).toBeNull();
      expect(result.current.streamSourceRef.current).toBeNull();
    });

    it('handles multiple sequential sessions', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession('claude_streaming');
      });
      expect(result.current.streamSource).toBe('claude_streaming');

      act(() => {
        result.current.endSession();
      });
      expect(result.current.streamSource).toBeNull();

      act(() => {
        result.current.startSession('other_source');
      });
      expect(result.current.streamSource).toBe('other_source');
    });
  });

  describe('Line Tracking', () => {
    it('tracks current line ID', () => {
      const { result } = renderHook(() => useStreamingSession());

      expect(result.current.getCurrentLineId()).toBeNull();

      act(() => {
        result.current.setCurrentLineId('line-123');
      });

      expect(result.current.getCurrentLineId()).toBe('line-123');
    });

    it('clears current line', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.setCurrentLineId('line-123');
      });
      expect(result.current.getCurrentLineId()).toBe('line-123');

      act(() => {
        result.current.clearCurrentLine();
      });

      expect(result.current.getCurrentLineId()).toBeNull();
    });

    it('tracks multiple response lines', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.trackResponseLine('line-1');
        result.current.trackResponseLine('line-2');
        result.current.trackResponseLine('line-3');
      });

      expect(result.current.getResponseLineIds()).toEqual(['line-1', 'line-2', 'line-3']);
    });

    it('clears response lines', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.trackResponseLine('line-1');
        result.current.trackResponseLine('line-2');
      });
      expect(result.current.getResponseLineIds().length).toBe(2);

      act(() => {
        result.current.clearResponseLines();
      });

      expect(result.current.getResponseLineIds()).toEqual([]);
    });
  });

  describe('Animation Tracking', () => {
    it('tracks revealed length', () => {
      const { result } = renderHook(() => useStreamingSession());

      expect(result.current.getRevealedLength()).toBe(0);

      act(() => {
        result.current.setRevealedLength(50);
      });

      expect(result.current.getRevealedLength()).toBe(50);
    });

    it('tracks content length', () => {
      const { result } = renderHook(() => useStreamingSession());

      expect(result.current.getContentLength()).toBe(0);

      act(() => {
        result.current.setContentLength(150);
      });

      expect(result.current.getContentLength()).toBe(150);
    });

    it('independently tracks revealed and content lengths', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.setRevealedLength(50);
        result.current.setContentLength(150);
      });

      expect(result.current.getRevealedLength()).toBe(50);
      expect(result.current.getContentLength()).toBe(150);
    });

    it('updates animation tracking over time', () => {
      const { result } = renderHook(() => useStreamingSession());

      // Simulate character-by-character animation
      const chunks = ['Hello', ' ', 'world', '!'];
      let totalLength = 0;

      act(() => {
        chunks.forEach((chunk) => {
          totalLength += chunk.length;
          result.current.setContentLength(totalLength);
          result.current.setRevealedLength(totalLength);
        });
      });

      expect(result.current.getContentLength()).toBe(12);
      expect(result.current.getRevealedLength()).toBe(12);
    });
  });

  describe('Interrupt Tracking', () => {
    it('marks a stream as interrupted', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.markAsInterrupted(5);
      });

      expect(result.current.wasInterrupted(5)).toBe(true);
    });

    it('does not mark other streams as interrupted (cross-stream prevention)', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.markAsInterrupted(5);
      });

      expect(result.current.wasInterrupted(5)).toBe(true);
      expect(result.current.wasInterrupted(6)).toBe(false);
      expect(result.current.wasInterrupted(4)).toBe(false);
    });

    it('prevents cross-stream contamination (specimen 47 regression test)', () => {
      const { result } = renderHook(() => useStreamingSession());

      // Stream 19: interrupted
      act(() => {
        result.current.markAsInterrupted(19);
      });
      expect(result.current.wasInterrupted(19)).toBe(true);

      // Stream 20: new stream should NOT be blocked
      expect(result.current.wasInterrupted(20)).toBe(false);

      // Clear interrupt state
      act(() => {
        result.current.clearInterruptState();
      });

      // Old stream 19 should also not be marked anymore
      expect(result.current.wasInterrupted(19)).toBe(false);
      expect(result.current.wasInterrupted(20)).toBe(false);
    });

    it('clears interrupt state', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.markAsInterrupted(5);
      });
      expect(result.current.wasInterrupted(5)).toBe(true);

      act(() => {
        result.current.clearInterruptState();
      });

      expect(result.current.wasInterrupted(5)).toBe(false);
    });

    it('overrides previous interrupt when marking new stream', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.markAsInterrupted(5);
      });
      expect(result.current.wasInterrupted(5)).toBe(true);

      act(() => {
        result.current.markAsInterrupted(6);
      });

      expect(result.current.wasInterrupted(5)).toBe(false);
      expect(result.current.wasInterrupted(6)).toBe(true);
    });
  });

  describe('State and Ref Synchronization', () => {
    it('keeps streamSource state synchronized with streamSourceRef', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession('claude_streaming');
      });

      // Both should be synchronized
      expect(result.current.streamSource).toBe('claude_streaming');
      expect(result.current.streamSourceRef.current).toBe('claude_streaming');
    });

    it('maintains synchronization through multiple updates', () => {
      const { result } = renderHook(() => useStreamingSession());

      // Update 1: start source1
      act(() => {
        result.current.startSession('source1');
      });
      expect(result.current.streamSource).toBe('source1');
      expect(result.current.streamSourceRef.current).toBe('source1');

      // Update 2: start source2
      act(() => {
        result.current.startSession('source2');
      });
      expect(result.current.streamSource).toBe('source2');
      expect(result.current.streamSourceRef.current).toBe('source2');

      // Update 3: end session
      act(() => {
        result.current.endSession();
      });
      expect(result.current.streamSource).toBeNull();
      expect(result.current.streamSourceRef.current).toBeNull();

      // Update 4: start source3
      act(() => {
        result.current.startSession('source3');
      });
      expect(result.current.streamSource).toBe('source3');
      expect(result.current.streamSourceRef.current).toBe('source3');
    });

    it('provides ref access for performance-critical paths', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession('claude_streaming');
      });

      // Ref should be accessible directly
      const ref = result.current.streamSourceRef;
      expect(ref.current).toBe('claude_streaming');

      // Ref value should not trigger re-render
      // (This is the performance benefit: callbacks can read ref without recreating)
      act(() => {
        ref.current = 'direct_write';
      });

      // Note: This is intentionally not recommended in normal usage
      // It demonstrates that ref can be accessed directly when needed
      expect(ref.current).toBe('direct_write');
    });
  });

  describe('Complete Session Flow', () => {
    it('handles full user interaction flow', () => {
      const { result } = renderHook(() => useStreamingSession());

      // User starts message
      act(() => {
        result.current.clearInterruptState();
      });
      expect(result.current.wasInterrupted(1)).toBe(false);

      // Message starts streaming
      act(() => {
        result.current.startSession('claude_streaming');
      });
      expect(result.current.streamSource).toBe('claude_streaming');

      // First chunk arrives
      act(() => {
        result.current.setCurrentLineId('response-1');
        result.current.trackResponseLine('response-1');
        result.current.setContentLength(50);
      });
      expect(result.current.getCurrentLineId()).toBe('response-1');
      expect(result.current.getResponseLineIds()).toContain('response-1');

      // More chunks arrive (animation progresses)
      act(() => {
        result.current.setRevealedLength(50);
        result.current.setContentLength(100);
      });
      expect(result.current.getRevealedLength()).toBe(50);
      expect(result.current.getContentLength()).toBe(100);

      // User interrupts
      act(() => {
        result.current.markAsInterrupted(1);
      });
      expect(result.current.wasInterrupted(1)).toBe(true);

      // Stream ends
      act(() => {
        result.current.endSession();
        result.current.clearCurrentLine();
        result.current.clearResponseLines();
      });
      expect(result.current.streamSource).toBeNull();
      expect(result.current.getCurrentLineId()).toBeNull();
      expect(result.current.getResponseLineIds()).toEqual([]);

      // User types new message
      act(() => {
        result.current.clearInterruptState();
      });
      expect(result.current.wasInterrupted(1)).toBe(false);
    });

    it('handles interruption mid-animation', () => {
      const { result } = renderHook(() => useStreamingSession());

      // Simulate streaming text
      const chunks = ['This ', 'is ', 'a ', 'long ', 'response'];
      let totalLength = 0;

      act(() => {
        result.current.startSession('claude_streaming');
        result.current.setCurrentLineId('stream-1');
        result.current.trackResponseLine('stream-1');
      });

      // Process chunks
      act(() => {
        chunks.forEach((chunk) => {
          totalLength += chunk.length;
          result.current.setContentLength(totalLength);
          result.current.setRevealedLength(totalLength);
        });
      });

      const lengthBeforeInterrupt = result.current.getRevealedLength();
      expect(lengthBeforeInterrupt).toBe(totalLength); // All revealed

      // User interrupts mid-stream
      act(() => {
        result.current.markAsInterrupted(1);
      });

      // Animation data is still available for UI truncation
      expect(result.current.getRevealedLength()).toBe(lengthBeforeInterrupt);
      expect(result.current.wasInterrupted(1)).toBe(true);

      // New stream starts
      act(() => {
        result.current.clearInterruptState();
        result.current.clearCurrentLine();
        result.current.clearResponseLines();
        result.current.startSession('claude_streaming');
        result.current.setCurrentLineId('stream-2');
        result.current.trackResponseLine('stream-2');
      });

      // New stream is not affected by old interrupt
      expect(result.current.wasInterrupted(2)).toBe(false);
      expect(result.current.getCurrentLineId()).toBe('stream-2');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty response line IDs', () => {
      const { result } = renderHook(() => useStreamingSession());

      expect(result.current.getResponseLineIds()).toEqual([]);
      expect(result.current.getResponseLineIds().length).toBe(0);
    });

    it('handles zero animation lengths', () => {
      const { result } = renderHook(() => useStreamingSession());

      expect(result.current.getRevealedLength()).toBe(0);
      expect(result.current.getContentLength()).toBe(0);
    });

    it('handles null stream source', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession();
      });

      expect(result.current.streamSource).toBeNull();
      expect(result.current.streamSourceRef.current).toBeNull();
    });

    it('handles negative stream IDs (edge case)', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.markAsInterrupted(-1);
      });

      expect(result.current.wasInterrupted(-1)).toBe(true);
      expect(result.current.wasInterrupted(0)).toBe(false);
    });

    it('handles very large stream IDs', () => {
      const { result } = renderHook(() => useStreamingSession());

      const largeId = Number.MAX_SAFE_INTEGER;

      act(() => {
        result.current.markAsInterrupted(largeId);
      });

      expect(result.current.wasInterrupted(largeId)).toBe(true);
    });

    it('handles rapid successive updates', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.startSession('source1');
        result.current.startSession('source2');
        result.current.startSession('source3');
        result.current.endSession();
      });

      // Final state should be null (endSession was last)
      expect(result.current.streamSource).toBeNull();
    });

    it('handles setting same line ID multiple times', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.setCurrentLineId('same-id');
        result.current.setCurrentLineId('same-id');
        result.current.setCurrentLineId('same-id');
      });

      expect(result.current.getCurrentLineId()).toBe('same-id');
    });

    it('does not allow duplicate response line tracking (responsibility of caller)', () => {
      const { result } = renderHook(() => useStreamingSession());

      act(() => {
        result.current.trackResponseLine('line-1');
        result.current.trackResponseLine('line-1');
        result.current.trackResponseLine('line-1');
      });

      // Hook doesn't deduplicate - this is caller's responsibility
      expect(result.current.getResponseLineIds()).toEqual(['line-1', 'line-1', 'line-1']);
    });
  });

  describe('Method Stability', () => {
    it('returns stable callback references across renders', () => {
      const { result, rerender } = renderHook(() => useStreamingSession());

      const initialStartSession = result.current.startSession;
      const initialEndSession = result.current.endSession;
      const initialGetCurrentLineId = result.current.getCurrentLineId;

      rerender();

      // Methods should maintain same reference (useCallback stability)
      expect(result.current.startSession).toBe(initialStartSession);
      expect(result.current.endSession).toBe(initialEndSession);
      expect(result.current.getCurrentLineId).toBe(initialGetCurrentLineId);
    });
  });
});
