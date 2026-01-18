/**
 * Tests for useTerminalStreaming hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTerminalStreaming, type UseTerminalStreamingReturn } from '../useTerminalStreaming';

// Mock dependencies
vi.mock('../../services/miraBackendStream', () => ({
  streamMiraBackend: vi.fn(),
}));

vi.mock('../../shared/audioEngine', () => ({
  playStreamingSound: vi.fn(() => Promise.resolve()),
  playHydrophoneStatic: vi.fn(() => Promise.resolve()),
}));

describe('useTerminalStreaming', () => {
  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.streamState.isStreaming).toBe(false);
      expect(result.current.streamState.streamId).toBe(0);
      expect(result.current.terminalLines.length).toBe(2); // System + initialization message
    });

    it('initializes terminal lines with system message', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.terminalLines[0].type).toBe('system');
      expect(result.current.terminalLines[0].content).toContain('INITIALIZED');
    });

    it('accepts initial confidence option', () => {
      const { result } = renderHook(() => useTerminalStreaming({ initialConfidence: 75 }));

      expect(result.current.miraState.confidenceInUser).toBe(75);
    });

    it('provides refs for internal state tracking', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.lineCountRef).toBeDefined();
      expect(result.current.scrollRef).toBeDefined();
      expect(result.current.responseLineIdsRef).toBeDefined();
      expect(result.current.isStreamInterruptedRef).toBeDefined();
    });
  });

  describe('addTerminalLine', () => {
    it('adds a text line with correct structure', () => {
      const { result } = renderHook(() => useTerminalStreaming());
      const initialCount = result.current.terminalLines.length;

      act(() => {
        result.current.addTerminalLine('text', 'Test message');
      });

      expect(result.current.terminalLines.length).toBe(initialCount + 1);
      const lastLine = result.current.terminalLines[result.current.terminalLines.length - 1];
      expect(lastLine.type).toBe('text');
      expect(lastLine.content).toBe('Test message');
      expect(lastLine.timestamp).toBeDefined();
    });

    it('adds an analysis line with data', () => {
      const { result } = renderHook(() => useTerminalStreaming());
      const analysisData = {
        reasoning: 'Test reasoning',
        confidenceDelta: 5,
      };

      act(() => {
        result.current.addTerminalLine('analysis', '', analysisData);
      });

      const lastLine = result.current.terminalLines[result.current.terminalLines.length - 1];
      expect(lastLine.type).toBe('analysis');
      expect(lastLine.analysisData).toEqual(analysisData);
    });

    it('increments line IDs sequentially', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      act(() => {
        result.current.addTerminalLine('text', 'Line 1');
        result.current.addTerminalLine('text', 'Line 2');
        result.current.addTerminalLine('text', 'Line 3');
      });

      const lines = result.current.terminalLines.slice(-3);
      expect(lines[0].id).not.toBe(lines[1].id);
      expect(lines[1].id).not.toBe(lines[2].id);
    });
  });

  describe('updateRapportBar', () => {
    it('updates rapport bar if it exists', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      // Add a rapport bar
      act(() => {
        result.current.addTerminalLine('text', '[RAPPORT] [██████████░░░░░░░░] 50%');
      });

      // Update it
      act(() => {
        result.current.updateRapportBar(75);
      });

      const updatedLine = result.current.terminalLines.find(l => l.content.includes('[RAPPORT]'));
      expect(updatedLine).toBeDefined();
      expect(updatedLine!.content).toContain('75%');
    });

    it('generates correct rapport bar format', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      // First add a rapport bar
      act(() => {
        result.current.addTerminalLine('text', '[RAPPORT] [██████████░░░░░░░░] 50%');
      });

      // Then update it with different confidence
      act(() => {
        result.current.updateRapportBar(0);
      });

      const rapportLine = result.current.terminalLines.find(l => l.content.includes('[RAPPORT]'));
      expect(rapportLine).toBeDefined();
      expect(rapportLine!.content).toContain('0%');
      expect(rapportLine!.content).toContain('[RAPPORT]');
    });

    it('updates existing rapport bar to show different confidence', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      // First add a rapport bar
      act(() => {
        result.current.addTerminalLine('text', '[RAPPORT] [██████████░░░░░░░░] 50%');
      });

      // Then update it to 100%
      act(() => {
        result.current.updateRapportBar(100);
      });

      const rapportLine = result.current.terminalLines.find(l => l.content.includes('[RAPPORT]'));
      expect(rapportLine).toBeDefined();
      expect(rapportLine!.content).toContain('100%');
    });
  });

  describe('Stream State Management', () => {
    it('provides stream state', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.streamState).toBeDefined();
      expect(result.current.streamState.isStreaming).toBe(false);
      expect(result.current.streamState.streamId).toBeGreaterThanOrEqual(0);
    });

    it('provides interrupt callback', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(typeof result.current.interrupt).toBe('function');
    });

    it('provides sendMessage callback', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(typeof result.current.sendMessage).toBe('function');
    });
  });

  describe('Refs and Triggers', () => {
    it('provides scroll ref for auto-scrolling', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.scrollRef).toBeDefined();
      expect(result.current.scrollRef.current).toBeNull(); // Not yet attached
    });

    it('provides line count ref for tracking', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.lineCountRef.current).toBeGreaterThan(0);
    });

    it('provides interrupt tracking refs', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.isStreamInterruptedRef).toBeDefined();
      expect(result.current.interruptedStreamIdRef).toBeDefined();
      expect(result.current.lastConfidenceUpdateStreamIdRef).toBeDefined();
    });
  });

  describe('Mira State', () => {
    it('provides mira state from simulator', () => {
      const { result } = renderHook(() => useTerminalStreaming());

      expect(result.current.miraState).toBeDefined();
      expect(result.current.miraState.confidenceInUser).toBeDefined();
      expect(result.current.miraState.currentMood).toBeDefined();
      expect(result.current.miraState.userProfile).toBeDefined();
    });
  });
});
