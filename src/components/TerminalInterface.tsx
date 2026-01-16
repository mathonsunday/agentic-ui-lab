import { useState, useCallback, useRef, useEffect } from 'react';
import { MinimalInput } from './MinimalInput';
import {
  initializeMiraState,
  evaluateUserResponse,
  type MiraState,
  type AgentResponse,
} from '../shared/miraAgentSimulator';
import { playStreamingSound } from '../shared/audioEngine';
import { ASCII_PATTERNS } from '../shared/deepSeaAscii';
import './TerminalInterface.css';

interface TerminalInterfaceProps {
  onReturn?: () => void;
}

interface TerminalLine {
  id: string;
  type: 'ascii' | 'text' | 'input' | 'system';
  content: string;
  timestamp?: number;
}

export function TerminalInterface({ onReturn }: TerminalInterfaceProps) {
  const [miraState, setMiraState] = useState<MiraState>(initializeMiraState);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'system',
      content: '> MIRA RESEARCH INTERFACE INITIALIZED',
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
    (response: AgentResponse, mood: string) => {
      setIsStreaming(true);
      const delay = 150; // ms between chunks
      let totalDelay = 0;

      // Add ASCII art first - pick random variation from mood's array
      const patterns = ASCII_PATTERNS[mood as keyof typeof ASCII_PATTERNS] || ASCII_PATTERNS.testing;
      const randomPattern = Array.isArray(patterns)
        ? patterns[Math.floor(Math.random() * patterns.length)]
        : patterns;
      const asciiLine: TerminalLine = {
        id: String(lineCountRef.current++),
        type: 'ascii',
        content: randomPattern,
      };
      setTerminalLines((prev) => [...prev, asciiLine]);
      totalDelay += delay * 2; // Give ASCII art some space

      // Stream the response chunks (observations are internal tracking only)
      response.streaming.forEach((chunk, index) => {
        setTimeout(() => {
          addTerminalLine('text', chunk);
          if (index === response.streaming.length - 1) {
            setIsStreaming(false);
          }
        }, totalDelay + delay * index);
      });
    },
    [addTerminalLine]
  );

  const handleInput = useCallback(
    (userInput: string) => {
      if (!userInput.trim()) return;

      // Add user input to terminal
      addTerminalLine('input', `> ${userInput}`);

      // Evaluate response
      const duration = 3000;
      const { updatedState, response } = evaluateUserResponse(
        miraState,
        userInput,
        duration
      );
      setMiraState(updatedState);

      // Play audio cue
      playStreamingSound('thinking').catch(() => {});

      // Add confidence indicator
      addTerminalLine(
        'system',
        `[CONFIDENCE: ${Math.round(updatedState.confidenceInUser)}%]`
      );

      // Stream her response with current mood
      streamResponse(response, updatedState.currentMood);
    },
    [miraState, addTerminalLine, streamResponse]
  );

  return (
    <div className="terminal-interface">
      <div className="terminal-interface__header">
        <div className="terminal-interface__title">
          MIRA RESEARCH TERMINAL v0.1
        </div>
        <div className="terminal-interface__subtitle">
          Deep Sea Research Assistant · Connected
        </div>
      </div>

      <div className="terminal-interface__output" ref={scrollRef}>
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

      {onReturn && (
        <button className="terminal-interface__return" onClick={onReturn}>
          [EXIT]
        </button>
      )}
    </div>
  );
}
