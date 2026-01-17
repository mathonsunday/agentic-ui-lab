import { TerminalInterface } from './TerminalInterface';

interface ResearchExperienceProps {
  onReturn?: () => void;
  initialConfidence?: number;
  onConfidenceChange?: (newConfidence: number) => void;
}

export function ResearchExperience({ onReturn, initialConfidence, onConfidenceChange }: ResearchExperienceProps) {
  return <TerminalInterface onReturn={onReturn} initialConfidence={initialConfidence} onConfidenceChange={onConfidenceChange} />;
}
