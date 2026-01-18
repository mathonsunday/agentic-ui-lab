/**
 * TypewriterLine Component
 *
 * Animates text character-by-character to create a typewriter effect.
 * Reveals one character at a time with configurable typing speed.
 *
 * Useful for simulating the sensation of watching someone type in real-time,
 * providing natural pacing and rhythm to text streaming.
 */

import { useState, useEffect } from 'react';
import { createLogger } from '../utils/debugLogger';

const logger = createLogger('TypewriterLine');

export interface TypewriterLineProps {
  content: string;
  speed: number; // characters per second (10-100)
  isAnimating?: boolean; // whether this line should animate (for sequential animation)
  onComplete?: () => void; // called when animation finishes for this line
  onCharacter?: (char: string) => void;
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
  onComplete,
  onCharacter,
}: TypewriterLineProps) {
  const [revealedLength, setRevealedLength] = useState(0);
  const charDelayMs = Math.max(10, Math.round(1000 / speed));

  useEffect(() => {
    // If not animating, don't start the timer
    if (!isAnimating) {
      logger.debug('Not animating, effect returning early', {
        contentLength: content.length,
      });
      return;
    }

    console.log(`[TypewriterLine] Starting animation with content length: ${content.length}`);
    logger.debug('Starting continuous animation', {
      contentLength: content.length,
      charDelayMs,
    });

    let hasCalledComplete = false;
    let lastLoggedRevealedLength = 0;

    // Single continuous interval that doesn't depend on content changes
    // Uses closure to check current content.length on each tick
    const timer = setInterval(() => {
      setRevealedLength((prev) => {
        // If content shrunk (shouldn't happen), clamp to new length
        if (prev > content.length) {
          logger.debug('Content shrunk, clamping', {
            revealed: prev,
            newContentLength: content.length,
          });
          return content.length;
        }

        // If we've already revealed everything, call completion ONCE
        if (prev >= content.length) {
          if (prev > 0 && !hasCalledComplete) {
            hasCalledComplete = true;
            console.log(`[TypewriterLine] Animation complete! Revealed ${prev} chars, content length: ${content.length}`);
            logger.debug('Animation complete', {
              revealed: prev,
              contentLength: content.length,
            });
            onComplete?.();
          }
          return prev;  // Don't increment, stay at current position
        }

        // Reveal next character
        const nextLength = prev + 1;

        // Log every 50 characters for debugging
        if (nextLength % 50 === 0 && nextLength !== lastLoggedRevealedLength) {
          console.log(`[TypewriterLine] Progress: ${nextLength}/${content.length} chars revealed`);
          lastLoggedRevealedLength = nextLength;
        }

        onCharacter?.(content[nextLength - 1]);
        return nextLength;
      });
    }, charDelayMs);

    return () => {
      console.log(`[TypewriterLine] Clearing interval, revealed length was: ${lastLoggedRevealedLength}`);
      logger.debug('Clearing interval');
      clearInterval(timer);
    };
  }, [charDelayMs, isAnimating, onComplete, onCharacter, content]);

  const revealed = content.substring(0, revealedLength);
  return <span className="terminal-interface__text">{revealed}</span>;
}
