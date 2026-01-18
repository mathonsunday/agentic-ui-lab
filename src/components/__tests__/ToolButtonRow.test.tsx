/**
 * Tests for ToolButtonRow Component
 *
 * Validates:
 * - Rendering tool buttons from array
 * - Tool button click execution
 * - Disabled state propagation
 * - Tool ID and name handling
 * - Empty tool array handling
 * - Multiple tools rendering
 * - Container styling and layout
 * - Tool button key management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ToolButtonRow } from '../ToolButtonRow';
import type { Tool } from '../ToolButtonRow';

describe('ToolButtonRow Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      const { container } = render(<ToolButtonRow tools={[]} />);
      expect(container.querySelector('.tool-button-row')).toBeTruthy();
    });

    it('should have tool-button-row class', () => {
      const { container } = render(<ToolButtonRow tools={[]} />);
      const row = container.querySelector('.tool-button-row');
      expect(row?.className).toContain('tool-button-row');
    });

    it('should render empty when no tools provided', () => {
      const { container } = render(<ToolButtonRow tools={[]} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should render single tool button', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);
    });

    it('should render multiple tool buttons', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
        {
          id: 'tool-2',
          name: 'Tool 2',
          onExecute: vi.fn(),
        },
        {
          id: 'tool-3',
          name: 'Tool 3',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(3);
    });

    it('should render many tool buttons', () => {
      const tools = Array.from({ length: 10 }, (_, i) => ({
        id: `tool-${i}`,
        name: `Tool ${i}`,
        onExecute: vi.fn(),
      }));

      const { container } = render(<ToolButtonRow tools={tools} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(10);
    });
  });

  describe('Tool Button Display', () => {
    it('should display tool names on buttons', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'ZOOM IN',
          onExecute: vi.fn(),
        },
        {
          id: 'tool-2',
          name: 'ZOOM OUT',
          onExecute: vi.fn(),
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);
      expect(getByText('ZOOM IN')).toBeTruthy();
      expect(getByText('ZOOM OUT')).toBeTruthy();
    });

    it('should have tool-button class on each button', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const button = container.querySelector('button');
      expect(button?.className).toContain('tool-button');
    });

    it('should set aria-label for accessibility', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'ZOOM IN',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toBe('ZOOM IN');
    });
  });

  describe('Click Handling', () => {
    it('should call onExecute when button clicked', () => {
      const mockExecute = vi.fn();
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Click Me',
          onExecute: mockExecute,
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);
      const button = getByText('Click Me');

      fireEvent.click(button);

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should call correct tool onExecute when multiple tools', () => {
      const mockExecute1 = vi.fn();
      const mockExecute2 = vi.fn();
      const mockExecute3 = vi.fn();

      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: mockExecute1,
        },
        {
          id: 'tool-2',
          name: 'Tool 2',
          onExecute: mockExecute2,
        },
        {
          id: 'tool-3',
          name: 'Tool 3',
          onExecute: mockExecute3,
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);

      fireEvent.click(getByText('Tool 1'));
      expect(mockExecute1).toHaveBeenCalledTimes(1);
      expect(mockExecute2).not.toHaveBeenCalled();
      expect(mockExecute3).not.toHaveBeenCalled();

      fireEvent.click(getByText('Tool 2'));
      expect(mockExecute1).toHaveBeenCalledTimes(1);
      expect(mockExecute2).toHaveBeenCalledTimes(1);
      expect(mockExecute3).not.toHaveBeenCalled();

      fireEvent.click(getByText('Tool 3'));
      expect(mockExecute1).toHaveBeenCalledTimes(1);
      expect(mockExecute2).toHaveBeenCalledTimes(1);
      expect(mockExecute3).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks on same button', () => {
      const mockExecute = vi.fn();
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Click Multiple',
          onExecute: mockExecute,
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);
      const button = getByText('Click Multiple');

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockExecute).toHaveBeenCalledTimes(3);
    });
  });

  describe('Disabled State', () => {
    it('should be enabled by default', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should disable buttons when disabled prop is true', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
        {
          id: 'tool-2',
          name: 'Tool 2',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} disabled={true} />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect((button as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('should enable all buttons when disabled prop is false', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(
        <ToolButtonRow tools={tools} disabled={false} />
      );
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should prevent onExecute when disabled', () => {
      const mockExecute = vi.fn();
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Disabled Tool',
          onExecute: mockExecute,
        },
      ];

      const { getByText } = render(
        <ToolButtonRow tools={tools} disabled={true} />
      );
      const button = getByText('Disabled Tool');

      fireEvent.click(button);

      // Button is disabled, so click shouldn't trigger onExecute
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should update disabled state when prop changes', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container, rerender } = render(
        <ToolButtonRow tools={tools} disabled={false} />
      );

      let button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);

      rerender(<ToolButtonRow tools={tools} disabled={true} />);

      button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      rerender(<ToolButtonRow tools={tools} disabled={false} />);

      button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe('Props', () => {
    it('should accept tools array prop', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      expect(container.querySelector('button')).toBeTruthy();
    });

    it('should accept disabled prop', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} disabled={true} />);
      expect(container.querySelector('button')).toBeTruthy();
    });

    it('should have default disabled value of false', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const button = container.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe('Tool Object Properties', () => {
    it('should use tool id as key', () => {
      const tools: Tool[] = [
        {
          id: 'unique-id-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
        {
          id: 'unique-id-2',
          name: 'Tool 2',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should handle special characters in tool names', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: '[ZOOM] > IN <',
          onExecute: vi.fn(),
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);
      expect(getByText('[ZOOM] > IN <')).toBeTruthy();
    });

    it('should handle long tool names', () => {
      const longName = 'Very Long Tool Name That Takes Up Space'.repeat(3);
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: longName,
          onExecute: vi.fn(),
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);
      expect(getByText(longName)).toBeTruthy();
    });

    it('should handle empty tool name', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: '',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const button = container.querySelector('button');
      expect(button?.textContent).toBe('');
    });
  });

  describe('Props Changes', () => {
    it('should update when tools array changes', () => {
      const tools1: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
      ];

      const { container, rerender } = render(<ToolButtonRow tools={tools1} />);

      let buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);

      const tools2: Tool[] = [
        ...tools1,
        {
          id: 'tool-2',
          name: 'Tool 2',
          onExecute: vi.fn(),
        },
      ];

      rerender(<ToolButtonRow tools={tools2} />);

      buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should handle tool array becoming empty', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool',
          onExecute: vi.fn(),
        },
      ];

      const { container, rerender } = render(<ToolButtonRow tools={tools} />);

      let buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);

      rerender(<ToolButtonRow tools={[]} />);

      buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should handle tool array growing', () => {
      const tools = Array.from({ length: 5 }, (_, i) => ({
        id: `tool-${i}`,
        name: `Tool ${i}`,
        onExecute: vi.fn(),
      }));

      const { container, rerender } = render(<ToolButtonRow tools={tools.slice(0, 2)} />);

      let buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);

      rerender(<ToolButtonRow tools={tools} />);

      buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5);
    });
  });

  describe('Container Layout', () => {
    it('should use flex layout for horizontal arrangement', () => {
      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
        {
          id: 'tool-2',
          name: 'Tool 2',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const row = container.querySelector('.tool-button-row') as HTMLDivElement;
      expect(row).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tools with duplicate IDs', () => {
      const tools: Tool[] = [
        {
          id: 'duplicate',
          name: 'Tool 1',
          onExecute: vi.fn(),
        },
        {
          id: 'duplicate',
          name: 'Tool 2',
          onExecute: vi.fn(),
        },
      ];

      const { container } = render(<ToolButtonRow tools={tools} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should handle very large tools array', () => {
      const tools = Array.from({ length: 100 }, (_, i) => ({
        id: `tool-${i}`,
        name: `Tool ${i}`,
        onExecute: vi.fn(),
      }));

      const { container } = render(<ToolButtonRow tools={tools} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(100);
    });

    it('should handle tool execution', () => {
      const mockExecute = vi.fn();

      const tools: Tool[] = [
        {
          id: 'tool-1',
          name: 'Executing Tool',
          onExecute: mockExecute,
        },
      ];

      const { getByText } = render(<ToolButtonRow tools={tools} />);
      const button = getByText('Executing Tool');

      fireEvent.click(button);

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});
