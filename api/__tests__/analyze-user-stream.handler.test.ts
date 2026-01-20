/**
 * Handler Unit Tests for /api/analyze-user-stream
 *
 * These tests call the actual handler function with mocked request/response
 * to verify behavior across all code paths. This provides coverage for
 * refactoring the handler's cyclomatic complexity.
 *
 * Tested branches:
 * - Method validation (POST only)
 * - Missing miraState error
 * - Tool call processing path
 * - Missing userInput error
 * - Content feature detection (hardcoded vs Claude-streamed)
 * - Claude response parsing and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Module-level mock for Anthropic's stream method
const mockAnthropicStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        stream: mockAnthropicStream,
      };
    },
  };
});

// Mock the miraAgent functions
vi.mock('../lib/miraAgent.js', () => ({
  updateConfidenceAndProfile: vi.fn((state, updates) => ({
    ...state,
    confidenceInUser: Math.max(0, Math.min(100, state.confidenceInUser + updates.confidenceDelta)),
    userProfile: updates.updatedProfile,
  })),
  updateMemory: vi.fn((state) => state),
  processToolCall: vi.fn((state) => ({
    ...state,
    confidenceInUser: state.confidenceInUser + 5,
  })),
}));

// Mock contentLibrary
vi.mock('../lib/contentLibrary.js', () => ({
  getContentFeature: vi.fn(() => null),
}));

// Mock idGenerator
vi.mock('../lib/utils/idGenerator.js', () => ({
  generateEventId: vi.fn(() => `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
}));

import handler from '../analyze-user-stream';
import { getContentFeature } from '../lib/contentLibrary.js';
import { processToolCall } from '../lib/miraAgent.js';

/**
 * Creates a mock VercelRequest
 */
function createMockRequest(options: {
  method?: string;
  body?: unknown;
}): VercelRequest {
  return {
    method: options.method ?? 'POST',
    body: options.body ?? {},
  } as VercelRequest;
}

/**
 * Creates a mock VercelResponse that captures SSE events
 */
function createMockResponse(): {
  response: VercelResponse;
  getEvents: () => Array<{ type: string; data: unknown }>;
  getStatus: () => number | null;
  getJson: () => unknown;
} {
  const events: Array<{ type: string; data: unknown }> = [];
  let statusCode: number | null = null;
  let jsonResponse: unknown = null;

  const response = {
    setHeader: vi.fn().mockReturnThis(),
    status: vi.fn((code: number) => {
      statusCode = code;
      return response;
    }),
    json: vi.fn((data: unknown) => {
      jsonResponse = data;
      return response;
    }),
    write: vi.fn((data: string) => {
      // Parse SSE data
      if (data.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(data.slice(6).trim());
          events.push({ type: parsed.type, data: parsed });
        } catch {
          // Skip malformed
        }
      }
      return true;
    }),
    end: vi.fn(),
  } as unknown as VercelResponse;

  return {
    response,
    getEvents: () => events,
    getStatus: () => statusCode,
    getJson: () => jsonResponse,
  };
}

/**
 * Creates mock MiraState for testing
 */
function createMockMiraState() {
  return {
    confidenceInUser: 50,
    userProfile: {
      thoughtfulness: 0.5,
      adventurousness: 0.5,
      engagement: 0.5,
      curiosity: 0.5,
      superficiality: 0.2,
    },
    memories: [],
  };
}

/**
 * Creates a mock async iterator for Claude streaming
 */
function createTestStream(chunks: string[]) {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (index < chunks.length) {
            const chunk = chunks[index++];
            return {
              done: false,
              value: {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: chunk },
              },
            };
          }
          return { done: true, value: undefined };
        },
      };
    },
  };
}

describe('analyze-user-stream handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Method validation', () => {
    it('should reject non-POST requests with 405', async () => {
      const request = createMockRequest({ method: 'GET' });
      const { response, getStatus, getJson } = createMockResponse();

      await handler(request, response);

      expect(getStatus()).toBe(405);
      expect(getJson()).toEqual({ error: 'Method not allowed' });
    });

    it('should accept POST requests', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { miraState: createMockMiraState(), userInput: 'hello' },
      });
      const { response, getStatus } = createMockResponse();

      // Mock Claude to return valid JSON
      const testStream = createTestStream([
        '{"confidenceDelta": 5, "reasoning": "test", ',
        '"thoughtfulness": 0.6, "adventurousness": 0.5, ',
        '"engagement": 0.5, "curiosity": 0.5, "superficiality": 0.2}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      await handler(request, response);

      // Should not return 405
      expect(getStatus()).not.toBe(405);
    });
  });

  describe('Request body validation', () => {
    it('should send ERROR event when miraState is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { userInput: 'hello' },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'ERROR')).toBe(true);

      const errorEvent = events.find(e => e.type === 'ERROR');
      expect((errorEvent?.data as { data: { code: string } }).data.code).toBe('MISSING_FIELDS');
    });

    it('should send ERROR event when userInput is missing (for non-tool calls)', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { miraState: createMockMiraState() },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'ERROR')).toBe(true);

      const errorEvent = events.find(e => e.type === 'ERROR');
      expect((errorEvent?.data as { data: { code: string } }).data.code).toBe('MISSING_INPUT');
    });
  });

  describe('Tool call processing', () => {
    it('should process tool calls without requiring userInput', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          toolData: { action: 'zoom_in', timestamp: Date.now() },
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      // Tool calls only emit RESPONSE_COMPLETE (no STATE_DELTA)
      expect(events.some(e => e.type === 'RESPONSE_COMPLETE')).toBe(true);
      // Should NOT have ERROR
      expect(events.some(e => e.type === 'ERROR')).toBe(false);
    });

    it('should call processToolCall for tool data', async () => {
      const toolData = { action: 'zoom_out', timestamp: Date.now() };
      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          toolData,
        },
      });
      const { response } = createMockResponse();

      await handler(request, response);

      expect(processToolCall).toHaveBeenCalled();
    });
  });

  describe('Content feature handling', () => {
    it('should detect and process hardcoded content features', async () => {
      vi.mocked(getContentFeature).mockReturnValue({
        id: 'test_feature',
        isHardcoded: true,
        content: 'Test hardcoded content',
        eventSource: 'test_source',
        confidenceDelta: 5,
      });

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'trigger word',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      // Should have TEXT_MESSAGE_START for content features
      expect(events.some(e => e.type === 'TEXT_MESSAGE_START')).toBe(true);
      expect(events.some(e => e.type === 'TEXT_CONTENT')).toBe(true);
      expect(events.some(e => e.type === 'RESPONSE_COMPLETE')).toBe(true);
    });

    it('should stream Claude response for non-hardcoded content features', async () => {
      vi.mocked(getContentFeature).mockReturnValue({
        id: 'claude_feature',
        isHardcoded: false,
        prompt: 'Generate content about X',
        eventSource: 'claude_streaming',
        confidenceDelta: 8,
      });

      const testStream = createTestStream(['Hello ', 'World!']);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'grant proposal',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'TEXT_MESSAGE_START')).toBe(true);
      // Should have multiple TEXT_CONTENT events from streaming
      const contentEvents = events.filter(e => e.type === 'TEXT_CONTENT');
      expect(contentEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('API key validation', () => {
    it('should send ERROR when ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      vi.mocked(getContentFeature).mockReturnValue(null);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'hello',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'ERROR')).toBe(true);

      const errorEvent = events.find(e => e.type === 'ERROR');
      expect((errorEvent?.data as { data: { code: string } }).data.code).toBe('SERVER_CONFIG_ERROR');
    });
  });

  describe('Claude response parsing', () => {
    beforeEach(() => {
      vi.mocked(getContentFeature).mockReturnValue(null);
    });

    it('should parse valid JSON response from Claude', async () => {
      const testStream = createTestStream([
        '{"confidenceDelta": 10, "reasoning": "Good question!", ',
        '"thoughtfulness": 0.7, "adventurousness": 0.6, ',
        '"engagement": 0.8, "curiosity": 0.7, "superficiality": 0.1}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'What is consciousness?',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'RESPONSE_START')).toBe(true);
      expect(events.some(e => e.type === 'RESPONSE_COMPLETE')).toBe(true);
      expect(events.some(e => e.type === 'ANALYSIS_COMPLETE')).toBe(true);
    });

    it('should handle Claude response with leading + in numbers', async () => {
      const testStream = createTestStream([
        '{"confidenceDelta": +15, "reasoning": "Excellent!", ',
        '"thoughtfulness": 0.8, "adventurousness": 0.7, ',
        '"engagement": 0.9, "curiosity": 0.8, "superficiality": 0.1}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'Deep philosophical question',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      // Should succeed despite +15 format
      expect(events.some(e => e.type === 'RESPONSE_COMPLETE')).toBe(true);
      expect(events.some(e => e.type === 'ERROR')).toBe(false);
    });

    it('should send ERROR when Claude returns invalid JSON', async () => {
      const testStream = createTestStream([
        'This is not JSON at all',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'hello',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'ERROR')).toBe(true);

      const errorEvent = events.find(e => e.type === 'ERROR');
      expect((errorEvent?.data as { data: { code: string } }).data.code).toBe('INVALID_RESPONSE');
    });

    it('should send ERROR when Claude returns malformed JSON', async () => {
      const testStream = createTestStream([
        '{confidenceDelta: 10, reasoning: missing quotes}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'test',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'ERROR')).toBe(true);

      const errorEvent = events.find(e => e.type === 'ERROR');
      expect((errorEvent?.data as { data: { code: string } }).data.code).toBe('JSON_PARSE_ERROR');
    });
  });

  describe('Confidence calculation', () => {
    beforeEach(() => {
      vi.mocked(getContentFeature).mockReturnValue(null);
    });

    it('should clamp confidence to 0-100 range', async () => {
      // Start with confidence at 95, add +10 -> should clamp to 100
      const state = createMockMiraState();
      state.confidenceInUser = 95;

      const testStream = createTestStream([
        '{"confidenceDelta": 10, "reasoning": "test", ',
        '"thoughtfulness": 0.5, "adventurousness": 0.5, ',
        '"engagement": 0.5, "curiosity": 0.5, "superficiality": 0.2}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: { miraState: state, userInput: 'hello' },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      // Confidence is in RESPONSE_COMPLETE's updatedState, not STATE_DELTA
      const completeEvent = events.find(e => e.type === 'RESPONSE_COMPLETE');
      expect(completeEvent).toBeDefined();

      const envelope = completeEvent?.data as { data: { updatedState: { confidenceInUser: number } } };
      expect(envelope.data.updatedState.confidenceInUser).toBe(100); // Clamped
    });

    it('should not allow negative confidence', async () => {
      const state = createMockMiraState();
      state.confidenceInUser = 5;

      const testStream = createTestStream([
        '{"confidenceDelta": -20, "reasoning": "terrible", ',
        '"thoughtfulness": 0.1, "adventurousness": 0.1, ',
        '"engagement": 0.1, "curiosity": 0.1, "superficiality": 0.9}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: { miraState: state, userInput: 'boring' },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      // Confidence is in RESPONSE_COMPLETE's updatedState, not STATE_DELTA
      const completeEvent = events.find(e => e.type === 'RESPONSE_COMPLETE');
      expect(completeEvent).toBeDefined();

      const envelope = completeEvent?.data as { data: { updatedState: { confidenceInUser: number } } };
      expect(envelope.data.updatedState.confidenceInUser).toBe(0); // Clamped to 0
    });
  });

  describe('Error handling', () => {
    it('should send STREAM_ERROR on unexpected exceptions', async () => {
      vi.mocked(getContentFeature).mockReturnValue(null);
      mockAnthropicStream.mockRejectedValue(new Error('Network failure'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'hello',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      expect(events.some(e => e.type === 'ERROR')).toBe(true);

      const errorEvent = events.find(e => e.type === 'ERROR');
      expect((errorEvent?.data as { data: { code: string; message: string } }).data.code).toBe('STREAM_ERROR');
      expect((errorEvent?.data as { data: { code: string; message: string } }).data.message).toBe('Network failure');
    });
  });

  describe('SSE headers', () => {
    it('should set correct SSE headers', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { miraState: createMockMiraState(), toolData: { action: 'test' } },
      });
      const { response } = createMockResponse();

      await handler(request, response);

      expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(response.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });
  });

  describe('Event sequencing', () => {
    it('should emit events in correct order for text input', async () => {
      vi.mocked(getContentFeature).mockReturnValue(null);

      const testStream = createTestStream([
        '{"confidenceDelta": 5, "reasoning": "test", ',
        '"thoughtfulness": 0.5, "adventurousness": 0.5, ',
        '"engagement": 0.5, "curiosity": 0.5, "superficiality": 0.2}',
      ]);
      mockAnthropicStream.mockResolvedValue(testStream);

      const request = createMockRequest({
        method: 'POST',
        body: {
          miraState: createMockMiraState(),
          userInput: 'hello',
        },
      });
      const { response, getEvents } = createMockResponse();

      await handler(request, response);

      const events = getEvents();
      const types = events.map(e => e.type);

      // Verify order: RESPONSE_START -> STATE_DELTA -> ANALYSIS_COMPLETE -> RESPONSE_COMPLETE
      const responseStartIdx = types.indexOf('RESPONSE_START');
      const stateDeltaIdx = types.indexOf('STATE_DELTA');
      const analysisIdx = types.indexOf('ANALYSIS_COMPLETE');
      const completeIdx = types.indexOf('RESPONSE_COMPLETE');

      expect(responseStartIdx).toBeLessThan(stateDeltaIdx);
      expect(stateDeltaIdx).toBeLessThan(analysisIdx);
      expect(analysisIdx).toBeLessThan(completeIdx);
    });
  });
});
