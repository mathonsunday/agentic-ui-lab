/**
 * Premium Creature Renderer
 * Dynamically renders animated ASCII creatures from the deep-sea-ascii-art library
 * Falls back to text-based ASCII if premium component unavailable
 */

import React from 'react';
import { type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';

// Direct static imports of premium components
import { AnimatedAnglerfish } from './premium-creatures/animated-anglerfish';
import { AnimatedJellyfish } from './premium-creatures/animated-jellyfish';
import { AnimatedBioluminescentFish } from './premium-creatures/animated-bioluminescent-fish';
import { AnimatedViperFish } from './premium-creatures/animated-viper-fish';
import { AnimatedTreasureChest } from './premium-creatures/animated-treasure-chest';
import { AnimatedCoral } from './premium-creatures/animated-coral';
import { AnimatedDeepSeaDiver } from './premium-creatures/animated-deep-sea-diver';

/**
 * Map creature names to their premium animated components
 */
const PremiumCreatures = {
  anglerFish: AnimatedAnglerfish,
  jellyfish: AnimatedJellyfish,
  bioluminescentFish: AnimatedBioluminescentFish,
  viperFish: AnimatedViperFish,
  treasureChest: AnimatedTreasureChest,
  coral: AnimatedCoral,
  deepSeaDiver: AnimatedDeepSeaDiver,
} as const;

type AvailablePremiumCreature = keyof typeof PremiumCreatures;

interface PremiumCreatureRendererProps {
  creature: CreatureName;
  zoom: ZoomLevel;
  fallback?: React.ReactNode;
  usePremium?: boolean;
}

/**
 * Check if a creature has a premium animated version
 */
function isPremiumAvailable(creature: CreatureName): boolean {
  return creature in PremiumCreatures;
}

/**
 * Fallback component that shows text-based ASCII
 */
function TextAsciiFallback({
  fallback,
}: {
  fallback?: React.ReactNode;
}) {
  // If custom fallback provided, use it
  if (fallback) return <>{fallback}</>;

  // Otherwise show placeholder
  return (
    <div className="font-mono text-amber-700/50 text-sm p-4 bg-slate-900/30 rounded border border-slate-700/30">
      [Text-based ASCII rendering]
    </div>
  );
}

/**
 * Main renderer component
 * Shows premium animated creatures if available, falls back to text ASCII
 */
export function PremiumCreatureRenderer({
  creature,
  zoom,
  fallback,
  usePremium = true,
}: PremiumCreatureRendererProps) {
  // If premium disabled by user, show text ASCII immediately
  if (!usePremium) {
    return <TextAsciiFallback fallback={fallback} />;
  }

  // If this creature doesn't have a premium version, show text ASCII
  if (!isPremiumAvailable(creature)) {
    return <TextAsciiFallback fallback={fallback} />;
  }

  // Get the premium component
  const PremiumComponent =
    PremiumCreatures[creature as AvailablePremiumCreature];

  // Render premium component directly
  return <PremiumComponent zoom={zoom} />;
}

/**
 * Hook to determine if a creature has a premium variant
 */
export function usePremiumCreatureAvailability(
  creature: CreatureName
): boolean {
  return isPremiumAvailable(creature);
}

/**
 * List all available premium creatures
 */
export const PREMIUM_CREATURES: AvailablePremiumCreature[] = Object.keys(
  PremiumCreatures
) as AvailablePremiumCreature[];
