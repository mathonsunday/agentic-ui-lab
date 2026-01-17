import { useState, useCallback, useRef, useEffect } from 'react';
import { MinimalInput } from './MinimalInput';
import {
  initializeMiraState,
  evaluateUserResponseWithBackend,
  type MiraState,
  type AgentResponse,
} from '../shared/miraAgentSimulator';
import { playStreamingSound } from '../shared/audioEngine';
import { ASCII_PATTERNS } from '../shared/deepSeaAscii';
import './TerminalInterface.css';

interface TerminalInterfaceProps {
  onReturn?: () => void;
  initialConfidence?: number;
}

interface TerminalLine {
  id: string;
  type: 'ascii' | 'text' | 'input' | 'system';
  content: string;
  timestamp?: number;
}

export function TerminalInterface({ onReturn, initialConfidence }: TerminalInterfaceProps) {
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef(2);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Show initial ASCII art
  useEffect(() => {
    const testingPatterns = ASCII_PATTERNS.testing;
    const randomPattern = testingPatterns[Math.floor(Math.random() * testingPatterns.length)];
    const asciiLine: TerminalLine = {
      id: String(lineCountRef.current++),
      type: 'ascii',
      content: randomPattern,
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

  const streamResponse = useCallback(
    (response: AgentResponse) => {
      setIsStreaming(true);
      const delay = 150; // ms between chunks
      let totalDelay = 0;

      // Stream the response chunks first (observations are internal tracking only)
      response.streaming.forEach((chunk, index) => {
        setTimeout(() => {
          addTerminalLine('text', chunk);
        }, totalDelay + delay * index);
      });
      totalDelay += delay * response.streaming.length;

      // Add transition phrase
      setTimeout(() => {
        addTerminalLine('text', '...what do you think about this...');
      }, totalDelay);
      totalDelay += delay * 2;

      // Then show ASCII art - pick random from all moods for variety
      setTimeout(() => {
        // Collect all ASCII patterns from all moods for maximum variety
        const allPatterns = Object.values(ASCII_PATTERNS).flat();
        const randomPattern = allPatterns[Math.floor(Math.random() * allPatterns.length)];
        const asciiLine: TerminalLine = {
          id: String(lineCountRef.current++),
          type: 'ascii',
          content: randomPattern,
        };
        setTerminalLines((prev) => [...prev, asciiLine]);
        setIsStreaming(false);
      }, totalDelay);
    },
    [addTerminalLine]
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
        // Evaluate response with backend (async)
        const duration = 3000;
        const { updatedState, response } = await evaluateUserResponseWithBackend(
          miraState,
          userInput,
          duration
        );
        setMiraState(updatedState);

        // Add confidence indicator
        addTerminalLine(
          'system',
          `[CONFIDENCE: ${Math.round(updatedState.confidenceInUser)}%]`
        );

        // Stream her response
        streamResponse(response);
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
    [miraState, addTerminalLine, streamResponse]
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
