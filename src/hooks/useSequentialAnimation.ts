/**
 * useSequentialAnimation Hook
 *
 * Manages animation state for sequential/one-at-a-time animations.
 * Automatically triggers re-renders when animation state changes.
 *
 * Separates animation state management from business logic, making it
 * easier to reason about and test.
 *
 * Usage:
 *   const animation = useSequentialAnimation<TerminalLine>();
 *
 *   // Start animating first item
 *   animation.startAnimation(items[0].id);
 *
 *   // In render: check if item should animate
 *   if (animation.isAnimating(line.id)) {
 *     return <TypewriterLine isAnimating={true} ... />;
 *   }
 *
 *   // Move to next item when current completes
 *   const nextId = animation.moveToNext(items);
 */

import { useRef, useState, useCallback } from 'react';

export interface Animatable {
  id: string;
}

export function useSequentialAnimation<T extends Animatable>() {
  const currentAnimatingIdRef = useRef<string | null>(null);
  const [animationTrigger, setAnimationTrigger] = useState(0);

  /**
   * Start animating a specific item
   */
  const startAnimation = useCallback((itemId: string) => {
    currentAnimatingIdRef.current = itemId;
    setAnimationTrigger((t) => t + 1);
  }, []);

  /**
   * Move to the next item in the list and start animating it
   * Returns the next item's ID, or null if we've reached the end
   */
  const moveToNext = useCallback((items: T[], currentId: string) => {
    const currentIndex = items.findIndex((item) => item.id === currentId);
    if (currentIndex === -1) return null;

    const nextIndex = currentIndex + 1;

    if (nextIndex < items.length) {
      currentAnimatingIdRef.current = items[nextIndex].id;
      setAnimationTrigger((t) => t + 1);
      return items[nextIndex].id;
    } else {
      currentAnimatingIdRef.current = null;
      return null;
    }
  }, []);

  /**
   * Check if a specific item is currently animating
   */
  const isAnimating = useCallback((itemId: string) => {
    return itemId === currentAnimatingIdRef.current;
  }, []);

  /**
   * Get the ID of the currently animating item (or null)
   */
  const getCurrentAnimatingId = useCallback(() => {
    return currentAnimatingIdRef.current;
  }, []);

  /**
   * Stop all animations
   */
  const reset = useCallback(() => {
    currentAnimatingIdRef.current = null;
    setAnimationTrigger((t) => t + 1);
  }, []);

  return {
    startAnimation,
    moveToNext,
    isAnimating,
    getCurrentAnimatingId,
    reset,
    trigger: animationTrigger, // For dependency tracking if needed
  };
}
