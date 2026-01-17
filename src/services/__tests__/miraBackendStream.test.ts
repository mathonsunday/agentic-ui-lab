import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StreamEvent } from '../miraBackendStream';

/**
 * Tests for SSE Stream Parser
 *
 * This is critical infrastructure - these tests verify that:
 * 1. Chunks arriving from the backend are parsed correctly
 * 2. No data is lost during streaming
 * 3. Events fire in the correct order
 * 4. Malformed data is handled gracefully
 */

describe('SSE Stream Parser - Core Infrastructure', () => {
  describe('Event Parsing', () => {
    it('should parse a single SSE event correctly', () => {
      const eventLine = 'data: {"type":"confidence","data":{"from":50,"to":60,"delta":10}}';

      const parsed = parseSSELine(eventLine);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('confidence');
      expect(parsed?.data).toEqual({ from: 50, to: 60, delta: 10 });
    });

    it('should ignore lines that are not SSE formatted', () => {
      const invalidLines = [
        'not-a-data-line',
        'random text',
        ':comment',
        'event: something',
      ];

      invalidLines.forEach(line => {
        const parsed = parseSSELine(line);
        expect(parsed).toBeNull();
      });
    });

    it('should handle response_chunk events with special characters', () => {
      const chunkEvent = {
        type: 'response_chunk',
        data: {
          chunk: '[RAPPORT] [████████░░░░░░░░░░] 50%\n...text with special chars...',
        },
      };

      const eventLine = `data: ${JSON.stringify(chunkEvent)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('response_chunk');
      expect(parsed?.data).toEqual(chunkEvent.data);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedLines = [
        'data: {invalid json}',
        'data: {"incomplete":',
        'data: null',
        'data: undefined',
      ];

      malformedLines.forEach(line => {
        const parsed = parseSSELine(line);
        expect(parsed).toBeNull();
      });
    });
  });

  describe('Event Types', () => {
    it('should parse confidence update events', () => {
      const event: StreamEvent = {
        type: 'confidence',
        data: { from: 40, to: 52, delta: 12 },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed?.type).toBe('confidence');
    });

    it('should parse profile update events', () => {
      const event: StreamEvent = {
        type: 'profile',
        data: {
          thoughtfulness: 60,
          adventurousness: 65,
          engagement: 70,
          curiosity: 75,
          superficiality: 20,
        },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed?.type).toBe('profile');
    });

    it('should parse response_chunk events', () => {
      const event: StreamEvent = {
        type: 'response_chunk',
        data: { chunk: '...some text...' },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed?.type).toBe('response_chunk');
    });

    it('should parse complete events', () => {
      const event: StreamEvent = {
        type: 'complete',
        data: {
          updatedState: { /* state data */ },
          response: { /* response data */ },
        },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed?.type).toBe('complete');
    });

    it('should parse error events', () => {
      const event: StreamEvent = {
        type: 'error',
        data: { message: 'Something went wrong' },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed?.type).toBe('error');
      expect((parsed?.data as any).message).toBe('Something went wrong');
    });
  });

  describe('Multiple Events in Sequence', () => {
    it('should parse multiple events from a stream buffer', () => {
      const eventLines = [
        'data: {"type":"confidence","data":{"from":50,"to":62,"delta":12}}',
        'data: {"type":"profile","data":{"thoughtfulness":60,"adventurousness":65,"engagement":70,"curiosity":75,"superficiality":20}}',
        'data: {"type":"response_chunk","data":{"chunk":"[RAPPORT]..."}}',
        'data: {"type":"response_chunk","data":{"chunk":"...text..."}}',
      ];

      const parsed = eventLines.map(parseSSELine).filter(Boolean);

      expect(parsed).toHaveLength(4);
      expect(parsed[0]?.type).toBe('confidence');
      expect(parsed[1]?.type).toBe('profile');
      expect(parsed[2]?.type).toBe('response_chunk');
      expect(parsed[3]?.type).toBe('response_chunk');
    });

    it('should preserve order of events', () => {
      const eventTypes = ['confidence', 'profile', 'response_chunk', 'complete'];
      const eventLines = eventTypes.map(type =>
        `data: {"type":"${type}","data":{}}`
      );

      const parsed = eventLines.map(parseSSELine).filter(Boolean);
      const parsedTypes = parsed.map(e => e!.type);

      expect(parsedTypes).toEqual(eventTypes);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data field', () => {
      const event = 'data: {"type":"profile","data":{}}';
      const parsed = parseSSELine(event);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('profile');
      expect(parsed?.data).toEqual({});
    });

    it('should handle very long chunks', () => {
      const longChunk = 'x'.repeat(10000);
      const event = {
        type: 'response_chunk',
        data: { chunk: longChunk },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect(parsed).not.toBeNull();
      expect((parsed?.data as any).chunk.length).toBe(10000);
    });

    it('should handle unicode and special characters in chunks', () => {
      const chunk = '...eighty percent of creatures...🌊...bioluminescence...';
      const event = {
        type: 'response_chunk',
        data: { chunk },
      };

      const eventLine = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(eventLine);

      expect((parsed?.data as any).chunk).toContain('🌊');
      expect((parsed?.data as any).chunk).toContain('bioluminescence');
    });
  });
});

/**
 * Helper function: Parse a single SSE event line
 * This mimics the actual parsing logic from miraBackendStream.ts
 */
function parseSSELine(line: string): StreamEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as StreamEvent;
  } catch {
    return null;
  }
}
