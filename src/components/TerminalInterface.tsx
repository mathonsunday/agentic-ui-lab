import { useState, useCallback, useRef, useEffect, useReducer, useMemo } from 'react';
import { useAtom } from 'jotai';
import { MinimalInput } from './MinimalInput';
import { TypewriterLine } from './TypewriterLine';
import { settingsAtom } from '../stores/settings';
import { createLogger } from '../utils/debugLogger';
import { useTerminalLineZoomUpdate } from '../hooks/useTerminalLineZoomUpdate';
import {
  initializeMiraState,
  assessResponse,
  type MiraState,
} from '../shared/miraAgentSimulator';
import { playStreamingSound, playHydrophoneStatic } from '../shared/audioEngine';
import { getNextZoomLevel, getPrevZoomLevel, getCreatureAtZoom, getCreatureByMood, type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';
import { formatAnalysisBox } from '../shared/analysisFormatter';
import { streamMiraBackend } from '../services/miraBackendStream';
import { ToolButtonRow } from './ToolButtonRow';
import './TerminalInterface.css';

interface TerminalInterfaceProps {
  onReturn?: () => void;
  initialConfidence?: number;
  onConfidenceChange?: (newConfidence: number) => void;
}

interface TerminalLine {
  id: string;
  type: 'ascii' | 'text' | 'input' | 'system' | 'analysis';
  content: string;
  timestamp?: number;
  // For text lines: whether to animate character-by-character (false = show complete text)
  isAnimating?: boolean;
  // For analysis lines: store raw data to support collapsible rendering
  analysisData?: {
    reasoning: string;
    confidenceDelta: number;
  };
  // Source of the content (e.g., 'specimen_47', 'claude_streaming')
  source?: string;
}

// Stream state management with useReducer
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
      streamDebugLog(`[REDUCER] START_STREAM`, {
        newStreamId,
        abortController: !!action.abort,
      });
      console.log(`🎬 [REDUCER] START_STREAM #${newStreamId}`, { isStreaming: true });
      return {
        isStreaming: true,
        streamId: newStreamId,
        abortController: action.abort,
      };
    case 'END_STREAM':
      streamDebugLog(`[REDUCER] END_STREAM`, {
        streamId: state.streamId,
        wasStreaming: state.isStreaming,
      });
      console.log(`🏁 [REDUCER] END_STREAM #${state.streamId}`, { isStreaming: false, wasStreaming: state.isStreaming });
      return {
        ...state,
        isStreaming: false,
        abortController: null,
      };
    case 'INTERRUPT_STREAM':
      streamDebugLog(`[REDUCER] INTERRUPT_STREAM`, {
        streamId: state.streamId,
        wasStreaming: state.isStreaming,
      });
      console.log(`🛑 [REDUCER] INTERRUPT_STREAM #${state.streamId}`, { isStreaming: false, wasStreaming: state.isStreaming });
      return {
        ...state,
        isStreaming: false,
        abortController: null,
      };
    default:
      return state;
  }
}

const logger = createLogger('TerminalInterface');

// Stream debugging logger with timestamps
const streamDebugLog = (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  console.log(`[STREAM_DEBUG ${timestamp}] ${message}`, data || '');
};


export function TerminalInterface({ onReturn, initialConfidence, onConfidenceChange }: TerminalInterfaceProps) {
  const [settings] = useAtom(settingsAtom);
  const { updateLastAsciiLine } = useTerminalLineZoomUpdate();
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
  // Centralized stream state with useReducer
  const [streamState, dispatchStream] = useReducer(streamReducer, {
    isStreaming: false,
    streamId: 0,
    abortController: null,
  });

  const [currentCreature, setCurrentCreature] = useState<CreatureName>('anglerFish');
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('medium');
  const [interactionCount, setInteractionCount] = useState(0);
  const [currentStreamSource, setCurrentStreamSource] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef(2);
  const currentAnimatingLineIdRef = useRef<string | null>(null);
  const currentRevealedLengthRef = useRef(0); // Track current animation position for interrupt
  const currentAnimatingContentLengthRef = useRef(0); // Track total content length for animation completion
  const currentStreamSourceRef = useRef<string | null>(null); // Track source for current line
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render when animation completes
  const responseLineIdsRef = useRef<string[]>([]);
  const isStreamInterruptedRef = useRef(false); // Track interrupt status outside of React state
  const interruptedStreamIdRef = useRef<number | null>(null); // Track which stream was interrupted
  const lastConfidenceUpdateStreamIdRef = useRef<number | null>(null); // Track stream ID for confidence updates

  // Auto-scroll to bottom when new lines are added
  // KNOWN BUG #1: Viewport does not auto-scroll during specimen 47 character animation.
  // User must manually scroll down to see text being revealed.
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [terminalLines]);

  // Show initial ASCII art (using zoomable creature at medium level)
  useEffect(() => {
    const initialAscii = getCreatureAtZoom('anglerFish', 'medium');
    const asciiLine: TerminalLine = {
      id: String(lineCountRef.current++),
      type: 'ascii',
      content: initialAscii,
    };
    setTerminalLines((prev) => [...prev, asciiLine]);
  }, []);

  const addTerminalLine = useCallback(
    (type: TerminalLine['type'], content: string, analysisData?: { reasoning: string; confidenceDelta: number }, source?: string) => {
      const newLine: TerminalLine = {
        id: String(lineCountRef.current++),
        type,
        content,
        timestamp: Date.now(),
        analysisData,
        source: source || currentStreamSourceRef.current || undefined,
      };
      setTerminalLines((prev) => [...prev, newLine]);
    },
    []
  );

  // Update the most recent rapport bar with new confidence value
  const updateRapportBar = useCallback((newConfidence: number) => {
    const percent = Math.round(newConfidence);
    const filled = Math.round(percent / 5); // 20 characters total
    const empty = 20 - filled;
    const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    const newRapportText = `[RAPPORT] ${bar} ${percent}%`;

    setTerminalLines((prev) => {
      // Find the last line that contains a rapport bar
      let lastRapportIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === 'text' && prev[i].content.includes('[RAPPORT]')) {
          lastRapportIndex = i;
          break;
        }
      }

      if (lastRapportIndex === -1) return prev; // No rapport bar found

      // Update that line's content
      const updated = [...prev];
      updated[lastRapportIndex] = {
        ...updated[lastRapportIndex],
        content: newRapportText,
      };
      return updated;
    });
  }, []);

  const handleToolCall = useCallback(
    async (toolAction: string, toolData: Record<string, unknown>) => {
      const streamNum = streamState.streamId + 1;
      streamDebugLog(`handleToolCall started - STREAM #${streamNum}`, {
        action: toolAction,
        isCurrentlyStreaming: streamState.isStreaming,
      });

      // Allow zoom actions to execute concurrently with other streams
      const isZoomAction = toolAction === 'zoom_in' || toolAction === 'zoom_out';
      if (streamState.isStreaming && !isZoomAction) {
        console.log('⚠️ Already streaming, ignoring tool call');
        streamDebugLog(`Already streaming - ignoring this tool call - STREAM #${streamNum}`);
        return;
      }

      streamDebugLog(`Dispatching START_STREAM for tool call - STREAM #${streamNum}`, {
        action: toolAction,
      });
      setInteractionCount((prev) => prev + 1);

      try {
        const { promise, abort } = streamMiraBackend(
          null,
          miraState,
          { type: 'tool_call', depth: 'moderate', confidenceDelta: 0, traits: {} },
          {
            action: toolAction,
            timestamp: Date.now(),
            sequenceNumber: interactionCount,
            ...toolData,
          },
          {
            onConfidence: (update) => {
              streamDebugLog(`onConfidence callback - STREAM #${streamNum}`, { from: update.from, to: update.to });
              setMiraState((prev) => ({
                ...prev,
                confidenceInUser: update.to,
              }));
              updateRapportBar(update.to);
              onConfidenceChange?.(update.to);
            },
            onComplete: (data) => {
              streamDebugLog(`onComplete callback - STREAM #${streamNum}`, {
                newConfidence: data.updatedState.confidenceInUser,
              });
              setMiraState(data.updatedState);
              onConfidenceChange?.(data.updatedState.confidenceInUser);
              dispatchStream({ type: 'END_STREAM' });
            },
            onError: (error) => {
              console.error('❌ Tool call error:', error);
              streamDebugLog(`onError callback - STREAM #${streamNum}`, { error });
              addTerminalLine('text', `...error: ${error}...`);
              dispatchStream({ type: 'END_STREAM' });
            },
          }
        );
        dispatchStream({ type: 'START_STREAM', abort });
        console.log('📌 Abort controller set for tool stream');
        streamDebugLog(`START_STREAM dispatched - STREAM #${streamNum}`);
        await promise;
        console.log('✅ Tool stream promise resolved');
        streamDebugLog(`Tool stream promise resolved - STREAM #${streamNum}`);
      } catch (error) {
        console.error('Tool call failed:', error);
        streamDebugLog(`Caught error in try-catch - STREAM #${streamNum}`, { error });
        dispatchStream({ type: 'END_STREAM' });
      } finally {
        // Always ensure streaming is stopped via reducer
        console.log('🧹 Ensuring stream is stopped');
        streamDebugLog(`Finally block executing - STREAM #${streamNum}`, {
          isCurrentlyStreaming: streamState.isStreaming,
        });
        // If still streaming (shouldn't be if onComplete/onError ran), dispatch END_STREAM
        if (streamState.isStreaming) {
          dispatchStream({ type: 'END_STREAM' });
        }
      }
    },
    [miraState, streamState.isStreaming, streamState.streamId, interactionCount, addTerminalLine, onConfidenceChange, updateRapportBar]
  );

  // Tool handlers for zoom interactions
  const handleZoomIn = useCallback(() => {
    const nextZoom = getNextZoomLevel(currentZoom);
    const newAscii = getCreatureAtZoom(currentCreature, nextZoom);

    console.log('🔍 ZOOM IN triggered:', currentZoom, '→', nextZoom);

    setCurrentZoom(nextZoom);

    // Update the most recent ASCII line with the new zoom level
    setTerminalLines((prev) => updateLastAsciiLine(prev, newAscii));

    handleToolCall('zoom_in', { zoomLevel: nextZoom });
  }, [currentCreature, currentZoom, handleToolCall, updateLastAsciiLine]);

  const handleZoomOut = useCallback(() => {
    const prevZoom = getPrevZoomLevel(currentZoom);
    const newAscii = getCreatureAtZoom(currentCreature, prevZoom);

    console.log('🔍 ZOOM OUT triggered:', currentZoom, '→', prevZoom);

    setCurrentZoom(prevZoom);

    // Update the most recent ASCII line with the new zoom level
    setTerminalLines((prev) => updateLastAsciiLine(prev, newAscii));

    handleToolCall('zoom_out', { zoomLevel: prevZoom });
  }, [currentCreature, currentZoom, handleToolCall, updateLastAsciiLine]);

  const handleInput = useCallback(
    async (userInput: string) => {
      const streamNum = streamState.streamId + 1;
      if (!userInput.trim()) return;

      // Reset interrupt flag for new stream
      isStreamInterruptedRef.current = false;
      interruptedStreamIdRef.current = null;
      lastConfidenceUpdateStreamIdRef.current = streamNum;
      console.log('🔄 Reset isStreamInterruptedRef.current = false for new stream');

      streamDebugLog(`handleInput started - STREAM #${streamNum}`, {
        userInput: userInput.substring(0, 50) + '...',
        isCurrentlyStreaming: streamState.isStreaming,
      });

      // Add user input to terminal
      addTerminalLine('input', `> ${userInput}`);

      // Set streaming state to disable input
      streamDebugLog(`Dispatching START_STREAM for input - STREAM #${streamNum}`);

      // Play audio cue
      playStreamingSound('thinking').catch(() => {});

      try {
        // Frontend assessment: type and basic depth from word count
        const assessment = assessResponse(userInput, 3000, miraState);

        // Stream from backend with real-time updates
        const callbacksObject = {
          onConfidence: (update: any) => {
            // Only apply confidence updates if this stream wasn't interrupted
            if (interruptedStreamIdRef.current === streamNum) {
              console.log(`⏭️ [TerminalInterface] Ignoring confidence update from interrupted stream #${streamNum}`);
              streamDebugLog(`Ignoring confidence update from interrupted stream - STREAM #${streamNum}`);
              return;
            }

            // Update state with new confidence
            setMiraState((prev) => ({
              ...prev,
              confidenceInUser: update.to,
            }));
            onConfidenceChange?.(update.to);
          },
          onProfile: (profile: any) => {
            // Update user profile as Claude analyzes
            setMiraState((prev) => ({
              ...prev,
              userProfile: {
                ...prev.userProfile,
                ...profile,
              },
            }));
          },
          onRapportUpdate: (confidence: number, formattedBar: string) => {
            // Rapport bar updates are terminal text lines that display in place
            // They are semantic state updates sent as separate events now
            const newLineId = String(lineCountRef.current++);
            responseLineIdsRef.current.push(newLineId);
            addTerminalLine('text', formattedBar);

            console.log(`🎖️ [TerminalInterface] Rapport bar updated: ${confidence}%`);
          },
          onMessageStart: (messageId: string, source?: string) => {
            // Track the stream source to conditionally show INTERRUPT button
            // Also track in ref for line creation
            // KNOWN BUG #2: INTERRUPT button does not appear during specimen 47 animation.
            console.log(`📨 [TerminalInterface] onMessageStart called - STREAM #${streamNum}`, {
              messageId,
              source,
              hasSource: !!source,
              isStreaming: streamState.isStreaming,
            });
            setCurrentStreamSource(source || null);
            currentStreamSourceRef.current = source || null;
            console.log(`📨 [TerminalInterface] Message started - STREAM #${streamNum}`, {
              messageId,
              source,
              setStateSource: source || null,
            });
          },
          onResponseChunk: (chunk: any) => {
            console.log(`📥 [TerminalInterface] onResponseChunk callback invoked with ${chunk.length} chars - STREAM #${streamNum}`);
            // Check if stream was interrupted - only block chunks from the interrupted stream
            if (isStreamInterruptedRef.current && interruptedStreamIdRef.current === streamNum) {
              console.log(`📥 [TerminalInterface] BLOCKING chunk (${chunk.length} chars) - stream #${streamNum} was interrupted`);
              streamDebugLog(`Blocking chunk from interrupted stream - STREAM #${streamNum}`, {
                chunkLength: chunk.length,
              });
              return;
            }
            streamDebugLog(`onResponseChunk received - STREAM #${streamNum}`, {
              chunkLength: chunk.length,
              isInterrupted: isStreamInterruptedRef.current,
            });

            // Accumulate chunks into a single terminal line (not one line per chunk)
            // This prevents rapid scrolling when streaming long content like specimen 47
            // CRITICAL: Use functional state update to ensure line exists before accumulating
            setTerminalLines((prev) => {
              if (!currentAnimatingLineIdRef.current) {
                // First text chunk: create new line
                const newLineId = String(lineCountRef.current++);
                currentAnimatingLineIdRef.current = newLineId;
                currentAnimatingContentLengthRef.current = chunk.length; // Track total content length
                responseLineIdsRef.current.push(newLineId);
                setRenderTrigger(t => t + 1); // Force re-render
                streamDebugLog(`First chunk - triggering render - STREAM #${streamNum}`, { renderTriggerId: newLineId });
                console.log(`📝 [TerminalInterface] Creating FIRST chunk line with ID: ${newLineId}, chunk size: ${chunk.length} chars`);

                // Create and add the new line in the same state update
                const newLine: TerminalLine = {
                  id: newLineId,
                  type: 'text',
                  content: chunk,
                  timestamp: Date.now(),
                };
                return [...prev, newLine];
              } else {
                // Subsequent chunks: accumulate into existing line
                const index = prev.findIndex(l => l.id === currentAnimatingLineIdRef.current);
                console.log(`📥 [TerminalInterface] Looking for line ${currentAnimatingLineIdRef.current}: found at index ${index} (total lines: ${prev.length})`);
                if (index === -1) {
                  console.warn(`⚠️ [TerminalInterface] Line not found! Current line ID: ${currentAnimatingLineIdRef.current}, available IDs:`, prev.map(l => l.id));
                  return prev;
                }

                const updated = [...prev];
                const oldLength = updated[index].content.length;
                updated[index] = {
                  ...updated[index],
                  content: updated[index].content + chunk
                };
                const newLength = updated[index].content.length;
                currentAnimatingContentLengthRef.current = newLength; // Update total content length
                console.log(`✏️ [TerminalInterface] ACCUMULATED chunk to line ${currentAnimatingLineIdRef.current}: ${oldLength} → ${newLength} chars (added ${chunk.length})`);
                return updated;
              }
            });

            // Play typing sound if enabled (throttle to reduce audio spam)
            if (settings.soundEnabled) {
              // Play sound every 2-3 characters to avoid audio overload
              if (chunk.length % 3 === 0) {
                playHydrophoneStatic(0.15).catch(() => {
                  // Silently ignore audio context errors (e.g., user hasn't interacted yet)
                });
              }
            }
          },
          onComplete: (data: any) => {
            streamDebugLog(`onComplete callback - STREAM #${streamNum}`, {
              newConfidence: data.updatedState.confidenceInUser,
              source: data.response?.source,
              suggested_mood: data.analysis?.suggested_creature_mood,
            });

            // Reset stream source when complete
            // For specimen_47, delay clearing until animation finishes (via onRevealedLengthChange)
            // For other sources, clear immediately
            if (data.response?.source !== 'specimen_47') {
              setCurrentStreamSource(null);
            }

            // Final state update
            setMiraState(data.updatedState);
            onConfidenceChange?.(data.updatedState.confidenceInUser);

            // Only show ASCII art response for text messages, not tool calls or specimen 47
            // Tool calls already updated the ASCII art inline via zoom handlers
            // Specimen 47 is a special grant proposal that shouldn't show ASCII art after
            if (data.response?.source !== 'tool_call' && data.response?.source !== 'specimen_47') {
              // Add transition phrase
              addTerminalLine('text', '...what do you think about this...');

              // Use mood-based creature selection
              const suggestedMood = data.analysis?.suggested_creature_mood;
              const { name: selectedCreature, art: selectedArt } = getCreatureByMood(suggestedMood);

              console.log('🎭 [TerminalInterface] Creature selected:', {
                mood: suggestedMood || 'none (random fallback)',
                creature: selectedCreature,
              });

              setCurrentCreature(selectedCreature);
              setCurrentZoom('medium');
              const asciiLine: TerminalLine = {
                id: String(lineCountRef.current++),
                type: 'ascii',
                content: selectedArt,
              };
              setTerminalLines((prev) => [...prev, asciiLine]);

              // Add visual separator after exchange
              addTerminalLine('system', '---');
            }

            // Reset response tracking on successful completion
            // For specimen_47, delay END_STREAM until animation finishes (via onRevealedLengthChange)
            // For other sources, end stream immediately
            if (data.response?.source !== 'specimen_47') {
              currentAnimatingLineIdRef.current = null;
              responseLineIdsRef.current = [];
              dispatchStream({ type: 'END_STREAM' });
            }
          },
          onAnalysis: (analysis: any) => {
            // Display Claude's reasoning as full analysis box
            console.log('📊 [TerminalInterface] onAnalysis callback fired:', {
              reasoning: analysis.reasoning.substring(0, 50),
              confidenceDelta: analysis.confidenceDelta,
            });
            const box = formatAnalysisBox({
              reasoning: analysis.reasoning,
              confidenceDelta: analysis.confidenceDelta,
            });
            console.log('📦 [TerminalInterface] Analysis box displayed');
            addTerminalLine('analysis', box);
          },
          onError: (error: any) => {
            console.error('Stream error:', error);
            streamDebugLog(`onError callback - STREAM #${streamNum}`, {
              error,
              wasInterrupted: isStreamInterruptedRef.current,
            });

            // Reset stream source on error
            setCurrentStreamSource(null);

            // Check if this is an interrupt (user explicitly stopped)
            const isInterrupt = error.includes('interrupted') || isStreamInterruptedRef.current;

            if (isInterrupt) {
              console.log('📍 Stream was interrupted by user (consequence already added by handleInterrupt)');
              // handleInterrupt already handled the consequence text and confidence update
            } else {
              addTerminalLine(
                'text',
                '...connection to the depths lost... the abyss is unreachable at this moment...'
              );
            }

            // Reset response tracking
            currentAnimatingLineIdRef.current = null;
            responseLineIdsRef.current = [];
            dispatchStream({ type: 'END_STREAM' });
          },
        };
        console.log('📋 [TerminalInterface] Callbacks object created:', {
          hasOnAnalysis: !!callbacksObject.onAnalysis,
          hasOnConfidence: !!callbacksObject.onConfidence,
          hasOnComplete: !!callbacksObject.onComplete,
          hasOnError: !!callbacksObject.onError,
        });

        const { promise, abort } = streamMiraBackend(
          userInput,
          miraState,
          assessment,
          null,
          callbacksObject
        );
        dispatchStream({ type: 'START_STREAM', abort });
        console.log('📌 Abort controller set for input stream');
        streamDebugLog(`START_STREAM dispatched - STREAM #${streamNum}`);
        await promise;
        console.log('✅ Input stream promise resolved');
        streamDebugLog(`Input stream promise resolved - STREAM #${streamNum}`);
      } catch (error) {
        // Error handling: graceful degradation
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Backend error:', errorMsg);
        streamDebugLog(`Caught error in try-catch - STREAM #${streamNum}`, { error: errorMsg });

        addTerminalLine(
          'text',
          '...connection to the depths lost... the abyss is unreachable at this moment...'
        );
        dispatchStream({ type: 'END_STREAM' });
      } finally {
        // Always ensure streaming is stopped via reducer
        console.log('🧹 Ensuring stream is stopped');
        streamDebugLog(`Finally block executing - STREAM #${streamNum}`, {
          isCurrentlyStreaming: streamState.isStreaming,
        });
        // If still streaming (shouldn't be if onComplete/onError ran), dispatch END_STREAM
        if (streamState.isStreaming) {
          dispatchStream({ type: 'END_STREAM' });
        }
      }
    },
    [miraState, streamState.isStreaming, streamState.streamId, addTerminalLine, onConfidenceChange, settings.soundEnabled, updateRapportBar]
  );

  const handleInterrupt = useCallback(() => {
    console.log(`🛑 Interrupt button clicked - STREAM #${streamState.streamId}`, {
      isStreaming: streamState.isStreaming,
      hasAbortController: !!streamState.abortController,
      responseChunksCount: responseLineIdsRef.current.length,
    });
    streamDebugLog(`handleInterrupt called - STREAM #${streamState.streamId}`, {
      hasAbortController: !!streamState.abortController,
      isStreaming: streamState.isStreaming,
      responseChunksCount: responseLineIdsRef.current.length,
    });

    if (streamState.abortController) {
      console.log(`🛑 Interrupt requested - calling abort function for STREAM #${streamState.streamId}`);
      streamDebugLog(`Calling abort function - STREAM #${streamState.streamId}`, {
        timestamp: Date.now(),
      });
      try {
        // Set interrupt flag FIRST to block any in-flight chunks
        isStreamInterruptedRef.current = true;
        interruptedStreamIdRef.current = streamState.streamId;
        console.log(`🛑 Set isStreamInterruptedRef.current = true for stream #${streamState.streamId}`);

        // Stop animating the current line and add consequence text
        setTerminalLines(prev => {
          // Find the index of the currently animating line
          const animatingIndex = currentAnimatingLineIdRef.current
            ? prev.findIndex(line => line.id === currentAnimatingLineIdRef.current)
            : prev.length - 1;

          const insertIndex = animatingIndex >= 0 ? animatingIndex + 1 : prev.length;

          console.log(`🛑 [handleInterrupt] Stopping animation at line index ${animatingIndex}, adding consequence after`);
          streamDebugLog(`Stopping animation and adding consequence - STREAM #${streamState.streamId}`, {
            animatingLineId: currentAnimatingLineIdRef.current,
            insertIndex,
            totalChunks: responseLineIdsRef.current.length
          });

          // Decrease rapport as penalty
          const newConfidence = Math.max(0, miraState.confidenceInUser - 15);
          setMiraState((prevState) => ({
            ...prevState,
            confidenceInUser: newConfidence,
          }));
          updateRapportBar(newConfidence);
          onConfidenceChange?.(newConfidence);
          console.log(`🛑 [handleInterrupt] Applied -15 confidence penalty. New confidence: ${newConfidence}`);

          // Stop animation on the currently animating line and truncate unrevea content
          const updated = [...prev];
          if (animatingIndex >= 0) {
            const revealedLength = currentRevealedLengthRef.current;
            const currentLine = updated[animatingIndex];
            const truncatedContent = currentLine.content.substring(0, revealedLength);
            updated[animatingIndex] = {
              ...currentLine,
              content: truncatedContent,  // Remove unrevealed content
              isAnimating: false,  // Freeze animation at current position
            };
            console.log(`🛑 [handleInterrupt] Truncated line from ${currentLine.content.length} to ${revealedLength} chars, set isAnimating=false`);
          }

          // Add consequence text after the now-frozen animation
          updated.splice(insertIndex, 0, {
            id: `interrupt-consequence-${Date.now()}`,
            type: 'text' as const,
            content: '...you cut off my words... you still don\'t understand...',
          });
          return updated;
        });

        // Clear response tracking for next stream
        // CRITICAL: Must clear currentAnimatingLineIdRef so next stream creates new line (not reuse old one)
        responseLineIdsRef.current = [];
        currentAnimatingLineIdRef.current = null;
        currentAnimatingContentLengthRef.current = 0;

        streamState.abortController();
        console.log(`✅ Abort function executed for STREAM #${streamState.streamId}`);
        streamDebugLog(`Abort function executed - STREAM #${streamState.streamId}`);
        // Dispatch INTERRUPT_STREAM to ensure state is updated
        dispatchStream({ type: 'INTERRUPT_STREAM' });
        console.log(`✅ INTERRUPT_STREAM dispatched for STREAM #${streamState.streamId}`);
      } catch (error) {
        console.error(`❌ Error calling abort for STREAM #${streamState.streamId}:`, error);
        streamDebugLog(`Error calling abort - STREAM #${streamState.streamId}`, { error });
      }
    } else {
      console.log(`⚠️ No abort controller available for STREAM #${streamState.streamId}`);
      streamDebugLog(`No abort controller available - STREAM #${streamState.streamId}`);
    }
  }, [streamState.abortController, streamState.streamId, miraState, updateRapportBar, onConfidenceChange]);

  return (
    <div className="terminal-interface">
      <div className="terminal-interface__header">
        <div className="terminal-interface__title">
          DR. PETROVIC'S RESEARCH TERMINAL v0.1
        </div>
        <div className="terminal-interface__subtitle">
          Deep Sea Research Assistant · Connected
        </div>
      </div>

      <div className="terminal-interface__content">
        <div className="terminal-interface__conversation" ref={scrollRef}>
          {terminalLines.map((line) => {
            const isResponseLine = responseLineIdsRef.current.includes(line.id);

            // VALIDATION: Warn if expected response line is missing from tracking
            if (import.meta.env.DEV) {
              const lineNum = parseInt(line.id);
              const expectedResponseLineIds = responseLineIdsRef.current.map(id => parseInt(id));
              if (!isNaN(lineNum) && expectedResponseLineIds.length > 0) {
                const minExpected = Math.min(...expectedResponseLineIds);
                const maxExpected = Math.max(...expectedResponseLineIds);
                if (lineNum >= minExpected && lineNum <= maxExpected && !isResponseLine) {
                  logger.warn('ID MISMATCH:', {
                    lineId: line.id,
                    trackedIds: responseLineIdsRef.current,
                    message: 'Line ID falls within response range but not tracked!',
                  });
                }
              }
            }

            // Animate response lines during streaming
            // For normal (multi-line) responses: only animate the currently active line
            // For single-line streams (like Specimen 47): animate as content grows
            // We check if line is in responseLineIdsRef - if yes, it's part of current response and should animate
            const shouldAnimate = !isResponseLine || responseLineIdsRef.current.includes(line.id);

            if (isResponseLine) {
              console.log(`[TerminalInterface] RENDER line ${line.id}: isResponseLine=true, responseLineIds=[${responseLineIdsRef.current.join(',')}], shouldAnimate=${shouldAnimate}`);
            }

            return (
              <div
                key={line.id}
                className={`terminal-interface__line terminal-interface__line--${line.type}`}
              >
                {line.type === 'ascii' ? (
                  <pre className="terminal-interface__ascii">{line.content}</pre>
                ) : line.type === 'analysis' ? (
                  <span className="terminal-interface__text">
                    {line.analysisData ? formatAnalysisBox(line.analysisData) : line.content}
                  </span>
                ) : isResponseLine ? (
                  // For claude_streaming: use simple text render (chunks arrive in real-time)
                  // For specimen_47: use TypewriterLine for single-chunk animation
                  line.source === 'claude_streaming' ? (
                    <span className="terminal-interface__text">{line.content}</span>
                  ) : (
                    <TypewriterLine
                      content={line.content}
                      speed={settings.typingSpeed}
                      isAnimating={shouldAnimate && (line.isAnimating !== false)}
                      onRevealedLengthChange={(length) => {
                        // Track revealed length for interrupt handling
                        if (line.id === currentAnimatingLineIdRef.current) {
                          currentRevealedLengthRef.current = length;
                          // Auto-scroll to bottom during character animation
                          if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                          }
                          // When animation completes, end the stream and clear source
                          // This allows INTERRUPT button to stay visible until all characters revealed
                          if (length >= currentAnimatingContentLengthRef.current) {
                            setCurrentStreamSource(null);
                            // Only dispatch if this is specimen_47 (other sources already dispatched END_STREAM)
                            if (currentStreamSource === 'specimen_47') {
                              currentAnimatingLineIdRef.current = null;
                              responseLineIdsRef.current = [];
                              dispatchStream({ type: 'END_STREAM' });
                            }
                          }
                        }
                      }}
                    />
                  )
                ) : (
                  <span className="terminal-interface__text">{line.content}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="terminal-interface__input-section">
          <MinimalInput
            onSubmit={handleInput}
            disabled={streamState.isStreaming}
            placeholder="> share your thoughts..."
          />

          {useMemo(() => {
            const tools = [
              { id: 'zoom-in', name: 'ZOOM IN', onExecute: handleZoomIn },
              { id: 'zoom-out', name: 'ZOOM OUT', onExecute: handleZoomOut },
            ];

            const shouldShowInterrupt =
              streamState.isStreaming && (currentStreamSource === 'specimen_47' || currentStreamSource === 'claude_streaming');

            console.log(`🎨 [BUTTON RENDER] Evaluating interrupt button - STREAM #${streamState.streamId}`, {
              isStreaming: streamState.isStreaming,
              currentStreamSource,
              isSpecimen47: currentStreamSource === 'specimen_47',
              isClaudeStreaming: currentStreamSource === 'claude_streaming',
              shouldShowInterrupt,
              renderTrigger,
            });

            if (shouldShowInterrupt) {
              tools.push({
                id: 'interrupt',
                name: 'INTERRUPT',
                onExecute: handleInterrupt,
              });
              streamDebugLog(`RENDER: Adding interrupt button - STREAM #${streamState.streamId}`, {
                isStreaming: streamState.isStreaming,
                source: currentStreamSource,
                renderTrigger,
                toolCount: tools.length,
              });
            } else {
              streamDebugLog(`RENDER: NOT adding interrupt button - STREAM #${streamState.streamId}`, {
                isStreaming: streamState.isStreaming,
                source: currentStreamSource,
                renderTrigger,
                toolCount: tools.length,
              });
            }

            return (
              <ToolButtonRow
                tools={tools}
                disabled={false}
              />
            );
          }, [handleZoomIn, handleZoomOut, streamState.isStreaming, currentStreamSource, handleInterrupt, renderTrigger])}
        </div>
      </div>

      {onReturn && (
        <button className="terminal-interface__return" onClick={onReturn}>
          [EXIT]
        </button>
      )}
    </div>
  );
}
