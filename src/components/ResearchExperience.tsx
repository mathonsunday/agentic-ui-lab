import { TerminalInterface } from './TerminalInterface';

interface ResearchExperienceProps {
  onReturn?: () => void;
}

export function ResearchExperience({ onReturn }: ResearchExperienceProps) {
  return <TerminalInterface onReturn={onReturn} />;
}
