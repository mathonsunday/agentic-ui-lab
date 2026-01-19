import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import { TypewriterLine } from '../TypewriterLine';

/**
 * TypewriterLine Component Tests
 *
 * CRITICAL: These tests document the UI COMPROMISE in streaming animation.
 *
 * The TypewriterLine component animates text character-by-character at a consistent
 * typing speed. However, when used with asynchronous streaming content (chunks arriving
 * from backend), the implementation trades perfect smoothness for simplicity:
 *
 * DOCUMENTED BEHAVIOR:
 * - Static content: Smooth character-by-character animation (IDEAL)
 * - Streaming content: First chunk animates smoothly, subsequent chunks cause
 *   visible pauses/jumps in animation (ACCEPTABLE TRADE-OFF)
 *
 * WHY THIS HAPPENS:
 * The component includes 'content' in useEffect dependencies (line 74). When new
 * chunks arrive and content prop changes, the animation interval is destroyed and
 * recreated. This causes:
 * 1. Brief pause in animation while old interval cleans up
 * 2. New interval starts from current revealedLength (doesn't reset)
 * 3. Animation resumes and continues from where it left off
 * 4. Multiple content updates = multiple interval recreations = visible pauses
 *
 * ACCEPTABLE BECAUSE:
 * - Feature is secondary (Specimen 47 grant proposal is experimental)
 * - Simplicity prevents closure capture bugs (our previous problem)
 * - Users see character-by-character typing (just with pauses between chunks)
 * - Alternative solutions require complex ref-based tracking or delay user feedback
 *
 * TESTS BELOW:
 * 1. Static animation tests (verify smooth character-by-character works)
 * 2. Streaming animation tests (verify paused/burst behavior with the compromise)
 * 3. Edge case tests (content shrinking, very long content, etc.)
 * 4. Prop change tests (verify animation restarts correctly on content updates)
 */

describe('TypewriterLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // BASIC RENDERING TESTS
  // ============================================================================

  it('should render initially empty', () => {
    const { container } = render(
      <TypewriterLine content="Hello" speed={40} isAnimating={true} />
    );

    // Initially reveals nothing (revealedLength starts at 0)
    expect(container.textContent).toBe('');
  });

  it('should accept all required props without error', () => {
    const { container } = render(
      <TypewriterLine
        content="Test content"
        speed={40}
        isAnimating={true}
      />
    );

    expect(container).toBeTruthy();
  });

  it('should render empty content without errors', () => {
    const { container } = render(
      <TypewriterLine content="" speed={40} isAnimating={true} />
    );

    expect(container.textContent).toBe('');
  });

  it('should render with different speed values', () => {
    const speeds = [10, 20, 40, 60, 100];

    speeds.forEach((speed) => {
      const { container } = render(
        <TypewriterLine content="Fast" speed={speed} isAnimating={true} />
      );

      expect(container).toBeTruthy();
    });
  });

  it('should have correct CSS class applied', () => {
    const { container } = render(
      <TypewriterLine content="Test" speed={40} isAnimating={true} />
    );

    const span = container.querySelector('span');
    expect(span).toBeTruthy();
    expect(span?.className).toBe('terminal-interface__text');
  });

  // ============================================================================
  // STATIC CONTENT ANIMATION TESTS (Ideal behavior - should be smooth)
  // ============================================================================

  describe('Static Content Animation (IDEAL: smooth character-by-character)', () => {
    it('should animate static content character-by-character at correct speed', () => {
      const { container, rerender } = render(
        <TypewriterLine content="Hello" speed={40} isAnimating={true} />
      );

      // At speed=40 chars/sec, each char takes 25ms
      // After 25ms, 1 char should be revealed
      vi.advanceTimersByTime(25);
      rerender(
        <TypewriterLine content="Hello" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('H');

      // After 50ms total, 2 chars
      vi.advanceTimersByTime(25);
      rerender(
        <TypewriterLine content="Hello" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('He');

      // After 75ms total, 3 chars
      vi.advanceTimersByTime(25);
      rerender(
        <TypewriterLine content="Hello" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('Hel');

      // After 100ms total, 4 chars
      vi.advanceTimersByTime(25);
      rerender(
        <TypewriterLine content="Hello" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('Hell');

      // After 125ms total, 5 chars (complete)
      vi.advanceTimersByTime(25);
      rerender(
        <TypewriterLine content="Hello" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('Hello');
    });

    it('should respect different animation speeds', () => {
      const { container: container40, rerender: rerender40 } = render(
        <TypewriterLine content="X" speed={40} isAnimating={true} />
      );

      const { container: container10, rerender: rerender10 } = render(
        <TypewriterLine content="X" speed={10} isAnimating={true} />
      );

      // At speed=40, char appears at 25ms
      vi.advanceTimersByTime(25);
      rerender40(<TypewriterLine content="X" speed={40} isAnimating={true} />);
      expect(container40.textContent).toBe('X');

      // At speed=10, char takes 100ms (1000/10)
      vi.advanceTimersByTime(75); // Total 100ms
      rerender10(<TypewriterLine content="X" speed={10} isAnimating={true} />);
      expect(container10.textContent).toBe('X');
    });


    it('should not reveal beyond content length', () => {
      const { container, rerender } = render(
        <TypewriterLine content="Hi" speed={40} isAnimating={true} />
      );

      // Advance far beyond content length
      vi.advanceTimersByTime(10000);
      rerender(
        <TypewriterLine content="Hi" speed={40} isAnimating={true} />
      );

      // Should still only show 2 characters
      expect(container.textContent).toBe('Hi');
    });
  });

  // ============================================================================
  // STREAMING CONTENT ANIMATION TESTS
  // (Validates smooth continuous animation with decoupled interval)
  // ============================================================================

  describe('Streaming Content Animation (CONTINUOUS: decoupled smooth typing)', () => {
    /**
     * This test suite validates smooth, continuous character-by-character animation
     * when content arrives asynchronously in chunks (like Specimen 47 grant proposal).
     *
     * The animation interval is decoupled from content updates:
     * 1. Single interval runs continuously while isAnimating=true
     * 2. Callback reads latest content.length on each tick
     * 3. No interval recreation, no visual pauses or jumps
     * 4. Smooth typing throughout streaming
     *
     * This follows the industry-standard pattern of "decoupling network streaming from
     * visual streaming" - buffer incoming chunks, animate from buffer at constant rate.
     */

    it('should animate first chunk smoothly without pause', () => {
      const { container, rerender } = render(
        <TypewriterLine
          content="First chunk"
          speed={40}
          isAnimating={true}
        />
      );

      // First 4 characters animate smoothly
      vi.advanceTimersByTime(100); // 4 chars at 25ms each
      rerender(
        <TypewriterLine content="First chunk" speed={40} isAnimating={true} />
      );

      expect(container.textContent).toBe('Firs');
    });

    it('should pause and restart animation when content grows (COMPROMISE)', () => {
      const { container, rerender } = render(
        <TypewriterLine content="First" speed={40} isAnimating={true} />
      );

      // Animate 3 characters
      vi.advanceTimersByTime(75); // 3 chars
      rerender(
        <TypewriterLine content="First" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('Fir');

      // NOW: New chunk arrives, content grows
      // Component re-renders with new content
      rerender(
        <TypewriterLine
          content="First chunk arrives"
          speed={40}
          isAnimating={true}
        />
      );

      // useEffect runs, interval is recreated because content changed
      // Animation resumes from revealedLength=3

      // Continue animating from where we left off
      vi.advanceTimersByTime(50); // 2 more chars
      rerender(
        <TypewriterLine
          content="First chunk arrives"
          speed={40}
          isAnimating={true}
        />
      );

      // Should now show 5 characters (pause/restart happened but animation continues)
      expect(container.textContent).toBe('First');
    });

    it('should handle rapid content growth without stopping animation', () => {
      /**
       * Simulates rapid backend chunks arriving faster than animation progresses.
       * This is typical for Specimen 47: backend sends ~77 chunks of ~77 chars each.
       *
       * Expected behavior: Animation continues but with visible pauses as interval
       * recreates on each chunk arrival.
       */
      const { container, rerender } = render(
        <TypewriterLine content="Chunk1" speed={40} isAnimating={true} />
      );

      // Animate first chunk partially (3 chars)
      vi.advanceTimersByTime(75);
      rerender(
        <TypewriterLine content="Chunk1" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('Chu');

      // Chunk 2 arrives before animation finishes first chunk
      rerender(
        <TypewriterLine
          content="Chunk1 and Chunk2"
          speed={40}
          isAnimating={true}
        />
      );

      // Continue animation
      vi.advanceTimersByTime(50);
      rerender(
        <TypewriterLine
          content="Chunk1 and Chunk2"
          speed={40}
          isAnimating={true}
        />
      );

      // Should continue from 3 chars, now at 5 chars
      expect(container.textContent).toBe('Chunk');

      // Chunk 3 arrives
      rerender(
        <TypewriterLine
          content="Chunk1 and Chunk2 plus Chunk3"
          speed={40}
          isAnimating={true}
        />
      );

      // Continue animating
      vi.advanceTimersByTime(100);
      rerender(
        <TypewriterLine
          content="Chunk1 and Chunk2 plus Chunk3"
          speed={40}
          isAnimating={true}
        />
      );

      // Should be further along but not necessarily smooth
      expect(container.textContent.length).toBeGreaterThan(5);
      expect(container.textContent.length).toBeLessThanOrEqual(
        'Chunk1 and Chunk2 plus Chunk3'.length
      );
    });

    it('should never exceed content length during streaming updates', () => {
      /**
       * CRITICAL INVARIANT: revealedLength must NEVER exceed content.length
       * This is the guard against animation bugs.
       */
      const { container, rerender } = render(
        <TypewriterLine content="Test" speed={40} isAnimating={true} />
      );

      // Animate all of "Test"
      vi.advanceTimersByTime(200);
      rerender(
        <TypewriterLine content="Test" speed={40} isAnimating={true} />
      );
      expect(container.textContent).toBe('Test');
      expect(container.textContent.length).toBeLessThanOrEqual(4);

      // Content changes multiple times
      rerender(
        <TypewriterLine content="Test expanded" speed={40} isAnimating={true} />
      );
      expect(container.textContent.length).toBeLessThanOrEqual(13);

      rerender(
        <TypewriterLine
          content="Test expanded more"
          speed={40}
          isAnimating={true}
        />
      );
      expect(container.textContent.length).toBeLessThanOrEqual(18);

      // Final content
      rerender(
        <TypewriterLine
          content="Test expanded more content"
          speed={40}
          isAnimating={true}
        />
      );
      expect(container.textContent.length).toBeLessThanOrEqual(
        'Test expanded more content'.length
      );
    });

    it('should handle content shrinking gracefully', () => {
      /**
       * Edge case: if content shrinks (e.g., line replacement), revealed length
       * should be clamped to new content length.
       */
      const { container, rerender } = render(
        <TypewriterLine content="LongContent" speed={40} isAnimating={true} />
      );

      // Animate several characters
      vi.advanceTimersByTime(100);
      rerender(
        <TypewriterLine content="LongContent" speed={40} isAnimating={true} />
      );

      const lengthBefore = container.textContent.length;

      // Content shrinks
      rerender(
        <TypewriterLine content="Short" speed={40} isAnimating={true} />
      );

      // revealedLength was clamped in first effect dependency [content]
      expect(container.textContent.length).toBeLessThanOrEqual(5);
    });

    it('should continue animating when new content arrives', () => {
      /**
       * Key behavior: With decoupled streaming, animation continues smoothly
       * when new content (chunks) arrive. The interval keeps running and
       * reads the latest content.length on each tick via the dependency array.
       *
       * This is the core fix: when content.length changes, the interval is recreated
       * with the new content.length, allowing smooth continuation of animation.
       */
      const { container, rerender } = render(
        <TypewriterLine content="Start" speed={40} isAnimating={true} />
      );

      // Animate a few characters
      act(() => {
        vi.advanceTimersByTime(75);
      });
      expect(container.textContent).toBe('Sta');

      // New chunk arrives - content grows, interval recreates with updated length
      act(() => {
        rerender(
          <TypewriterLine
            content="Start and more content here"
            speed={40}
            isAnimating={true}
          />
        );
      });

      // Animation continues smoothly into new content without pause/jump
      act(() => {
        vi.advanceTimersByTime(250); // Enough time to reveal more characters
      });

      // Should have revealed much more than just "Start"
      // At 40 chars/sec = 25ms per char:
      // - First 75ms revealed 3 chars (Sta)
      // - Next 250ms should reveal ~10 more chars
      // - Total: ~13 characters or more
      // If animation was paused or reset, it would only show "Sta..." or start over
      expect(container.textContent.length).toBeGreaterThanOrEqual(13);
    });
  });

  // ============================================================================
  // PROP CHANGE BEHAVIOR TESTS
  // ============================================================================

  describe('Prop Change Behavior', () => {
    it('should not animate when isAnimating is false', () => {
      const { container, rerender } = render(
        <TypewriterLine
          content="Hello"
          speed={40}
          isAnimating={false}
        />
      );

      // Advance time
      vi.advanceTimersByTime(500);
      rerender(
        <TypewriterLine
          content="Hello"
          speed={40}
          isAnimating={false}
        />
      );

      // Nothing should be revealed
      expect(container.textContent).toBe('');
    });

    it('should start animating when isAnimating changes from false to true', () => {
      const { container, rerender } = render(
        <TypewriterLine
          content="Start"
          speed={40}
          isAnimating={false}
        />
      );

      // Change to animating
      rerender(
        <TypewriterLine
          content="Start"
          speed={40}
          isAnimating={true}
        />
      );

      // Now animation should work
      vi.advanceTimersByTime(75);
      rerender(
        <TypewriterLine
          content="Start"
          speed={40}
          isAnimating={true}
        />
      );

      expect(container.textContent).toBe('Sta');
    });

    it('should stop animating when isAnimating changes from true to false', () => {
      const { container, rerender } = render(
        <TypewriterLine
          content="Hello"
          speed={40}
          isAnimating={true}
        />
      );

      // Animate 2 characters
      vi.advanceTimersByTime(50);
      rerender(
        <TypewriterLine
          content="Hello"
          speed={40}
          isAnimating={true}
        />
      );
      expect(container.textContent).toBe('He');

      // Stop animating
      rerender(
        <TypewriterLine
          content="Hello"
          speed={40}
          isAnimating={false}
        />
      );

      // Advance time - should not reveal more
      vi.advanceTimersByTime(500);
      rerender(
        <TypewriterLine
          content="Hello"
          speed={40}
          isAnimating={false}
        />
      );

      // Still only 2 characters
      expect(container.textContent).toBe('He');
    });

    it('should adjust animation speed when speed prop changes', () => {
      const { container, rerender } = render(
        <TypewriterLine
          content="Speed"
          speed={40}
          isAnimating={true}
        />
      );

      // Fast speed (40 chars/sec = 25ms per char)
      vi.advanceTimersByTime(75);
      rerender(
        <TypewriterLine
          content="Speed"
          speed={40}
          isAnimating={true}
        />
      );
      expect(container.textContent).toBe('Spe');

      // Change to very slow speed
      rerender(
        <TypewriterLine
          content="Speed"
          speed={10}
          isAnimating={true}
        />
      );

      // At slow speed (10 chars/sec = 100ms per char), should not advance
      vi.advanceTimersByTime(50);
      rerender(
        <TypewriterLine
          content="Speed"
          speed={10}
          isAnimating={true}
        />
      );

      // Still only 3 characters
      expect(container.textContent).toBe('Spe');
    });
  });

  // ============================================================================
  // VARIOUS CONTENT TYPES TESTS
  // ============================================================================

  describe('Content Type Handling', () => {
    it('should render with various content types', () => {
      const contents = [
        'Simple text',
        'Multi\nLine\nContent',
        'Special!@#$%Characters',
        'Numbers 12345',
        '    Leading spaces',
        'Trailing spaces    ',
      ];

      contents.forEach((content) => {
        const { container } = render(
          <TypewriterLine
            content={content}
            speed={40}
            isAnimating={true}
          />
        );

        expect(container).toBeTruthy();
      });
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const { container } = render(
        <TypewriterLine
          content={longContent}
          speed={40}
          isAnimating={true}
        />
      );

      expect(container).toBeTruthy();
    });

    it('should handle special characters and unicode', () => {
      const content = '🎬 Special: émoji, diacritics, 中文, العربية';
      const { container } = render(
        <TypewriterLine
          content={content}
          speed={40}
          isAnimating={true}
        />
      );

      expect(container).toBeTruthy();
    });

    it('should preserve whitespace in content', () => {
      const { container, rerender } = render(
        <TypewriterLine
          content="  spaces  "
          speed={40}
          isAnimating={true}
        />
      );

      vi.advanceTimersByTime(500);
      rerender(
        <TypewriterLine
          content="  spaces  "
          speed={40}
          isAnimating={true}
        />
      );

      // All content revealed, including spaces
      expect(container.textContent).toBe('  spaces  ');
    });
  });
});
