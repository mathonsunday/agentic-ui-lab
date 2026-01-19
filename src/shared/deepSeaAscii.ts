/**
 * Deep Sea ASCII Art - Zoom-based creature rendering
 *
 * This module provides zoom level navigation and creature lookup for the deep-sea theme.
 * It maintains backward compatibility with existing code while using the ascii-art-toolkit
 * library as the data source.
 *
 * Only creatures with complete zoom support (all 3 levels: far, medium, close) are included.
 * Creatures without zoom variants are automatically filtered out to ensure zoom buttons always work.
 */

import { library } from '@mathonsunday/ascii-art-toolkit';

export type ZoomLevel = 'far' | 'medium' | 'close';

/**
 * Creature name type - maps to IDs in the deep-sea theme
 * Converts from camelCase (legacy) to kebab-case (toolkit format)
 */
export type CreatureName =
  | 'anglerFish'
  | 'giantSquid'
  | 'jellyfish'
  | 'octopus'
  | 'shark'
  | 'treasureChest'
  | 'submarine'
  | 'schoolOfFish'
  | 'bioluminescentFish'
  | 'viperFish'
  | 'coral'
  | 'hermitCrab'
  | 'deepSeaScene'
  | 'seaTurtle'
  | 'deepSeaDiver';

/**
 * Mapping from camelCase creature names to toolkit IDs
 */
const CREATURE_ID_MAP: Record<CreatureName, string> = {
  anglerFish: 'deep-sea:anglerfish',
  giantSquid: 'deep-sea:giant-squid',
  jellyfish: 'deep-sea:jellyfish',
  octopus: 'deep-sea:octopus',
  shark: 'deep-sea:shark',
  treasureChest: 'deep-sea:treasure-chest',
  submarine: 'deep-sea:submarine',
  schoolOfFish: 'deep-sea:school-of-fish',
  bioluminescentFish: 'deep-sea:bioluminescent-fish',
  viperFish: 'deep-sea:viperfish',
  coral: 'deep-sea:coral-reef',
  hermitCrab: 'deep-sea:hermit-crab',
  deepSeaScene: 'deep-sea:scene',
  seaTurtle: 'deep-sea:sea-turtle',
  deepSeaDiver: 'deep-sea:diver',
};

/**
 * Build ZOOMABLE_CREATURES object from toolkit for backward compatibility
 *
 * Only includes creatures with COMPLETE zoom support (all 3 levels: far, medium, close).
 * Creatures without all zoom levels are skipped to prevent broken zoom functionality.
 * This filters out environment pieces and incomplete structures from the toolkit.
 */
const buildZoomableCreatures = () => {
  const creatures: Record<
    CreatureName,
    Record<ZoomLevel, string>
  > = {} as Record<CreatureName, Record<ZoomLevel, string>>;

  (Object.entries(CREATURE_ID_MAP) as Array<[CreatureName, string]>).forEach(
    ([camelName, toolkitId]) => {
      const piece = library.getById(toolkitId);
      if (!piece) {
        console.warn(`Creature not found in library: ${toolkitId}`);
        return;
      }

      // CRITICAL: Only include creatures with COMPLETE zoom support
      // Missing zoom levels = broken zoom button behavior
      if (!piece.zoom?.far || !piece.zoom?.medium || !piece.zoom?.close) {
        console.warn(
          `[deepSeaAscii] Skipping ${toolkitId} - incomplete zoom support ` +
          `(far: ${!!piece.zoom?.far}, medium: ${!!piece.zoom?.medium}, close: ${!!piece.zoom?.close})`
        );
        return;
      }

      creatures[camelName] = {
        far: piece.zoom.far,
        medium: piece.zoom.medium,
        close: piece.zoom.close,
      };
    }
  );

  if (Object.keys(creatures).length === 0) {
    console.error('[deepSeaAscii] No creatures with complete zoom support found in toolkit!');
  }

  return creatures;
};

export const ZOOMABLE_CREATURES = buildZoomableCreatures();

/**
 * Get the next zoom level in the cycle: far → medium → close → far
 */
export function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['far', 'medium', 'close'];
  const index = levels.indexOf(current);
  return levels[(index + 1) % levels.length];
}

/**
 * Get the previous zoom level in reverse cycle: close → medium → far → close
 */
export function getPrevZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['far', 'medium', 'close'];
  const index = levels.indexOf(current);
  return levels[(index - 1 + levels.length) % levels.length];
}

/**
 * Get ASCII art for a specific creature at a specific zoom level
 */
export function getCreatureAtZoom(creature: CreatureName, zoom: ZoomLevel): string {
  const creatureData = ZOOMABLE_CREATURES[creature];
  if (!creatureData) {
    console.warn(`Creature not found: ${creature}, using fallback`);
    return ZOOMABLE_CREATURES['anglerFish']?.[zoom] || '';
  }
  const art = creatureData[zoom];
  if (!art) {
    console.warn(`Zoom level not found: ${creature} at ${zoom}, using fallback`);
    return ZOOMABLE_CREATURES['anglerFish']?.[zoom] || '';
  }
  return art;
}

/**
 * Get a random creature name with its medium-zoom ASCII art
 * Used when displaying random creatures in response to user input
 */
export function getRandomCreature(): { name: CreatureName; art: string } {
  const creatureNames = Object.keys(ZOOMABLE_CREATURES) as CreatureName[];

  // Fallback if no creatures are available (shouldn't happen in normal use)
  if (creatureNames.length === 0) {
    console.warn('No creatures available in ZOOMABLE_CREATURES, using fallback');
    return { name: 'anglerFish', art: ZOOMABLE_CREATURES['anglerFish']?.['medium'] || '' };
  }

  const randomCreature = creatureNames[Math.floor(Math.random() * creatureNames.length)];
  const art = getCreatureAtZoom(randomCreature, 'medium');
  return { name: randomCreature, art };
}

/**
 * Map of moods to creatures (based on ACTUAL toolkit metadata)
 * Each mood maps to creatures that have that mood in their tags.mood array
 */
const MOOD_TO_CREATURES: Record<string, CreatureName[]> = {
  // Creatures
  predatory: ['anglerFish', 'shark'],
  eerie: ['anglerFish'],
  majestic: ['giantSquid'],
  powerful: ['giantSquid'],
  delicate: ['jellyfish'],
  ethereal: ['jellyfish'],
  curious: ['octopus', 'hermitCrab'],
  intelligent: ['octopus'],
  peaceful: ['seaTurtle', 'schoolOfFish'],
  ancient: ['seaTurtle'],
  aggressive: ['shark'],
  armored: ['hermitCrab'],
  magical: ['bioluminescentFish'],
  alive: ['bioluminescentFish', 'coral'],
  menacing: ['viperFish'],
  alien: ['viperFish'],

  // Structures
  valuable: ['treasureChest'],
  mysterious: ['treasureChest'],
  vintage: ['deepSeaDiver'],
  brave: ['deepSeaDiver'],
  technological: ['submarine'],
  exploratory: ['submarine'],

  // Environment
  diverse: ['coral'],
  social: ['schoolOfFish'],
  bioluminescent: ['deepSeaScene'],
};

/**
 * Get a creature matching suggested mood
 * Falls back to random if mood not recognized
 *
 * @param mood - Mood string from Claude's analysis (should match toolkit metadata)
 * @returns Creature name and ASCII art at medium zoom
 */
export function getCreatureByMood(mood?: string): { name: CreatureName; art: string } {
  // Fallback to random if no mood provided
  if (!mood) {
    console.warn('[getCreatureByMood] No mood provided, using random creature');
    return getRandomCreature();
  }

  const normalizedMood = mood.toLowerCase().trim();
  const matchingCreatures = MOOD_TO_CREATURES[normalizedMood];

  if (!matchingCreatures || matchingCreatures.length === 0) {
    console.warn(`[getCreatureByMood] No creatures found for mood "${mood}", using random`);
    return getRandomCreature();
  }

  // Randomly select from matching creatures (allows variety within mood category)
  const randomIndex = Math.floor(Math.random() * matchingCreatures.length);
  const selectedCreature = matchingCreatures[randomIndex];
  const art = getCreatureAtZoom(selectedCreature, 'medium');

  console.log(`[getCreatureByMood] Selected "${selectedCreature}" for mood "${mood}"`);
  return { name: selectedCreature, art };
}
