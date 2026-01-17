import { TerminalInterface } from './TerminalInterface';

interface ResearchExperienceProps {
  onReturn?: () => void;
  initialConfidence?: number;
}

export function ResearchExperience({ onReturn, initialConfidence }: ResearchExperienceProps) {
  return <TerminalInterface onReturn={onReturn} initialConfidence={initialConfidence} />;
}
