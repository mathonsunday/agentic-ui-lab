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
  const contentRef = useRef(content);

  // Keep contentRef synchronized with current content prop
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  console.log(`[TypewriterLine] RENDER with isAnimating=${isAnimating}, content.length=${content.length}, revealedLength=${revealedLength}, charDelayMs=${charDelayMs}`);

  useEffect(() => {
    // If not animating, don't start the timer
    if (!isAnimating) {
      console.log(`[TypewriterLine] EFFECT: isAnimating=false, returning early (content: ${content.length} chars)`);
      logger.debug('Not animating, effect returning early', {
        contentLength: content.length,
      });
      return;
    }

    console.log(`[TypewriterLine] EFFECT: Starting animation with content length: ${content.length}`);
    logger.debug('Starting continuous animation', {
      contentLength: content.length,
      charDelayMs,
    });

    let lastLoggedRevealedLength = 0;

    // Single continuous interval that doesn't depend on content changes
    // Uses contentRef to always check CURRENT content.length on each tick
    // During streaming, content grows faster than animation can keep up
    // So we just keep incrementing forever - never "complete" until unmount
    const timer = setInterval(() => {
      setRevealedLength((prev) => {
        const currentContent = contentRef.current;

        // If content shrunk (shouldn't happen), clamp to new length
        if (prev > currentContent.length) {
          console.log(`[TypewriterLine] INTERVAL: Content shrunk, clamping ${prev} → ${currentContent.length}`);
          logger.debug('Content shrunk, clamping', {
            revealed: prev,
            newContentLength: currentContent.length,
          });
          return currentContent.length;
        }

        // If we've caught up to current content length, stop incrementing for now
        // (new chunks will arrive and we'll start animating again)
        if (prev >= currentContent.length) {
          console.log(`[TypewriterLine] INTERVAL: Caught up to content (${prev}/${currentContent.length}), waiting for more chunks`);
          return prev;  // Stay at current position until more content arrives
        }

        // Reveal next character
        const nextLength = prev + 1;

        // Log every 50 characters for debugging
        if (nextLength % 50 === 0 && nextLength !== lastLoggedRevealedLength) {
          console.log(`[TypewriterLine] Progress: ${nextLength}/${currentContent.length} chars revealed`);
          lastLoggedRevealedLength = nextLength;
        }

        return nextLength;
      });
    }, charDelayMs);

    return () => {
      console.log(`[TypewriterLine] CLEANUP: Clearing interval, revealed length was: ${lastLoggedRevealedLength}, current content.length=${contentRef.current.length}`);
      logger.debug('Clearing interval');
      clearInterval(timer);
    };
  }, [charDelayMs, isAnimating]);

  const revealed = content.substring(0, revealedLength);
  return <span className="terminal-interface__text">{revealed}</span>;
}
