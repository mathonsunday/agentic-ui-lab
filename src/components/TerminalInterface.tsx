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
      return {
        isStreaming: true,
        streamId: newStreamId,
        abortController: action.abort,
      };
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

  // Track when currentStreamSource changes
  useEffect(() => {
  }, [currentStreamSource]);

  // Reset stream source when stream ends
  useEffect(() => {
    if (!streamState.isStreaming && currentStreamSource !== null) {
      setCurrentStreamSource(null);
      currentStreamSourceRef.current = null;
    }
  }, [streamState.isStreaming]);

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
    [miraState, streamState.isStreaming, streamState.streamId, interactionCount, addTerminalLine, onConfidenceChange, updateRapportBar]
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
      if (!userInput.trim()) return;

      // Reset interrupt flag for new stream
      isStreamInterruptedRef.current = false;
      interruptedStreamIdRef.current = null;
      lastConfidenceUpdateStreamIdRef.current = streamNum;


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
          onConfidence: (update: any) => {
            // Only apply confidence updates if this stream wasn't interrupted
            if (interruptedStreamIdRef.current === streamNum) {
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
          onRapportUpdate: (_confidence: number, formattedBar: string) => {
            // Rapport bar updates are terminal text lines that display in place
            // They are semantic state updates sent as separate events now
            const newLineId = String(lineCountRef.current++);
            responseLineIdsRef.current.push(newLineId);
            addTerminalLine('text', formattedBar);

          },
          onMessageStart: (_messageId: string, source?: string) => {
            // Track the stream source to conditionally show INTERRUPT button
            // Also track in ref for line creation
            setCurrentStreamSource(source || null);
            currentStreamSourceRef.current = source || null;
          },
          onResponseChunk: (chunk: any) => {
            // Check if stream was interrupted - only block chunks from the interrupted stream
            if (isStreamInterruptedRef.current && interruptedStreamIdRef.current === streamNum) {
              return;
            }

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

                // Create and add the new line in the same state update
                const newLine: TerminalLine = {
                  id: newLineId,
                  type: 'text',
                  content: chunk,
                  timestamp: Date.now(),
                  source: currentStreamSourceRef.current || undefined,
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
          onComplete: (data: any) => {

            // Don't reset currentStreamSource here - let the useEffect watching streamState.isStreaming handle cleanup
            // This prevents premature clearing while renderTrigger changes cause re-renders

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
            const box = formatAnalysisBox({
              reasoning: analysis.reasoning,
              confidenceDelta: analysis.confidenceDelta,
            });
            addTerminalLine('analysis', box);
          },
          onError: (error: any) => {

            // Reset stream source on error
            setCurrentStreamSource(null);

            // Check if this is an interrupt (user explicitly stopped)
            const isInterrupt = error.includes('interrupted') || isStreamInterruptedRef.current;

            if (isInterrupt) {
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

        const { promise, abort } = streamMiraBackend(
          userInput,
          miraState,
          assessment,
          null,
          callbacksObject
        );
        // Reset stream source before starting new stream
        setCurrentStreamSource(null);
        currentStreamSourceRef.current = null;
        dispatchStream({ type: 'START_STREAM', abort });
        await promise;
      } catch (_error) {
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
    [miraState, streamState.isStreaming, streamState.streamId, addTerminalLine, onConfidenceChange, settings.soundEnabled, updateRapportBar]
  );

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
          setMiraState((prevState) => ({
            ...prevState,
            confidenceInUser: newConfidence,
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
      } catch (error) {
      }
    } else {
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


            if (shouldShowInterrupt) {
              tools.push({
                id: 'interrupt',
                name: 'INTERRUPT',
                onExecute: handleInterrupt,
              });
            } else {
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
