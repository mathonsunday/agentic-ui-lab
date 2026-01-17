/**
 * RapportGauge Component
 * Displays the current rapport/confidence as an ASCII bar that updates in place
 * Format: [RAPPORT] [████████░░░░░░░░░░] 42%
 */

interface RapportGaugeProps {
  confidence: number; // 0-100
}

export function RapportGauge({ confidence }: RapportGaugeProps) {
  const percent = Math.round(confidence);
  const filled = Math.round(percent / 5); // 20 characters total, so 5% per character
  const empty = 20 - filled;
  const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';

  return (
    <div className="rapport-gauge">
      <span className="rapport-gauge__text">[RAPPORT] {bar} {percent}%</span>
    </div>
  );
}
