/**
 * Deep-Sea Audio Engine
 * Synthesizes thematic sounds for Dr. Petrovic's research environment
 * Based on patterns from music-playground Web Audio API implementations
 */

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function getMasterGain(): GainNode {
  if (!masterGain) {
    const ctx = getAudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3; // Gentle volume for ambient sounds
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/**
 * Pressure Creak Sound
 * Low frequency sweep with harmonic resonance
 * Evokes the sound of deep-sea pressure and hull stress
 */
export async function playPressureCreak(duration: number = 1.5): Promise<void> {
  await resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Main creaking tone (low frequency)
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + duration * 0.7);
  osc.frequency.exponentialRampToValueAtTime(60, now + duration);

  // Harmonic overtone
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(160, now);
  osc2.frequency.exponentialRampToValueAtTime(240, now + duration);

  // Envelope
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.3, now + 0.1);
  envelope.gain.exponentialRampToValueAtTime(0.05, now + duration);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.02, now + duration);

  osc.connect(envelope);
  osc2.connect(gain2);
  envelope.connect(getMasterGain());
  gain2.connect(getMasterGain());

  osc.start(now);
  osc2.start(now);
  osc.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * Hydrophone Static Sound
 * Filtered white noise simulating underwater recording artifacts
 */
export async function playHydrophoneStatic(duration: number = 0.5): Promise<void> {
  await resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // White noise generator
  const bufferSize = ctx.sampleRate * duration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // Bandpass filter (simulates underwater recording)
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 2;

  // Envelope
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.2, now + 0.05);
  envelope.gain.exponentialRampToValueAtTime(0.05, now + duration);

  noise.connect(filter);
  filter.connect(envelope);
  envelope.connect(getMasterGain());

  noise.start(now);
  noise.stop(now + duration);
}

/**
 * Specimen Alert Sound
 * Rising frequency chirp indicating creature/specimen proximity
 */
export async function playSpecimenAlert(intensity: number = 1): Promise<void> {
  await resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const duration = 0.6 * intensity;

  // Rising chirp
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + duration);

  // Envelope with pulse
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.25 * intensity, now + 0.05);
  envelope.gain.exponentialRampToValueAtTime(0, now + duration);

  osc.connect(envelope);
  envelope.connect(getMasterGain());

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Depth Pulse Sound
 * Breathing pulse that changes intensity with depth
 * Warm, inviting tone that adapts to environmental pressure
 */
export async function playDepthPulse(
  depth: number = 2000, // 0-5000 meters
  duration: number = 2
): Promise<void> {
  await resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Base frequency gets lower at greater depths
  const baseFreq = Math.max(50, 110 - (depth / 5000) * 50);

  // Three harmonic layers
  const frequencies = [baseFreq, baseFreq * 1.5, baseFreq * 2];
  const oscillators = frequencies.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    return osc;
  });

  // Breathing LFO (slow pulse)
  const pulseRate = 0.4 + (depth / 5000) * 0.2; // Slower pulse at greater depth
  const lfo = ctx.createOscillator();
  lfo.frequency.value = pulseRate;
  lfo.type = 'sine';

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0.3, now);

  // Main envelope
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.2, now + 0.2);
  envelope.gain.linearRampToValueAtTime(0.2, now + duration - 0.3);
  envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

  lfo.connect(lfoGain);

  oscillators.forEach((osc) => {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.1, now);
    lfoGain.connect(gainNode.gain);
    osc.connect(gainNode);
    gainNode.connect(envelope);
    osc.start(now);
    osc.stop(now + duration);
  });

  lfo.start(now);
  envelope.connect(getMasterGain());
  lfo.stop(now + duration);
}

/**
 * Play multiple sounds for multimodal streaming
 */
export async function playStreamingSound(type: 'thinking' | 'composing' | 'displaying'): Promise<void> {
  switch (type) {
    case 'thinking':
      await playPressureCreak(0.8);
      break;
    case 'composing':
      await playHydrophoneStatic(0.3);
      break;
    case 'displaying':
      // Gentle presence indicator
      await playDepthPulse(2000, 1);
      break;
  }
}
