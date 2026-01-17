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
  if (tools.length > 0) {
    console.log('📦 ToolButtonRow rendering', tools.length, 'tools:', tools.map(t => t.name));
  }
  return (
    <div className="tool-button-row">
      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          name={tool.name}
          onToolClick={() => {
            console.log(`🔘 Button clicked: ${tool.name}`);
            tool.onExecute();
          }}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
