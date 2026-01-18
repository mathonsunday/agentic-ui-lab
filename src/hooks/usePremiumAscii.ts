/**
 * Hook for managing premium ASCII art preference
 * Persists user's choice between premium animated and text-based ASCII
 */

import { useState, useEffect, useCallback } from 'react';

const PREMIUM_ASCII_KEY = 'agentic-ui:premium-ascii-enabled';

export function usePremiumAscii(initialEnabled = true) {
  const [usePremium, setUsePremium] = useState<boolean>(initialEnabled);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PREMIUM_ASCII_KEY);
      if (stored !== null) {
        setUsePremium(stored === 'true');
      }
      setIsHydrated(true);
    }
  }, []);

  // Persist preference when it changes
  const togglePremiumAscii = useCallback((value?: boolean) => {
    setUsePremium((prev) => {
      const newValue = value !== undefined ? value : !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(PREMIUM_ASCII_KEY, String(newValue));
      }
      return newValue;
    });
  }, []);

  return {
    usePremium,
    togglePremiumAscii,
    isHydrated,
  };
}
