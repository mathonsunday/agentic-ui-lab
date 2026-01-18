/**
 * Premium Creature Renderer
 * Dynamically renders animated ASCII creatures from the premium library
 * Falls back to text-based ASCII if premium component unavailable
 *
 * CURRENT STATUS: Operating in fallback mode (text ASCII)
 * The premium library (deep-sea-ascii-art) is not currently available.
 * The toggle button still works - it just switches between text modes.
 *
 * To enable premium animated creatures:
 * 1. Ensure deep-sea-ascii-art library is available
 * 2. Build it: cd ../deep-sea-ascii-art && npm run build
 * 3. Uncomment the createPremiumComponent function below
 * 4. Update vite.config.ts with path alias if needed
 */

import React from 'react';
import { type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';

/**
 * Premium creatures mapping
 * Currently empty - all creatures use text ASCII fallback
 * When the premium library is available, this will be populated
 */
const PremiumCreatures = {
  // Placeholder - commented out since library not available
  // To enable: uncomment and ensure deep-sea-ascii-art library is built
  // anglerFish: lazy(() => import('../../../deep-sea-ascii-art/...')),
  // jellyfish: lazy(() => import('../../../deep-sea-ascii-art/...')),
  // etc...
} as const;

type AvailablePremiumCreature = keyof typeof PremiumCreatures;

interface PremiumCreatureRendererProps {
  creature: CreatureName;
  zoom: ZoomLevel;
  fallback?: React.ReactNode;
  usePremium?: boolean; // Toggle between premium and fallback
}

function isPremiumAvailable(_creature: CreatureName): boolean {
  // Since PremiumCreatures is empty, no premium creatures are available
  return false;
}

/**
 * Fallback component that shows text-based ASCII (from your current system)
 */
function TextAsciiiFallback({
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
 * Currently always renders text ASCII since premium library is not available
 */
export function PremiumCreatureRenderer({
  fallback,
  usePremium = true,
}: PremiumCreatureRendererProps) {
  // For now, always use fallback since no premium creatures are available
  // The usePremium flag is still here for future use
  (usePremium); // Use the parameter to avoid unused variable warning

  return <TextAsciiiFallback fallback={fallback} />;
}

/**
 * Hook to determine if a creature has a premium variant
 * Currently always returns false since premium library not available
 */
export function usePremiumCreatureAvailability(_creature: CreatureName): boolean {
  return isPremiumAvailable(_creature);
}

/**
 * List all available premium creatures
 * Currently empty
 */
export const PREMIUM_CREATURES: AvailablePremiumCreature[] = [];
