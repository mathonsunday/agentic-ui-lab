/**
 * Premium Creature Renderer
 * Dynamically renders animated ASCII creatures from the premium library
 * Falls back to text-based ASCII if premium component unavailable
 *
 * NOTE: This component attempts to load premium creatures from a sibling library.
 * It gracefully falls back to text-based ASCII if the premium library isn't available.
 *
 * Setup Instructions (if setting up premium rendering):
 * 1. Build the deep-sea-ascii-art library: cd ../deep-sea-ascii-art && npm run build
 * 2. Update vite.config.ts to add alias: `'@premium-ascii-art': resolve(__dirname, '../deep-sea-ascii-art')`
 * 3. Update PremiumCreatureRenderer import paths to use the alias
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';

type ZoomLevelMap = 'far' | 'medium' | 'close';

/**
 * Lazy load premium components from the sibling deep-sea-ascii-art library
 * These will gracefully fail if the library isn't installed/available
 */
const createPremiumComponent = (componentName: string): React.LazyExoticComponent<React.FC<{ zoom: ZoomLevelMap }>> => {
  return lazy(async () => {
    try {
      const m = await import(`../../../deep-sea-ascii-art/components/premium-ascii/${componentName}`);
      // Handle both default and named exports
      const Component = m.default || Object.values(m)[0];
      return { default: Component as React.FC<{ zoom: ZoomLevelMap }> };
    } catch (e) {
      // Return null component if import fails
      return { default: () => null as any };
    }
  });
};

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
  usePremium?: boolean; // Toggle between premium and fallback
}

function isPremiumAvailable(creature: CreatureName): creature is AvailablePremiumCreature {
  return creature in PremiumCreatures;
}

function mapZoomLevel(zoom: ZoomLevel): ZoomLevelMap {
  // Premium components use the same zoom levels
  return zoom as ZoomLevelMap;
}

/**
 * Fallback component that shows text-based ASCII (from your current system)
 */
function TextAsciiiFallback({
  creature,
  zoom,
  fallback,
}: {
  creature: CreatureName;
  zoom: ZoomLevel;
  fallback?: React.ReactNode;
}) {
  // If custom fallback provided, use it
  if (fallback) return <>{fallback}</>;

  // Otherwise show placeholder
  return (
    <div className="font-mono text-amber-700/50 text-sm p-4 bg-slate-900/30 rounded border border-slate-700/30">
      [Creature: {creature} at {zoom} zoom - text-based ASCII]
      <div className="text-xs mt-2 opacity-50">
        (Premium rendering not available - enable toggle to use animated version)
      </div>
    </div>
  );
}

/**
 * Main renderer component
 * Attempts to render premium animated creature, falls back to text ASCII
 */
export function PremiumCreatureRenderer({
  creature,
  zoom,
  fallback,
  usePremium = true,
}: PremiumCreatureRendererProps) {
  const premiumZoom = useMemo(() => mapZoomLevel(zoom), [zoom]);

  // If premium rendering disabled, skip directly to fallback
  if (!usePremium) {
    return <TextAsciiiFallback creature={creature} zoom={zoom} fallback={fallback} />;
  }

  // If creature not available in premium library, use fallback
  if (!isPremiumAvailable(creature)) {
    return <TextAsciiiFallback creature={creature} zoom={zoom} fallback={fallback} />;
  }

  // Render premium component with fallback UI
  const PremiumComponent = PremiumCreatures[creature];

  return (
    <Suspense fallback={<TextAsciiiFallback creature={creature} zoom={zoom} fallback={fallback} />}>
      <div className="font-mono select-none transition-all duration-300">
        <PremiumComponent zoom={premiumZoom} />
      </div>
    </Suspense>
  );
}

/**
 * Hook to determine if a creature has a premium variant
 */
export function usePremiumCreatureAvailability(creature: CreatureName): boolean {
  return isPremiumAvailable(creature);
}

/**
 * List all available premium creatures
 */
export const PREMIUM_CREATURES = Object.keys(PremiumCreatures) as AvailablePremiumCreature[];
