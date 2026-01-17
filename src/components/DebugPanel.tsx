import { useState } from 'react';
import './DebugPanel.css';

interface DebugPanelProps {
  onSetConfidence?: (confidence: number) => void;
  currentConfidence?: number;
}

export function DebugPanel({
  onSetConfidence,
  currentConfidence,
}: DebugPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (isCollapsed) {
    return (
      <button
        className="debug-panel debug-panel--collapsed"
        onClick={() => setIsCollapsed(false)}
      >
        Debug
      </button>
    );
  }

  if (!onSetConfidence || currentConfidence === undefined) {
    return null;
  }

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <span>Recruitment Debug</span>
        <button onClick={() => setIsCollapsed(true)}>-</button>
      </div>

      {/* Confidence Control */}
      <div className="debug-section">
        <div className="debug-section__title">Test Confidence</div>
        <div className="debug-confidence">
          <div className="debug-confidence__display">
            <div className="debug-confidence__value">{Math.round(currentConfidence)}%</div>
            <div className="debug-confidence__personality">
              {currentConfidence <= 25 && 'negative'}
              {currentConfidence > 25 && currentConfidence <= 50 && 'chaotic'}
              {currentConfidence > 50 && currentConfidence <= 75 && 'glowing'}
              {currentConfidence > 75 && 'slovak'}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(currentConfidence)}
            onChange={(e) => onSetConfidence(parseInt(e.target.value, 10))}
            className="debug-confidence__slider"
          />
          <div className="debug-confidence__labels">
            <span>negative</span>
            <span>chaotic</span>
            <span>glowing</span>
            <span>slovak</span>
          </div>
        </div>
      </div>
    </div>
  );
}
