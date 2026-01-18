/**
 * Deep Sea ASCII Art - Zoom-based creature rendering
 *
 * This module provides zoom level navigation and creature lookup for the deep-sea theme.
 * It maintains backward compatibility with existing code while using the ascii-art-toolkit
 * library as the data source.
 *
 * All creatures support 3 zoom levels: far, medium, close
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

      creatures[camelName] = {
        far: piece.zoom?.far || piece.art,
        medium: piece.zoom?.medium || piece.art,
        close: piece.zoom?.close || piece.art,
      };
    }
  );

  return creatures as const;
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
