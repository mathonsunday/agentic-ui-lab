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
  schoolOfFish: 'deep-sea:bioluminescent-fish',
  bioluminescentFish: 'deep-sea:bioluminescent-fish',
  viperFish: 'deep-sea:viperfish',
  coral: 'deep-sea:coral-reef',
  hermitCrab: 'deep-sea:hermit-crab',
  deepSeaScene: 'deep-sea:scene',
  seaTurtle: 'deep-sea:sea-turtle',
  deepSeaDiver: 'deep-sea:diver',
};

/**
 * Check if a toolkit piece has complete zoom support (all 3 levels)
 */
function hasCompleteZoomSupport(piece: { zoom?: { far?: string; medium?: string; close?: string } }): boolean {
  return Boolean(piece.zoom?.far && piece.zoom?.medium && piece.zoom?.close);
}

/**
 * Try to get a creature's zoom data from the toolkit
 * Returns null if creature not found or incomplete zoom support
 */
function tryGetCreatureZoomData(
  toolkitId: string
): Record<ZoomLevel, string> | null {
  const piece = library.getById(toolkitId);

  if (!piece) {
    console.warn(`Creature not found in library: ${toolkitId}`);
    return null;
  }

  if (!hasCompleteZoomSupport(piece)) {
    console.warn(
      `[deepSeaAscii] Skipping ${toolkitId} - incomplete zoom support ` +
      `(far: ${!!piece.zoom?.far}, medium: ${!!piece.zoom?.medium}, close: ${!!piece.zoom?.close})`
    );
    return null;
  }

  return {
    far: piece.zoom!.far!,
    medium: piece.zoom!.medium!,
    close: piece.zoom!.close!,
  };
}

/**
 * Build ZOOMABLE_CREATURES object from toolkit for backward compatibility
 *
 * Only includes creatures with COMPLETE zoom support (all 3 levels: far, medium, close).
 * Creatures without all zoom levels are skipped to prevent broken zoom functionality.
 * This filters out environment pieces and incomplete structures from the toolkit.
 */
const buildZoomableCreatures = () => {
  const entries = Object.entries(CREATURE_ID_MAP) as Array<[CreatureName, string]>;

  const creatures = entries.reduce((acc, [camelName, toolkitId]) => {
    const zoomData = tryGetCreatureZoomData(toolkitId);
    if (zoomData) {
      acc[camelName] = zoomData;
    }
    return acc;
  }, {} as Record<CreatureName, Record<ZoomLevel, string>>);

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
 * Build reverse mapping from toolkit IDs to creature names
 * Used to convert library data back to our internal naming convention
 */
const TOOLKIT_ID_TO_CREATURE: Record<string, CreatureName> = Object.fromEntries(
  Object.entries(CREATURE_ID_MAP).map(([name, id]) => [id, name as CreatureName])
);

/**
 * Build mood-to-creatures mapping dynamically from the library
 * This ensures we stay in sync with the actual library metadata
 * Only includes creatures that have complete zoom support (are in ZOOMABLE_CREATURES)
 */
function buildMoodToCreatures(): Record<string, CreatureName[]> {
  const moodMap: Record<string, CreatureName[]> = {};
  const zoomableCreatureNames = new Set(Object.keys(ZOOMABLE_CREATURES));

  const pieces = library.getByTheme('deep-sea');

  for (const piece of pieces) {
    const creatureName = TOOLKIT_ID_TO_CREATURE[piece.id];

    // Skip if we don't recognize this piece or it lacks zoom support
    if (!creatureName || !zoomableCreatureNames.has(creatureName)) {
      continue;
    }

    // Add this creature to each of its moods
    const moods = piece.tags?.mood;
    if (moods && Array.isArray(moods)) {
      for (const mood of moods) {
        if (!moodMap[mood]) {
          moodMap[mood] = [];
        }
        moodMap[mood].push(creatureName);
      }
    }
  }

  return moodMap;
}

/**
 * Map of moods to creatures - dynamically built from library metadata
 * Only includes creatures with complete zoom support
 */
const MOOD_TO_CREATURES = buildMoodToCreatures();

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
    console.warn('[getCreatureByMood] Unrecognized mood from Claude:', { mood, normalized: normalizedMood });
    return getRandomCreature();
  }

  // Randomly select from matching creatures (allows variety within mood category)
  const randomIndex = Math.floor(Math.random() * matchingCreatures.length);
  const selectedCreature = matchingCreatures[randomIndex];
  const art = getCreatureAtZoom(selectedCreature, 'medium');

  console.log(`[getCreatureByMood] Selected "${selectedCreature}" for mood "${mood}"`);
  return { name: selectedCreature, art };
}
