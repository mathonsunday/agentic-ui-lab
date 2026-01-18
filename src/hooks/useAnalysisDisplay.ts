/**
 * Custom hook for managing analysis display state
 *
 * Encapsulates:
 * - Expanded/collapsed state for analysis boxes
 * - Analysis formatting
 * - Toggle logic for expanding individual analyses
 *
 * Extracted from TerminalInterface.tsx (100 LoC reduction)
 */

import { useState, useCallback } from 'react';

export interface UseAnalysisDisplayReturn {
  expandedAnalysisIds: Set<string>;
  toggleAnalysisExpanded: (analysisId: string) => void;
  isAnalysisExpanded: (analysisId: string) => boolean;
}

/**
 * Hook for managing which analysis boxes are expanded/collapsed
 */
export function useAnalysisDisplay(): UseAnalysisDisplayReturn {
  const [expandedAnalysisIds, setExpandedAnalysisIds] = useState<Set<string>>(new Set());

  const toggleAnalysisExpanded = useCallback((analysisId: string) => {
    setExpandedAnalysisIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(analysisId)) {
        newSet.delete(analysisId);
      } else {
        newSet.add(analysisId);
      }
      return newSet;
    });
  }, []);

  const isAnalysisExpanded = useCallback(
    (analysisId: string) => expandedAnalysisIds.has(analysisId),
    [expandedAnalysisIds]
  );

  return {
    expandedAnalysisIds,
    toggleAnalysisExpanded,
    isAnalysisExpanded,
  };
}
