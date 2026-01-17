import { useState, useCallback, useRef, useEffect } from 'react';
import { MinimalInput } from './MinimalInput';
import {
  initializeMiraState,
  assessResponse,
  type MiraState,
} from '../shared/miraAgentSimulator';
import { playStreamingSound } from '../shared/audioEngine';
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

export function TerminalInterface({ onReturn, initialConfidence, onConfidenceChange }: TerminalInterfaceProps) {
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
  const [currentCreature, setCurrentCreature] = useState<CreatureName>('anglerFish');
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('medium');
  const [interactionCount, setInteractionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef(2);

  // Keep ref in sync with state
  useEffect(() => {
    isStreamingRef.current = isStreaming;
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
      console.log('🔧 Tool call initiated:', toolAction, toolData);
      console.log('📊 Current confidence before:', miraState.confidenceInUser);

      if (isStreamingRef.current) {
        console.log('⚠️ Already streaming, ignoring tool call');
        return;
      }

      isStreamingRef.current = true;
      setIsStreaming(true);
      setInteractionCount((prev) => prev + 1);

      try {
        await streamMiraBackend(
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
              isStreamingRef.current = false;
              setMiraState(data.updatedState);
              onConfidenceChange?.(data.updatedState.confidenceInUser);
              setIsStreaming(false);
            },
            onError: (error) => {
              console.error('❌ Tool call error:', error);
              isStreamingRef.current = false;
              addTerminalLine('text', `...error: ${error}...`);
              setIsStreaming(false);
            },
          }
        );
      } catch (error) {
        console.error('Tool call failed:', error);
        isStreamingRef.current = false;
        setIsStreaming(false);
      }
    },
    [miraState, isStreaming, interactionCount, addTerminalLine, onConfidenceChange, updateRapportBar]
  );

  const handleInput = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      // Add user input to terminal
      addTerminalLine('input', `> ${userInput}`);

      // Set streaming state to disable input
      setIsStreaming(true);

      // Play audio cue
      playStreamingSound('thinking').catch(() => {});

      try {
        // Frontend assessment: type and basic depth from word count
        const assessment = assessResponse(userInput, 3000, miraState);

        // Stream from backend with real-time updates
        await streamMiraBackend(
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
              // Display chunk immediately
              addTerminalLine('text', chunk);
            },
            onComplete: (data) => {
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

              setIsStreaming(false);
            },
            onError: (error) => {
              console.error('Stream error:', error);
              addTerminalLine(
                'text',
                '...connection to the depths lost... the abyss is unreachable at this moment...'
              );
              setIsStreaming(false);
            },
          }
        );
      } catch (error) {
        // Error handling: graceful degradation
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Backend error:', errorMsg);

        addTerminalLine(
          'text',
          '...connection to the depths lost... the abyss is unreachable at this moment...'
        );
        setIsStreaming(false);
      }
    },
    [miraState, addTerminalLine, onConfidenceChange]
  );

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
          {terminalLines.map((line) => (
            <div
              key={line.id}
              className={`terminal-interface__line terminal-interface__line--${line.type}`}
            >
              {line.type === 'ascii' ? (
                <pre className="terminal-interface__ascii">{line.content}</pre>
              ) : (
                <span className="terminal-interface__text">{line.content}</span>
              )}
            </div>
          ))}

          <ToolButtonRow
            tools={[
              { id: 'zoom-in', name: 'ZOOM IN', onExecute: handleZoomIn },
              { id: 'zoom-out', name: 'ZOOM OUT', onExecute: handleZoomOut },
            ]}
            disabled={isStreaming}
          />
        </div>

        <div className="terminal-interface__input-section">
          <MinimalInput
            onSubmit={handleInput}
            disabled={isStreaming}
            placeholder="> share your thoughts..."
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
