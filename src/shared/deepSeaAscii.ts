// Deep Sea ASCII Art - Zoom-based creature rendering
// All creatures support 3 zoom levels: far, medium, close

// ============================================
// ZOOM UTILITIES FOR TOOL BUTTONS
// ============================================

import * as ROVVariants from './rovAsciiVariants';

export const ZOOMABLE_CREATURES = {
  anglerFish: ROVVariants.anglerFish,
  giantSquid: ROVVariants.giantSquid,
  jellyfish: ROVVariants.jellyfish,
  octopus: ROVVariants.octopus,
  shark: ROVVariants.shark,
  treasureChest: ROVVariants.treasureChest,
  submarine: ROVVariants.submarine,
  schoolOfFish: ROVVariants.schoolOfFish,
  bioluminescentFish: ROVVariants.bioluminescentFish,
  viperFish: ROVVariants.viperFish,
  coral: ROVVariants.coral,
  hermitCrab: ROVVariants.hermitCrab,
  deepSeaScene: ROVVariants.deepSeaScene,
  seaTurtle: ROVVariants.seaTurtle,
  deepSeaDiver: ROVVariants.deepSeaDiver,
} as const;

export type ZoomLevel = 'far' | 'medium' | 'close';
export type CreatureName = keyof typeof ZOOMABLE_CREATURES;

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
  return ZOOMABLE_CREATURES[creature][zoom];
}

/**
 * Get a random creature name with its medium-zoom ASCII art
 * Used when displaying random creatures in response to user input
 */
export function getRandomCreature(): { name: CreatureName; art: string } {
  const creatureNames = Object.keys(ZOOMABLE_CREATURES) as CreatureName[];
  const randomCreature = creatureNames[Math.floor(Math.random() * creatureNames.length)];
  const art = getCreatureAtZoom(randomCreature, 'medium');
  return { name: randomCreature, art };
}
