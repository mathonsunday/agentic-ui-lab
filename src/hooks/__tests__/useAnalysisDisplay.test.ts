/**
 * Tests for useAnalysisDisplay hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysisDisplay } from '../useAnalysisDisplay';

describe('useAnalysisDisplay', () => {
  describe('Initial State', () => {
    it('initializes with empty expanded set', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      expect(result.current.expandedAnalysisIds).toBeInstanceOf(Set);
      expect(result.current.expandedAnalysisIds.size).toBe(0);
    });

    it('provides toggle callback', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      expect(typeof result.current.toggleAnalysisExpanded).toBe('function');
    });

    it('provides check callback', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      expect(typeof result.current.isAnalysisExpanded).toBe('function');
    });
  });

  describe('toggleAnalysisExpanded', () => {
    it('adds analysis ID to expanded set', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      expect(result.current.expandedAnalysisIds.has('analysis-1')).toBe(true);
    });

    it('removes analysis ID from expanded set if already present', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      expect(result.current.expandedAnalysisIds.has('analysis-1')).toBe(true);

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      expect(result.current.expandedAnalysisIds.has('analysis-1')).toBe(false);
    });

    it('handles multiple analyses independently', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
        result.current.toggleAnalysisExpanded('analysis-2');
        result.current.toggleAnalysisExpanded('analysis-3');
      });

      expect(result.current.expandedAnalysisIds.size).toBe(3);
      expect(result.current.expandedAnalysisIds.has('analysis-1')).toBe(true);
      expect(result.current.expandedAnalysisIds.has('analysis-2')).toBe(true);
      expect(result.current.expandedAnalysisIds.has('analysis-3')).toBe(true);
    });

    it('allows toggling individual items without affecting others', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
        result.current.toggleAnalysisExpanded('analysis-2');
      });

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1'); // Toggle off
      });

      expect(result.current.expandedAnalysisIds.has('analysis-1')).toBe(false);
      expect(result.current.expandedAnalysisIds.has('analysis-2')).toBe(true); // Still expanded
    });
  });

  describe('isAnalysisExpanded', () => {
    it('returns false for non-existent IDs', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      expect(result.current.isAnalysisExpanded('non-existent')).toBe(false);
    });

    it('returns true for expanded IDs', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      expect(result.current.isAnalysisExpanded('analysis-1')).toBe(true);
    });

    it('returns false after toggling off', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      expect(result.current.isAnalysisExpanded('analysis-1')).toBe(false);
    });
  });

  describe('Set Behavior', () => {
    it('maintains set uniqueness', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
        result.current.toggleAnalysisExpanded('analysis-1');
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      expect(result.current.expandedAnalysisIds.size).toBe(1);
    });

    it('allows multiple simultaneous expansions', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      const ids = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'];

      act(() => {
        ids.forEach(id => result.current.toggleAnalysisExpanded(id));
      });

      expect(result.current.expandedAnalysisIds.size).toBe(ids.length);
      ids.forEach(id => {
        expect(result.current.isAnalysisExpanded(id)).toBe(true);
      });
    });

    it('efficiently handles many toggles', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.toggleAnalysisExpanded(`analysis-${i}`);
        }
      });

      expect(result.current.expandedAnalysisIds.size).toBe(100);

      act(() => {
        // Toggle every other one off
        for (let i = 0; i < 100; i += 2) {
          result.current.toggleAnalysisExpanded(`analysis-${i}`);
        }
      });

      expect(result.current.expandedAnalysisIds.size).toBe(50);
    });
  });

  describe('Integration Patterns', () => {
    it('supports render conditional based on expansion state', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
      });

      // Typical usage in component
      const shouldShowDetails = result.current.isAnalysisExpanded('analysis-1');
      expect(shouldShowDetails).toBe(true);
    });

    it('supports iterating over all expanded IDs', () => {
      const { result } = renderHook(() => useAnalysisDisplay());

      act(() => {
        result.current.toggleAnalysisExpanded('analysis-1');
        result.current.toggleAnalysisExpanded('analysis-2');
        result.current.toggleAnalysisExpanded('analysis-3');
      });

      const expandedArray = Array.from(result.current.expandedAnalysisIds);
      expect(expandedArray.length).toBe(3);
      expect(expandedArray).toContain('analysis-1');
    });
  });
});
