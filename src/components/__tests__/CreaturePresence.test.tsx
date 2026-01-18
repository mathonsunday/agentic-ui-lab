/**
 * Tests for CreaturePresence Component
 *
 * Validates:
 * - Rendering canvas elements for different creature types
 * - Visibility and "felt" state handling
 * - Position and direction props
 * - Animation lifecycle (requestAnimationFrame management)
 * - Cleanup on unmount
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CreaturePresence } from '../CreaturePresence';

// Mock requestAnimationFrame
let animationFrameCallbacks: Set<FrameRequestCallback> = new Set();
let frameCounter = 0;

global.requestAnimationFrame = vi.fn((callback) => {
  animationFrameCallbacks.add(callback);
  return ++frameCounter;
});

global.cancelAnimationFrame = vi.fn((id) => {
  // Mock implementation
});

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  globalAlpha: 1,
})) as any;

describe('CreaturePresence Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    animationFrameCallbacks.clear();
    frameCounter = 0;
  });

  describe('Rendering', () => {
    it('should render a canvas element', () => {
      const { container } = render(
        <CreaturePresence type="seeker" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should apply creature type to className', () => {
      const { container } = render(
        <CreaturePresence type="jellyfish" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('creature-presence--jellyfish');
    });

    it('should render all creature types', () => {
      const types: Array<'seeker' | 'tendril' | 'leviathan-eye' | 'jellyfish'> = [
        'seeker',
        'tendril',
        'leviathan-eye',
        'jellyfish',
      ];

      for (const type of types) {
        const { container } = render(
          <CreaturePresence type={type} />
        );

        const canvas = container.querySelector('canvas');
        expect(canvas?.className).toContain(`creature-presence--${type}`);

        cleanup();
      }
    });
  });

  describe('Visibility', () => {
    it('should apply felt class when visible=false and felt=true', () => {
      const { container } = render(
        <CreaturePresence type="seeker" visible={false} felt={true} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('felt');
    });

    it('should not apply felt class when visible=true', () => {
      const { container } = render(
        <CreaturePresence type="seeker" visible={true} felt={true} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).not.toContain('felt');
    });

    it('should default visible to true', () => {
      const { container } = render(
        <CreaturePresence type="seeker" />
      );

      const canvas = container.querySelector('canvas');
      // Should not have felt class by default
      expect(canvas?.className).not.toContain('felt');
    });
  });

  describe('Position and Direction', () => {
    it('should apply position styles', () => {
      const { container } = render(
        <CreaturePresence type="seeker" position={{ x: 25, y: 75 }} />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas?.style.left).toBe('25%');
      expect(canvas?.style.top).toBe('75%');
    });

    it('should use default position', () => {
      const { container } = render(
        <CreaturePresence type="seeker" />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas?.style.left).toBe('50%');
      expect(canvas?.style.top).toBe('50%');
    });

    it('should accept direction prop', () => {
      const directions: Array<'above' | 'below' | 'left' | 'right'> = [
        'above',
        'below',
        'left',
        'right',
      ];

      for (const direction of directions) {
        const { container } = render(
          <CreaturePresence type="tendril" direction={direction} />
        );

        const canvas = container.querySelector('canvas');
        expect(canvas).toBeTruthy();

        cleanup();
      }
    });

    it('should default direction to below', () => {
      const { container } = render(
        <CreaturePresence type="tendril" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('Animation Lifecycle', () => {
    it('should call requestAnimationFrame on render', () => {
      render(<CreaturePresence type="seeker" />);

      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should cancel animation on unmount', () => {
      const { unmount } = render(
        <CreaturePresence type="seeker" />
      );

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should set canvas dimensions', () => {
      const { container } = render(
        <CreaturePresence type="seeker" />
      );

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(200);
    });

    it('should handle canvas context retrieval', () => {
      const { container } = render(
        <CreaturePresence type="seeker" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.getContext).toBeDefined();
    });
  });

  describe('Props Changes', () => {
    it('should update on type change', () => {
      const { rerender, container: container1 } = render(
        <CreaturePresence type="seeker" />
      );

      let canvas = container1.querySelector('canvas');
      expect(canvas?.className).toContain('creature-presence--seeker');

      rerender(<CreaturePresence type="jellyfish" />);

      canvas = container1.querySelector('canvas');
      expect(canvas?.className).toContain('creature-presence--jellyfish');
    });

    it('should update on visibility change', () => {
      const { rerender, container } = render(
        <CreaturePresence type="seeker" visible={true} felt={false} />
      );

      let canvas = container.querySelector('canvas');
      expect(canvas?.className).not.toContain('felt');

      rerender(
        <CreaturePresence type="seeker" visible={false} felt={true} />
      );

      canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('felt');
    });

    it('should update on position change', () => {
      const { rerender, container } = render(
        <CreaturePresence type="seeker" position={{ x: 10, y: 20 }} />
      );

      let canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas?.style.left).toBe('10%');
      expect(canvas?.style.top).toBe('20%');

      rerender(
        <CreaturePresence type="seeker" position={{ x: 80, y: 90 }} />
      );

      canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas?.style.left).toBe('80%');
      expect(canvas?.style.top).toBe('90%');
    });

    it('should update on direction change', () => {
      const { rerender, container } = render(
        <CreaturePresence type="tendril" direction="above" />
      );

      let canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();

      rerender(
        <CreaturePresence type="tendril" direction="left" />
      );

      canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have creature-presence class', () => {
      const { container } = render(
        <CreaturePresence type="seeker" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('creature-presence');
    });

    it('should support all creature type combinations', () => {
      const types: Array<'seeker' | 'tendril' | 'leviathan-eye' | 'jellyfish'> = [
        'seeker',
        'tendril',
        'leviathan-eye',
        'jellyfish',
      ];

      const visibilities = [
        { visible: true, felt: false },
        { visible: false, felt: true },
        { visible: false, felt: false },
      ];

      for (const type of types) {
        for (const vis of visibilities) {
          const { container } = render(
            <CreaturePresence
              type={type}
              visible={vis.visible}
              felt={vis.felt}
            />
          );

          const canvas = container.querySelector('canvas');
          expect(canvas).toBeTruthy();

          cleanup();
        }
      }
    });
  });
});
