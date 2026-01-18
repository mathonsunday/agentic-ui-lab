/**
 * Custom hook for managing SSE streaming lifecycle
 *
 * Encapsulates:
 * - Stream state (isStreaming, streamId, abortController)
 * - Terminal lines accumulation
 * - Stream callbacks (onMessage, onAnalysis, onComplete)
 * - Interaction callbacks (onConfidenceChange, onInterrupt)
 *
 * Extracted from TerminalInterface.tsx (220 LoC reduction)
 */

import { useReducer, useState, useCallback, useRef, useEffect } from 'react';
import { streamMiraBackend } from '../services/miraBackendStream';
import { initializeMiraState, type MiraState } from '../shared/miraAgentSimulator';
import { playStreamingSound, playHydrophoneStatic } from '../shared/audioEngine';

export interface TerminalLine {
  id: string;
  type: 'ascii' | 'text' | 'input' | 'system' | 'analysis';
  content: string;
  timestamp?: number;
  analysisData?: {
    reasoning: string;
    confidenceDelta: number;
  };
}

interface StreamState {
  isStreaming: boolean;
  streamId: number;
  abortController: (() => void) | null;
}

type StreamAction =
  | { type: 'START_STREAM'; abort: () => void }
  | { type: 'END_STREAM' }
  | { type: 'INTERRUPT_STREAM' };

function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'START_STREAM':
      const newStreamId = state.streamId + 1;
      console.log(`🎬 [REDUCER] START_STREAM #${newStreamId}`, { isStreaming: true });
      return {
        isStreaming: true,
        streamId: newStreamId,
        abortController: action.abort,
      };
    case 'END_STREAM':
      console.log(`🏁 [REDUCER] END_STREAM #${state.streamId}`, { isStreaming: false });
      return {
        ...state,
        isStreaming: false,
        abortController: null,
      };
    case 'INTERRUPT_STREAM':
      console.log(`🛑 [REDUCER] INTERRUPT_STREAM #${state.streamId}`, { isStreaming: false });
      return {
        ...state,
        isStreaming: false,
        abortController: null,
      };
    default:
      return state;
  }
}

export interface UseTerminalStreamingOptions {
  initialConfidence?: number;
  onConfidenceChange?: (newConfidence: number) => void;
}

export interface UseTerminalStreamingReturn {
  streamState: StreamState;
  terminalLines: TerminalLine[];
  miraState: MiraState;
  lineCountRef: React.MutableRefObject<number>;
  isStreamInterruptedRef: React.MutableRefObject<boolean>;
  interruptedStreamIdRef: React.MutableRefObject<number | null>;
  lastConfidenceUpdateStreamIdRef: React.MutableRefObject<number | null>;
  responseLineIdsRef: React.MutableRefObject<string[]>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  addTerminalLine: (type: TerminalLine['type'], content: string, analysisData?: { reasoning: string; confidenceDelta: number }) => void;
  updateRapportBar: (newConfidence: number) => void;
  sendMessage: (userInput: string) => Promise<void>;
  interrupt: () => void;
}

/**
 * Hook for managing terminal streaming state and operations
 */
export function useTerminalStreaming(options: UseTerminalStreamingOptions = {}): UseTerminalStreamingReturn {
  const { initialConfidence, onConfidenceChange } = options;

  const [miraState, setMiraState] = useState<MiraState>(() => {
    return initializeMiraState(initialConfidence);
  });

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'system',
      content: '> DR. PETROVIC\'S RESEARCH TERMINAL INITIALIZED',
      timestamp: Date.now(),
    },
    {
      id: '1',
      type: 'text',
      content: '...you accepted my invitation...',
      timestamp: Date.now() + 100,
    },
  ]);

  const [streamState, dispatchStream] = useReducer(streamReducer, {
    isStreaming: false,
    streamId: 0,
    abortController: null,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineCountRef = useRef(2);
  const responseLineIdsRef = useRef<string[]>([]);
  const isStreamInterruptedRef = useRef(false);
  const interruptedStreamIdRef = useRef<number | null>(null);
  const lastConfidenceUpdateStreamIdRef = useRef<number | null>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [terminalLines]);

  const addTerminalLine = useCallback(
    (type: TerminalLine['type'], content: string, analysisData?: { reasoning: string; confidenceDelta: number }) => {
      const newLine: TerminalLine = {
        id: String(lineCountRef.current++),
        type,
        content,
        timestamp: Date.now(),
        analysisData,
      };
      setTerminalLines((prev) => [...prev, newLine]);
    },
    []
  );

  const updateRapportBar = useCallback((newConfidence: number) => {
    const percent = Math.round(newConfidence);
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    const newRapportText = `[RAPPORT] ${bar} ${percent}%`;

    setTerminalLines((prev) => {
      let lastRapportIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === 'text' && prev[i].content.includes('[RAPPORT]')) {
          lastRapportIndex = i;
          break;
        }
      }

      if (lastRapportIndex === -1) return prev;

      const updated = [...prev];
      updated[lastRapportIndex] = {
        ...updated[lastRapportIndex],
        content: newRapportText,
      };
      return updated;
    });
  }, []);

  const sendMessage = useCallback(
    async (userInput: string) => {
      const streamNum = streamState.streamId + 1;
      console.log(`📤 [useTerminalStreaming] Sending message - STREAM #${streamNum}`, { userInput: userInput.substring(0, 30) });

      if (streamState.isStreaming) {
        console.log('⚠️ Already streaming, ignoring message');
        return;
      }

      isStreamInterruptedRef.current = false;
      interruptedStreamIdRef.current = null;
      lastConfidenceUpdateStreamIdRef.current = null;

      // Add user input line
      addTerminalLine('input', `> ${userInput}`);

      // Start stream
      let abortController: AbortController | null = null;
      const abort = () => {
        if (abortController) {
          abortController.abort();
        }
      };
      dispatchStream({ type: 'START_STREAM', abort });

      try {
        // Play interaction sound
        await playStreamingSound('thinking');

        abortController = new AbortController();
        // @ts-expect-error - Hook extraction not yet complete (Phase 3)
        // TODO: Update streamMiraBackend call signature when integrating into TerminalInterface
        const { promise } = streamMiraBackend(userInput, miraState, {
          type: 'response',
          confidenceDelta: 0,
          traits: {},
        }, null, {
          onResponseChunk: (text: string) => {
            addTerminalLine('text', text);
          },
          onAnalysis: (data: any) => {
            addTerminalLine('analysis', '', data);
            if (onConfidenceChange) {
              onConfidenceChange(miraState.confidenceInUser + data.confidenceDelta);
            }
          },
          onComplete: (data: any) => {
            setMiraState(data.updatedState);
            dispatchStream({ type: 'END_STREAM' });
            lastConfidenceUpdateStreamIdRef.current = null;
          },
          onError: (error: string) => {
            console.error('Stream error:', error);
            dispatchStream({ type: 'END_STREAM' });
          },
        });
        await promise;
      } catch (error) {
        if (error instanceof Error && error.message === 'Aborted') {
          console.log(`⏹️ Stream #${streamNum} was aborted`);
          isStreamInterruptedRef.current = true;
        } else {
          console.error('Streaming error:', error);
        }
        dispatchStream({ type: 'END_STREAM' });
      }
    },
    [streamState.streamId, miraState, addTerminalLine, onConfidenceChange]
  );

  const interrupt = useCallback(() => {
    if (streamState.isStreaming && streamState.abortController) {
      console.log(`⏹️ Interrupting stream #${streamState.streamId}`);
      interruptedStreamIdRef.current = streamState.streamId;
      isStreamInterruptedRef.current = true;
      streamState.abortController();
      dispatchStream({ type: 'INTERRUPT_STREAM' });
      playHydrophoneStatic().catch(console.error);
    }
  }, [streamState.isStreaming, streamState.abortController, streamState.streamId]);

  return {
    streamState,
    terminalLines,
    miraState,
    lineCountRef,
    isStreamInterruptedRef,
    interruptedStreamIdRef,
    lastConfidenceUpdateStreamIdRef,
    responseLineIdsRef,
    scrollRef,
    addTerminalLine,
    updateRapportBar,
    sendMessage,
    interrupt,
  };
}
