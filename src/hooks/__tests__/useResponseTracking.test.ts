import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResponseTracking } from '../useResponseTracking';

/**
 * useResponseTracking Hook Tests
 *
 * Tests that response line tracking works correctly to prevent ID mismatches:
 * 1. Line IDs are unique and incrementing
 * 2. Response lines are properly tracked
 * 3. Sequential animation state is managed correctly
 * 4. Reset works as expected
 */
describe('useResponseTracking', () => {
  it('should create response lines with unique, incrementing IDs', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('First chunk', 'text');
    const line2 = result.current.createResponseLine('Second chunk', 'text');
    const line3 = result.current.createResponseLine('Third chunk', 'text');

    expect(line1.id).toBe('0');
    expect(line2.id).toBe('1');
    expect(line3.id).toBe('2');
  });

  it('should track text response lines for animation', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line = result.current.createResponseLine('Text chunk', 'text');

    expect(result.current.isResponseLine(line.id)).toBe(true);
    expect(result.current.responseLineIds.current).toContain(line.id);
  });

  it('should not track system lines for animation', () => {
    const { result } = renderHook(() => useResponseTracking());

    const sysLine = result.current.createResponseLine('System message', 'system');

    // System lines should not be in response tracking
    expect(result.current.isResponseLine(sysLine.id)).toBe(false);
    expect(result.current.responseLineIds.current).not.toContain(sysLine.id);
  });

  it('should set first response line as currently animating', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('First', 'text');

    expect(result.current.isCurrentlyAnimating(line1.id)).toBe(true);
    expect(result.current.currentAnimatingLineId.current).toBe(line1.id);
  });

  it('should not change animating line when creating subsequent lines', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('First', 'text');
    const line2 = result.current.createResponseLine('Second', 'text');

    // First line should still be animating
    expect(result.current.isCurrentlyAnimating(line1.id)).toBe(true);
    expect(result.current.isCurrentlyAnimating(line2.id)).toBe(false);
  });

  it('should move to next animating line', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('First', 'text');
    const line2 = result.current.createResponseLine('Second', 'text');
    const line3 = result.current.createResponseLine('Third', 'text');

    // Initially first line is animating
    expect(result.current.isCurrentlyAnimating(line1.id)).toBe(true);

    // Move to next
    const nextId = result.current.moveToNextAnimatingLine();
    expect(nextId).toBe(line2.id);
    expect(result.current.isCurrentlyAnimating(line2.id)).toBe(true);
    expect(result.current.isCurrentlyAnimating(line1.id)).toBe(false);

    // Move to next again
    const nextId2 = result.current.moveToNextAnimatingLine();
    expect(nextId2).toBe(line3.id);
    expect(result.current.isCurrentlyAnimating(line3.id)).toBe(true);

    // Move past end
    const nextId3 = result.current.moveToNextAnimatingLine();
    expect(nextId3).toBeNull();
    expect(result.current.currentAnimatingLineId.current).toBeNull();
  });

  it('should return null when moving to next if already at end', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('Only', 'text');

    // Already at first (and last)
    expect(result.current.isCurrentlyAnimating(line1.id)).toBe(true);

    // Moving to next should return null
    const nextId = result.current.moveToNextAnimatingLine();
    expect(nextId).toBeNull();
  });

  it('should return null when moving to next with no animating line', () => {
    const { result } = renderHook(() => useResponseTracking());

    // No lines created yet
    const nextId = result.current.moveToNextAnimatingLine();
    expect(nextId).toBeNull();
  });

  it('should reset tracking', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('First', 'text');
    const line2 = result.current.createResponseLine('Second', 'text');

    expect(result.current.isResponseLine(line1.id)).toBe(true);
    expect(result.current.isResponseLine(line2.id)).toBe(true);
    expect(result.current.isCurrentlyAnimating(line1.id)).toBe(true);

    // Reset
    result.current.resetTracking();

    expect(result.current.isResponseLine(line1.id)).toBe(false);
    expect(result.current.isResponseLine(line2.id)).toBe(false);
    expect(result.current.currentAnimatingLineId.current).toBeNull();
    expect(result.current.responseLineIds.current).toHaveLength(0);
  });

  it('should continue incrementing line IDs after reset', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line1 = result.current.createResponseLine('First', 'text');
    expect(line1.id).toBe('0');

    result.current.resetTracking();

    // ID counter should not reset, only tracking data
    const line2 = result.current.createResponseLine('After reset', 'text');
    expect(line2.id).toBe('1');
  });

  it('should provide current line count', () => {
    const { result } = renderHook(() => useResponseTracking());

    expect(result.current.getCurrentLineCount()).toBe(0);

    result.current.createResponseLine('First', 'text');
    expect(result.current.getCurrentLineCount()).toBe(1);

    result.current.createResponseLine('Second', 'text');
    expect(result.current.getCurrentLineCount()).toBe(2);
  });

  it('should create lines with correct metadata', () => {
    const { result } = renderHook(() => useResponseTracking());

    const line = result.current.createResponseLine('Test content', 'text');

    expect(line.id).toBeDefined();
    expect(line.type).toBe('text');
    expect(line.content).toBe('Test content');
    expect(line.timestamp).toBeDefined();
    expect(typeof line.timestamp).toBe('number');
  });

  it('should prevent ID mismatch bug', () => {
    const { result } = renderHook(() => useResponseTracking());

    // Create multiple lines quickly
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(result.current.createResponseLine(`Chunk ${i}`, 'text'));
    }

    // All IDs should be unique and sequential
    const ids = lines.map(l => l.id);
    expect(ids).toEqual(['0', '1', '2', '3', '4']);

    // All should be tracked as response lines
    lines.forEach(line => {
      expect(result.current.isResponseLine(line.id)).toBe(true);
    });

    // IDs in tracking should match IDs on lines
    expect(result.current.responseLineIds.current).toEqual(ids);
  });
});
