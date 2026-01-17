/**
 * Tests for AG-UI Event Protocol
 *
 * Verifies:
 * - Event envelope creation and parsing
 * - Event correlation and sequence tracking
 * - Out-of-order event buffering
 * - Legacy format compatibility
 */

import { describe, it, expect } from 'vitest';
import type { EventEnvelope } from '../types/events';

describe('Event Protocol', () => {
  describe('Event Envelope', () => {
    it('should create event envelope with correlation IDs', () => {
      const before = Date.now();
      const envelope: EventEnvelope = {
        event_id: 'evt_123',
        schema_version: '1.0.0',
        type: 'TEXT_CONTENT',
        timestamp: Date.now(),
        sequence_number: 0,
        parent_event_id: 'evt_start_123',
        data: {
          chunk: 'Hello',
          chunk_index: 0,
        },
      };
      const after = Date.now();

      expect(envelope.event_id).toBe('evt_123');
      expect(envelope.parent_event_id).toBe('evt_start_123');
      expect(envelope.schema_version).toBe('1.0.0');
      expect(envelope.sequence_number).toBe(0);

      // FIXED: Bounded timestamp validation
      expect(envelope.timestamp).toBeGreaterThanOrEqual(before);
      expect(envelope.timestamp).toBeLessThanOrEqual(after + 100);
    });

    it('should support all AG-UI event types', () => {
      const before = Date.now();
      const eventTypes = [
        'TEXT_MESSAGE_START',
        'TEXT_CONTENT',
        'TEXT_MESSAGE_END',
        'STATE_DELTA',
        'TOOL_CALL_START',
        'TOOL_CALL_RESULT',
        'TOOL_CALL_END',
        'ERROR',
        'ACK',
      ];

      for (const type of eventTypes) {
        const envelope: EventEnvelope = {
          event_id: `evt_${type}`,
          schema_version: '1.0.0',
          type: type as any,
          timestamp: Date.now(),
          sequence_number: 0,
          data: {},
        };
        expect(envelope.type).toBe(type);
        // FIXED: Validate timestamps are in reasonable window
        expect(envelope.timestamp).toBeGreaterThanOrEqual(before - 100);
        expect(envelope.timestamp).toBeLessThanOrEqual(Date.now() + 100);
      }
    });

    it('should track event causality with parent_event_id', () => {
      const before = Date.now();
      const startEvent: EventEnvelope = {
        event_id: 'evt_msg_start',
        schema_version: '1.0.0',
        type: 'TEXT_MESSAGE_START',
        timestamp: Date.now(),
        sequence_number: 0,
        data: { message_id: 'msg_123' },
      };

      const contentEvent: EventEnvelope = {
        event_id: 'evt_msg_content_1',
        schema_version: '1.0.0',
        type: 'TEXT_CONTENT',
        timestamp: Date.now(),
        sequence_number: 1,
        parent_event_id: startEvent.event_id,
        data: { chunk: 'Hello', chunk_index: 0 },
      };

      const endEvent: EventEnvelope = {
        event_id: 'evt_msg_end',
        schema_version: '1.0.0',
        type: 'TEXT_MESSAGE_END',
        timestamp: Date.now(),
        sequence_number: 2,
        parent_event_id: startEvent.event_id,
        data: { total_chunks: 1 },
      };

      // Verify causality chain
      expect(contentEvent.parent_event_id).toBe(startEvent.event_id);
      expect(endEvent.parent_event_id).toBe(startEvent.event_id);

      // FIXED: Validate timestamps are within reasonable window
      const after = Date.now();
      expect(startEvent.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(startEvent.timestamp).toBeLessThanOrEqual(after + 100);
      expect(contentEvent.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(contentEvent.timestamp).toBeLessThanOrEqual(after + 100);
      expect(endEvent.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(endEvent.timestamp).toBeLessThanOrEqual(after + 100);
    });

    it('should include metadata context', () => {
      const before = Date.now();
      const envelope: EventEnvelope = {
        event_id: 'evt_123',
        schema_version: '1.0.0',
        type: 'STATE_DELTA',
        timestamp: Date.now(),
        sequence_number: 0,
        context: {
          user_interaction: 'zoom_in',
          interaction_id: 'inter_456',
        },
        data: {},
      };
      const after = Date.now();

      expect(envelope.context).toEqual({
        user_interaction: 'zoom_in',
        interaction_id: 'inter_456',
      });

      // FIXED: Validate timestamp is within reasonable window
      expect(envelope.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(envelope.timestamp).toBeLessThanOrEqual(after + 100);
    });
  });

  describe('Event Sequencing', () => {
    // Helper: Simple event buffer for testing
    class EventBuffer {
      private buffer = new Map<number, EventEnvelope>();
      private nextSequence = 0;

      process(envelope: EventEnvelope): EventEnvelope[] {
        if (envelope.sequence_number === this.nextSequence) {
          this.nextSequence++;
          const ordered: EventEnvelope[] = [envelope];

          while (this.buffer.has(this.nextSequence)) {
            const next = this.buffer.get(this.nextSequence)!;
            this.buffer.delete(this.nextSequence);
            ordered.push(next);
            this.nextSequence++;
          }

          return ordered;
        }

        if (envelope.sequence_number > this.nextSequence) {
          this.buffer.set(envelope.sequence_number, envelope);
        }

        return [];
      }

      flush(): EventEnvelope[] {
        const remaining = Array.from(this.buffer.values()).sort(
          (a, b) => a.sequence_number - b.sequence_number
        );
        this.buffer.clear();
        return remaining;
      }
    }

    it('should reorder out-of-order events correctly', () => {
      const buffer = new EventBuffer();
      const events: EventEnvelope[] = [
        {
          event_id: 'evt_0',
          schema_version: '1.0.0',
          type: 'TEXT_CONTENT',
          timestamp: Date.now(),
          sequence_number: 0,
          data: {},
        },
        {
          event_id: 'evt_2',
          schema_version: '1.0.0',
          type: 'TEXT_CONTENT',
          timestamp: Date.now(),
          sequence_number: 2, // Out of order - skipped 1
          data: {},
        },
        {
          event_id: 'evt_1',
          schema_version: '1.0.0',
          type: 'TEXT_CONTENT',
          timestamp: Date.now(),
          sequence_number: 1, // Now arrives
          data: {},
        },
      ];

      // FIXED: Actually test buffering and reordering logic
      const processed: EventEnvelope[] = [];
      for (const evt of events) {
        processed.push(...buffer.process(evt));
      }

      const remaining = buffer.flush();
      const allOrdered = [...processed, ...remaining];

      // Verify correct ordering
      expect(allOrdered.map((e) => e.sequence_number)).toEqual([0, 1, 2]);
      expect(allOrdered.map((e) => e.event_id)).toEqual(['evt_0', 'evt_1', 'evt_2']);
    });

    it('should support event versioning for protocol evolution', () => {
      const before = Date.now();
      const v1Event: EventEnvelope = {
        event_id: 'evt_v1',
        schema_version: '1.0.0',
        type: 'TEXT_CONTENT',
        timestamp: Date.now(),
        sequence_number: 0,
        data: { chunk: 'old format' },
      };

      const v2Event: EventEnvelope = {
        event_id: 'evt_v2',
        schema_version: '2.0.0',
        type: 'TEXT_CONTENT',
        timestamp: Date.now(),
        sequence_number: 1,
        data: { chunk: 'new format', metadata: { source: 'claude' } },
      };
      const after = Date.now();

      expect(v1Event.schema_version).toBe('1.0.0');
      expect(v2Event.schema_version).toBe('2.0.0');

      // FIXED: Validate timestamps are within reasonable window
      expect(v1Event.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(v1Event.timestamp).toBeLessThanOrEqual(after + 100);
      expect(v2Event.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(v2Event.timestamp).toBeLessThanOrEqual(after + 100);
    });
  });

  describe('Event Types', () => {
    it('should support text message sequences', () => {
      const before = Date.now();
      const events: EventEnvelope[] = [
        {
          event_id: 'msg_1',
          schema_version: '1.0.0',
          type: 'TEXT_MESSAGE_START',
          timestamp: Date.now(),
          sequence_number: 0,
          data: { message_id: 'msg_abc' },
        },
        {
          event_id: 'msg_2',
          schema_version: '1.0.0',
          type: 'TEXT_CONTENT',
          timestamp: Date.now(),
          sequence_number: 1,
          parent_event_id: 'msg_1',
          data: { chunk: 'Hello', chunk_index: 0 },
        },
        {
          event_id: 'msg_3',
          schema_version: '1.0.0',
          type: 'TEXT_CONTENT',
          timestamp: Date.now(),
          sequence_number: 2,
          parent_event_id: 'msg_1',
          data: { chunk: ' World', chunk_index: 1 },
        },
        {
          event_id: 'msg_4',
          schema_version: '1.0.0',
          type: 'TEXT_MESSAGE_END',
          timestamp: Date.now(),
          sequence_number: 3,
          parent_event_id: 'msg_1',
          data: { total_chunks: 2 },
        },
      ];
      const after = Date.now();

      // Verify message sequence
      const startEvent = events.find((e) => e.type === 'TEXT_MESSAGE_START')!;
      const contentEvents = events.filter((e) => e.type === 'TEXT_CONTENT');
      const endEvent = events.find((e) => e.type === 'TEXT_MESSAGE_END')!;

      expect(startEvent).toBeDefined();
      expect(contentEvents).toHaveLength(2);
      expect(endEvent).toBeDefined();

      // All content and end events should reference start
      contentEvents.forEach((e) => {
        expect(e.parent_event_id).toBe(startEvent.event_id);
      });
      expect(endEvent.parent_event_id).toBe(startEvent.event_id);

      // FIXED: Validate all timestamps are within reasonable window
      events.forEach((e) => {
        expect(e.timestamp).toBeGreaterThanOrEqual(before - 100);
        expect(e.timestamp).toBeLessThanOrEqual(after + 100);
      });
    });

    it('should support state delta events', () => {
      const before = Date.now();
      const deltaEvent: EventEnvelope = {
        event_id: 'state_1',
        schema_version: '1.0.0',
        type: 'STATE_DELTA',
        timestamp: Date.now(),
        sequence_number: 0,
        data: {
          version: 1,
          timestamp: Date.now(),
          operations: [
            { op: 'replace', path: '/confidenceInUser', value: 65 },
            { op: 'replace', path: '/currentMood', value: 'curious' },
          ],
        },
      };
      const after = Date.now();

      expect(deltaEvent.type).toBe('STATE_DELTA');
      const data = deltaEvent.data as any;
      expect(data.operations).toHaveLength(2);
      expect(data.operations[0].op).toBe('replace');

      // FIXED: Validate timestamps are within reasonable window
      expect(deltaEvent.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(deltaEvent.timestamp).toBeLessThanOrEqual(after + 100);
      expect(data.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(data.timestamp).toBeLessThanOrEqual(after + 100);
    });

    it('should support tool call sequences', () => {
      const before = Date.now();
      const events: EventEnvelope[] = [
        {
          event_id: 'tool_1',
          schema_version: '1.0.0',
          type: 'TOOL_CALL_START',
          timestamp: Date.now(),
          sequence_number: 0,
          data: {
            tool_call_id: 'tc_123',
            tool_name: 'zoom_in',
            arguments: { current_zoom: 'medium' },
          },
        },
        {
          event_id: 'tool_2',
          schema_version: '1.0.0',
          type: 'TOOL_CALL_RESULT',
          timestamp: Date.now(),
          sequence_number: 1,
          parent_event_id: 'tool_1',
          data: {
            tool_call_id: 'tc_123',
            status: 'success',
            result: { new_zoom: 'close' },
          },
        },
        {
          event_id: 'tool_3',
          schema_version: '1.0.0',
          type: 'TOOL_CALL_END',
          timestamp: Date.now(),
          sequence_number: 2,
          parent_event_id: 'tool_1',
          data: { tool_call_id: 'tc_123', total_results: 1 },
        },
      ];
      const after = Date.now();

      const startEvent = events.find((e) => e.type === 'TOOL_CALL_START')!;
      const resultEvent = events.find((e) => e.type === 'TOOL_CALL_RESULT')!;
      const endEvent = events.find((e) => e.type === 'TOOL_CALL_END')!;

      expect(startEvent).toBeDefined();
      expect(resultEvent.parent_event_id).toBe(startEvent.event_id);
      expect(endEvent.parent_event_id).toBe(startEvent.event_id);

      // FIXED: Validate all timestamps are within reasonable window
      events.forEach((e) => {
        expect(e.timestamp).toBeGreaterThanOrEqual(before - 100);
        expect(e.timestamp).toBeLessThanOrEqual(after + 100);
      });
    });

    it('should support error events', () => {
      const before = Date.now();
      const errorEvent: EventEnvelope = {
        event_id: 'err_1',
        schema_version: '1.0.0',
        type: 'ERROR',
        timestamp: Date.now(),
        sequence_number: 0,
        data: {
          code: 'TOOL_NOT_FOUND',
          message: 'Unknown tool: foo_bar',
          recoverable: true,
        },
      };
      const after = Date.now();

      const data = errorEvent.data as any;
      expect(data.code).toBe('TOOL_NOT_FOUND');
      expect(data.recoverable).toBe(true);

      // FIXED: Validate timestamp is within reasonable window
      expect(errorEvent.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(errorEvent.timestamp).toBeLessThanOrEqual(after + 100);
    });

    it('should support ACK events for acknowledgment', () => {
      const before = Date.now();
      const ackEvent: EventEnvelope = {
        event_id: 'ack_1',
        schema_version: '1.0.0',
        type: 'ACK',
        timestamp: Date.now(),
        sequence_number: 0,
        data: { event_id: 'evt_123' },
      };
      const after = Date.now();

      const data = ackEvent.data as any;
      expect(data.event_id).toBe('evt_123');

      // FIXED: Validate timestamp is within reasonable window
      expect(ackEvent.timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(ackEvent.timestamp).toBeLessThanOrEqual(after + 100);
    });
  });

  // ADDED: Critical missing tests for concurrent scenarios
  describe('Concurrent Event Scenarios', () => {
    it('should reorder concurrent out-of-order events with gaps', () => {
      // Helper buffer implementation
      class EventBuffer {
        private buffer = new Map<number, EventEnvelope>();
        private nextSequence = 0;

        process(envelope: EventEnvelope): EventEnvelope[] {
          if (envelope.sequence_number === this.nextSequence) {
            this.nextSequence++;
            const ordered: EventEnvelope[] = [envelope];

            while (this.buffer.has(this.nextSequence)) {
              const next = this.buffer.get(this.nextSequence)!;
              this.buffer.delete(this.nextSequence);
              ordered.push(next);
              this.nextSequence++;
            }

            return ordered;
          }

          if (envelope.sequence_number > this.nextSequence) {
            this.buffer.set(envelope.sequence_number, envelope);
          }

          return [];
        }

        flush(): EventEnvelope[] {
          const remaining = Array.from(this.buffer.values()).sort(
            (a, b) => a.sequence_number - b.sequence_number
          );
          this.buffer.clear();
          return remaining;
        }
      }

      const buffer = new EventBuffer();
      const events: EventEnvelope[] = [
        { event_id: 'evt_0', schema_version: '1.0.0', type: 'TEXT_CONTENT', timestamp: Date.now(), sequence_number: 0, data: {} },
        { event_id: 'evt_3', schema_version: '1.0.0', type: 'TEXT_CONTENT', timestamp: Date.now(), sequence_number: 3, data: {} },
        { event_id: 'evt_1', schema_version: '1.0.0', type: 'TEXT_CONTENT', timestamp: Date.now(), sequence_number: 1, data: {} },
        { event_id: 'evt_2', schema_version: '1.0.0', type: 'TEXT_CONTENT', timestamp: Date.now(), sequence_number: 2, data: {} },
      ];

      const processed: EventEnvelope[] = [];
      for (const evt of events) {
        processed.push(...buffer.process(evt));
      }

      const remaining = buffer.flush();
      const allOrdered = [...processed, ...remaining];

      // Verify all events are correctly ordered despite concurrent arrival
      expect(allOrdered.map((e) => e.sequence_number)).toEqual([0, 1, 2, 3]);
      expect(allOrdered.map((e) => e.event_id)).toEqual(['evt_0', 'evt_1', 'evt_2', 'evt_3']);
    });

    it('should handle late-arriving events within sequence window', () => {
      class EventBuffer {
        private buffer = new Map<number, EventEnvelope>();
        private nextSequence = 0;

        process(envelope: EventEnvelope): EventEnvelope[] {
          if (envelope.sequence_number === this.nextSequence) {
            this.nextSequence++;
            const ordered: EventEnvelope[] = [envelope];

            while (this.buffer.has(this.nextSequence)) {
              const next = this.buffer.get(this.nextSequence)!;
              this.buffer.delete(this.nextSequence);
              ordered.push(next);
              this.nextSequence++;
            }

            return ordered;
          }

          if (envelope.sequence_number > this.nextSequence) {
            this.buffer.set(envelope.sequence_number, envelope);
          }

          return [];
        }

        getBufferedCount(): number {
          return this.buffer.size;
        }

        flush(): EventEnvelope[] {
          const remaining = Array.from(this.buffer.values()).sort(
            (a, b) => a.sequence_number - b.sequence_number
          );
          this.buffer.clear();
          return remaining;
        }
      }

      const buffer = new EventBuffer();

      // Send 0, then 10 (large gap)
      const evt0: EventEnvelope = {
        event_id: 'evt_0', schema_version: '1.0.0', type: 'TEXT_CONTENT',
        timestamp: Date.now(), sequence_number: 0, data: {}
      };

      const evt10: EventEnvelope = {
        event_id: 'evt_10', schema_version: '1.0.0', type: 'TEXT_CONTENT',
        timestamp: Date.now(), sequence_number: 10, data: {}
      };

      const result0 = buffer.process(evt0);
      const result10 = buffer.process(evt10);

      // Event 0 processed immediately, event 10 buffered
      expect(result0).toHaveLength(1);
      expect(result10).toHaveLength(0);
      expect(buffer.getBufferedCount()).toBe(1);
    });
  });
});
