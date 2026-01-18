/**
 * Premium Creature Renderer
 * Dynamically renders animated ASCII creatures from the deep-sea-ascii-art library
 * Falls back to text-based ASCII if premium component unavailable
 */

import React, { lazy, Suspense } from 'react';
import { type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';

/**
 * Type for premium creature components
 */
interface PremiumCreatureComponent {
  (props: { zoom?: ZoomLevel }): React.ReactElement;
}

/**
 * Helper to create lazy-loaded components with proper error handling
 */
const createPremiumComponent = (componentPath: string) => {
  return lazy(
    async () => {
      try {
        const module = await import(
          /* @vite-ignore */
          `../../deep-sea-ascii-art/components/premium-ascii/${componentPath}`
        );
        // Support both default and named exports
        const component: PremiumCreatureComponent =
          module.default ||
          module[Object.keys(module).find((k) => k.startsWith('Animated')) || ''];
        return { default: component };
      } catch (error) {
        console.error(
          `Failed to load premium component: ${componentPath}`,
          error
        );
        // Return null component on failure
        return { default: (() => React.createElement('div')) as PremiumCreatureComponent };
      }
    }
  ) as React.LazyExoticComponent<PremiumCreatureComponent>;
};

/**
 * Map creature names to their premium animated components
 */
const PremiumCreatures = {
  anglerFish: createPremiumComponent('animated-anglerfish'),
  jellyfish: createPremiumComponent('animated-jellyfish'),
  bioluminescentFish: createPremiumComponent('animated-bioluminescent-fish'),
  viperFish: createPremiumComponent('animated-viper-fish'),
  treasureChest: createPremiumComponent('animated-treasure-chest'),
  coral: createPremiumComponent('animated-coral'),
  deepSeaDiver: createPremiumComponent('animated-deep-sea-diver'),
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

  // Render with Suspense for loading states
  return (
    <Suspense fallback={<TextAsciiFallback fallback={fallback} />}>
      <PremiumComponent zoom={zoom} />
    </Suspense>
  );
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
