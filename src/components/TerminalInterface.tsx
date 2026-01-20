import { useState, useCallback, useRef, useEffect, useReducer, useMemo } from 'react';
import { useAtom } from 'jotai';
import { MinimalInput } from './MinimalInput';
import { settingsAtom } from '../stores/settings';
import { createLogger } from '../utils/debugLogger';
import { useTerminalLineZoomUpdate } from '../hooks/useTerminalLineZoomUpdate';
import {
  initializeMiraState,
  assessResponse,
  type MiraState,
  type InterruptMemory,
} from '../shared/miraAgentSimulator';
import { playStreamingSound, playHydrophoneStatic } from '../shared/audioEngine';
import { getNextZoomLevel, getPrevZoomLevel, getCreatureAtZoom, getCreatureByMood, type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';
import { formatAnalysisBox, generateConfidenceBar } from '../shared/analysisFormatter';
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
  // Source of the content
  source?: 'claude_streaming';
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
    case 'START_STREAM': {
      const newStreamId = state.streamId + 1;
      return {
        isStreaming: true,
        streamId: newStreamId,
        abortController: action.abort,
      };
    }
    case 'END_STREAM':
      return {
        ...state,
        isStreaming: false,
        abortController: null,
      };
    case 'INTERRUPT_STREAM':
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef(2);
  const currentAnimatingLineIdRef = useRef<string | null>(null);
  const currentRevealedLengthRef = useRef(0); // Track current animation position for interrupt
  const currentAnimatingContentLengthRef = useRef(0); // Track total content length for animation completion
  const currentStreamSourceRef = useRef<string | null>(null); // Track source for current line
  const responseLineIdsRef = useRef<string[]>([]);
  const isStreamInterruptedRef = useRef(false); // Track interrupt status outside of React state
  const interruptedStreamIdRef = useRef<number | null>(null); // Track which stream was interrupted

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


  // Update revealed length for streaming text
  useEffect(() => {
    if (currentAnimatingLineIdRef.current) {
      const animatingLine = terminalLines.find(
        line => line.id === currentAnimatingLineIdRef.current
      );
      if (animatingLine) {
        currentRevealedLengthRef.current = animatingLine.content.length;
      }
    }
  }, [terminalLines]);

  // Reset stream source when stream ends
  useEffect(() => {
    if (!streamState.isStreaming && currentStreamSourceRef.current !== null) {
      currentStreamSourceRef.current = null;
    }
  }, [streamState.isStreaming]);

  const addTerminalLine = useCallback(
    (type: TerminalLine['type'], content: string, analysisData?: { reasoning: string; confidenceDelta: number }, source?: 'claude_streaming') => {
      const newLine: TerminalLine = {
        id: String(lineCountRef.current++),
        type,
        content,
        timestamp: Date.now(),
        analysisData,
        source: (source || currentStreamSourceRef.current) as 'claude_streaming' | undefined,
      };
      console.log('📝 [TerminalInterface.addTerminalLine] Adding line:', {
        id: newLine.id,
        type,
        contentPreview: content.substring(0, 80),
        source: newLine.source,
      });
      setTerminalLines((prev) => {
        console.log('📝 [TerminalInterface.addTerminalLine] State update: added line to', {
          previousCount: prev.length,
          newCount: prev.length + 1,
          lineId: newLine.id,
        });
        return [...prev, newLine];
      });
    },
    []
  );

  // Update the most recent rapport bar with new confidence value
  const updateRapportBar = useCallback((newConfidence: number) => {
    const newRapportText = generateConfidenceBar(newConfidence).trim();

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
      // Allow zoom actions to execute concurrently with other streams
      const isZoomAction = toolAction === 'zoom_in' || toolAction === 'zoom_out';
      if (streamState.isStreaming && !isZoomAction) {
        return;
      }

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
              setMiraState((prev) => ({
                ...prev,
                confidenceInUser: update.to,
              }));
              updateRapportBar(update.to);
              onConfidenceChange?.(update.to);
            },
            onComplete: (data) => {
              setMiraState(data.updatedState);
              onConfidenceChange?.(data.updatedState.confidenceInUser);
              dispatchStream({ type: 'END_STREAM' });
            },
            onError: (error) => {
              addTerminalLine('text', `...error: ${error}...`);
              dispatchStream({ type: 'END_STREAM' });
            },
          }
        );
        dispatchStream({ type: 'START_STREAM', abort });
        await promise;
      } catch (error) {
        dispatchStream({ type: 'END_STREAM' });
      } finally {
        // Always ensure streaming is stopped via reducer
        // If still streaming (shouldn't be if onComplete/onError ran), dispatch END_STREAM
        if (streamState.isStreaming) {
          dispatchStream({ type: 'END_STREAM' });
        }
      }
    },
    [miraState, streamState.isStreaming, interactionCount, addTerminalLine, onConfidenceChange, updateRapportBar]
  );

  // Tool handlers for zoom interactions
  const handleZoomIn = useCallback(() => {
    const nextZoom = getNextZoomLevel(currentZoom);
    const newAscii = getCreatureAtZoom(currentCreature, nextZoom);


    setCurrentZoom(nextZoom);

    // Update the most recent ASCII line with the new zoom level
    setTerminalLines((prev) => updateLastAsciiLine(prev, newAscii));

    handleToolCall('zoom_in', { zoomLevel: nextZoom });
  }, [currentCreature, currentZoom, handleToolCall, updateLastAsciiLine]);

  const handleZoomOut = useCallback(() => {
    const prevZoom = getPrevZoomLevel(currentZoom);
    const newAscii = getCreatureAtZoom(currentCreature, prevZoom);


    setCurrentZoom(prevZoom);

    // Update the most recent ASCII line with the new zoom level
    setTerminalLines((prev) => updateLastAsciiLine(prev, newAscii));

    handleToolCall('zoom_out', { zoomLevel: prevZoom });
  }, [currentCreature, currentZoom, handleToolCall, updateLastAsciiLine]);

  const handleInput = useCallback(
    async (userInput: string) => {
      const streamNum = streamState.streamId + 1;
      console.log('🔵 [TerminalInterface.handleInput] User submitted input, starting stream', {
        streamNum,
        userInput: userInput.substring(0, 50),
      });

      if (!userInput.trim()) return;

      // Reset interrupt flag for new stream
      isStreamInterruptedRef.current = false;
      interruptedStreamIdRef.current = null;


      // Add user input to terminal
      addTerminalLine('input', `> ${userInput}`);

      // Set streaming state to disable input

      // Play audio cue
      playStreamingSound('thinking').catch(() => {});

      try {
        // Frontend assessment: type and basic depth from word count
        const assessment = assessResponse(userInput, 3000, miraState);

        // Stream from backend with real-time updates
        const callbacksObject = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onConfidence: (_update: any) => {
            // Only apply confidence updates if this stream wasn't interrupted
            if (interruptedStreamIdRef.current === streamNum) {
              return;
            }

            // Confidence updates are handled in onComplete (single source of truth)
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onProfile: (_profile: any) => {
            // Profile updates are handled in onComplete (single source of truth)
          },
          onResponseStart: (_confidenceDelta: number, formattedBar: string) => {
            // Display rapport bar when response starts (first thing the user sees)
            addTerminalLine('text', formattedBar);
          },
           
          onMessageStart: (_messageId: string, _source?: string) => {
            // Track the stream source to conditionally show INTERRUPT button
            console.log('🎯 [TERMINAL INTERFACE] onMessageStart called', {
              messageId: _messageId,
              source: _source,
              refBeforeSet: currentStreamSourceRef.current,
              timestamp: Date.now()
            });

            currentStreamSourceRef.current = _source || null;

            console.log('🎯 [TERMINAL INTERFACE] onMessageStart ref updated', {
              refAfterSet: currentStreamSourceRef.current,
              timestamp: Date.now()
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onResponseChunk: (chunk: any) => {
            // Check if stream was interrupted - only block chunks from the interrupted stream
            if (isStreamInterruptedRef.current && interruptedStreamIdRef.current === streamNum) {
              return;
            }

            // Accumulate chunks into a single terminal line (not one line per chunk)
            // CRITICAL: Use functional state update to ensure line exists before accumulating
            setTerminalLines((prev) => {
              if (!currentAnimatingLineIdRef.current) {
                // First text chunk: create new line
                const newLineId = String(lineCountRef.current++);
                currentAnimatingLineIdRef.current = newLineId;
                currentAnimatingContentLengthRef.current = chunk.length; // Track total content length
                responseLineIdsRef.current.push(newLineId);

                // Create and add the new line in the same state update
                const newLine: TerminalLine = {
                  id: newLineId,
                  type: 'text',
                  content: chunk,
                  timestamp: Date.now(),
                  source: (currentStreamSourceRef.current || undefined) as 'claude_streaming' | undefined,
                };
                return [...prev, newLine];
              } else {
                // Subsequent chunks: accumulate into existing line
                const index = prev.findIndex(l => l.id === currentAnimatingLineIdRef.current);
                if (index === -1) {
                  console.warn(`⚠️ [TerminalInterface] Line not found! Current line ID: ${currentAnimatingLineIdRef.current}, available IDs:`, prev.map(l => l.id));
                  return prev;
                }

                const updated = [...prev];
                updated[index] = {
                  ...updated[index],
                  content: updated[index].content + chunk
                };
                const newLength = updated[index].content.length;
                currentAnimatingContentLengthRef.current = newLength; // Update total content length
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onComplete: (data: any) => {

            // Don't reset currentStreamSource here - let the useEffect watching streamState.isStreaming handle cleanup

            // Only apply state update if this stream wasn't interrupted
            if (interruptedStreamIdRef.current !== streamNum) {
              // Final state update (single source of truth for confidence)
              setMiraState(data.updatedState);
              onConfidenceChange?.(data.updatedState.confidenceInUser);
            }

            // Only show ASCII art response for text messages, not tool calls
            // Tool calls already updated the ASCII art inline via zoom handlers
            if (data.response?.source !== 'tool_call') {
              // Add transition phrase
              addTerminalLine('text', '...what do you think about this...');

              // Use mood-based creature selection
              const suggestedMood = data.analysis?.suggested_creature_mood;
              const { name: selectedCreature, art: selectedArt } = getCreatureByMood(suggestedMood);


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
            currentAnimatingLineIdRef.current = null;
            responseLineIdsRef.current = [];
            dispatchStream({ type: 'END_STREAM' });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onAnalysis: (analysis: any) => {
            // Display Claude's reasoning as analysis box
            // (Rapport bar is already displayed by onResponseStart)
            const box = formatAnalysisBox({
              reasoning: analysis.reasoning,
              confidenceDelta: analysis.confidenceDelta,
            });
            addTerminalLine('analysis', box);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (error: any) => {

            // Reset stream source on error
            currentStreamSourceRef.current = null;

            // Check if this is an interrupt (user explicitly stopped)
            const isInterrupt = error.includes('interrupted') || isStreamInterruptedRef.current;

            if (!isInterrupt) {
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

        const interruptCountAtRequest = miraState.memories.filter(m => m.type === 'interrupt').length;

        console.log('🌊 [TerminalInterface.handleInput] Calling streamMiraBackend with callbacks object', {
          hasOnResponseStart: !!callbacksObject.onResponseStart,
          callbacks: Object.keys(callbacksObject),
          interruptsInState: interruptCountAtRequest,
          totalMemories: miraState.memories.length,
          memoryTypes: miraState.memories.map(m => m.type),
        });

        const { promise, abort } = streamMiraBackend(
          userInput,
          miraState,
          assessment,
          null,
          callbacksObject
        );
        // Reset stream source before starting new stream
        currentStreamSourceRef.current = null;
        dispatchStream({ type: 'START_STREAM', abort });
        console.log('🌊 [TerminalInterface.handleInput] Stream started, awaiting promise...');
        await promise;
        console.log('🌊 [TerminalInterface.handleInput] Stream promise resolved');
      } catch (_err) {
        // Error handling: graceful degradation
        addTerminalLine(
          'text',
          '...connection to the depths lost... the abyss is unreachable at this moment...'
        );
        dispatchStream({ type: 'END_STREAM' });
      } finally {
        // Always ensure streaming is stopped via reducer
        // If still streaming (shouldn't be if onComplete/onError ran), dispatch END_STREAM
        if (streamState.isStreaming) {
          dispatchStream({ type: 'END_STREAM' });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [miraState, streamState.isStreaming, addTerminalLine, onConfidenceChange, settings.soundEnabled, updateRapportBar]
  );

  /**
   * INTERRUPT COORDINATION CONTRACT
   *
   * This function coordinates between 3 layers:
   * 1. UI Layer (TerminalInterface) - Truncates visible content, adds consequence text
   * 2. Service Layer (miraBackendStream) - Aborts HTTP stream, blocks buffered chunks
   * 3. State Layer (React state) - Applies -15 confidence penalty
   *
   * Coordination mechanism:
   * - interruptedStreamIdRef blocks backend state updates from interrupted stream
   * - isStreamInterruptedRef blocks chunk processing during interrupt
   * - streamState.abortController cancels the underlying HTTP request
   *
   * Critical: Order matters! Set refs BEFORE calling abortController to prevent race.
   */
  const handleInterrupt = useCallback(() => {

    if (streamState.abortController) {
      try {
        // Set interrupt flag FIRST to block any in-flight chunks
        isStreamInterruptedRef.current = true;
        interruptedStreamIdRef.current = streamState.streamId;

        // Stop animating the current line and add consequence text
        setTerminalLines(prev => {
          // Find the index of the currently animating line
          const animatingIndex = currentAnimatingLineIdRef.current
            ? prev.findIndex(line => line.id === currentAnimatingLineIdRef.current)
            : prev.length - 1;

          const insertIndex = animatingIndex >= 0 ? animatingIndex + 1 : prev.length;


          // Decrease rapport as penalty
          const newConfidence = Math.max(0, miraState.confidenceInUser - 15);

          // Record interrupt in memory (Option A: fact only, B & C: raw data captured)
          const interruptCount = miraState.memories.filter(m => m.type === 'interrupt').length;
          const revealedLength = currentRevealedLengthRef.current;
          const currentLine = prev[animatingIndex >= 0 ? animatingIndex : prev.length - 1];
          const truncatedText = currentLine?.content.substring(0, revealedLength) || '';

          const interruptMemory: InterruptMemory = {
            timestamp: Date.now(),
            type: 'interrupt',
            interruptNumber: interruptCount + 1,

            // Option B data: what was blocked (first 150 chars of visible text)
            blockedResponseStart: truncatedText.substring(0, 150),
            blockedResponseLength: revealedLength,

            // Option C data: emotional context
            // NOTE: Current response's analysis hasn't arrived yet (stream incomplete)
            // We would need to store lastAnalysis in state to populate these
            // For now, leave as undefined (Option A doesn't need them)
            assessmentAtInterrupt: undefined,
            creatureMoodAtInterrupt: undefined,

            // Required fields to match InteractionMemory pattern
            content: 'interrupt',
            duration: 0,
            depth: 'surface',
          };

          console.log('🛑 INTERRUPT RECORDED', {
            interruptNumber: interruptMemory.interruptNumber,
            timestamp: new Date(interruptMemory.timestamp).toISOString(),
            blockedResponseStart: interruptMemory.blockedResponseStart,
            blockedResponseLength: interruptMemory.blockedResponseLength,
            confidenceBefore: miraState.confidenceInUser,
            confidenceAfter: newConfidence,
            totalMemories: miraState.memories.length + 1,
          });

          setMiraState((prevState) => ({
            ...prevState,
            confidenceInUser: newConfidence,
            memories: [...prevState.memories, interruptMemory],
          }));
          updateRapportBar(newConfidence);
          onConfidenceChange?.(newConfidence);

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
        // Dispatch INTERRUPT_STREAM to ensure state is updated
        dispatchStream({ type: 'INTERRUPT_STREAM' });
      } catch {
        // Silent failure - abort may fail if stream already ended
      }
    }
  }, [streamState, miraState, updateRapportBar, onConfidenceChange]);

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
                  <span className="terminal-interface__text">{line.content}</span>
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
            console.log('🔄 [TERMINAL INTERFACE] useMemo recalculating tools', {
              isStreaming: streamState.isStreaming,
              currentStreamSourceRef: currentStreamSourceRef.current,
              timestamp: Date.now()
            });

            const tools = [
              { id: 'zoom-in', name: 'ZOOM IN', onExecute: handleZoomIn },
              { id: 'zoom-out', name: 'ZOOM OUT', onExecute: handleZoomOut },
            ];

            const shouldShowInterrupt =
              streamState.isStreaming && currentStreamSourceRef.current === 'claude_streaming';

            console.log('🔄 [TERMINAL INTERFACE] shouldShowInterrupt calculated', {
              shouldShowInterrupt,
              isStreaming: streamState.isStreaming,
              refValue: currentStreamSourceRef.current,
              timestamp: Date.now()
            });

            if (shouldShowInterrupt) {
              tools.push({
                id: 'interrupt',
                name: 'INTERRUPT',
                onExecute: handleInterrupt,
              });
            }

            console.log('🔄 [TERMINAL INTERFACE] Final tools array', {
              toolIds: tools.map(t => t.id),
              hasInterrupt: tools.some(t => t.id === 'interrupt'),
              timestamp: Date.now()
            });

            return (
              <ToolButtonRow
                tools={tools}
                disabled={false}
              />
            );
          }, [handleZoomIn, handleZoomOut, streamState.isStreaming, handleInterrupt])}
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
