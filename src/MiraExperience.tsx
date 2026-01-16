import { useState, useCallback, useEffect, useRef } from 'react';
import { VisualCanvas } from './components/VisualCanvas';
import { MinimalInput } from './components/MinimalInput';
import { ThinkingStream } from './components/ThinkingStream';
import { Atmosphere } from './components/Atmosphere';
import { FloatingText } from './components/FloatingText';
import { CreaturePresence } from './components/CreaturePresence';
import { DebugPanel } from './components/DebugPanel';
import { ResearchRecruitment } from './components/ResearchRecruitment';
import { ResearchExperience } from './components/ResearchExperience';
import {
  createInitialState,
  loadScenario,
  setPhase,
  stepForward,
  reset,
  SCENARIOS,
  type AgentState,
  type Phase,
} from './shared/stateMachine';
import { evaluateHover, evaluateDecision, initializeRecruitmentLog } from './shared/researchEvaluator';
import { playStreamingSound, playPressureCreak } from './shared/audioEngine';
import './ag-ui.css';

export function MiraExperience() {
  const [state, setState] = useState<AgentState>(createInitialState);
  const [speed, setSpeed] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showRecruitment, setShowRecruitment] = useState(true);
  const [showResearch, setShowResearch] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastConfidenceRef = useRef<number>(0);

  // Auto-advance through steps when autoPlay is on
  useEffect(() => {
    if (!autoPlay) return;
    if (state.phase === 'idle' || state.phase === 'displaying') return;
    if (state.stepIndex >= state.totalSteps) return;

    const baseDelay = state.phase === 'thinking' ? 800 : 600;
    const delay = baseDelay / speed;

    timerRef.current = window.setTimeout(() => {
      setState((s) => stepForward(s));
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.phase, state.stepIndex, state.totalSteps, autoPlay, speed]);

  // Initialize recruitment flow on mount
  useEffect(() => {
    const initialLog = initializeRecruitmentLog(state.sessionStartTime);
    setState((s) => ({
      ...s,
      systemLog: initialLog,
      researchEvaluation: {
        ...s.researchEvaluation,
        confidence: 0,
      },
    }));
  }, []);

  // Handle research recruitment hover
  const handleRecruitmentHover = useCallback(
    (target: 'join' | 'reject' | null) => {
      setState((prevState) => {
        const { evaluation, newEntries } = evaluateHover(
          prevState.researchEvaluation,
          target,
          prevState.sessionStartTime
        );

        // Play audio cue if confidence changed significantly
        const confidenceDelta = Math.abs(evaluation.confidence - lastConfidenceRef.current);
        if (confidenceDelta > 5) {
          lastConfidenceRef.current = evaluation.confidence;
          if (target === 'reject') {
            playStreamingSound('thinking').catch(() => {});
          } else if (target === 'join') {
            playStreamingSound('composing').catch(() => {});
          }
        }

        return {
          ...prevState,
          researchEvaluation: evaluation,
          systemLog: [...prevState.systemLog, ...newEntries],
        };
      });
    },
    []
  );

  // Handle join research decision
  const handleJoinResearch = useCallback(() => {
    const newEntries = evaluateDecision('join', state.researchEvaluation, state.sessionStartTime);
    playStreamingSound('displaying').catch(() => {});
    setShowRecruitment(false);
    setShowResearch(true);

    setState((s) => ({
      ...s,
      systemLog: [...s.systemLog, ...newEntries],
      researchEvaluation: {
        ...s.researchEvaluation,
        confidence: 100,
      },
    }));
  }, [state.researchEvaluation, state.sessionStartTime]);

  // Handle reject research decision
  const handleRejectResearch = useCallback(() => {
    const newEntries = evaluateDecision('reject', state.researchEvaluation, state.sessionStartTime);
    playPressureCreak(0.5).catch(() => {});
    setShowRecruitment(false);

    setState((s) => ({
      ...s,
      systemLog: [...s.systemLog, ...newEntries],
      researchEvaluation: {
        ...s.researchEvaluation,
        confidence: 0,
      },
    }));
  }, [state.researchEvaluation, state.sessionStartTime]);

  // Handle user text input
  const handleInput = useCallback((input: string) => {
    // Load specimen47 scenario and start thinking
    setState((s) => {
      const loaded = loadScenario(s, 'specimen47');
      return { ...loaded, phase: 'thinking' as Phase };
    });
    setAutoPlay(true);
  }, []);

  // Handle thinking stream completion (when it naturally finishes)
  const handleThinkingComplete = useCallback(() => {
    // Only auto-transition if we're in autoPlay mode
    if (autoPlay && state.currentScenario) {
      const scenario = SCENARIOS[state.currentScenario];
      setState((s) => ({
        ...s,
        phase: 'composing' as Phase,
        stepIndex: scenario.thoughts.length,
      }));
    }
  }, [autoPlay, state.currentScenario]);

  // Debug panel handlers
  const handleSetPhase = useCallback((phase: Phase) => {
    setAutoPlay(false);
    setState((s) => setPhase(s, phase));
  }, []);

  const handleLoadScenario = useCallback((scenarioId: string) => {
    setAutoPlay(false);
    setState((s) => loadScenario(s, scenarioId));
  }, []);

  const handleStepForward = useCallback(() => {
    setAutoPlay(false);
    setState((s) => stepForward(s));
  }, []);

  const handleReset = useCallback(() => {
    setAutoPlay(false);
    setState((s) => reset(s));
  }, []);

  // Return from research experience to recruitment
  const handleReturnFromResearch = useCallback(() => {
    setShowResearch(false);
    setShowRecruitment(true);
  }, []);

  // Derive what to show based on current step
  const thoughtCount = state.currentScenario
    ? SCENARIOS[state.currentScenario]?.thoughts.length || 0
    : 0;
  const visibleThoughtIndex = state.phase === 'thinking'
    ? Math.min(state.stepIndex, thoughtCount)
    : thoughtCount;

  // If user has joined research, show research experience instead
  if (showResearch) {
    return <ResearchExperience onReturn={handleReturnFromResearch} />;
  }

  // If showing recruitment, show clean recruitment interface only
  if (showRecruitment) {
    return (
      <>
        <ResearchRecruitment
          onJoin={handleJoinResearch}
          onReject={handleRejectResearch}
          onHoverChange={handleRecruitmentHover}
          confidence={state.researchEvaluation.confidence}
          isActive={true}
        />
        <DebugPanel
          state={state}
          onSetPhase={handleSetPhase}
          onLoadScenario={handleLoadScenario}
          onStepForward={handleStepForward}
          onReset={handleReset}
          onSetSpeed={setSpeed}
          speed={speed}
        />
      </>
    );
  }

  return (
    <VisualCanvas>
      {/* Background atmosphere */}
      <Atmosphere
        mood={state.response?.mood || 'calm'}
        depth={state.response?.depth || 1500}
        intensity={state.phase === 'thinking' ? 0.5 : 0.8}
      />

      {/* Thinking stream - visible stream of consciousness */}
      {!showRecruitment && state.thoughts.length > 0 && (
        <ThinkingStream
          thoughts={state.thoughts.slice(0, visibleThoughtIndex)}
          isActive={state.phase === 'thinking'}
          onComplete={handleThinkingComplete}
        />
      )}

      {/* Streamed visual elements */}
      {!showRecruitment &&
        state.visibleElements.map((element, i) => {
          if (element.type === 'text') {
            return (
              <FloatingText
                key={`text-${i}`}
                content={element.content}
                position={element.position}
                style={
                  element.content === element.content.toUpperCase()
                    ? 'shout'
                    : 'normal'
                }
                drift
              />
            );
          }
          if (element.type === 'creature') {
            return (
              <CreaturePresence
                key={`creature-${i}`}
                type={
                  element.content as
                    | 'seeker'
                    | 'tendril'
                    | 'leviathan-eye'
                    | 'jellyfish'
                }
                position={element.position}
                visible
              />
            );
          }
          return null;
        })}

      {/* Input */}
      {!showRecruitment && (
        <MinimalInput
          onSubmit={handleInput}
          disabled={state.phase === 'thinking' || state.phase === 'composing'}
          placeholder="Speak to Dr. Petrovic..."
        />
      )}

      {/* Debug Panel */}
      <DebugPanel
        state={state}
        onSetPhase={handleSetPhase}
        onLoadScenario={handleLoadScenario}
        onStepForward={handleStepForward}
        onReset={handleReset}
        onSetSpeed={setSpeed}
        speed={speed}
      />
    </VisualCanvas>
  );
}
