import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTerminalLineZoomUpdate, type TerminalLine } from '../useTerminalLineZoomUpdate';

describe('useTerminalLineZoomUpdate', () => {
  describe('Basic functionality', () => {
    it('updates the last ASCII line with new content', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'system', content: 'System message' },
        { id: '2', type: 'ascii', content: 'Old ASCII art' },
        { id: '3', type: 'text', content: 'Some text' },
      ];

      const newAsciiContent = 'New ASCII art';
      const updated = result.current.updateLastAsciiLine(terminalLines, newAsciiContent);

      expect(updated[1].content).toBe(newAsciiContent);
    });

    it('returns unchanged array if no ASCII line exists', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'system', content: 'System message' },
        { id: '2', type: 'text', content: 'Some text' },
      ];

      const updated = result.current.updateLastAsciiLine(terminalLines, 'New ASCII');

      expect(updated).toEqual(terminalLines);
    });

    it('finds the LAST ASCII line when multiple exist', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'ascii', content: 'First ASCII' },
        { id: '2', type: 'text', content: 'Text' },
        { id: '3', type: 'ascii', content: 'Second ASCII' },
      ];

      const newAsciiContent = 'Updated ASCII';
      const updated = result.current.updateLastAsciiLine(terminalLines, newAsciiContent);

      // Second ASCII (index 2) should be updated
      expect(updated[2].content).toBe(newAsciiContent);
      // First ASCII (index 0) should remain unchanged
      expect(updated[0].content).toBe('First ASCII');
    });
  });

  describe('React state immutability', () => {
    it('creates a new array reference', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'ascii', content: 'ASCII' },
      ];

      const updated = result.current.updateLastAsciiLine(terminalLines, 'New ASCII');

      // Array should be a different reference
      expect(updated).not.toBe(terminalLines);
    });

    it('creates a new line object at the updated index', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const originalLine: TerminalLine = { id: '1', type: 'ascii', content: 'ASCII' };
      const terminalLines: TerminalLine[] = [originalLine];

      const updated = result.current.updateLastAsciiLine(terminalLines, 'New ASCII');

      // Line object should be a different reference
      expect(updated[0]).not.toBe(originalLine);
    });

    it('preserves other line objects unchanged', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const otherLine: TerminalLine = { id: '2', type: 'text', content: 'Text' };
      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'ascii', content: 'ASCII' },
        otherLine,
      ];

      const updated = result.current.updateLastAsciiLine(terminalLines, 'New ASCII');

      // Other lines should keep the same reference
      expect(updated[1]).toBe(otherLine);
    });

    it('preserves properties of updated line except content', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [
        {
          id: '1',
          type: 'ascii',
          content: 'Old ASCII',
          timestamp: 12345,
        },
      ];

      const updated = result.current.updateLastAsciiLine(terminalLines, 'New ASCII');

      expect(updated[0].id).toBe('1');
      expect(updated[0].type).toBe('ascii');
      expect(updated[0].timestamp).toBe(12345);
      expect(updated[0].content).toBe('New ASCII');
    });
  });

  describe('Zoom workflow', () => {
    it('handles sequential zoom updates correctly', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const initialLines: TerminalLine[] = [
        { id: '1', type: 'ascii', content: 'Medium zoom ASCII' },
      ];

      // First zoom in
      let updated = result.current.updateLastAsciiLine(initialLines, 'Close zoom ASCII');
      expect(updated[0].content).toBe('Close zoom ASCII');

      // Second zoom out
      updated = result.current.updateLastAsciiLine(updated, 'Medium zoom ASCII again');
      expect(updated[0].content).toBe('Medium zoom ASCII again');
    });

    it('works with complex terminal history', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'system', content: 'System init' },
        { id: '2', type: 'ascii', content: 'Initial ASCII' },
        { id: '3', type: 'input', content: '> user input' },
        { id: '4', type: 'text', content: 'Response text' },
        { id: '5', type: 'analysis', content: 'Analysis data', analysisData: { reasoning: 'test', confidenceDelta: 5 } },
      ];

      // Should update ASCII at index 1, not create new line at end
      const updated = result.current.updateLastAsciiLine(terminalLines, 'Zoomed ASCII');

      expect(updated.length).toBe(terminalLines.length);
      expect(updated[1].content).toBe('Zoomed ASCII');
      expect(updated[4].content).toBe('Analysis data');
    });
  });

  describe('Edge cases', () => {
    it('handles empty terminal lines array', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const terminalLines: TerminalLine[] = [];
      const updated = result.current.updateLastAsciiLine(terminalLines, 'New ASCII');

      expect(updated).toEqual([]);
    });

    it('handles very long ASCII content', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const longAscii = 'X'.repeat(10000);
      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'ascii', content: 'Short' },
      ];

      const updated = result.current.updateLastAsciiLine(terminalLines, longAscii);

      expect(updated[0].content).toBe(longAscii);
      expect(updated[0].content.length).toBe(10000);
    });

    it('handles special characters in ASCII content', () => {
      const { result } = renderHook(() => useTerminalLineZoomUpdate());

      const specialAscii = '╔═══╗\n║ ◯ ║\n╚═══╝';
      const terminalLines: TerminalLine[] = [
        { id: '1', type: 'ascii', content: 'Original' },
      ];

      const updated = result.current.updateLastAsciiLine(terminalLines, specialAscii);

      expect(updated[0].content).toBe(specialAscii);
    });
  });
});
