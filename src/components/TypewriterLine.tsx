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
    // If content shrunk (shouldn't happen), reset
    if (revealedLength > content.length) {
      logger.debug('Content shrunk, resetting', {
        revealedLength,
        newContentLength: content.length,
      });
      setRevealedLength(content.length);
    }

    // If we've already revealed everything, call completion callback
    if (revealedLength >= content.length) {
      if (revealedLength > 0 && isAnimating) {
        logger.debug('Animation complete', {
          revealedLength,
          contentLength: content.length,
        });
        onComplete?.();
      }
      return;
    }

    // If not animating, don't start the timer
    if (!isAnimating) {
      logger.debug('Not animating, effect returning early', {
        revealedLength,
        contentLength: content.length,
      });
      return;
    }

    logger.debug('Starting animation', {
      revealedLength,
      contentLength: content.length,
      charDelayMs,
      isAnimating,
    });

    // Schedule the next character reveal
    const timer = setInterval(() => {
      logger.debug('Interval tick', { revealedLength });
      setRevealedLength((prev) => {
        const nextLength = prev + 1;
        if (nextLength <= content.length) {
          onCharacter?.(content[nextLength - 1]);
        }
        return nextLength;
      });
    }, charDelayMs);

    return () => {
      logger.debug('Clearing interval');
      clearInterval(timer);
    };
  }, [revealedLength, content, charDelayMs, isAnimating, onComplete, onCharacter]);

  const revealed = content.substring(0, revealedLength);
  return <span className="terminal-interface__text">{revealed}</span>;
}
