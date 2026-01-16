// Dr. Mira Petrovic - Character configuration

export interface ThoughtFragment {
  text: string;
  intensity: number; // 0-1, affects size/opacity
  decay: 'fast' | 'slow' | 'linger';
  glitch?: boolean;
}

export interface VisualElement {
  type: 'text' | 'image' | 'creature' | 'particle' | 'sound';
  content: string;
  position?: { x: number; y: number };
  style?: Record<string, string | number>;
}

export interface AgentResponse {
  thinking: ThoughtFragment[];
  visual: {
    mood: 'wonder' | 'obsession' | 'calm' | 'distress';
    elements: VisualElement[];
    atmosphere?: {
      depth: number;
      pressure: number;
    };
  };
}

export const CHARACTER = {
  name: 'Dr. Mira Petrovic',
  role: 'Marine Biologist, MBARI',
  obsession: 'Specimen 47',

  // Thought patterns for stream of consciousness
  thoughtPatterns: {
    greeting: [
      '...another visitor...',
      '...they want to know about my work...',
      '...should I tell them about specimen 47?...',
      '...not yet, not yet...',
    ],
    specimen47: [
      '...it\'s been watching me...',
      '...I can feel its presence...',
      '...the eyes, those eyes...',
      '...47 days since first contact...',
      '...why do I keep counting?...',
      '...it knows things...',
    ],
    research: [
      '...the pressure readings are wrong...',
      '...something moved on the last dive...',
      '...MBARI doesn\'t understand...',
      '...I need more time down there...',
      '...the bioluminescence patterns...',
    ],
    emotional: [
      '...I haven\'t slept in days...',
      '...am I losing my mind?...',
      '...no one believes me...',
      '...THE PRESSURE...',
      '...it\'s beautiful down there...',
      '...so dark, so quiet...',
    ],
  },

  // Visual vocabulary
  visualElements: {
    creatures: ['seeker', 'tendril', 'leviathan-eye', 'jellyfish'],
    sounds: ['pressure-creak', 'hydrophone-static', 'distant-whale', 'rov-hum'],
    moods: {
      wonder: { depth: 1000, colors: ['#4dd0e1', '#26a69a'] },
      obsession: { depth: 3000, colors: ['#ff6b6b', '#4dd0e1'] },
      calm: { depth: 500, colors: ['#4dd0e1', '#e0f7fa'] },
      distress: { depth: 4000, colors: ['#ff6b6b', '#ffa726'], glitch: true },
    },
  },
};

// Helper to get random thoughts for a topic
export function getThoughtsForTopic(
  topic: keyof typeof CHARACTER.thoughtPatterns,
  count: number = 4
): ThoughtFragment[] {
  const patterns = CHARACTER.thoughtPatterns[topic];
  const shuffled = [...patterns].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((text, i) => ({
    text,
    intensity: 0.3 + Math.random() * 0.7,
    decay: i === count - 1 ? 'linger' : Math.random() > 0.5 ? 'slow' : 'fast',
    glitch: Math.random() > 0.85,
  }));
}

// Helper to determine topic from user input
export function detectTopic(input: string): keyof typeof CHARACTER.thoughtPatterns {
  const lower = input.toLowerCase();

  if (lower.includes('specimen') || lower.includes('47') || lower.includes('creature')) {
    return 'specimen47';
  }
  if (lower.includes('research') || lower.includes('work') || lower.includes('dive')) {
    return 'research';
  }
  if (lower.includes('feel') || lower.includes('okay') || lower.includes('how are')) {
    return 'emotional';
  }
  return 'greeting';
}
