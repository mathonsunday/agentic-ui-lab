import { useState } from 'react';
import { useAtom } from 'jotai';
import { settingsAtom, type TypingMode } from '../stores/settings';
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
  const [settings, setSettings] = useAtom(settingsAtom);

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

  const handleTypingModeChange = (mode: TypingMode) => {
    setSettings({ ...settings, typingMode: mode });
  };

  const handleSpeedChange = (speed: number) => {
    setSettings({ ...settings, typingSpeed: speed });
  };

  const handleSoundToggle = () => {
    setSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

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

      {/* Typing Animation Controls */}
      <div className="debug-section">
        <div className="debug-section__title">Typing Mode</div>
        <div className="debug-typing-modes">
          <label className="debug-typing-mode">
            <input
              type="radio"
              name="typing-mode"
              value="instant"
              checked={settings.typingMode === 'instant'}
              onChange={(e) => handleTypingModeChange(e.target.value as TypingMode)}
            />
            <span>Instant</span>
          </label>
          <label className="debug-typing-mode">
            <input
              type="radio"
              name="typing-mode"
              value="character"
              checked={settings.typingMode === 'character'}
              onChange={(e) => handleTypingModeChange(e.target.value as TypingMode)}
            />
            <span>Character</span>
          </label>
          <label className="debug-typing-mode">
            <input
              type="radio"
              name="typing-mode"
              value="line"
              checked={settings.typingMode === 'line'}
              onChange={(e) => handleTypingModeChange(e.target.value as TypingMode)}
            />
            <span>Line</span>
          </label>
        </div>

        {settings.typingMode !== 'instant' && (
          <div className="debug-speed">
            <label>
              Speed: {settings.typingSpeed} chars/sec
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={settings.typingSpeed}
              onChange={(e) => handleSpeedChange(parseInt(e.target.value, 10))}
            />
          </div>
        )}

        <div className="debug-sound">
          <label className="debug-sound-toggle">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={handleSoundToggle}
            />
            <span>{settings.soundEnabled ? 'Sound: ON' : 'Sound: OFF'}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
