/**
 * TypewriterLine Component
 *
 * Animates text character-by-character to create a typewriter effect.
 * Reveals one character at a time with configurable typing speed.
 *
 * Useful for simulating the sensation of watching someone type in real-time,
 * providing natural pacing and rhythm to text streaming.
 */

import { useState, useEffect, useRef } from 'react';
import { createLogger } from '../utils/debugLogger';

const logger = createLogger('TypewriterLine');

export interface TypewriterLineProps {
  content: string;
  speed: number; // characters per second (10-100)
  isAnimating?: boolean; // whether this line should animate (for sequential animation)
}

/**
 * TypewriterLine reveals text character-by-character
 *
 * At speed=40 chars/sec, each character takes 25ms to appear.
 * Handles content updates gracefully and cleans up timers.
 */
export function TypewriterLine({
  content,
  speed,
  isAnimating = true,
}: TypewriterLineProps) {
  const [revealedLength, setRevealedLength] = useState(0);
  const charDelayMs = Math.max(10, Math.round(1000 / speed));

  // Sync revealed length to content length when content grows
  useEffect(() => {
    setRevealedLength((prev) => Math.max(prev, 0));
  }, [content]);

  useEffect(() => {
    if (!isAnimating) {
      return;
    }

    const timer = setInterval(() => {
      setRevealedLength((prev) => {
        // Always check current content prop, not closure value
        if (prev >= content.length) {
          return prev;
        }
        return prev + 1;
      });
    }, charDelayMs);

    return () => clearInterval(timer);
  }, [charDelayMs, isAnimating, content]);

  const revealed = content.substring(0, revealedLength);
  return <span className="terminal-interface__text">{revealed}</span>;
}
