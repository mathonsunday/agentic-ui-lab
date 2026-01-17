import { useState, useCallback, useEffect, useRef } from 'react';
import { DebugPanel } from './components/DebugPanel';
import { ResearchRecruitment } from './components/ResearchRecruitment';
import { ResearchExperience } from './components/ResearchExperience';
import {
  createInitialState,
  type AgentState,
} from './shared/stateMachine';
import { evaluateHover, evaluateDecision, initializeRecruitmentLog } from './shared/researchEvaluator';
import { playStreamingSound, playPressureCreak } from './shared/audioEngine';
import './ag-ui.css';

export function MiraExperience() {
  const [state, setState] = useState<AgentState>(createInitialState);
  const [showResearch, setShowResearch] = useState(false);
  const [miraConfidence, setMiraConfidence] = useState(50); // For debug panel control
  const lastConfidenceRef = useRef<number>(0);

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
    setShowResearch(true);

    // Don't modify confidence here - keep what was set by debug slider
    setState((s) => ({
      ...s,
      systemLog: [...s.systemLog, ...newEntries],
    }));
  }, [state.researchEvaluation, state.sessionStartTime]);

  // Handle reject research decision
  const handleRejectResearch = useCallback(() => {
    const newEntries = evaluateDecision('reject', state.researchEvaluation, state.sessionStartTime);
    playPressureCreak(0.5).catch(() => {});

    setState((s) => ({
      ...s,
      systemLog: [...s.systemLog, ...newEntries],
      researchEvaluation: {
        ...s.researchEvaluation,
        confidence: 0,
      },
    }));
  }, [state.researchEvaluation, state.sessionStartTime]);

  // Handle confidence changes from debug panel
  const handleSetConfidence = useCallback((confidence: number) => {
    setMiraConfidence(confidence);
    setState((s) => ({
      ...s,
      researchEvaluation: {
        ...s.researchEvaluation,
        confidence,
      },
    }));
  }, []);

  // Return from research experience to recruitment
  const handleReturnFromResearch = useCallback(() => {
    setShowResearch(false);
  }, []);

  // Handle confidence updates from research experience
  const handleConfidenceChange = useCallback((newConfidence: number) => {
    setState((s) => ({
      ...s,
      researchEvaluation: {
        ...s.researchEvaluation,
        confidence: newConfidence,
      },
    }));
  }, []);

  // If user has joined research, show research experience instead
  if (showResearch) {
    return <ResearchExperience onReturn={handleReturnFromResearch} initialConfidence={state.researchEvaluation.confidence} onConfidenceChange={handleConfidenceChange} />;
  }

  // Show recruitment interface with debug panel
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
        onSetConfidence={handleSetConfidence}
        currentConfidence={miraConfidence}
      />
    </>
  );
}
