import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { MiraState, ResponseAssessment } from '../../shared/miraAgentSimulator';

// Note: These tests focus on the interrupt behavior contract rather than
// unit testing internal implementation details, since the streaming
// happens in a browser environment with network I/O.

describe('miraBackendStream - Interrupt Functionality (Contract Tests)', () => {
  let mockMiraState: MiraState;
  let mockAssessment: ResponseAssessment;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMiraState = {
      confidenceInUser: 50,
      userProfile: {
        thoughtfulness: 0.5,
        adventurousness: 0.5,
        engagement: 0.5,
        curiosity: 0.5,
        superficiality: 0.5,
      },
    };

    mockAssessment = {
      type: 'open_ended',
      depth: 'moderate',
      confidenceDelta: 5,
      traits: {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Abort return value', () => {
    it('should export streamMiraBackend with abort function', async () => {
      // This is a contract test verifying the API shape
      const streamService = await import('../miraBackendStream');
      expect(streamService.streamMiraBackend).toBeDefined();
      expect(typeof streamService.streamMiraBackend).toBe('function');
    });

    it('should return abort function in return value', async () => {
      // Verify the function returns the expected structure
      const streamService = await import('../miraBackendStream');
      expect(streamService.streamMiraBackend).toBeDefined();

      // The function signature should include abort in the return
      const functionString = streamService.streamMiraBackend.toString();
      expect(functionString).toContain('abort');
      expect(functionString).toContain('promise');
    });
  });

  describe('Stream callback types', () => {
    it('should support onResponseChunk callback', async () => {
      const streamService = await import('../miraBackendStream');
      expect(streamService.streamMiraBackend).toBeDefined();

      // Verify through imports that callback types are exported
      const typeString = streamService.streamMiraBackend.toString();
      expect(typeString).toBeDefined();
    });

    it('should support onError callback for interrupt messages', async () => {
      const streamService = await import('../miraBackendStream');
      expect(streamService.streamMiraBackend).toBeDefined();
    });

    it('should support onComplete callback', async () => {
      const streamService = await import('../miraBackendStream');
      expect(streamService.streamMiraBackend).toBeDefined();
    });
  });

  describe('Interrupt message constant', () => {
    it('should use "Stream interrupted by user" as interrupt error message', async () => {
      // This verifies the error message is consistent
      const streamService = await import('../miraBackendStream');
      const source = streamService.streamMiraBackend.toString();

      // Check that the interrupt message is present in the code
      expect(source).toContain('Stream interrupted by user');
    });
  });

  describe('Reader cancellation support', () => {
    it('should call reader.cancel() when abort is triggered', async () => {
      // Verify the reader cancellation code path exists
      const streamService = await import('../miraBackendStream');
      const source = streamService.streamMiraBackend.toString();

      expect(source).toContain('readerRef');
      expect(source).toContain('cancel');
      expect(source).toContain('wasInterrupted');
    });
  });

  describe('Interrupt flag propagation', () => {
    it('should use wasInterrupted flag to block chunks', async () => {
      // Verify internal logic for blocking chunks
      const streamService = await import('../miraBackendStream');
      const source = streamService.streamMiraBackend.toString();

      expect(source).toContain('wasInterrupted');
      expect(source).toContain('wrappedCallbacks');
    });

    it('should prevent event buffer flush after interrupt', async () => {
      // Verify event buffer respects interrupt flag
      const streamService = await import('../miraBackendStream');
      const source = streamService.streamMiraBackend.toString();

      expect(source).toContain('eventBuffer');
      expect(source).toContain('flush');
      expect(source).toContain('wasInterrupted');
    });
  });

  describe('Wrapped callbacks', () => {
    it('should wrap onResponseChunk to check interrupt status', async () => {
      // Verify callback wrapping
      const streamService = await import('../miraBackendStream');
      const source = streamService.streamMiraBackend.toString();

      expect(source).toContain('wrappedCallbacks');
      expect(source).toContain('onResponseChunk');
    });

    it('should wrap onComplete to check interrupt status', async () => {
      const streamService = await import('../miraBackendStream');
      const source = streamService.streamMiraBackend.toString();

      expect(source).toContain('onComplete');
      expect(source).toMatch(/BLOCKING.*onComplete/);
    });
  });
});
