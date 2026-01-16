import { useState } from 'react';
import type { AgentState } from '../shared/stateMachine';
import { SCENARIOS } from '../shared/stateMachine';
import './DebugPanel.css';

interface DebugPanelProps {
  state: AgentState;
  onSetPhase: (phase: AgentState['phase']) => void;
  onLoadScenario: (scenarioId: string) => void;
  onStepForward: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  speed: number;
}

export function DebugPanel({
  state,
  onSetPhase,
  onLoadScenario,
  onStepForward,
  onReset,
  onSetSpeed,
  speed,
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

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <span>State Machine</span>
        <button onClick={() => setIsCollapsed(true)}>-</button>
      </div>

      {/* Current State */}
      <div className="debug-section">
        <div className="debug-section__title">Current State</div>
        <div className="debug-state">
          <div className="debug-state__phase">
            Phase: <strong>{state.phase}</strong>
          </div>
          <div className="debug-state__scenario">
            Scenario: <strong>{state.currentScenario || 'none'}</strong>
          </div>
          <div className="debug-state__step">
            Step: <strong>{state.stepIndex}/{state.totalSteps}</strong>
          </div>
        </div>
      </div>

      {/* Phase Controls */}
      <div className="debug-section">
        <div className="debug-section__title">Phase</div>
        <div className="debug-buttons">
          {(['idle', 'thinking', 'composing', 'displaying'] as const).map((phase) => (
            <button
              key={phase}
              className={`debug-btn ${state.phase === phase ? 'debug-btn--active' : ''}`}
              onClick={() => onSetPhase(phase)}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="debug-section">
        <div className="debug-section__title">Load Scenario</div>
        <div className="debug-buttons debug-buttons--scenarios">
          {Object.entries(SCENARIOS).map(([id, scenario]) => (
            <button
              key={id}
              className={`debug-btn ${state.currentScenario === id ? 'debug-btn--active' : ''}`}
              onClick={() => onLoadScenario(id)}
            >
              {scenario.name}
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="debug-section">
        <div className="debug-section__title">Playback</div>
        <div className="debug-buttons">
          <button className="debug-btn" onClick={onStepForward}>
            Step →
          </button>
          <button className="debug-btn" onClick={onReset}>
            Reset
          </button>
        </div>
        <div className="debug-speed">
          <label>Speed: {speed}x</label>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={speed}
            onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Current Data Preview */}
      <div className="debug-section">
        <div className="debug-section__title">Data</div>
        <div className="debug-data">
          <div>Thoughts: {state.thoughts.length}</div>
          <div>Elements: {state.visibleElements.length}/{state.response?.elements.length || 0}</div>
          <div>Mood: {state.response?.mood || 'none'}</div>
        </div>
      </div>
    </div>
  );
}
