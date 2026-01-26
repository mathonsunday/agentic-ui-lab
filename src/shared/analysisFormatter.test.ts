/**
 * Mutation-Guided Tests for Analysis Formatter
 *
 * Each test is designed to catch specific mutations (potential bugs).
 * Tests verify observable output behavior, not implementation details.
 */

import { describe, it, expect } from 'vitest';
import {
  generateConfidenceBar,
  formatAnalysisBox,
  formatMetricsDisplay,
  type AnalysisDisplayData,
} from './analysisFormatter';

describe('generateConfidenceBar', () => {
  // Catches mutation: / to * on line 26
  it('should create bar with correct filled ratio at 50%', () => {
    const result = generateConfidenceBar(50);
    // 50 / 5 = 10 filled, 10 empty (would be 250 filled if / became *)
    expect(result).toContain('██████████░░░░░░░░░░');
  });

  // Catches mutation: / to * on line 26
  it('should create bar with correct filled ratio at 25%', () => {
    const result = generateConfidenceBar(25);
    // 25 / 5 = 5 filled, 15 empty (would be 125 filled if / became *)
    expect(result).toContain('█████░░░░░░░░░░░░░░░');
  });

  // Catches mutation: - to + on line 27
  it('should have correct total bar length of 20 characters', () => {
    const result = generateConfidenceBar(60);
    const barMatch = result.match(/\[(█|░)+\]/);
    expect(barMatch).toBeTruthy();
    const bar = barMatch![0];
    // Count characters inside brackets (should be 20, would be wrong if - became +)
    const charCount = (bar.match(/█/g) || []).length + (bar.match(/░/g) || []).length;
    expect(charCount).toBe(20);
  });

  // Catches mutation: + to - on line 28 (multiple + operators in concatenation)
  it('should include [RAPPORT] prefix in output', () => {
    const result = generateConfidenceBar(50);
    expect(result).toContain('[RAPPORT]');
  });

  // Catches mutation: + to - on line 28 (string concatenation)
  it('should include percentage value in output', () => {
    const result = generateConfidenceBar(73);
    expect(result).toContain('73%');
  });

  // Catches mutation: + to - on line 28 (newline)
  it('should end with newline character', () => {
    const result = generateConfidenceBar(50);
    expect(result).toMatch(/\n$/);
  });

  it('should show empty bar at 0%', () => {
    const result = generateConfidenceBar(0);
    expect(result).toContain('░░░░░░░░░░░░░░░░░░░░');
    expect(result).toContain('0%');
  });

  it('should show full bar at 100%', () => {
    const result = generateConfidenceBar(100);
    expect(result).toContain('████████████████████');
    expect(result).toContain('100%');
  });

  it('should round confidence to nearest integer', () => {
    const result = generateConfidenceBar(42.7);
    expect(result).toContain('43%');
  });
});

describe('formatAnalysisBox', () => {
  // Catches mutation: >= to > on line 48
  it('should show + symbol for zero confidence delta', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Neutral observation',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    // Should be +0, not just 0 (would fail if >= became >)
    expect(result).toContain('[+0 confidence]');
  });

  // Catches mutation: >= to < on line 48 (flipped logic)
  it('should show + symbol for positive confidence delta', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Good point',
      confidenceDelta: 5,
    };
    const result = formatAnalysisBox(data);
    expect(result).toContain('[+5 confidence]');
  });

  // Catches mutation: >= to <= on line 48
  it('should NOT show + symbol for negative confidence delta', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Odd remark',
      confidenceDelta: -3,
    };
    const result = formatAnalysisBox(data);
    // Should be -3, not +-3
    expect(result).toContain('[-3 confidence]');
    expect(result).not.toContain('[+-3');
  });

  // Catches mutation: > to >= on line 66 (word wrapping boundary)
  it('should NOT wrap when text equals exactly maxWidth', () => {
    // Create text where (currentLine + word).length === maxWidth (55)
    // With >, 55 > 55 is false, so keeps on same line
    // With >=, 55 >= 55 is true, so wraps (incorrect)
    const word1 = 'a'.repeat(25);
    const word2 = 'b'.repeat(29); // 25 + 1 (space) + 29 = 55 exactly
    const data: AnalysisDisplayData = {
      reasoning: `${word1} ${word2}`,
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    const contentLines = result.split('\n').filter(l => l.includes('│') && !l.includes('MIRA'));
    // Should be 1 line (both words fit exactly)
    // Would be 2 lines if > became >=
    expect(contentLines.length).toBe(1);
  });

  // Catches mutation: > to < on line 66 (flipped wrapping logic)
  it('should NOT wrap short text', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Short note',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    const contentLines = result.split('\n').filter(l => l.includes('│') && !l.includes('MIRA'));
    // Should be 1 line for short text (would be many lines if > became <)
    expect(contentLines.length).toBe(1);
  });

  // Catches mutation: > to <= on line 66
  it('should keep words together when adding word fits exactly', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'one two three four five six seven eight nine ten',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    // Words should be wrapped intelligently, not broken mid-word
    const lines = result.split('\n');
    lines.forEach(line => {
      // No line should start/end with partial words (no hanging spaces at start)
      if (line.includes('│')) {
        const content = line.split('│')[1];
        if (content && content.trim().length > 0) {
          expect(content).toMatch(/^ /); // Should have leading space padding
        }
      }
    });
  });

  // Catches mutation: + to - on line 66, 68, 70 (word concatenation)
  it('should preserve all words in wrapped output', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'word1 word2 word3 word4 word5',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    expect(result).toContain('word1');
    expect(result).toContain('word2');
    expect(result).toContain('word3');
    expect(result).toContain('word4');
    expect(result).toContain('word5');
  });

  // Catches mutation: ConditionalRemoval on line 66 (always if-branch)
  it('should not wrap every word on new line', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'a b c d e',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    const contentLines = result.split('\n').filter(l => l.includes('│') && !l.includes('MIRA'));
    // Should be 1 line, not 5 lines (would fail if always took if-branch)
    expect(contentLines.length).toBe(1);
  });

  // Catches mutation: ConditionalRemoval on line 66 (always else-branch)
  it('should wrap long text that exceeds maxWidth', () => {
    const longText = 'a'.repeat(60) + ' ' + 'b'.repeat(60);
    const data: AnalysisDisplayData = {
      reasoning: longText,
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    const contentLines = result.split('\n').filter(l => l.includes('│') && !l.includes('MIRA'));
    // Should be multiple lines (would be 1 line if always took else-branch)
    expect(contentLines.length).toBeGreaterThan(1);
  });

  // Catches mutation: ConditionalRemoval on line 73 (empty line handling)
  it('should not include empty lines for empty final currentLine', () => {
    const data: AnalysisDisplayData = {
      // Text that ends exactly at boundary (no trailing content)
      reasoning: 'word '.repeat(10).trim(),
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    const contentLines = result.split('\n').filter(l => l.includes('│') && !l.includes('MIRA'));
    // Should not have empty content lines
    contentLines.forEach(line => {
      const content = line.split('│')[1];
      expect(content?.trim().length).toBeGreaterThan(0);
    });
  });

  // Catches mutation: + to - on line 81 (boxWidth calculation)
  it('should create box wide enough for delta text', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Short',
      confidenceDelta: 999,
    };
    const result = formatAnalysisBox(data);
    // Box should fit "[+999 confidence]" without breaking
    expect(result).toContain('[+999 confidence]');
    const topLine = result.split('\n')[0];
    expect(topLine).toContain('┐'); // Should close properly
  });

  // Catches mutation: - to + on line 83 (horizontal repeat calculation)
  it('should create properly formatted top border', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Test',
      confidenceDelta: 5,
    };
    const result = formatAnalysisBox(data);
    const lines = result.split('\n');
    const topLine = lines[0];
    // Should have consistent box characters
    expect(topLine).toMatch(/^┌─/);
    expect(topLine).toMatch(/─┐$/);
  });

  // Catches mutation: + to - on line 84 (bottom bar width)
  it('should create bottom border matching top border width', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Testing border alignment',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    const lines = result.split('\n');
    const topLine = lines[0];
    const bottomLine = lines[lines.length - 1];
    // Top and bottom should be similar length (within reason for different chars)
    expect(Math.abs(topLine.length - bottomLine.length)).toBeLessThan(5);
  });

  it('should include MIRA\'S NOTES header', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Test',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    expect(result).toContain("MIRA'S NOTES");
  });

  it('should use box drawing characters', () => {
    const data: AnalysisDisplayData = {
      reasoning: 'Test',
      confidenceDelta: 0,
    };
    const result = formatAnalysisBox(data);
    expect(result).toMatch(/┌/);
    expect(result).toMatch(/┐/);
    expect(result).toMatch(/└/);
    expect(result).toMatch(/┘/);
    expect(result).toMatch(/│/);
    expect(result).toMatch(/─/);
  });
});

describe('formatMetricsDisplay', () => {
  it('should format single metric as key-value pair', () => {
    const metrics = { thoughtfulness: 75 };
    const result = formatMetricsDisplay(metrics);
    expect(result).toBe('thoughtfulness: 75');
  });

  it('should format multiple metrics with newline separation', () => {
    const metrics = {
      thoughtfulness: 75,
      curiosity: 82,
    };
    const result = formatMetricsDisplay(metrics);
    expect(result).toBe('thoughtfulness: 75\ncuriosity: 82');
  });

  it('should handle empty metrics object', () => {
    const metrics = {};
    const result = formatMetricsDisplay(metrics);
    expect(result).toBe('');
  });

  it('should preserve metric key names exactly', () => {
    const metrics = { 'my-custom-metric': 50 };
    const result = formatMetricsDisplay(metrics);
    expect(result).toContain('my-custom-metric');
  });

  it('should handle zero values', () => {
    const metrics = { score: 0 };
    const result = formatMetricsDisplay(metrics);
    expect(result).toBe('score: 0');
  });
});
