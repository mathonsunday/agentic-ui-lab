/**
 * useResponseTracking Hook
 *
 * Encapsulates response line ID generation and tracking to prevent bugs
 * like double-increment that caused the ID mismatch issue.
 *
 * This hook ensures that:
 * 1. Each response line gets a unique, incrementing ID
 * 2. Response line IDs are properly tracked
 * 3. Sequential animation state is managed correctly
 *
 * Usage:
 *   const tracking = useResponseTracking();
 *   const line = tracking.createResponseLine(chunk, 'text');
 *   setTerminalLines(prev => [...prev, line]);
 *
 *   if (tracking.isResponseLine(lineId)) {
 *     // This line is part of a response
 *   }
 */

import { useRef, useCallback } from 'react';

export interface ResponseLine {
  id: string;
  type: 'text' | 'system' | 'ascii';
  content: string;
  timestamp: number;
}

export function useResponseTracking() {
  const lineCountRef = useRef(0);
  const responseLineIdsRef = useRef<string[]>([]);
  const currentAnimatingLineIdRef = useRef<string | null>(null);

  /**
   * Create a new response line with auto-incremented ID
   * Only increments counter when creating response lines
   */
  const createResponseLine = useCallback((
    content: string,
    type: 'text' | 'system' | 'ascii' = 'text'
  ): ResponseLine => {
    const id = String(lineCountRef.current++);

    // Only track text responses for animation
    if (type === 'text') {
      responseLineIdsRef.current.push(id);

      // Auto-set first response line as currently animating
      if (!currentAnimatingLineIdRef.current) {
        currentAnimatingLineIdRef.current = id;
      }
    }

    return {
      id,
      type,
      content,
      timestamp: Date.now(),
    };
  }, []);

  /**
   * Move to the next animating line in the sequence
   * Returns the next line's ID, or null if no more lines
   */
  const moveToNextAnimatingLine = useCallback(() => {
    const currentId = currentAnimatingLineIdRef.current;
    if (!currentId) return null;

    const currentIndex = responseLineIdsRef.current.indexOf(currentId);
    const nextIndex = currentIndex + 1;

    if (nextIndex < responseLineIdsRef.current.length) {
      currentAnimatingLineIdRef.current = responseLineIdsRef.current[nextIndex];
      return responseLineIdsRef.current[nextIndex];
    } else {
      currentAnimatingLineIdRef.current = null;
      return null;
    }
  }, []);

  /**
   * Check if a line ID is part of this response
   */
  const isResponseLine = useCallback((lineId: string) => {
    return responseLineIdsRef.current.includes(lineId);
  }, []);

  /**
   * Check if a line is currently animating
   */
  const isCurrentlyAnimating = useCallback((lineId: string) => {
    return lineId === currentAnimatingLineIdRef.current;
  }, []);

  /**
   * Reset all tracking (call after response completes)
   */
  const resetTracking = useCallback(() => {
    responseLineIdsRef.current = [];
    currentAnimatingLineIdRef.current = null;
  }, []);

  /**
   * Get current line counter value (for debugging)
   */
  const getCurrentLineCount = useCallback(() => {
    return lineCountRef.current;
  }, []);

  return {
    createResponseLine,
    moveToNextAnimatingLine,
    isResponseLine,
    isCurrentlyAnimating,
    resetTracking,
    getCurrentLineCount,
    // Expose refs for debugging if needed
    responseLineIds: responseLineIdsRef,
    currentAnimatingLineId: currentAnimatingLineIdRef,
  };
}
