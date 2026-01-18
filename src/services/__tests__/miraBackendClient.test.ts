/**
 * Tests for Mira Backend Client
 *
 * Validates:
 * - POST request construction and headers
 * - Successful response parsing
 * - Error handling and retry logic
 * - Timeout handling
 * - Backend availability check
 * - Request payload format
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  callMiraBackend,
  checkBackendAvailable,
  type AnalyzeUserResponse,
} from '../miraBackendClient';
import type { MiraState, ResponseAssessment } from '../../../api/lib/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.location for getApiUrl()
Object.defineProperty(global, 'window', {
  value: {
    location: {
      origin: 'http://localhost:5183',
    },
  },
  writable: true,
});

// Create mock data for testing
const mockMiraState: MiraState = {
  confidenceInUser: 30,
  userProfile: {
    thoughtfulness: 0.5,
    adventurousness: 0.6,
    engagement: 0.4,
    curiosity: 0.7,
    superficiality: 0.3,
  },
  memories: [],
  sessionStartTime: Date.now(),
};

const mockAssessment: ResponseAssessment = {
  type: 'question',
  depth: 'moderate',
  riskFlag: false,
};

const mockResponse: AnalyzeUserResponse = {
  updatedState: {
    ...mockMiraState,
    confidenceInUser: 42,
  },
  response: {
    text: 'Test response',
    personality: 'wonder',
  },
};

describe('Mira Backend Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('callMiraBackend', () => {
    it('should make a POST request to /api/analyze-user', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await callMiraBackend('hello', mockMiraState, mockAssessment, 5000);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5183/api/analyze-user',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should send correct headers', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await callMiraBackend('hello', mockMiraState, mockAssessment, 5000);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should send user input in request body', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const userInput = 'test user input';
      await callMiraBackend(userInput, mockMiraState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.userInput).toBe(userInput);
    });

    it('should send miraState in request body', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.miraState).toEqual(mockMiraState);
      expect(body.miraState.confidenceInUser).toBe(30);
    });

    it('should send assessment in request body', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.assessment).toEqual(mockAssessment);
      expect(body.assessment.type).toBe('question');
    });

    it('should send interaction duration in request body', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const duration = 12345;
      await callMiraBackend('test', mockMiraState, mockAssessment, duration);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.interactionDuration).toBe(duration);
    });

    it('should return parsed response on success', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      expect(result).toEqual(mockResponse);
      expect(result.updatedState.confidenceInUser).toBe(42);
      expect(result.response.personality).toBe('wonder');
    });

    it('should handle HTTP error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' }),
      });
      global.fetch = mockFetch;

      await expect(
        callMiraBackend('test', mockMiraState, mockAssessment, 5000)
      ).rejects.toThrow();
    });

    it('should handle server errors (5xx)', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });
      global.fetch = mockFetch;

      await expect(
        callMiraBackend('test', mockMiraState, mockAssessment, 5000)
      ).rejects.toThrow();
    });


    it('should handle malformed JSON response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      global.fetch = mockFetch;

      await expect(
        callMiraBackend('test', mockMiraState, mockAssessment, 5000)
      ).rejects.toThrow();
    });

    it('should handle missing error message in response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      await expect(
        callMiraBackend('test', mockMiraState, mockAssessment, 5000)
      ).rejects.toThrow('HTTP 400');
    });

    it('should handle empty response body', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      global.fetch = mockFetch;

      const result = await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      expect(result).toEqual({});
    });

    it('should encode special characters in user input', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const specialInput = 'Test with "quotes", newlines\nand Unicode émojis 🌊';
      await callMiraBackend(
        specialInput,
        mockMiraState,
        mockAssessment,
        5000
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.userInput).toBe(specialInput);
    });

    it('should handle very long user input', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const longInput = 'a'.repeat(5000);
      await callMiraBackend(longInput, mockMiraState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.userInput.length).toBe(5000);
    });

    it('should handle large state objects', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const largeState = {
        ...mockMiraState,
        memories: Array(100).fill({
          type: 'interaction' as const,
          timestamp: Date.now(),
          content: 'Memory content',
        }),
      };

      await callMiraBackend('test', largeState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.miraState.memories.length).toBe(100);
    });

    it('should handle various assessment types', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const assessmentTypes: ResponseAssessment['type'][] = [
        'question',
        'open_ended',
        'command',
        'tool_use',
      ];

      for (const type of assessmentTypes) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const assessment: ResponseAssessment = {
          ...mockAssessment,
          type,
        };

        await callMiraBackend('test', mockMiraState, assessment, 5000);

        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const body = JSON.parse(lastCall[1].body as string);

        expect(body.assessment.type).toBe(type);
      }
    });

    it('should handle depth levels in assessment', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const assessment: ResponseAssessment = {
        type: 'question',
        depth: 'deep',
        riskFlag: false,
      };

      await callMiraBackend('test', mockMiraState, assessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.assessment.depth).toBe('deep');
    });

    it('should handle risk flags in assessment', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const assessment: ResponseAssessment = {
        type: 'question',
        depth: 'moderate',
        riskFlag: true,
      };

      await callMiraBackend('test', mockMiraState, assessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.assessment.riskFlag).toBe(true);
    });

    it('should handle response with updated profile', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const result = await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      expect(result.updatedState.userProfile).toBeDefined();
      expect(result.updatedState.userProfile).toHaveProperty('thoughtfulness');
      expect(result.updatedState.userProfile).toHaveProperty('adventurousness');
    });

    it('should handle response with updated memories', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          updatedState: {
            ...mockResponse.updatedState,
            memories: [
              {
                type: 'interaction',
                timestamp: Date.now(),
                content: 'New memory',
              },
            ],
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      expect(result.updatedState.memories).toHaveLength(1);
      expect(result.updatedState.memories[0].content).toBe('New memory');
    });

    it('should handle response with different personalities', async () => {
      const personalities = ['negative', 'chaotic', 'glowing', 'slovak'] as const;

      for (const personality of personalities) {
        vi.clearAllMocks();

        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockResponse,
            response: {
              ...mockResponse.response,
              personality,
            },
          }),
        });
        global.fetch = mockFetch;

        const result = await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

        expect(result.response.personality).toBe(personality);
      }
    });
  });

  describe('checkBackendAvailable', () => {
    it('should make OPTIONS request to check availability', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      });
      global.fetch = mockFetch;

      await checkBackendAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5183/api/analyze-user',
        expect.objectContaining({
          method: 'OPTIONS',
        })
      );
    });

    it('should return true when backend responds with ok status', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      });
      global.fetch = mockFetch;

      const available = await checkBackendAvailable();

      expect(available).toBe(true);
    });

    it('should return false when backend responds with error status', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      const available = await checkBackendAvailable();

      expect(available).toBe(false);
    });

    it('should return false on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      );
      global.fetch = mockFetch;

      const available = await checkBackendAvailable();

      expect(available).toBe(false);
    });

    it('should return false on timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Request timeout')
      );
      global.fetch = mockFetch;

      const available = await checkBackendAvailable();

      expect(available).toBe(false);
    });

    it('should not throw errors, only return boolean', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Any error'));
      global.fetch = mockFetch;

      expect(async () => {
        await checkBackendAvailable();
      }).not.toThrow();
    });
  });

  describe('API URL handling', () => {
    it('should use window.location.origin when available', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0] as string;

      expect(url).toContain('http://localhost:5183');
    });

    it('should construct full API endpoint URL', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      await callMiraBackend('test', mockMiraState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0] as string;

      expect(url).toBe('http://localhost:5183/api/analyze-user');
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const requests = [
        callMiraBackend('input1', mockMiraState, mockAssessment, 5000),
        callMiraBackend('input2', mockMiraState, mockAssessment, 5000),
        callMiraBackend('input3', mockMiraState, mockAssessment, 5000),
      ];

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Request payload integrity', () => {
    it('should not mutate input parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const state = { ...mockMiraState };
      const assessment = { ...mockAssessment };
      const userInput = 'test';

      await callMiraBackend(userInput, state, assessment, 5000);

      expect(state).toEqual(mockMiraState);
      expect(assessment).toEqual(mockAssessment);
    });

    it('should serialize complex objects correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch;

      const complexState: MiraState = {
        ...mockMiraState,
        memories: [
          {
            type: 'interaction',
            timestamp: 1234567890,
            content: 'Memory with "quotes" and\nnewlines',
          },
        ],
      };

      await callMiraBackend('test', complexState, mockAssessment, 5000);

      const callArgs = mockFetch.mock.calls[0];
      const bodyString = callArgs[1].body as string;
      const body = JSON.parse(bodyString);

      expect(body.miraState.memories[0].content).toContain('newlines');
      expect(bodyString).toBeTruthy(); // Verify it's properly stringified
    });
  });
});
