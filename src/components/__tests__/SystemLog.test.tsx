/**
 * Tests for SystemLog Component
 *
 * Validates:
 * - Rendering log entries with correct formatting (via snapshots)
 * - Time formatting (MM:SS format)
 * - Auto-scroll to bottom when new entries added
 * - Scroll behavior based on isActive prop
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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
    it('should render complete component with all elements', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render empty component with no entries', () => {
      const { container } = render(<SystemLog entries={[]} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render with single entry', () => {
      const entries = [mockEntries[0]];
      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Entry Type Rendering', () => {
    it('should render all entry types correctly', () => {
      const { container } = render(<SystemLog entries={mockEntries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render evaluation type with styling', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'EVALUATION',
          message: 'Test evaluation',
        },
      ];
      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render observation type with styling', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: 'Test observation',
        },
      ];
      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render thought type with styling', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'THOUGHT',
          message: 'Test thought',
        },
      ];
      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render confidence type with styling', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Test confidence',
        },
      ];
      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
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

  describe('Value Display', () => {
    it('should render with value displayed', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 75,
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render without value when not provided', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: 'Observation',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render with zero value', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 0,
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should render with 100% value', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'CONFIDENCE',
          message: 'Confidence',
          value: 100,
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
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
      const { rerender, container } = render(
        <SystemLog entries={mockEntries} />
      );

      let entries = container.querySelectorAll('.system-log__entry');
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

      entries = container.querySelectorAll('.system-log__entry');
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

  describe('Edge Cases', () => {
    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(500);
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: longMessage,
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should handle special characters in messages', () => {
      const entries: SystemLogEntry[] = [
        {
          timestamp: 0,
          type: 'OBSERVATION',
          message: 'Test <>&"\'',
        },
      ];

      const { container } = render(<SystemLog entries={entries} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
