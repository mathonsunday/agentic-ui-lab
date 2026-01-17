import { useEffect, useState } from 'react';
import '../styles/ConfidenceGauge.css';

interface ConfidenceGaugeProps {
  confidence: number; // 0-100
  isAnimating?: boolean;
}

/**
 * Simple horizontal bar showing Mira's confidence level
 * Animates smoothly as confidence updates
 */
export function ConfidenceGauge({ confidence, isAnimating = false }: ConfidenceGaugeProps) {
  const [displayConfidence, setDisplayConfidence] = useState(confidence);

  useEffect(() => {
    console.log('📊 ConfidenceGauge received prop:', confidence, 'current display:', displayConfidence);
    if (confidence !== displayConfidence) {
      console.log('🎬 Starting animation:', displayConfidence, '→', confidence);
      // Animate confidence change over 600ms
      const startConfidence = displayConfidence;
      const diff = confidence - startConfidence;
      const startTime = Date.now();
      const duration = 600;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth easing
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const newConfidence = startConfidence + diff * easeOut;

        setDisplayConfidence(Math.round(newConfidence));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [confidence, displayConfidence]);

  // Get color based on confidence
  const getColor = (conf: number) => {
    if (conf <= 25) return '#ef4444'; // red - defensive
    if (conf <= 50) return '#eab308'; // yellow - testing
    if (conf <= 75) return '#06b6d4'; // cyan - curious
    return '#a855f7'; // purple - vulnerable
  };

  const color = getColor(displayConfidence);
  const percentage = (displayConfidence / 100) * 100;

  return (
    <div className={`confidence-gauge ${isAnimating ? 'animating' : ''}`}>
      <div className="gauge-header">
        <span className="gauge-label">[CONFIDENCE]</span>
        <span className="gauge-value">{displayConfidence}%</span>
      </div>
      <div className="gauge-bar-container">
        <div
          className="gauge-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
