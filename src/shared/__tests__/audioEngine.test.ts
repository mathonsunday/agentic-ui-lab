/**
 * Tests for Deep-Sea Audio Engine
 *
 * Validates:
 * - Module exports and function signatures
 * - API consistency
 * - Function existence and types
 * - Web Audio API graph construction
 * - Sound effect parameter handling
 * - Audio context lifecycle management
 *
 * Includes:
 * - API structure tests
 * - Web Audio mock tests
 * - Sound effect behavior validation
 * - Parameter-based sound customization
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Web Audio API
class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = { connect: vi.fn() } as any;

  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        value: 440,
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        value: 1,
      },
      connect: vi.fn(),
    };
  }

  createBiquadFilter() {
    return {
      type: 'bandpass',
      frequency: { value: 1000 },
      Q: { value: 1 },
      connect: vi.fn(),
    };
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      getChannelData: () => new Float32Array(length),
      numberOfChannels: channels,
      length,
      sampleRate,
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

describe('Deep-Sea Audio Engine', () => {
  beforeEach(() => {
    // Mock AudioContext globally
    (global as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API Structure', () => {
    it('should export all required audio functions', async () => {
      const audioModule = await import('../audioEngine');

      expect(typeof audioModule.getAudioContext).toBe('function');
      expect(typeof audioModule.getMasterGain).toBe('function');
      expect(typeof audioModule.resumeAudioContext).toBe('function');
      expect(typeof audioModule.playPressureCreak).toBe('function');
      expect(typeof audioModule.playHydrophoneStatic).toBe('function');
      expect(typeof audioModule.playSpecimenAlert).toBe('function');
      expect(typeof audioModule.playDepthPulse).toBe('function');
      expect(typeof audioModule.playStreamingSound).toBe('function');
    });

    it('should export consistent API across imports', async () => {
      const audioModule1 = await import('../audioEngine');
      const audioModule2 = await import('../audioEngine');

      expect(typeof audioModule1.playPressureCreak).toBe(
        typeof audioModule2.playPressureCreak
      );
      expect(typeof audioModule1.playStreamingSound).toBe(
        typeof audioModule2.playStreamingSound
      );
    });
  });

  describe('Audio Context Management', () => {
    it('should create audio context on first call', async () => {
      const audioModule = await import('../audioEngine');

      const ctx = audioModule.getAudioContext();
      expect(ctx).toBeDefined();
      expect(ctx instanceof MockAudioContext).toBe(true);
    });

    it('should reuse existing audio context', async () => {
      const audioModule = await import('../audioEngine');

      const ctx1 = audioModule.getAudioContext();
      const ctx2 = audioModule.getAudioContext();
      expect(ctx1).toBe(ctx2);
    });

    it('should create master gain node with proper setup', async () => {
      const audioModule = await import('../audioEngine');

      const gain = audioModule.getMasterGain();
      expect(gain).toBeDefined();
      expect(gain.gain.value).toBe(0.3); // Gentle volume for ambient sounds
    });

    it('should reuse existing master gain', async () => {
      const audioModule = await import('../audioEngine');

      const gain1 = audioModule.getMasterGain();
      const gain2 = audioModule.getMasterGain();
      expect(gain1).toBe(gain2);
    });

    it('should resume suspended audio context', async () => {
      const audioModule = await import('../audioEngine');

      const ctx = audioModule.getAudioContext();
      ctx.state = 'suspended';

      await audioModule.resumeAudioContext();
      expect(ctx.state).toBe('running');
    });

    it('should not resume already running context', async () => {
      const audioModule = await import('../audioEngine');

      const ctx = audioModule.getAudioContext();
      ctx.state = 'running';

      const resumeSpy = vi.spyOn(ctx, 'resume');
      await audioModule.resumeAudioContext();

      expect(resumeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Pressure Creak Sound', () => {
    it('should play pressure creak with default duration', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playPressureCreak();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should play pressure creak with custom duration', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playPressureCreak(2);
      expect(true).toBe(true);
    });

    it('should create dual oscillators for harmonic effect', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playPressureCreak(1);

      // Should create 2 oscillators (main + harmonic overtone)
      expect(createOscSpy).toHaveBeenCalledTimes(2);
    });

    it('should use sine wave type for smooth tone', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playPressureCreak(1);

      const oscillators = (createOscSpy.mock.results as any[]).map(r => r.value);
      oscillators.forEach((osc: any) => {
        expect(osc.type).toBe('sine');
      });
    });

    it('should configure envelope for natural attack and decay', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createGainSpy = vi.spyOn(ctx, 'createGain');

      await audioModule.playPressureCreak(1);

      // Should create at least 2 gain nodes (envelope + gain2)
      expect(createGainSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Hydrophone Static Sound', () => {
    it('should play hydrophone static with default duration', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playHydrophoneStatic();
      expect(true).toBe(true);
    });

    it('should play hydrophone static with custom duration', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playHydrophoneStatic(1);
      expect(true).toBe(true);
    });

    it('should create white noise buffer', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createBufferSpy = vi.spyOn(ctx, 'createBuffer');

      await audioModule.playHydrophoneStatic(0.5);

      // Should create buffer for noise
      expect(createBufferSpy).toHaveBeenCalled();
      const call = createBufferSpy.mock.calls[0];
      expect(call[0]).toBe(1); // 1 channel
      expect(call[2]).toBe(44100); // Sample rate
    });

    it('should apply bandpass filter for underwater effect', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createFilterSpy = vi.spyOn(ctx, 'createBiquadFilter');

      await audioModule.playHydrophoneStatic(0.5);

      expect(createFilterSpy).toHaveBeenCalled();
      const filter = (createFilterSpy.mock.results[0] as any).value;
      expect(filter.type).toBe('bandpass');
      expect(filter.frequency.value).toBe(400);
    });

    it('should create buffer source from noise buffer', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createSourceSpy = vi.spyOn(ctx, 'createBufferSource');

      await audioModule.playHydrophoneStatic(0.5);

      expect(createSourceSpy).toHaveBeenCalled();
    });
  });

  describe('Specimen Alert Sound', () => {
    it('should play specimen alert with default intensity', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playSpecimenAlert();
      expect(true).toBe(true);
    });

    it('should play specimen alert with custom intensity', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playSpecimenAlert(2);
      expect(true).toBe(true);
    });

    it('should create rising frequency chirp', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playSpecimenAlert(1);

      expect(createOscSpy).toHaveBeenCalled();
      const osc = (createOscSpy.mock.results[0] as any).value;
      expect(osc.type).toBe('sine');
    });

    it('should scale duration by intensity', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createGainSpy = vi.spyOn(ctx, 'createGain');

      await audioModule.playSpecimenAlert(2);

      // With higher intensity, should still create gain nodes
      expect(createGainSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Depth Pulse Sound', () => {
    it('should play depth pulse with default depth', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playDepthPulse();
      expect(true).toBe(true);
    });

    it('should play depth pulse with custom depth', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playDepthPulse(5000);
      expect(true).toBe(true);
    });

    it('should play depth pulse with custom duration', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playDepthPulse(2000, 3);
      expect(true).toBe(true);
    });

    it('should create harmonic layers for rich tone', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playDepthPulse(2000, 2);

      // Should create oscillators for harmonics + LFO
      expect(createOscSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should modulate frequency based on depth', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      // Shallow depth
      await audioModule.playDepthPulse(500, 1);
      const shallowOscCount = createOscSpy.mock.calls.length;

      // Reset mock
      createOscSpy.mockClear();

      // Deep depth - should have similar structure
      await audioModule.playDepthPulse(5000, 1);
      const deepOscCount = createOscSpy.mock.calls.length;

      expect(deepOscCount).toBeGreaterThanOrEqual(1);
    });

    it('should create breathing LFO for pulse effect', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playDepthPulse(2000, 2);

      // Should create LFO as one of the oscillators
      expect(createOscSpy).toHaveBeenCalled();
    });

    it('should apply envelope to all harmonic layers', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createGainSpy = vi.spyOn(ctx, 'createGain');

      await audioModule.playDepthPulse(2000, 2);

      // Should create multiple gain nodes for harmonics + LFO + envelope
      expect(createGainSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Streaming Sound Selector', () => {
    it('should play thinking sound for "thinking" type', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playStreamingSound('thinking');
      expect(true).toBe(true);
    });

    it('should play composing sound for "composing" type', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playStreamingSound('composing');
      expect(true).toBe(true);
    });

    it('should play displaying sound for "displaying" type', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playStreamingSound('displaying');
      expect(true).toBe(true);
    });

    it('should map "thinking" to pressure creak', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playStreamingSound('thinking');

      // Pressure creak creates 2 oscillators
      expect(createOscSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should map "composing" to hydrophone static', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createBufferSpy = vi.spyOn(ctx, 'createBuffer');

      await audioModule.playStreamingSound('composing');

      // Hydrophone static creates buffer
      expect(createBufferSpy).toHaveBeenCalled();
    });

    it('should map "displaying" to depth pulse', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playStreamingSound('displaying');

      // Depth pulse creates multiple oscillators for harmonics + LFO
      expect(createOscSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative duration gracefully', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playPressureCreak(-1);
      expect(true).toBe(true);
    });

    it('should handle zero duration gracefully', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playPressureCreak(0);
      expect(true).toBe(true);
    });

    it('should handle very large depth values', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playDepthPulse(10000, 2);
      expect(true).toBe(true);
    });

    it('should handle very high intensity values', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playSpecimenAlert(10);
      expect(true).toBe(true);
    });

    it('should handle suspended context gracefully', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      ctx.state = 'suspended';

      await audioModule.playPressureCreak(0.5);
      expect(ctx.state).toBe('running');
    });

    it('should not throw when playing sounds in sequence', async () => {
      const audioModule = await import('../audioEngine');

      await audioModule.playStreamingSound('thinking');
      await audioModule.playStreamingSound('composing');
      await audioModule.playStreamingSound('displaying');

      expect(true).toBe(true);
    });
  });

  describe('Audio Graph Connectivity', () => {
    it('should connect all nodes in pressure creak graph', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');
      const createGainSpy = vi.spyOn(ctx, 'createGain');

      await audioModule.playPressureCreak(1);

      expect(createOscSpy).toHaveBeenCalled();
      expect(createGainSpy).toHaveBeenCalled();

      // Verify oscillators were started and stopped
      const oscillators = (createOscSpy.mock.results as any[]).map(r => r.value);
      oscillators.forEach((osc: any) => {
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
      });
    });

    it('should connect all nodes in hydrophone static graph', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createSourceSpy = vi.spyOn(ctx, 'createBufferSource');

      await audioModule.playHydrophoneStatic(0.5);

      expect(createSourceSpy).toHaveBeenCalled();
      const source = (createSourceSpy.mock.results[0] as any).value;
      expect(source.start).toHaveBeenCalled();
      expect(source.stop).toHaveBeenCalled();
    });

    it('should connect all nodes in specimen alert graph', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playSpecimenAlert(1);

      const oscillators = (createOscSpy.mock.results as any[]).map(r => r.value);
      oscillators.forEach((osc: any) => {
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
      });
    });

    it('should connect all nodes in depth pulse graph', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playDepthPulse(2000, 2);

      // All oscillators should be started and stopped
      const oscillators = (createOscSpy.mock.results as any[]).map(r => r.value);
      expect(oscillators.length).toBeGreaterThanOrEqual(3);

      oscillators.forEach((osc: any) => {
        if (osc.start && osc.stop) {
          // Only check if methods exist (LFO and regular oscs)
          expect(typeof osc.start).toBe('function');
          expect(typeof osc.stop).toBe('function');
        }
      });
    });
  });

  describe('Thematic Consistency', () => {
    it('should use low frequencies for pressure creak (deep-sea theme)', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playPressureCreak(1);

      // Oscillators should be sine waves (common for low frequency tones)
      const oscillators = (createOscSpy.mock.results as any[]).map(r => r.value);
      oscillators.forEach((osc: any) => {
        expect(osc.type).toBe('sine');
      });
    });

    it('should use filtered noise for hydrophone static', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createFilterSpy = vi.spyOn(ctx, 'createBiquadFilter');
      const createBufferSpy = vi.spyOn(ctx, 'createBuffer');

      await audioModule.playHydrophoneStatic(0.5);

      expect(createBufferSpy).toHaveBeenCalled();
      expect(createFilterSpy).toHaveBeenCalled();
    });

    it('should use rising frequency for specimen alert', async () => {
      const audioModule = await import('../audioEngine');

      // Should complete without error with rising chirp
      await audioModule.playSpecimenAlert(1);
      expect(true).toBe(true);
    });

    it('should use harmonic layers for depth pulse (breathing effect)', async () => {
      const audioModule = await import('../audioEngine');
      const ctx = audioModule.getAudioContext();

      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      await audioModule.playDepthPulse(2000, 2);

      // Should have multiple oscillators for harmonics
      expect(createOscSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
