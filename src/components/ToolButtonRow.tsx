import { ToolButton } from './ToolButton';
import './ToolButtonRow.css';

export interface Tool {
  id: string;
  name: string;
  onExecute: () => void;
}

export interface ToolButtonRowProps {
  tools: Tool[];
  disabled?: boolean;
}

/**
 * ToolButtonRow Component
 * Container for rendering multiple tool buttons in a horizontal row
 * Buttons are disabled during streaming interactions
 */
export function ToolButtonRow({ tools, disabled = false }: ToolButtonRowProps) {
  return (
    <div className="tool-button-row">
      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          name={tool.name}
          onToolClick={tool.onExecute}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
