/**
 * LineByLineReveal Component
 *
 * Animates text by revealing one visual line at a time.
 * Preserves newlines and formatting while gradually showing content.
 *
 * Useful for preserving the structure of multi-line content like poetry,
 * code blocks, or formatted proposals while maintaining a sense of progression.
 */

import { useState, useEffect } from 'react';

export interface LineByLineRevealProps {
  content: string;
  speed: number; // characters per second (used to calculate line delay)
  onComplete?: () => void;
  onLine?: () => void;
}

/**
 * LineByLineReveal reveals text one line at a time
 *
 * Splits content by newlines and reveals each line with delay.
 * Line delay is calculated from typing speed to feel natural:
 * If average line is ~60 chars and speed is 40 chars/sec,
 * one line should take ~1.5 seconds.
 */
export function LineByLineReveal({
  content,
  speed,
  onComplete,
  onLine,
}: LineByLineRevealProps) {
  const [revealedLineCount, setRevealedLineCount] = useState(0);

  // Split content into lines
  const lines = content.split('\n');

  // Calculate delay between lines based on typing speed
  // Assume average line length ~60 chars for natural pacing
  const avgLineLength = 60;
  const lineDelayMs = Math.max(500, Math.round((avgLineLength / speed) * 1000));

  useEffect(() => {
    // If we've already revealed everything, trigger complete
    if (revealedLineCount >= lines.length && revealedLineCount > 0) {
      onComplete?.();
      return;
    }

    // If nothing to reveal yet, return
    if (revealedLineCount >= lines.length) {
      return;
    }

    // Schedule the next line reveal
    const timer = setTimeout(() => {
      setRevealedLineCount((prev) => {
        const nextCount = prev + 1;
        onLine?.();
        return nextCount;
      });
    }, lineDelayMs);

    return () => clearTimeout(timer);
  }, [revealedLineCount, lines.length, lineDelayMs, onComplete, onLine]);

  // Render only the revealed lines, preserving formatting
  return (
    <>
      {lines.slice(0, revealedLineCount).map((line, index) => (
        <span key={index} className="terminal-interface__text">
          {line}
          {index < revealedLineCount - 1 && '\n'}
        </span>
      ))}
    </>
  );
}
