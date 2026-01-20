import { describe, it, expect } from 'vitest';
import type { InteractionMemory, InterruptMemory } from '../types';

describe('InterruptMemory', () => {
  it('should be a valid InteractionMemory variant', () => {
    const interruptMemory: InterruptMemory = {
      timestamp: Date.now(),
      type: 'interrupt',
      interruptNumber: 1,
      blockedResponseStart: 'I was about to say...',
      blockedResponseLength: 150,
      content: 'interrupt',
      duration: 0,
      depth: 'surface',
    };

    // Should compile and be assignable to InteractionMemory
    const memory: InteractionMemory = interruptMemory;
    expect(memory.type).toBe('interrupt');
  });

  it('should support optional fields for future iterations (Option B & C)', () => {
    const minimalInterrupt: InterruptMemory = {
      timestamp: Date.now(),
      type: 'interrupt',
      interruptNumber: 1,
      content: 'interrupt',
      duration: 0,
      depth: 'surface',
      // Optional fields omitted - should still be valid
    };

    expect(minimalInterrupt.blockedResponseStart).toBeUndefined();
    expect(minimalInterrupt.blockedResponseLength).toBeUndefined();
    expect(minimalInterrupt.assessmentAtInterrupt).toBeUndefined();
    expect(minimalInterrupt.creatureMoodAtInterrupt).toBeUndefined();
  });

  it('should support all fields for future Option B/C prompt iterations', () => {
    const fullInterrupt: InterruptMemory = {
      timestamp: Date.now(),
      type: 'interrupt',
      interruptNumber: 1,

      // Option B fields
      blockedResponseStart: 'First chunk of response',
      blockedResponseLength: 42,

      // Option C fields
      assessmentAtInterrupt: 'I was being vulnerable here',
      creatureMoodAtInterrupt: 'jellyfish',

      // Required fields
      content: 'interrupt',
      duration: 0,
      depth: 'surface',
    };

    expect(fullInterrupt.blockedResponseStart).toBe('First chunk of response');
    expect(fullInterrupt.blockedResponseLength).toBe(42);
    expect(fullInterrupt.assessmentAtInterrupt).toBe('I was being vulnerable here');
    expect(fullInterrupt.creatureMoodAtInterrupt).toBe('jellyfish');
  });

  it('should be filterable by type discriminator', () => {
    const memories: InteractionMemory[] = [
      {
        type: 'response',
        content: 'hello',
        timestamp: 1,
        duration: 0,
        depth: 'moderate',
      },
      {
        type: 'interrupt',
        interruptNumber: 1,
        content: 'interrupt',
        timestamp: 2,
        duration: 0,
        depth: 'surface',
      },
      {
        type: 'tool_call',
        content: 'zoom_in',
        timestamp: 3,
        duration: 0,
        depth: 'surface',
        toolData: { action: 'zoom_in', timestamp: 3, sequenceNumber: 1 },
      },
    ];

    const interrupts = memories.filter(m => m.type === 'interrupt');
    expect(interrupts).toHaveLength(1);
    expect(interrupts[0].type).toBe('interrupt');
    if (interrupts[0].type === 'interrupt') {
      expect(interrupts[0].interruptNumber).toBe(1);
    }
  });

  it('should support accurate message count filtering (Option A: exclude interrupts)', () => {
    const memories: InteractionMemory[] = [
      { type: 'response', content: 'msg1', timestamp: 1, duration: 0, depth: 'moderate' },
      { type: 'question', content: 'msg2', timestamp: 2, duration: 0, depth: 'deep' },
      { type: 'interrupt', interruptNumber: 1, content: 'interrupt', timestamp: 3, duration: 0, depth: 'surface' },
      { type: 'response', content: 'msg3', timestamp: 4, duration: 0, depth: 'moderate' },
      { type: 'tool_call', content: 'tool', timestamp: 5, duration: 0, depth: 'surface', toolData: {} as any },
      { type: 'interrupt', interruptNumber: 2, content: 'interrupt', timestamp: 6, duration: 0, depth: 'surface' },
    ];

    // Message count should be 3 (exclude tool_call and interrupts)
    const messageCount = memories.filter(m =>
      m.type !== 'tool_call' && m.type !== 'interrupt'
    ).length;
    const toolCount = memories.filter(m => m.type === 'tool_call').length;
    const interruptCount = memories.filter(m => m.type === 'interrupt').length;

    expect(messageCount).toBe(3);
    expect(toolCount).toBe(1);
    expect(interruptCount).toBe(2);
  });
});
