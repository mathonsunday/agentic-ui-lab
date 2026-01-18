/**
 * Analysis Display Formatting Utilities
 *
 * Centralized formatting for analysis data, confidence bars, and ASCII boxes.
 * Used by both frontend (TerminalInterface) and backend (analyze-user-stream).
 *
 * This consolidates formatting logic that was previously scattered across:
 * - src/components/TerminalInterface.tsx (formatAnalysisBox)
 * - api/analyze-user-stream.ts (generateConfidenceBar)
 */

export interface AnalysisDisplayData {
  reasoning: string;
  confidenceDelta: number;
}

/**
 * Generate ASCII rapport bar showing confidence level
 *
 * @example
 * generateConfidenceBar(42) => "[RAPPORT] [████████░░░░░░░░░░] 42%\n"
 * generateConfidenceBar(100) => "[RAPPORT] [████████████████████] 100%\n"
 */
export function generateConfidenceBar(confidence: number): string {
  const percent = Math.round(confidence);
  const filled = Math.round(percent / 5); // 20 characters total, so 5% per character
  const empty = 20 - filled;
  const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  return `[RAPPORT] ${bar} ${percent}%\n`;
}

/**
 * Format analysis reasoning as ASCII box with confidence delta in header
 * Creates a visually distinct block showing Mira's internal observations
 *
 * @example
 * formatAnalysisBox(
 *   "That was a thoughtful observation about deep-sea bioluminescence",
 *   +5
 * ) =>
 * ┌─ MIRA'S NOTES ────────────────── [+5 confidence] ─┐
 * │ That was a thoughtful observation about deep-sea   │
 * │ bioluminescence                                     │
 * └────────────────────────────────────────────────────┘
 */
export function formatAnalysisBox(data: AnalysisDisplayData): string {
  const { reasoning, confidenceDelta } = data;
  const deltaSymbol = confidenceDelta >= 0 ? '+' : '';
  const deltaText = `[${deltaSymbol}${confidenceDelta} confidence]`;

  // Box drawing characters
  const topLeft = '┌';
  const topRight = '┐';
  const bottomLeft = '└';
  const bottomRight = '┘';
  const horizontal = '─';
  const vertical = '│';

  // Wrap reasoning text to fit in box (max 55 chars per line for responsive)
  const maxWidth = 55;
  const words = reasoning.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxWidth) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Build box
  const boxWidth = Math.max(
    Math.max(...lines.map(l => l.length)),
    20 + deltaText.length
  ) + 2; // +2 for padding

  const topBar = `${topLeft}${horizontal} MIRA'S NOTES ${horizontal.repeat(Math.max(0, boxWidth - 15 - deltaText.length))} ${deltaText} ${horizontal}${topRight}`;
  const bottomBar = `${bottomLeft}${horizontal.repeat(boxWidth + 2)}${bottomRight}`;

  const contentLines = lines.map(line =>
    `${vertical} ${line.padEnd(boxWidth, ' ')} ${vertical}`
  );

  return [topBar, ...contentLines, bottomBar].join('\n');
}

/**
 * Format metrics display as key-value pairs
 *
 * @example
 * formatMetricsDisplay({
 *   thoughtfulness: 75,
 *   curiosity: 82
 * }) =>
 * "thoughtfulness: 75\ncuriosity: 82"
 */
export function formatMetricsDisplay(metrics: Record<string, number>): string {
  return Object.entries(metrics)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}
