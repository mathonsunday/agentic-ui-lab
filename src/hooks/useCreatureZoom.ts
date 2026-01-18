/**
 * Custom hook for managing creature zoom and display state
 *
 * Encapsulates:
 * - Zoom level state (far, medium, close)
 * - Current creature selection
 * - Zoom handlers (in/out)
 * - ASCII art rendering based on zoom level
 *
 * Extracted from TerminalInterface.tsx (80 LoC reduction)
 */

import { useState, useCallback } from 'react';
import {
  getNextZoomLevel,
  getPrevZoomLevel,
  getCreatureAtZoom,
  getRandomCreature,
  type ZoomLevel,
  type CreatureName,
} from '../shared/deepSeaAscii';

export interface UseCreatureZoomReturn {
  currentZoom: ZoomLevel;
  currentCreature: CreatureName;
  asciiArt: string;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

/**
 * Hook for managing creature zoom state and ASCII art rendering
 */
export function useCreatureZoom(initialCreature: CreatureName = 'anglerFish', initialZoom: ZoomLevel = 'medium'): UseCreatureZoomReturn {
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>(initialZoom);
  const [currentCreature, setCurrentCreature] = useState<CreatureName>(initialCreature);

  const handleZoomIn = useCallback(() => {
    setCurrentZoom((prevZoom) => {
      const newZoom = getNextZoomLevel(prevZoom);

      // When zooming in very close, sometimes pick a random creature for surprise
      if (newZoom === 'close' && Math.random() < 0.3) {
        const { name: randomCreature } = getRandomCreature();
        setCurrentCreature(randomCreature);
      }

      return newZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setCurrentZoom((prevZoom) => {
      const newZoom = getPrevZoomLevel(prevZoom);
      return newZoom;
    });
  }, []);

  const asciiArt = getCreatureAtZoom(currentCreature, currentZoom);

  return {
    currentZoom,
    currentCreature,
    asciiArt,
    handleZoomIn,
    handleZoomOut,
  };
}
