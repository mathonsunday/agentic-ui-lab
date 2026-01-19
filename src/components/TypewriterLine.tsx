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

export interface TypewriterLineProps {
  content: string;
  speed: number; // characters per second (10-100)
  isAnimating?: boolean; // whether this line should animate (for sequential animation)
  onRevealedLengthChange?: (length: number) => void; // callback when revealed length changes
}

/**
 * TypewriterLine reveals text character-by-character
 *
 * At speed=40 chars/sec, each character takes 25ms to appear.
 * Handles content updates gracefully and cleans up timers.
 *
 * IMPLEMENTATION NOTE - Streaming Content Support:
 * The animation interval is decoupled from content updates. The interval runs
 * continuously while isAnimating=true, and the reveal callback reads the latest
 * content.length on each tick. This ensures smooth character-by-character animation
 * even as chunks arrive asynchronously from the backend.
 *
 * This follows the industry-standard pattern of "decoupling network streaming from
 * visual streaming" - buffer incoming chunks, animate from buffer at constant rate.
 */
export function TypewriterLine({
  content,
  speed,
  isAnimating = true,
  onRevealedLengthChange,
}: TypewriterLineProps) {
  const [revealedLength, setRevealedLength] = useState(0);
  const charDelayMs = Math.max(10, Math.round(1000 / speed));
  const contentRef = useRef(content);

  // Keep ref in sync with current content
  useEffect(() => {
    contentRef.current = content;
    // Clamp revealed length if content shrinks
    setRevealedLength((prev) => Math.min(prev, content.length));
  }, [content]);

  // Notify parent of revealed length changes (for interrupt handling)
  useEffect(() => {
    onRevealedLengthChange?.(revealedLength);
  }, [revealedLength, onRevealedLengthChange]);

  useEffect(() => {
    if (!isAnimating) {
      return;
    }

    const timer = setInterval(() => {
      setRevealedLength((prev) => {
        // Read current content via ref, not closure
        const currentContent = contentRef.current;
        if (prev >= currentContent.length) {
          return prev;
        }
        return prev + 1;
      });
    }, charDelayMs);

    return () => clearInterval(timer);
  }, [charDelayMs, isAnimating]);

  const revealed = content.substring(0, revealedLength);
  return <span className="terminal-interface__text">{revealed}</span>;
}
