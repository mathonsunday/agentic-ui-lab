import { useEffect, useRef } from 'react';
import type { SystemLogEntry } from '../shared/stateMachine';
import './SystemLog.css';

interface SystemLogProps {
  entries: SystemLogEntry[];
  isActive?: boolean;
}

export function SystemLog({ entries, isActive = true }: SystemLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (scrollRef.current && isActive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isActive]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'EVALUATION':
        return 'system-log__entry--evaluation';
      case 'OBSERVATION':
        return 'system-log__entry--observation';
      case 'THOUGHT':
        return 'system-log__entry--thought';
      case 'CONFIDENCE':
        return 'system-log__entry--confidence';
      default:
        return '';
    }
  };

  return (
    <div className="system-log">
      <div className="system-log__header">
        <span className="system-log__title">DR. PETROVIC</span>
        <span className="system-log__subtitle">thinking</span>
      </div>

      <div className="system-log__fade-top"></div>

      <div className="system-log__content" ref={scrollRef}>
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className={`system-log__entry ${getTypeColor(entry.type)}`}
          >
            <span className="system-log__time">[{formatTime(entry.timestamp)}]</span>
            <span className="system-log__type">{entry.type}</span>
            <span className="system-log__message">{entry.message}</span>
            {entry.value !== undefined && (
              <span className="system-log__value">{entry.value}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="system-log__fade-bottom"></div>
    </div>
  );
}
