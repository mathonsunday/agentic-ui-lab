import { useState, useCallback, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { MinimalInput } from './MinimalInput';
import { TypewriterLine } from './TypewriterLine';
import { settingsAtom } from '../stores/settings';
import { createLogger } from '../utils/debugLogger';
import {
  initializeMiraState,
  assessResponse,
  type MiraState,
} from '../shared/miraAgentSimulator';
import { playStreamingSound, playHydrophoneStatic } from '../shared/audioEngine';
import { getNextZoomLevel, getPrevZoomLevel, getCreatureAtZoom, getRandomCreature, type ZoomLevel, type CreatureName } from '../shared/deepSeaAscii';
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
  type: 'ascii' | 'text' | 'input' | 'system';
  content: string;
  timestamp?: number;
}

const logger = createLogger('TerminalInterface');

// Stream debugging logger with timestamps
const streamDebugLog = (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  console.log(`[STREAM_DEBUG ${timestamp}] ${message}`, data || '');
};

export function TerminalInterface({ onReturn, initialConfidence, onConfidenceChange }: TerminalInterfaceProps) {
  const [settings] = useAtom(settingsAtom);
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
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const streamCounterRef = useRef(0); // Track how many streams have been initiated
  const [currentCreature, setCurrentCreature] = useState<CreatureName>('anglerFish');
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('medium');
  const [interactionCount, setInteractionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef(2);
  const abortControllerRef = useRef<(() => void) | null>(null);
  const currentAnimatingLineIdRef = useRef<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render when animation completes
  const responseLineIdsRef = useRef<string[]>([]);

  // Keep ref in sync with state and log all state changes
  useEffect(() => {
    isStreamingRef.current = isStreaming;
    streamDebugLog(`isStreaming state changed`, {
      newValue: isStreaming,
      refValue: isStreamingRef.current,
      streamCount: streamCounterRef.current,
      timestamp: Date.now()
    });
  }, [isStreaming]);

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

  const addTerminalLine = useCallback(
    (type: TerminalLine['type'], content: string) => {
      const newLine: TerminalLine = {
        id: String(lineCountRef.current++),
        type,
        content,
        timestamp: Date.now(),
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

  // Tool handlers for zoom interactions
  const handleZoomIn = useCallback(() => {
    const nextZoom = getNextZoomLevel(currentZoom);
    const newAscii = getCreatureAtZoom(currentCreature, nextZoom);

    console.log('🔍 ZOOM IN triggered:', currentZoom, '→', nextZoom);

    setCurrentZoom(nextZoom);

    setTerminalLines((prev) => {
      let lastAsciiIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === 'ascii') {
          lastAsciiIndex = i;
          break;
        }
      }
      if (lastAsciiIndex === -1) return prev;

      const updated = [...prev];
      updated[lastAsciiIndex] = { ...updated[lastAsciiIndex], content: newAscii };
      return updated;
    });

    handleToolCall('zoom_in', { zoomLevel: nextZoom });
  }, [currentCreature, currentZoom]);

  const handleZoomOut = useCallback(() => {
    const prevZoom = getPrevZoomLevel(currentZoom);
    const newAscii = getCreatureAtZoom(currentCreature, prevZoom);

    console.log('🔍 ZOOM OUT triggered:', currentZoom, '→', prevZoom);

    setCurrentZoom(prevZoom);

    setTerminalLines((prev) => {
      let lastAsciiIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === 'ascii') {
          lastAsciiIndex = i;
          break;
        }
      }
      if (lastAsciiIndex === -1) return prev;

      const updated = [...prev];
      updated[lastAsciiIndex] = { ...updated[lastAsciiIndex], content: newAscii };
      return updated;
    });

    handleToolCall('zoom_out', { zoomLevel: prevZoom });
  }, [currentCreature, currentZoom]);

  const handleToolCall = useCallback(
    async (toolAction: string, toolData: Record<string, unknown>) => {
      const streamNum = ++streamCounterRef.current;
      console.log('🔧 Tool call initiated:', toolAction, toolData);
      console.log('📊 Current confidence before:', miraState.confidenceInUser);
      streamDebugLog(`handleToolCall started - STREAM #${streamNum}`, {
        action: toolAction,
        isCurrentlyStreaming: isStreamingRef.current,
        isStreamingState: isStreaming
      });

      if (isStreamingRef.current) {
        console.log('⚠️ Already streaming, ignoring tool call');
        streamDebugLog(`Already streaming - ignoring this tool call`);
        return;
      }

      streamDebugLog(`Setting streaming TRUE for tool call`, { stream: streamNum });
      isStreamingRef.current = true;
      setIsStreaming(true);
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
              console.log('✅ Confidence update received:', update.from, '→', update.to);
              streamDebugLog(`onConfidence callback - STREAM #${streamNum}`, { from: update.from, to: update.to });
              setMiraState((prev) => ({
                ...prev,
                confidenceInUser: update.to,
              }));
              updateRapportBar(update.to);
              onConfidenceChange?.(update.to);
            },
            onComplete: (data) => {
              console.log('✨ Tool call complete, new confidence:', data.updatedState.confidenceInUser);
              console.log('🛑 Setting isStreaming to false');
              streamDebugLog(`onComplete callback - STREAM #${streamNum}`, {
                newConfidence: data.updatedState.confidenceInUser,
                aboutToSetIsStreamingFalse: true
              });
              isStreamingRef.current = false;
              setMiraState(data.updatedState);
              onConfidenceChange?.(data.updatedState.confidenceInUser);
              setIsStreaming(false);
            },
            onError: (error) => {
              console.error('❌ Tool call error:', error);
              streamDebugLog(`onError callback - STREAM #${streamNum}`, { error, aboutToSetIsStreamingFalse: true });
              isStreamingRef.current = false;
              addTerminalLine('text', `...error: ${error}...`);
              setIsStreaming(false);
            },
          }
        );
        abortControllerRef.current = abort;
        console.log('📌 Abort controller set for tool stream');
        streamDebugLog(`Abort controller set - STREAM #${streamNum}`);
        await promise;
        console.log('✅ Tool stream promise resolved');
        streamDebugLog(`Tool stream promise resolved - STREAM #${streamNum}`);
      } catch (error) {
        console.error('Tool call failed:', error);
        streamDebugLog(`Caught error in try-catch - STREAM #${streamNum}`, { error });
        isStreamingRef.current = false;
        setIsStreaming(false);
      } finally {
        // Always clear abort ref and ensure streaming is stopped
        console.log('🧹 Clearing abort controller and stopping stream');
        streamDebugLog(`Finally block executing - STREAM #${streamNum}`, {
          isStreamingRefBefore: isStreamingRef.current,
          aboutToSetFalse: true
        });
        isStreamingRef.current = false;
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [miraState, isStreaming, interactionCount, addTerminalLine, onConfidenceChange, updateRapportBar]
  );

  const handleInput = useCallback(
    async (userInput: string) => {
      const streamNum = ++streamCounterRef.current;
      if (!userInput.trim()) return;

      streamDebugLog(`handleInput started - STREAM #${streamNum}`, {
        userInput: userInput.substring(0, 50) + '...',
        isCurrentlyStreaming: isStreamingRef.current
      });

      // Add user input to terminal
      addTerminalLine('input', `> ${userInput}`);

      // Set streaming state to disable input
      // CRITICAL: Update ref synchronously BEFORE setState to avoid stale closure during render
      streamDebugLog(`Setting streaming TRUE for input - STREAM #${streamNum}`);
      isStreamingRef.current = true;
      setIsStreaming(true);

      // Play audio cue
      playStreamingSound('thinking').catch(() => {});

      try {
        // Frontend assessment: type and basic depth from word count
        const assessment = assessResponse(userInput, 3000, miraState);

        // Stream from backend with real-time updates
        const { promise, abort } = streamMiraBackend(
          userInput,
          miraState,
          assessment,
          null,
          {
            onConfidence: (update) => {
              // Update state with new confidence
              setMiraState((prev) => ({
                ...prev,
                confidenceInUser: update.to,
              }));
              onConfidenceChange?.(update.to);
            },
            onProfile: (profile) => {
              // Update user profile as Claude analyzes
              setMiraState((prev) => ({
                ...prev,
                userProfile: {
                  ...prev.userProfile,
                  ...profile,
                },
              }));
            },
            onResponseChunk: (chunk) => {
              // Add each chunk as a separate terminal line to preserve formatting and gaps
              const newLineId = String(lineCountRef.current);

              streamDebugLog(`onResponseChunk received - STREAM #${streamNum}`, {
                chunkLength: chunk.length,
                newLineId,
                isCurrentlyStreaming: isStreamingRef.current,
                isStreamingState: isStreaming
              });

              // Track this line as part of the response sequence
              responseLineIdsRef.current.push(newLineId);

              // Set the first chunk's line as the currently animating line
              if (!currentAnimatingLineIdRef.current) {
                currentAnimatingLineIdRef.current = newLineId;
                setRenderTrigger(t => t + 1); // Force re-render
                streamDebugLog(`First chunk - triggering render - STREAM #${streamNum}`, { renderTriggerId: newLineId });
              }

              addTerminalLine('text', chunk);

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
            onComplete: (data) => {
              streamDebugLog(`onComplete callback - STREAM #${streamNum}`, {
                newConfidence: data.updatedState.confidenceInUser,
                aboutToSetIsStreamingFalse: true,
                isStreamingRefBefore: isStreamingRef.current
              });

              // Final state update
              setMiraState(data.updatedState);
              onConfidenceChange?.(data.updatedState.confidenceInUser);

              // Add transition phrase
              addTerminalLine('text', '...what do you think about this...');

              // Show ASCII art with tracked creature
              const { name: randomCreature, art: randomArt } = getRandomCreature();
              setCurrentCreature(randomCreature);
              setCurrentZoom('medium');
              const asciiLine: TerminalLine = {
                id: String(lineCountRef.current++),
                type: 'ascii',
                content: randomArt,
              };
              setTerminalLines((prev) => [...prev, asciiLine]);

              // Add visual separator after exchange
              addTerminalLine('system', '---');

              // Reset response tracking
              currentAnimatingLineIdRef.current = null;
              responseLineIdsRef.current = [];
              setIsStreaming(false);
            },
            onError: (error) => {
              console.error('Stream error:', error);
              streamDebugLog(`onError callback - STREAM #${streamNum}`, {
                error,
                isStreamingRefBefore: isStreamingRef.current,
                aboutToSetIsStreamingFalse: true
              });

              // Check if this is an interrupt (user explicitly stopped)
              const isInterrupt = error.includes('interrupted');

              if (isInterrupt) {
                console.log('📍 Stream was interrupted by user');
                // Decrease rapport as penalty
                const newConfidence = Math.max(0, miraState.confidenceInUser - 15);
                setMiraState((prev) => ({
                  ...prev,
                  confidenceInUser: newConfidence,
                }));
                updateRapportBar(newConfidence);
                onConfidenceChange?.(newConfidence);
                // Add narrative consequence
                addTerminalLine('text', '...you cut off my words... you still don\'t understand...');
              } else {
                addTerminalLine(
                  'text',
                  '...connection to the depths lost... the abyss is unreachable at this moment...'
                );
              }

              // Reset response tracking
              currentAnimatingLineIdRef.current = null;
              responseLineIdsRef.current = [];
              setIsStreaming(false);
            },
          }
        );
        abortControllerRef.current = abort;
        console.log('📌 Abort controller set for input stream');
        streamDebugLog(`Abort controller set - STREAM #${streamNum}`);
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
        setIsStreaming(false);
      } finally {
        // Always clear abort ref and ensure streaming is stopped
        console.log('🧹 Clearing abort controller and stopping stream');
        streamDebugLog(`Finally block executing - STREAM #${streamNum}`, {
          isStreamingRefBefore: isStreamingRef.current,
          aboutToSetFalse: true
        });
        isStreamingRef.current = false;
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [miraState, addTerminalLine, onConfidenceChange]
  );

  const handleInterrupt = useCallback(() => {
    console.log('🛑 Interrupt button clicked, abort fn exists?', !!abortControllerRef.current);
    streamDebugLog(`handleInterrupt called`, {
      hasAbortController: !!abortControllerRef.current,
      isStreaming,
      isStreamingRef: isStreamingRef.current
    });
    if (abortControllerRef.current) {
      console.log('🛑 Interrupt requested - calling abort function');
      streamDebugLog(`Calling abort function`);
      abortControllerRef.current();
      console.log('✅ Abort function called - the onError callback will handle cleanup');
    } else {
      console.log('⚠️ No abort controller available');
      streamDebugLog(`No abort controller available`);
    }
  }, [isStreaming]);

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

            // For sequential animation: only animate the currently animating line
            const shouldAnimate = !isResponseLine || line.id === currentAnimatingLineIdRef.current;

            return (
              <div
                key={line.id}
                className={`terminal-interface__line terminal-interface__line--${line.type}`}
              >
                {line.type === 'ascii' ? (
                  <pre className="terminal-interface__ascii">{line.content}</pre>
                ) : isResponseLine ? (
                  <TypewriterLine
                    content={line.content}
                    speed={settings.typingSpeed}
                    isAnimating={shouldAnimate}
                    onComplete={() => {
                      // Move to next response line
                      const currentIndex = responseLineIdsRef.current.indexOf(line.id);
                      const nextIndex = currentIndex + 1;
                      if (nextIndex < responseLineIdsRef.current.length) {
                        currentAnimatingLineIdRef.current = responseLineIdsRef.current[nextIndex];
                        setRenderTrigger(t => t + 1); // Force re-render to start next animation
                      } else {
                        currentAnimatingLineIdRef.current = null;
                      }
                    }}
                  />
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
            disabled={isStreaming}
            placeholder="> share your thoughts..."
          />

          <ToolButtonRow
            tools={(() => {
              const interruptTool = { id: 'interrupt', name: 'INTERRUPT', onExecute: handleInterrupt };
              const tools = [
                { id: 'zoom-in', name: 'ZOOM IN', onExecute: handleZoomIn },
                { id: 'zoom-out', name: 'ZOOM OUT', onExecute: handleZoomOut },
              ];

              // Detailed logging for tool button rendering
              if (isStreaming) {
                tools.push(interruptTool);
                streamDebugLog(`RENDER: Adding interrupt button`, {
                  isStreaming,
                  isStreamingRef: isStreamingRef.current,
                  renderTrigger,
                  toolCount: tools.length
                });
              } else {
                streamDebugLog(`RENDER: NOT adding interrupt button (isStreaming is false)`, {
                  isStreaming,
                  isStreamingRef: isStreamingRef.current,
                  renderTrigger,
                  toolCount: tools.length
                });
              }

              return tools;
            })()}
            disabled={false}
          />
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
