import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCreatureByMood, type CreatureName } from './deepSeaAscii';

describe('getCreatureByMood', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Valid moods', () => {
    it('returns predatory creatures for "predatory" mood', () => {
      const result = getCreatureByMood('predatory');
      expect(['anglerFish', 'shark']).toContain(result.name);
      expect(result.art).toBeTruthy();
      expect(typeof result.art).toBe('string');
    });

    it('returns curious creatures for "curious" mood', () => {
      const result = getCreatureByMood('curious');
      expect(['octopus', 'hermitCrab']).toContain(result.name);
      expect(result.art).toBeTruthy();
    });

    it('returns peaceful creatures for "peaceful" mood', () => {
      const result = getCreatureByMood('peaceful');
      expect(['seaTurtle', 'schoolOfFish']).toContain(result.name);
      expect(result.art).toBeTruthy();
    });

    it('returns ethereal creatures for "ethereal" mood', () => {
      const result = getCreatureByMood('ethereal');
      expect(result.name).toBe('jellyfish');
      expect(result.art).toBeTruthy();
    });

    it('returns intelligent creatures for "intelligent" mood', () => {
      const result = getCreatureByMood('intelligent');
      expect(result.name).toBe('octopus');
      expect(result.art).toBeTruthy();
    });

    it('returns eerie creatures for "eerie" mood', () => {
      const result = getCreatureByMood('eerie');
      expect(result.name).toBe('anglerFish');
      expect(result.art).toBeTruthy();
    });

    it('returns majestic creatures for "majestic" mood', () => {
      const result = getCreatureByMood('majestic');
      expect(result.name).toBe('giantSquid');
      expect(result.art).toBeTruthy();
    });

    it('returns magical creatures for "magical" mood', () => {
      const result = getCreatureByMood('magical');
      expect(result.name).toBe('bioluminescentFish');
      expect(result.art).toBeTruthy();
    });

    it('returns menacing creatures for "menacing" mood', () => {
      const result = getCreatureByMood('menacing');
      expect(result.name).toBe('viperFish');
      expect(result.art).toBeTruthy();
    });

    it('returns ancient creatures for "ancient" mood', () => {
      const result = getCreatureByMood('ancient');
      expect(result.name).toBe('seaTurtle');
      expect(result.art).toBeTruthy();
    });

    it('handles case-insensitive mood strings', () => {
      const result1 = getCreatureByMood('CURIOUS');
      const result2 = getCreatureByMood('Curious');
      const result3 = getCreatureByMood('curious');

      expect(['octopus', 'hermitCrab']).toContain(result1.name);
      expect(['octopus', 'hermitCrab']).toContain(result2.name);
      expect(['octopus', 'hermitCrab']).toContain(result3.name);
    });

    it('handles moods with whitespace', () => {
      const result1 = getCreatureByMood('  curious  ');
      const result2 = getCreatureByMood('\tcurious\n');

      expect(['octopus', 'hermitCrab']).toContain(result1.name);
      expect(['octopus', 'hermitCrab']).toContain(result2.name);
    });
  });

  describe('Fallback behavior', () => {
    it('falls back to random for unknown mood', () => {
      const result = getCreatureByMood('nonexistent_mood_12345');

      expect(result.name).toBeTruthy();
      expect(result.art).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No creatures found for mood')
      );
    });

    it('falls back to random for undefined mood', () => {
      const result = getCreatureByMood();

      expect(result.name).toBeTruthy();
      expect(result.art).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No mood provided')
      );
    });

    it('falls back to random for empty string', () => {
      const result = getCreatureByMood('');

      expect(result.name).toBeTruthy();
      expect(result.art).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('falls back to random for whitespace-only string', () => {
      const result = getCreatureByMood('   ');

      expect(result.name).toBeTruthy();
      expect(result.art).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Console logging', () => {
    it('logs successful creature selection', () => {
      getCreatureByMood('curious');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[getCreatureByMood\] Selected.*for mood "curious"/)
      );
    });

    it('logs mood from analysis when provided', () => {
      getCreatureByMood('peaceful');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[getCreatureByMood\] Selected.*for mood "peaceful"/)
      );
    });

    it('includes creature name in log', () => {
      getCreatureByMood('curious');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[getCreatureByMood\] Selected ".*" for mood/)
      );
    });

    it('logs warning when mood is unrecognized', () => {
      getCreatureByMood('fake_mood');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/No creatures found for mood/i)
      );
    });

    it('logs warning when mood is undefined', () => {
      getCreatureByMood(undefined);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/No mood provided/i)
      );
    });
  });

  describe('Return value structure', () => {
    it('returns object with name and art properties', () => {
      const result = getCreatureByMood('curious');

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('art');
      expect(Object.keys(result).length).toBe(2);
    });

    it('returns non-empty ASCII art string', () => {
      const result = getCreatureByMood('curious');

      expect(typeof result.art).toBe('string');
      expect(result.art.length).toBeGreaterThan(0);
    });

    it('returns valid creature name type', () => {
      const result = getCreatureByMood('curious');
      const validCreatures = [
        'anglerFish',
        'giantSquid',
        'jellyfish',
        'octopus',
        'seaTurtle',
        'shark',
        'hermitCrab',
        'bioluminescentFish',
        'viperFish',
        'treasureChest',
        'deepSeaDiver',
        'submarine',
        'coral',
        'schoolOfFish',
        'deepSeaScene',
      ];

      expect(validCreatures).toContain(result.name);
    });
  });

  describe('All supported moods', () => {
    const supportedMoods = [
      'aggressive',
      'alien',
      'alive',
      'ancient',
      'armored',
      'bioluminescent',
      'brave',
      'curious',
      'delicate',
      'diverse',
      'eerie',
      'ethereal',
      'exploratory',
      'intelligent',
      'magical',
      'majestic',
      'menacing',
      'mysterious',
      'peaceful',
      'powerful',
      'predatory',
      'social',
      'technological',
      'valuable',
      'vintage',
    ];

    supportedMoods.forEach(mood => {
      it(`returns a creature for mood: ${mood}`, () => {
        const result = getCreatureByMood(mood);

        expect(result.name).toBeTruthy();
        expect(result.art).toBeTruthy();
        expect(typeof result.art).toBe('string');
        expect(result.art.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Randomness within mood category', () => {
    it('returns different creatures from same mood category (high probability)', () => {
      // This test runs getCreatureByMood multiple times for a mood with multiple creatures
      // We should see different creatures selected (with high probability)
      const results: CreatureName[] = [];

      for (let i = 0; i < 20; i++) {
        const result = getCreatureByMood('predatory');
        results.push(result.name);
      }

      const uniqueCreatures = new Set(results);
      // With 20 attempts and 2 possible creatures (anglerFish, shark),
      // probability of getting both is very high (>99%)
      expect(uniqueCreatures.size).toBeGreaterThan(1);
    });
  });
});
