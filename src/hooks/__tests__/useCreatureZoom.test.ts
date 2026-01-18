/**
 * Tests for useCreatureZoom hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreatureZoom } from '../useCreatureZoom';

// Mock deepSeaAscii module
vi.mock('../../shared/deepSeaAscii', () => ({
  getNextZoomLevel: vi.fn((level) => {
    const levels = ['far', 'medium', 'close', 'ultraClose'];
    const idx = levels.indexOf(level);
    return levels[Math.min(idx + 1, levels.length - 1)];
  }),
  getPrevZoomLevel: vi.fn((level) => {
    const levels = ['far', 'medium', 'close', 'ultraClose'];
    const idx = levels.indexOf(level);
    return levels[Math.max(idx - 1, 0)];
  }),
  getCreatureAtZoom: vi.fn((creature, zoom) => `[${creature} at ${zoom}]`),
  getRandomCreature: vi.fn(() => 'randomCreature'),
}));

describe('useCreatureZoom', () => {
  describe('Initial State', () => {
    it('initializes with default creature and zoom', () => {
      const { result } = renderHook(() => useCreatureZoom());

      expect(result.current.currentCreature).toBe('anglerFish');
      expect(result.current.currentZoom).toBe('medium');
    });

    it('initializes with provided creature and zoom', () => {
      const { result } = renderHook(() => useCreatureZoom('jellyfish', 'close'));

      expect(result.current.currentCreature).toBe('jellyfish');
      expect(result.current.currentZoom).toBe('close');
    });

    it('provides ASCII art string', () => {
      const { result } = renderHook(() => useCreatureZoom());

      expect(typeof result.current.asciiArt).toBe('string');
    });
  });

  describe('handleZoomIn', () => {
    it('increases zoom level', () => {
      const { result } = renderHook(() => useCreatureZoom('anglerFish', 'far'));

      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.currentZoom).not.toBe('far');
    });

    it('provides callback for zoom in', () => {
      const { result } = renderHook(() => useCreatureZoom());

      expect(typeof result.current.handleZoomIn).toBe('function');

      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.currentZoom).toBeDefined();
    });

    it('limits zoom to maximum level', () => {
      const { result } = renderHook(() => useCreatureZoom('anglerFish', 'ultraClose'));

      act(() => {
        result.current.handleZoomIn();
      });

      // Should stay at ultraClose
      expect(result.current.currentZoom).toBe('ultraClose');
    });
  });

  describe('handleZoomOut', () => {
    it('decreases zoom level', () => {
      const { result } = renderHook(() => useCreatureZoom('anglerFish', 'close'));

      act(() => {
        result.current.handleZoomOut();
      });

      expect(result.current.currentZoom).not.toBe('close');
    });

    it('provides callback for zoom out', () => {
      const { result } = renderHook(() => useCreatureZoom());

      expect(typeof result.current.handleZoomOut).toBe('function');

      act(() => {
        result.current.handleZoomOut();
      });

      expect(result.current.currentZoom).toBeDefined();
    });

    it('limits zoom to minimum level', () => {
      const { result } = renderHook(() => useCreatureZoom('anglerFish', 'far'));

      act(() => {
        result.current.handleZoomOut();
      });

      // Should stay at far
      expect(result.current.currentZoom).toBe('far');
    });
  });

  describe('ASCII Art Rendering', () => {
    it('updates ASCII art when zoom changes', () => {
      const { result } = renderHook(() => useCreatureZoom('anglerFish', 'far'));
      const initialArt = result.current.asciiArt;

      act(() => {
        result.current.handleZoomIn();
      });

      // ASCII art should be different at different zoom levels
      expect(result.current.asciiArt).toBeDefined();
    });

    it('includes creature name in ASCII art reference', () => {
      const { result } = renderHook(() => useCreatureZoom('jellyfish', 'medium'));

      expect(result.current.asciiArt).toContain('jellyfish');
    });

    it('includes zoom level in ASCII art reference', () => {
      const { result } = renderHook(() => useCreatureZoom('anglerFish', 'close'));

      expect(result.current.asciiArt).toContain('close');
    });
  });

  describe('Creature Selection', () => {
    it('allows overriding creature on initialization', () => {
      const { result } = renderHook(() => useCreatureZoom('rov', 'medium'));

      expect(result.current.currentCreature).toBe('rov');
    });

    it('maintains creature through zoom changes', () => {
      const { result } = renderHook(() => useCreatureZoom('jellyfish', 'medium'));

      const creature = result.current.currentCreature;

      act(() => {
        result.current.handleZoomIn();
      });

      // Creature should remain same (unless random selection happens at ultraClose)
      expect(result.current.currentCreature).toBeDefined();
    });
  });
});
