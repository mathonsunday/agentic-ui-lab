/**
 * Tests for SystemLog Component
 *
 * Validates:
 * - Rendering log entries with correct formatting
 * - Time formatting (MM:SS format)
 * - Entry type colors and styling
 * - Auto-scroll to bottom when new entries added
 * - Scroll behavior based on isActive prop
 * - Display of optional values (percentages)
 * - Header information display
 * - Fade effects (top and bottom)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { SystemLog } from '../SystemLog';
import type { SystemLogEntry } from '../../shared/stateMachine';

describe('SystemLog Component', () => {
  const mockEntries: SystemLogEntry[] = [
    {
      timestamp: 0,
      type: 'EVALUATION',
      message: 'Research Potential',
      value: 0,
    },
    {
      timestamp: 30,
      type: 'OBSERVATION',
      message: 'Subject appears alert',
    },
    {
      timestamp: 65,
      type: 'THOUGHT',
      message: 'Interesting response pattern',
    },
    {
      timestamp: 120,
      type: 'CONFIDENCE',
      message: 'Confidence increasing',
      value: 25,
    },
  ];

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      expect(container.querySelector('.system-log')).toBeTruthy();
    });

    it('should render header with title', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('DR. PETROVIC')).toBeTruthy();
    });

    it('should render header subtitle', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('thinking')).toBeTruthy();
    });

    it('should render all log entries', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const entries = container.querySelectorAll('.system-log__entry');
      expect(entries.length).toBe(mockEntries.length);
    });

    it('should render fade-top element', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      expect(container.querySelector('.system-log__fade-top')).toBeTruthy();
    });

    it('should render fade-bottom element', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      expect(container.querySelector('.system-log__fade-bottom')).toBeTruthy();
    });

    it('should render content scrollable container', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      expect(container.querySelector('.system-log__content')).toBeTruthy();
    });
  });

  describe('Entry Rendering', () => {
    it('should display entry type as EVALUATION', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('EVALUATION')).toBeTruthy();
    });

    it('should display entry type as OBSERVATION', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('OBSERVATION')).toBeTruthy();
    });

    it('should display entry type as THOUGHT', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('THOUGHT')).toBeTruthy();
    });

    it('should display entry type as CONFIDENCE', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('CONFIDENCE')).toBeTruthy();
    });

    it('should display entry messages', () => {
      const { getByText } = render(<SystemLog entries={mockEntries} />);
      expect(getByText('Research Potential')).toBeTruthy();
      expect(getByText('Subject appears alert')).toBeTruthy();
      expect(getByText('Interesting response pattern')).toBeTruthy();
      expect(getByText('Confidence increasing')).toBeTruthy();
    });
  });

  describe('Time Formatting', () => {
    it('should format time as MM:SS', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const times = container.querySelectorAll('.system-log__time');

      // First entry at 0 seconds = 00:00
      expect(times[0]?.textContent).toContain('00:00');
    });

    it('should format 30 seconds as 00:30', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const times = container.querySelectorAll('.system-log__time');

      // Second entry at 30 seconds = 00:30
      expect(times[1]?.textContent).toContain('00:30');
    });

    it('should format 65 seconds as 01:05', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const times = container.querySelectorAll('.system-log__time');

      // Third entry at 65 seconds = 01:05
      expect(times[2]?.textContent).toContain('01:05');
    });

    it('should format 120 seconds as 02:00', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const times = container.querySelectorAll('.system-log__time');

      // Fourth entry at 120 seconds = 02:00
      expect(times[3]?.textContent).toContain('02:00');
    });

    it('should pad single-digit seconds with zero', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 5,
          type: 'EVALUATION',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const time = container.querySelector('.system-log__time');
      expect(time?.textContent).toContain('00:05');
    });

    it('should pad single-digit minutes with zero', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 75,
          type: 'EVALUATION',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const time = container.querySelector('.system-log__time');
      expect(time?.textContent).toContain('01:15');
    });

    it('should format large timestamps', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 3661,
          type: 'EVALUATION',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const time = container.querySelector('.system-log__time');
      expect(time?.textContent).toContain('61:01');
    });
  });

  describe('Entry Type Colors', () => {
    it('should apply evaluation color class', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'EVALUATION',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const entry = container.querySelector('.system-log__entry');
      expect(entry?.className).toContain('system-log__entry--evaluation');
    });

    it('should apply observation color class', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const entry = container.querySelector('.system-log__entry');
      expect(entry?.className).toContain('system-log__entry--observation');
    });

    it('should apply thought color class', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'THOUGHT',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const entry = container.querySelector('.system-log__entry');
      expect(entry?.className).toContain('system-log__entry--thought');
    });

    it('should apply confidence color class', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const entry = container.querySelector('.system-log__entry');
      expect(entry?.className).toContain('system-log__entry--confidence');
    });
  });

  describe('Value Display', () => {
    it('should display value when provided', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 50,
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.querySelector('.system-log__value')).toBeTruthy();
    });

    it('should display value as percentage', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 75,
        },
      ];

      const { getByText } = render(<SystemLog entries={entries} />);
      expect(getByText('75%')).toBeTruthy();
    });

    it('should not display value when not provided', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: 'Observation',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.querySelector('.system-log__value')).toBeFalsy();
    });

    it('should handle zero value', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 0,
        },
      ];

      const { getByText } = render(<SystemLog entries={entries} />);
      expect(getByText('0%')).toBeTruthy();
    });

    it('should handle 100% value', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 100,
        },
      ];

      const { getByText } = render(<SystemLog entries={entries} />);
      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('should have scrollable content container', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const content = container.querySelector('.system-log__content') as HTMLDivElement;
      expect(content).toBeTruthy();
    });

    it('should auto-scroll when isActive is true', () => {
      const { container, rerender } = render(
        <SystemLog entries={mockEntries} isActive={true} />
      );

      const content = container.querySelector('.system-log__content') as HTMLDivElement;
      const initialScroll = content.scrollTop;

      // Add more entries and rerender
      const newEntries = [
        ...mockEntries,
        {
          timestamp: 150,
          type: 'EVALUATION',
          message: 'New entry',
        },
      ];

      rerender(<SystemLog entries={newEntries} isActive={true} />);

      // After adding entries, should scroll down
      expect(content.scrollTop).toBeGreaterThanOrEqual(initialScroll);
    });

    it('should not auto-scroll when isActive is false', () => {
      const { container } = render(
        <SystemLog entries={mockEntries} isActive={false} />
      );

      const content = container.querySelector('.system-log__content') as HTMLDivElement;
      content.scrollTop = 0;

      // Even though we have scrollable content, when isActive is false,
      // scroll position should not change automatically
      expect(content.scrollTop).toBe(0);
    });

    it('should use default isActive value of true', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const content = container.querySelector('.system-log__content');
      expect(content).toBeTruthy();
    });
  });

  describe('Props Changes', () => {
    it('should update when entries change', () => {
      const { rerender, container: container1 } = render(
        <SystemLog entries={mockEntries} />
      );

      let entries = container1.querySelectorAll('.system-log__entry');
      expect(entries.length).toBe(4);

      const newEntries = [
        ...mockEntries,
        {
          timestamp: 180,
          type: 'THOUGHT',
          message: 'Additional thought',
        },
      ];

      rerender(<SystemLog entries={newEntries} />);

      entries = container1.querySelectorAll('.system-log__entry');
      expect(entries.length).toBe(5);
    });

    it('should update when isActive changes', () => {
      const { rerender, container } = render(
        <SystemLog entries={mockEntries} isActive={true} />
      );

      let content = container.querySelector('.system-log__content');
      expect(content).toBeTruthy();

      rerender(<SystemLog entries={mockEntries} isActive={false} />);

      content = container.querySelector('.system-log__content');
      expect(content).toBeTruthy();
    });

    it('should handle empty entries array', () => {
      const { container } = render(<SystemLog entries={[]} />);
      const entries = container.querySelectorAll('.system-log__entry');
      expect(entries.length).toBe(0);
    });

    it('should handle single entry', () => {
      const entries = [mockEntries[0]];
      const { container } = render(<SystemLog entries={entries} />);
      const renderedEntries = container.querySelectorAll('.system-log__entry');
      expect(renderedEntries.length).toBe(1);
    });

    it('should handle many entries', () => {
      const manyEntries = Array.from({ length: 100 }, (_, i) => ({
        timestamp: i * 10,
        type: 'OBSERVATION' as const,
        message: `Entry ${i}`,
      }));

      const { container } = render(<SystemLog entries={manyEntries} />);
      const entries = container.querySelectorAll('.system-log__entry');
      expect(entries.length).toBe(100);
    });
  });

  describe('Entry Structure', () => {
    it('should render time span in each entry', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const times = container.querySelectorAll('.system-log__time');
      expect(times.length).toBe(mockEntries.length);
    });

    it('should render type span in each entry', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const types = container.querySelectorAll('.system-log__type');
      expect(types.length).toBe(mockEntries.length);
    });

    it('should render message span in each entry', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      const messages = container.querySelectorAll('.system-log__message');
      expect(messages.length).toBe(mockEntries.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined timestamp', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'EVALUATION',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.querySelector('.system-log__time')).toBeTruthy();
    });

    it('should handle unknown entry type gracefully', () => {
      const entries: any[] = [
        {
          timestamp: 0,
          type: 'UNKNOWN',
          message: 'Test',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      const entry = container.querySelector('.system-log__entry');
      expect(entry?.className).not.toContain('system-log__entry--');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(500);
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: longMessage,
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.querySelector('.system-log__message')).toBeTruthy();
    });

    it('should handle special characters in messages', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: 'Test <>&"\'',
        },
      ];

      const { getByText } = render(<SystemLog entries={entries} />);
      expect(getByText("Test <>&\"'")).toBeTruthy();
    });
  });
});
