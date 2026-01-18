/**
 * Hook for updating terminal ASCII art lines on zoom
 *
 * Encapsulates the logic for:
 * - Finding the last ASCII art line in the terminal
 * - Updating it with new ASCII art while triggering React re-renders
 * - Ensuring proper immutability for state updates
 *
 * This prevents the bug where React doesn't detect state changes when
 * mutating objects in place.
 */

import { useCallback } from 'react';

export interface TerminalLine {
  id: string;
  type: 'ascii' | 'text' | 'input' | 'system' | 'analysis';
  content: string;
  timestamp?: number;
  analysisData?: {
    reasoning: string;
    confidenceDelta: number;
  };
}

/**
 * Hook for updating the most recent ASCII art line in the terminal
 *
 * Returns a function that updates the last ASCII line with new content,
 * creating new array and object references so React detects the change.
 */
export function useTerminalLineZoomUpdate() {
  const updateLastAsciiLine = useCallback(
    (
      terminalLines: TerminalLine[],
      newAsciiContent: string
    ): TerminalLine[] => {
      // Find the index of the last ASCII line
      let lastAsciiIndex = -1;
      for (let i = terminalLines.length - 1; i >= 0; i--) {
        if (terminalLines[i].type === 'ascii') {
          lastAsciiIndex = i;
          break;
        }
      }

      // If no ASCII line found, return unchanged
      if (lastAsciiIndex === -1) {
        console.warn('[useTerminalLineZoomUpdate] No ASCII line found in terminal');
        return terminalLines;
      }

      // Create new array (required for React state detection)
      const updated = [...terminalLines];

      // Create new line object with updated content (required for React state detection)
      updated[lastAsciiIndex] = {
        ...updated[lastAsciiIndex],
        content: newAsciiContent,
      };

      return updated;
    },
    []
  );

  return { updateLastAsciiLine };
}
