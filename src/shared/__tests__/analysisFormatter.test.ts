/**
 * Tests for Analysis Formatter Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateConfidenceBar,
  formatAnalysisBox,
  formatMetricsDisplay,
  type AnalysisDisplayData,
} from '../analysisFormatter';

describe('Analysis Formatter', () => {
  describe('generateConfidenceBar', () => {
    it('generates bar with 0% confidence', () => {
      const result = generateConfidenceBar(0);
      expect(result).toContain('[RAPPORT]');
      expect(result).toContain('░'.repeat(20)); // All empty
      expect(result).toContain('0%');
    });

    it('generates bar with 50% confidence', () => {
      const result = generateConfidenceBar(50);
      expect(result).toContain('[RAPPORT]');
      expect(result).toContain('█'.repeat(10)); // 10 filled
      expect(result).toContain('░'.repeat(10)); // 10 empty
      expect(result).toContain('50%');
    });

    it('generates bar with 100% confidence', () => {
      const result = generateConfidenceBar(100);
      expect(result).toContain('[RAPPORT]');
      expect(result).toContain('█'.repeat(20)); // All filled
      expect(result).toContain('100%');
    });

    it('rounds confidence values', () => {
      const result = generateConfidenceBar(42.7);
      expect(result).toContain('43%');
    });

    it('includes newline at end', () => {
      const result = generateConfidenceBar(50);
      expect(result[result.length - 1]).toBe('\n');
    });

    it('maintains correct bar character ratio', () => {
      for (let i = 0; i <= 100; i += 10) {
        const result = generateConfidenceBar(i);
        const expectedFilled = Math.round(i / 5);
        const expectedEmpty = 20 - expectedFilled;
        expect(result).toContain('█'.repeat(expectedFilled));
        expect(result).toContain('░'.repeat(expectedEmpty));
      }
    });
  });

  describe('formatAnalysisBox', () => {
    it('formats analysis with positive confidence delta', () => {
      const data: AnalysisDisplayData = {
        reasoning: 'That was insightful',
        confidenceDelta: 5,
      };
      const result = formatAnalysisBox(data);

      expect(result).toContain("MIRA'S NOTES");
      expect(result).toContain('[+5 confidence]');
      expect(result).toContain('That was insightful');
    });

    it('formats analysis with negative confidence delta', () => {
      const data: AnalysisDisplayData = {
        reasoning: 'That was dismissive',
        confidenceDelta: -3,
      };
      const result = formatAnalysisBox(data);

      expect(result).toContain("MIRA'S NOTES");
      expect(result).toContain('[-3 confidence]');
      expect(result).toContain('That was dismissive');
    });

    it('formats analysis with zero confidence delta', () => {
      const data: AnalysisDisplayData = {
        reasoning: 'Neutral response',
        confidenceDelta: 0,
      };
      const result = formatAnalysisBox(data);

      expect(result).toContain('[+0 confidence]'); // Shows '+' for zero
    });

    it('wraps long reasoning text', () => {
      const longReasoning =
        'This is a very long reasoning that should definitely wrap across multiple lines because it exceeds the maximum width of fifty five characters';
      const data: AnalysisDisplayData = {
        reasoning: longReasoning,
        confidenceDelta: 8,
      };
      const result = formatAnalysisBox(data);

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(3); // Header + at least 2 content lines + footer
    });

    it('uses box drawing characters', () => {
      const data: AnalysisDisplayData = {
        reasoning: 'Test',
        confidenceDelta: 2,
      };
      const result = formatAnalysisBox(data);

      expect(result).toContain('┌'); // Top left
      expect(result).toContain('┐'); // Top right
      expect(result).toContain('└'); // Bottom left
      expect(result).toContain('┘'); // Bottom right
      expect(result).toContain('│'); // Vertical
      expect(result).toContain('─'); // Horizontal
    });

    it('handles single word reasoning', () => {
      const data: AnalysisDisplayData = {
        reasoning: 'Interesting',
        confidenceDelta: 3,
      };
      const result = formatAnalysisBox(data);

      expect(result).toContain('Interesting');
      expect(result).toContain('[+3 confidence]');
    });

    it('handles empty reasoning gracefully', () => {
      const data: AnalysisDisplayData = {
        reasoning: '',
        confidenceDelta: 1,
      };
      const result = formatAnalysisBox(data);

      // Should still have box structure
      expect(result).toContain('┌');
      expect(result).toContain("MIRA'S NOTES");
      expect(result).toContain('[+1 confidence]');
    });

    it('produces valid box with multiple lines', () => {
      const data: AnalysisDisplayData = {
        reasoning:
          'You asked a thoughtful question about bioluminescence in deep-sea creatures',
        confidenceDelta: 12,
      };
      const result = formatAnalysisBox(data);

      const lines = result.split('\n');
      const firstLine = lines[0];
      const lastLine = lines[lines.length - 1];

      // Top and bottom should match in structure
      expect(firstLine).toMatch(/^┌─.*─┐$/);
      expect(lastLine).toMatch(/^└─*┘$/);

      // All content lines should be vertically aligned
      for (let i = 1; i < lines.length - 1; i++) {
        expect(lines[i]).toMatch(/^│.*│$/);
      }
    });
  });

  describe('formatMetricsDisplay', () => {
    it('formats single metric', () => {
      const metrics = { thoughtfulness: 75 };
      const result = formatMetricsDisplay(metrics);
      expect(result).toBe('thoughtfulness: 75');
    });

    it('formats multiple metrics', () => {
      const metrics = {
        thoughtfulness: 75,
        curiosity: 82,
        engagement: 60,
      };
      const result = formatMetricsDisplay(metrics);

      expect(result).toContain('thoughtfulness: 75');
      expect(result).toContain('curiosity: 82');
      expect(result).toContain('engagement: 60');
    });

    it('separates metrics with newlines', () => {
      const metrics = {
        a: 10,
        b: 20,
        c: 30,
      };
      const result = formatMetricsDisplay(metrics);
      const lines = result.split('\n');

      expect(lines.length).toBe(3);
    });

    it('handles empty metrics object', () => {
      const metrics = {};
      const result = formatMetricsDisplay(metrics);
      expect(result).toBe('');
    });

    it('formats metrics with various value ranges', () => {
      const metrics = {
        zero: 0,
        small: 5,
        medium: 50,
        large: 100,
      };
      const result = formatMetricsDisplay(metrics);

      expect(result).toContain('zero: 0');
      expect(result).toContain('small: 5');
      expect(result).toContain('medium: 50');
      expect(result).toContain('large: 100');
    });
  });

  describe('Integration tests', () => {
    it('can format complete analysis with bar and box', () => {
      const confidence = 72;
      const bar = generateConfidenceBar(confidence);
      const boxData: AnalysisDisplayData = {
        reasoning: 'Excellent observation about marine ecosystems',
        confidenceDelta: 10,
      };
      const box = formatAnalysisBox(boxData);

      expect(bar).toContain('[RAPPORT]');
      expect(box).toContain("MIRA'S NOTES");
      // Both should be independent and valid
      expect(bar.length).toBeGreaterThan(0);
      expect(box.length).toBeGreaterThan(0);
    });
  });
});
