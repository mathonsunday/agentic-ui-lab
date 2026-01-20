import './ToolButton.css';

interface ToolButtonProps {
  name: string;
  onToolClick: () => void;
  disabled?: boolean;
}

/**
 * ToolButton Component
 * A button that triggers tool actions with visual feedback
 * Disables during streaming to prevent double-submission
 */
export const ToolButton = ({ name, onToolClick, disabled = false }: ToolButtonProps) => {
  return (
    <button
      className="tool-button"
      onClick={onToolClick}
      disabled={disabled}
      aria-label={name}
    >
      {name}
    </button>
  );
};
