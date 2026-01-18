/**
 * Tests for useSequentialAnimation Hook
 *
 * Validates:
 * - Starting animation on specific items
 * - Moving through items sequentially
 * - Animation state checking
 * - Edge cases (empty arrays, out of bounds)
 * - Reset functionality
 * - Multiple animation cycles
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSequentialAnimation,
  type Animatable,
} from '../useSequentialAnimation';

// Test data
interface TestItem extends Animatable {
  id: string;
  content: string;
}

const createItems = (count: number): TestItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    content: `Content ${i}`,
  }));
};

describe('useSequentialAnimation Hook', () => {
  describe('Initialization', () => {
    it('should initialize with no animation active', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());

      expect(result.current.getCurrentAnimatingId()).toBeNull();
      expect(result.current.trigger).toBe(0);
    });

    it('should return all required methods', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());

      expect(typeof result.current.startAnimation).toBe('function');
      expect(typeof result.current.moveToNext).toBe('function');
      expect(typeof result.current.isAnimating).toBe('function');
      expect(typeof result.current.getCurrentAnimatingId).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('startAnimation', () => {
    it('should start animation on a specific item', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.getCurrentAnimatingId()).toBe(items[0].id);
    });

    it('should trigger a re-render when animation starts', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);
      const initialTrigger = result.current.trigger;

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.trigger).toBe(initialTrigger + 1);
    });

    it('should switch animation to a different item', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.getCurrentAnimatingId()).toBe(items[0].id);

      act(() => {
        result.current.startAnimation(items[1].id);
      });

      expect(result.current.getCurrentAnimatingId()).toBe(items[1].id);
    });

    it('should handle animating arbitrary item IDs', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const customId = 'custom-animation-id';

      act(() => {
        result.current.startAnimation(customId);
      });

      expect(result.current.getCurrentAnimatingId()).toBe(customId);
    });
  });

  describe('isAnimating', () => {
    it('should return true for currently animating item', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.isAnimating(items[0].id)).toBe(true);
    });

    it('should return false for non-animating items', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.isAnimating(items[1].id)).toBe(false);
      expect(result.current.isAnimating(items[2].id)).toBe(false);
    });

    it('should return false when nothing is animating', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      expect(result.current.isAnimating(items[0].id)).toBe(false);
    });
  });

  describe('moveToNext', () => {
    it('should move from first to second item', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, items[0].id);
      });

      expect(nextId).toBe(items[1].id);
      expect(result.current.getCurrentAnimatingId()).toBe(items[1].id);
    });

    it('should move through entire sequence', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.isAnimating(items[0].id)).toBe(true);

      act(() => {
        result.current.moveToNext(items, items[0].id);
      });

      expect(result.current.isAnimating(items[1].id)).toBe(true);

      act(() => {
        result.current.moveToNext(items, items[1].id);
      });

      expect(result.current.isAnimating(items[2].id)).toBe(true);
    });

    it('should return null when moving past end of list', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(2);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      act(() => {
        result.current.moveToNext(items, items[0].id);
      });

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, items[1].id);
      });

      expect(nextId).toBeNull();
      expect(result.current.getCurrentAnimatingId()).toBeNull();
    });

    it('should return null for invalid current item ID', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, 'invalid-id');
      });

      expect(nextId).toBeNull();
    });

    it('should trigger re-render when moving to next', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      const triggerBefore = result.current.trigger;

      act(() => {
        result.current.moveToNext(items, items[0].id);
      });

      expect(result.current.trigger).toBe(triggerBefore + 1);
    });

    it('should handle moving from first to last in 2-item list', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(2);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, items[0].id);
      });

      expect(nextId).toBe(items[1].id);
      expect(result.current.isAnimating(items[1].id)).toBe(true);
    });

    it('should handle single-item list', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(1);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, items[0].id);
      });

      expect(nextId).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear animation state', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.getCurrentAnimatingId()).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.getCurrentAnimatingId()).toBeNull();
    });

    it('should trigger re-render on reset', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      const triggerBefore = result.current.trigger;

      act(() => {
        result.current.reset();
      });

      expect(result.current.trigger).toBe(triggerBefore + 1);
    });

    it('should allow restarting animation after reset', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.getCurrentAnimatingId()).toBeNull();

      act(() => {
        result.current.startAnimation(items[1].id);
      });

      expect(result.current.isAnimating(items[1].id)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty item list in moveToNext', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items: TestItem[] = [];

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, 'any-id');
      });

      expect(nextId).toBeNull();
    });

    it('should handle large item lists', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(1000);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.isAnimating(items[0].id)).toBe(true);

      act(() => {
        result.current.moveToNext(items, items[0].id);
      });

      expect(result.current.isAnimating(items[1].id)).toBe(true);
    });

    it('should handle duplicate IDs (uses first match)', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items: TestItem[] = [
        { id: 'duplicate', content: 'First' },
        { id: 'other', content: 'Second' },
        { id: 'duplicate', content: 'Third' },
      ];

      act(() => {
        result.current.startAnimation('duplicate');
      });

      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, 'duplicate');
      });

      // Should move to index 1, not the duplicate at index 2
      expect(nextId).toBe('other');
    });

    it('should handle special characters in IDs', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const specialId = 'item-/\\@#$%^&*()';

      act(() => {
        result.current.startAnimation(specialId);
      });

      expect(result.current.getCurrentAnimatingId()).toBe(specialId);
      expect(result.current.isAnimating(specialId)).toBe(true);
    });

    it('should handle very long animation sequences', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(100);

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      // Move through many items
      for (let i = 0; i < 50; i++) {
        const currentId = result.current.getCurrentAnimatingId();
        expect(currentId).not.toBeNull();

        act(() => {
          result.current.moveToNext(items, currentId!);
        });
      }

      // Should be at item 50
      expect(result.current.isAnimating(items[50].id)).toBe(true);
    });
  });

  describe('Multiple Animation Cycles', () => {
    it('should handle complete animation cycle', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      // Start first animation
      act(() => {
        result.current.startAnimation(items[0].id);
      });

      // Move through sequence
      for (let i = 0; i < items.length - 1; i++) {
        const currentId = result.current.getCurrentAnimatingId();
        expect(currentId).toBe(items[i].id);

        act(() => {
          result.current.moveToNext(items, currentId!);
        });
      }

      expect(result.current.isAnimating(items[2].id)).toBe(true);

      // Try to move past end
      let nextId: string | null;
      act(() => {
        nextId = result.current.moveToNext(items, items[2].id);
      });

      expect(nextId).toBeNull();
      expect(result.current.getCurrentAnimatingId()).toBeNull();

      // Start another cycle
      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.isAnimating(items[0].id)).toBe(true);
    });

    it('should track trigger count correctly through cycles', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      const triggerStart = result.current.trigger;

      // First animation
      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.trigger).toBe(triggerStart + 1);

      // Move to next
      act(() => {
        result.current.moveToNext(items, items[0].id);
      });

      expect(result.current.trigger).toBe(triggerStart + 2);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.trigger).toBe(triggerStart + 3);
    });
  });

  describe('Animation State Consistency', () => {
    it('should maintain isAnimating consistency with getCurrentAnimatingId', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(5);

      for (const item of items) {
        act(() => {
          result.current.startAnimation(item.id);
        });

        const current = result.current.getCurrentAnimatingId();

        for (const checkItem of items) {
          const isAnimating = result.current.isAnimating(checkItem.id);

          if (checkItem.id === current) {
            expect(isAnimating).toBe(true);
          } else {
            expect(isAnimating).toBe(false);
          }
        }
      }
    });

    it('should have only one item animating at a time', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(5);

      act(() => {
        result.current.startAnimation(items[2].id);
      });

      let animatingCount = 0;
      for (const item of items) {
        if (result.current.isAnimating(item.id)) {
          animatingCount++;
        }
      }

      expect(animatingCount).toBe(1);
    });
  });

  describe('Trigger Counter', () => {
    it('should increment trigger on state changes', () => {
      const { result } = renderHook(() => useSequentialAnimation<TestItem>());
      const items = createItems(3);

      const startTrigger = result.current.trigger;

      act(() => {
        result.current.startAnimation(items[0].id);
      });

      expect(result.current.trigger).toBe(startTrigger + 1);

      act(() => {
        result.current.moveToNext(items, items[0].id);
      });

      expect(result.current.trigger).toBe(startTrigger + 2);

      act(() => {
        result.current.reset();
      });

      expect(result.current.trigger).toBe(startTrigger + 3);
    });

    it('should provide stable reference for dependency tracking', () => {
      const { result, rerender } = renderHook(() =>
        useSequentialAnimation<TestItem>()
      );
      const items = createItems(3);

      const startMethod1 = result.current.startAnimation;
      const isAnimatingMethod1 = result.current.isAnimating;

      rerender();

      // Methods should have stable references
      expect(result.current.startAnimation).toBe(startMethod1);
      expect(result.current.isAnimating).toBe(isAnimatingMethod1);
    });
  });
});
