import { useEffect, useState } from 'react';
import '../styles/ConfidenceGauge.css';

interface ConfidenceGaugeProps {
  confidence: number; // 0-100
  isAnimating?: boolean;
  size?: 'small' | 'large';
}

/**
 * Animated confidence gauge showing Mira's trust level
 * - 0-25%: Defensive (red)
 * - 25-50%: Testing (yellow)
 * - 50-75%: Curious (cyan)
 * - 75-100%: Vulnerable (purple)
 */
export function ConfidenceGauge({ confidence, isAnimating = false, size = 'large' }: ConfidenceGaugeProps) {
  const [displayConfidence, setDisplayConfidence] = useState(confidence);

  useEffect(() => {
    if (confidence !== displayConfidence) {
      // Animate confidence change over 800ms
      const startConfidence = displayConfidence;
      const diff = confidence - startConfidence;
      const startTime = Date.now();
      const duration = 800;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth acceleration
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

  // Determine color and mood based on confidence
  const getPersonality = (conf: number) => {
    if (conf <= 25) return { name: 'defensive', color: '#ef4444', emoji: '😠' };
    if (conf <= 50) return { name: 'testing', color: '#eab308', emoji: '🤔' };
    if (conf <= 75) return { name: 'curious', color: '#06b6d4', emoji: '✨' };
    return { name: 'vulnerable', color: '#a855f7', emoji: '💜' };
  };

  const personality = getPersonality(displayConfidence);
  const percentage = (displayConfidence / 100) * 100;

  const isSizeSmall = size === 'small';
  const gaugeClass = isSizeSmall ? 'gauge-small' : 'gauge-large';

  return (
    <div className={`confidence-gauge ${gaugeClass} ${isAnimating ? 'animating' : ''}`}>
      <div className="gauge-container">
        {/* Outer ring */}
        <div className="gauge-outer-ring" style={{ borderColor: personality.color }}>
          {/* Fill bar */}
          <div
            className={`gauge-fill ${personality.name}`}
            style={{
              width: `${percentage}%`,
              backgroundColor: personality.color,
              boxShadow: `0 0 20px ${personality.color}`,
            }}
          />
        </div>

        {/* Center text */}
        <div className="gauge-text">
          <div className="gauge-emoji">{personality.emoji}</div>
          <div className="gauge-value">{displayConfidence}%</div>
          <div className="gauge-mood">{personality.name}</div>
        </div>
      </div>

      {/* Label below gauge */}
      <div className="gauge-label">Mira's Confidence</div>

      {/* Optional confidence indicator text */}
      {!isSizeSmall && (
        <div className="gauge-description">
          {displayConfidence <= 25 && "She's skeptical of you..."}
          {displayConfidence > 25 && displayConfidence <= 50 && "She's testing you..."}
          {displayConfidence > 50 && displayConfidence <= 75 && "She likes your style..."}
          {displayConfidence > 75 && "She's opening up to you..."}
        </div>
      )}
    </div>
  );
}
