/**
 * Tests for StreamEventSequencer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamEventSequencer } from '../lib/streamEventSequencer';
import type { MiraState, AgentResponse } from '../lib/types';

// Mock VercelResponse
const createMockResponse = () => {
  const writes: string[] = [];
  return {
    write: vi.fn((data: string) => {
      writes.push(data);
    }),
    end: vi.fn(),
    writes,
  };
};

describe('StreamEventSequencer', () => {
  let mockResponse: any;
  let sequencer: StreamEventSequencer;

  beforeEach(() => {
    mockResponse = createMockResponse();
    sequencer = new StreamEventSequencer(mockResponse);
  });

  describe('Event ID Generation', () => {
    it('generates unique event IDs', async () => {
      const eventIds = new Set<string>();
      for (let i = 0; i < 10; i++) {
        await sequencer.sendAnalysis('test', {
          thoughtfulness: 50,
          adventurousness: 50,
          engagement: 50,
          curiosity: 50,
          superficiality: 50,
        }, 5);
      }

      const writes = mockResponse.writes;
      const eventIds_found = writes.map((w: string) => {
        const json = JSON.parse(w.replace('data: ', ''));
        return json.event_id;
      });

      // All should be unique
      expect(new Set(eventIds_found).size).toBe(eventIds_found.length);
    });

    it('generates event IDs with evt_ prefix', async () => {
      await sequencer.sendAnalysis('test', {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      }, 5);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.event_id).toMatch(/^evt_/);
    });
  });

  describe('sendStateUpdate', () => {
    it('sends STATE_DELTA event', async () => {
      await sequencer.sendStateUpdate(75, {
        thoughtfulness: 60,
        adventurousness: 70,
        engagement: 80,
        curiosity: 75,
        superficiality: 20,
      });

      expect(mockResponse.write).toHaveBeenCalled();
      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.type).toBe('STATE_DELTA');
    });

    it('includes confidence in state delta', async () => {
      await sequencer.sendStateUpdate(75, {
        thoughtfulness: 60,
        adventurousness: 70,
        engagement: 80,
        curiosity: 75,
        superficiality: 20,
      });

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      const confidenceOp = json.data.operations.find((op: any) => op.path === '/confidenceInUser');
      expect(confidenceOp.value).toBe(75);
    });

    it('includes user profile in state delta', async () => {
      const metrics = {
        thoughtfulness: 60,
        adventurousness: 70,
        engagement: 80,
        curiosity: 75,
        superficiality: 20,
      };

      await sequencer.sendStateUpdate(75, metrics);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      const profileOp = json.data.operations.find((op: any) => op.path === '/userProfile');
      expect(profileOp.value).toEqual(metrics);
    });

    it('includes version and timestamp', async () => {
      await sequencer.sendStateUpdate(75, {
        thoughtfulness: 60,
        adventurousness: 70,
        engagement: 80,
        curiosity: 75,
        superficiality: 20,
      });

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.version).toBe(1);
      expect(json.data.timestamp).toBeDefined();
      expect(typeof json.data.timestamp).toBe('number');
    });
  });

  describe('sendRapportBar', () => {
    it('sends complete text message sequence', async () => {
      const bar = '[RAPPORT] [██████████░░░░░░░░] 50%\n';
      await sequencer.sendRapportBar(bar);

      expect(mockResponse.writes.length).toBe(3); // START, CONTENT, END
    });

    it('sends TEXT_MESSAGE_START first', async () => {
      const bar = '[RAPPORT] [██████████░░░░░░░░] 50%\n';
      await sequencer.sendRapportBar(bar);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.type).toBe('TEXT_MESSAGE_START');
    });

    it('sends TEXT_CONTENT with rapport bar', async () => {
      const bar = '[RAPPORT] [██████████░░░░░░░░] 50%\n';
      await sequencer.sendRapportBar(bar);

      const json = JSON.parse(mockResponse.writes[1].replace('data: ', ''));
      expect(json.type).toBe('TEXT_CONTENT');
      expect(json.data.chunk).toBe(bar);
      expect(json.data.chunk_index).toBe(0);
    });

    it('sends TEXT_MESSAGE_END with total chunks', async () => {
      const bar = '[RAPPORT] [██████████░░░░░░░░] 50%\n';
      await sequencer.sendRapportBar(bar);

      const json = JSON.parse(mockResponse.writes[2].replace('data: ', ''));
      expect(json.type).toBe('TEXT_MESSAGE_END');
      expect(json.data.total_chunks).toBe(1);
    });

    it('correlates events with parent event ID', async () => {
      const bar = '[RAPPORT] [██████████░░░░░░░░] 50%\n';
      await sequencer.sendRapportBar(bar);

      const startJson = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      const contentJson = JSON.parse(mockResponse.writes[1].replace('data: ', ''));
      const endJson = JSON.parse(mockResponse.writes[2].replace('data: ', ''));

      expect(contentJson.parent_event_id).toBe(startJson.event_id);
      expect(endJson.parent_event_id).toBe(startJson.event_id);
    });

    it('includes message ID in START event', async () => {
      const bar = '[RAPPORT] [██████████░░░░░░░░] 50%\n';
      await sequencer.sendRapportBar(bar);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.message_id).toMatch(/^msg_rapport_/);
    });
  });

  describe('sendAnalysis', () => {
    it('sends ANALYSIS_COMPLETE event', async () => {
      await sequencer.sendAnalysis('Test reasoning', {
        thoughtfulness: 75,
        adventurousness: 60,
        engagement: 70,
        curiosity: 80,
        superficiality: 15,
      }, 8);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.type).toBe('ANALYSIS_COMPLETE');
    });

    it('includes reasoning in analysis event', async () => {
      const reasoning = 'Test reasoning about deep sea creatures';
      await sequencer.sendAnalysis(reasoning, {
        thoughtfulness: 75,
        adventurousness: 60,
        engagement: 70,
        curiosity: 80,
        superficiality: 15,
      }, 8);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.reasoning).toBe(reasoning);
    });

    it('includes metrics in analysis event', async () => {
      const metrics = {
        thoughtfulness: 75,
        adventurousness: 60,
        engagement: 70,
        curiosity: 80,
        superficiality: 15,
      };

      await sequencer.sendAnalysis('Test', metrics, 8);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.metrics).toEqual(metrics);
    });

    it('includes confidence delta in analysis event', async () => {
      await sequencer.sendAnalysis('Test', {
        thoughtfulness: 75,
        adventurousness: 60,
        engagement: 70,
        curiosity: 80,
        superficiality: 15,
      }, 12);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.confidenceDelta).toBe(12);
    });
  });

  describe('sendCompletion', () => {
    it('sends RESPONSE_COMPLETE event', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 70,
      };
      const mockResponse_data: AgentResponse = {
        streaming: [],
        observations: [],
        confidenceDelta: 5,
      };

      await sequencer.sendCompletion(mockState as MiraState, mockResponse_data);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.type).toBe('RESPONSE_COMPLETE');
    });

    it('includes updated state in completion event', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 70,
      };
      const mockResponse_data: AgentResponse = {
        streaming: [],
        observations: [],
        confidenceDelta: 5,
      };

      await sequencer.sendCompletion(mockState as MiraState, mockResponse_data);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.updatedState).toEqual(mockState);
    });

    it('includes response in completion event', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 70,
      };
      const mockResponse_data: AgentResponse = {
        streaming: [],
        observations: [],
        confidenceDelta: 5,
      };

      await sequencer.sendCompletion(mockState as MiraState, mockResponse_data);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.response).toEqual(mockResponse_data);
    });
  });

  describe('sendError', () => {
    it('sends ERROR event', async () => {
      await sequencer.sendError('TEST_ERROR', 'Test error message');

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.type).toBe('ERROR');
    });

    it('includes error code and message', async () => {
      await sequencer.sendError('INVALID_INPUT', 'Input validation failed');

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.code).toBe('INVALID_INPUT');
      expect(json.data.message).toBe('Input validation failed');
    });

    it('includes recoverable flag', async () => {
      await sequencer.sendError('NETWORK_ERROR', 'Connection failed', true);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.recoverable).toBe(true);
    });

    it('defaults recoverable to false', async () => {
      await sequencer.sendError('SERVER_ERROR', 'Server error');

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.data.recoverable).toBe(false);
    });
  });

  describe('sendToolCallCompletion', () => {
    it('sends state delta and completion for tool calls', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 75,
      };

      await sequencer.sendToolCallCompletion(mockState as MiraState);

      expect(mockResponse.writes.length).toBe(2); // STATE_DELTA + RESPONSE_COMPLETE
    });

    it('sends STATE_DELTA first', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 75,
      };

      await sequencer.sendToolCallCompletion(mockState as MiraState);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.type).toBe('STATE_DELTA');
    });

    it('sends RESPONSE_COMPLETE with tool_call source', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 75,
      };

      await sequencer.sendToolCallCompletion(mockState as MiraState);

      const json = JSON.parse(mockResponse.writes[1].replace('data: ', ''));
      expect(json.type).toBe('RESPONSE_COMPLETE');
      expect(json.data.response.source).toBe('tool_call');
    });

    it('includes confidence in state delta', async () => {
      const mockState: Partial<MiraState> = {
        confidenceInUser: 82,
      };

      await sequencer.sendToolCallCompletion(mockState as MiraState);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      const confidenceOp = json.data.operations.find((op: any) => op.path === '/confidenceInUser');
      expect(confidenceOp.value).toBe(82);
    });
  });

  describe('AG-UI Event Format', () => {
    it('includes required AG-UI envelope fields', async () => {
      await sequencer.sendAnalysis('Test', {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      }, 5);

      const json = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      expect(json.event_id).toBeDefined();
      expect(json.schema_version).toBe('1.0.0');
      expect(json.type).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.sequence_number).toBeDefined();
      expect(json.data).toBeDefined();
    });

    it('includes SSE format (data: ...)', async () => {
      await sequencer.sendAnalysis('Test', {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      }, 5);

      expect(mockResponse.writes[0]).toMatch(/^data: /);
      expect(mockResponse.writes[0]).toMatch(/\n\n$/);
    });

    it('increments sequence numbers', async () => {
      await sequencer.sendAnalysis('Test 1', {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      }, 5);

      await sequencer.sendAnalysis('Test 2', {
        thoughtfulness: 50,
        adventurousness: 50,
        engagement: 50,
        curiosity: 50,
        superficiality: 50,
      }, 5);

      const json1 = JSON.parse(mockResponse.writes[0].replace('data: ', ''));
      const json2 = JSON.parse(mockResponse.writes[1].replace('data: ', ''));

      expect(json2.sequence_number).toBe(json1.sequence_number + 1);
    });
  });
});
