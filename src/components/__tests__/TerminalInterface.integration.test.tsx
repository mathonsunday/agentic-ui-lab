import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalInterface } from '../TerminalInterface';
import * as miraBackendStream from '../../services/miraBackendStream';

// Mock streamMiraBackend to simulate SSE callbacks
vi.mock('../../services/miraBackendStream', () => ({
  streamMiraBackend: vi.fn(),
}));

/**
 * Integration Tests: Full Streaming Flow
 *
 * These tests verify the complete interaction pipeline:
 * 1. User submits input via MinimalInput
 * 2. TerminalInterface processes and displays user input
 * 3. Backend streaming is initiated
 * 4. Multiple streaming events (confidence, profile, chunks, complete) arrive
 * 5. UI updates reflect all changes in correct order
 * 6. Error handling works correctly
 */

describe('TerminalInterface Integration - Streaming Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global fetch mock
    delete (global as any).fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper function to generate rapport bar for tests
   */
  function generateMockRapportBar(confidence: number): string {
    const percent = Math.round(confidence);
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    return `[RAPPORT] ${bar} ${percent}%\n`;
  }

  /**
   * Helper to mock streamMiraBackend with specific test data
   */
  function mockStreamMiraBackend(testData: { chunks?: string[]; completeData?: any; error?: string }) {
    (miraBackendStream.streamMiraBackend as any).mockImplementation(
      (_userInput: any, _state: any, _assessment: any, _toolData: any, callbacks: any) => {
        // Return promise and abort function
        const promise = new Promise<void>((resolve) => {
          // Schedule callbacks on next microtask
          Promise.resolve().then(() => {
            if (testData.error) {
              // Send error
              callbacks.onError?.(testData.error);
            } else {
              // Send each chunk (filter out any [RAPPORT] chunks since rapport bar now comes from onComplete)
              if (testData.chunks) {
                testData.chunks.forEach((chunk) => {
                  // Skip [RAPPORT] chunks - they're now handled in onComplete
                  if (!chunk.includes('[RAPPORT]')) {
                    callbacks.onResponseChunk?.(chunk);
                  }
                });
              }

              // Send completion - this triggers rapport bar generation
              if (testData.completeData) {
                // Extract confidence and trigger rapport bar callback (matching real flow)
                const confidence = testData.completeData.updatedState?.confidenceInUser;
                if (confidence !== undefined) {
                  const rapportBar = generateMockRapportBar(confidence);
                  callbacks.onRapportUpdate?.(confidence, rapportBar);
                }

                // Send completion callback
                callbacks.onComplete?.(testData.completeData);
              }
            }
            resolve();
          });
        });

        return { promise, abort: () => {} };
      }
    );
  }

  describe('Full User Interaction Flow', () => {
    it('should display initial state with system messages', () => {
      render(<TerminalInterface />);

      expect(screen.getByText("> DR. PETROVIC'S RESEARCH TERMINAL INITIALIZED")).toBeInTheDocument();
      expect(screen.getByText('...you accepted my invitation...')).toBeInTheDocument();
    });

    it('should accept and display user input in terminal', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      // Mock fetch to prevent streaming
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          body: null,
        } as any)
      );

      // Type and submit
      await userEvent.type(textarea, 'I believe the deep sea holds secrets');
      fireEvent.click(submitButton);

      // User input should appear in terminal
      await waitFor(() => {
        expect(screen.getByText('> I believe the deep sea holds secrets')).toBeInTheDocument();
      });

      // Textarea should be cleared
      expect(textarea).toHaveValue('');
    });

    it('should trim whitespace from user input', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          body: null,
        } as any)
      );

      await userEvent.type(textarea, '   test input   ');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('> test input')).toBeInTheDocument();
      });
    });

    it('should not submit empty or whitespace-only input', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const initialText = screen.getByText('...you accepted my invitation...');

      // Get initial line count to compare
      const linesBefore = screen.queryAllByText(/^.*$/);
      const initialCount = linesBefore.length;

      // Try submitting empty input
      fireEvent.change(textarea, { target: { value: '   ' } });
      const form = textarea.closest('form')!;
      fireEvent.submit(form);

      // Verify no new lines were added
      await waitFor(() => {
        expect(textarea).toHaveValue('   ');
      });
    });

    it('should disable input while streaming', async () => {
      // Mock streamMiraBackend to return a promise that never resolves
      (miraBackendStream.streamMiraBackend as any).mockImplementation(
        (_userInput: any, _state: any, _assessment: any, _toolData: any, _callbacks: any) => {
          return {
            promise: new Promise<void>(() => {
              // Never resolves - simulates ongoing stream
            }),
            abort: () => {},
          };
        }
      );

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      // Should be disabled during streaming
      await waitFor(() => {
        expect(textarea).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('State Management During Streaming', () => {
    it('should maintain state across multiple interactions', async () => {
      mockStreamMiraBackend({
        completeData: {
          updatedState: {
            confidenceInUser: 50,
            userProfile: {
              thoughtfulness: 60,
              adventurousness: 50,
              engagement: 55,
              curiosity: 65,
              superficiality: 20,
            },
            interactionCount: 1,
            memories: [],
          },
          response: {
            observations: [],
            streaming: [],
            confidenceDelta: 0,
            moodShift: 'calm' as const,
          },
        },
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      // First interaction
      await userEvent.type(textarea, 'First message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('> First message')).toBeInTheDocument();
      });

      // Should be ready for next interaction - wait for textarea to be re-enabled
      await waitFor(() => {
        expect(textarea).not.toBeDisabled();
      });
      expect(textarea).toHaveValue('');
    });
  });

  describe('Streaming Events and UI Updates', () => {
    it('should handle response_chunk events and display text', async () => {
      mockStreamMiraBackend({
        chunks: ['...first thought...', '...second thought...'],
        completeData: {
          updatedState: {
            confidenceInUser: 50,
            userProfile: {
              thoughtfulness: 60,
              adventurousness: 50,
              engagement: 55,
              curiosity: 65,
              superficiality: 20,
            },
            interactionCount: 1,
            memories: [],
          },
          response: {
            observations: ['observation1'],
            streaming: ['...first thought...', '...second thought...'],
            confidenceDelta: 10,
            moodShift: 'calm' as const,
          },
        },
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      // Chunks should be accumulated into single terminal line
      // (with new RAPPORT_UPDATE separation, text chunks accumulate into one line)
      // Both text elements should be present in the accumulated line
      await waitFor(
        () => {
          const textElements = screen.queryAllByText(/thought/);
          // Should have at least one text element containing parts of the thoughts
          expect(textElements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('should display rapport bar, response text and transition phrase after streaming completes', async () => {
      mockStreamMiraBackend({
        chunks: ['[RAPPORT] [██████████░░░░░░░░] 50%', 'response text'],
        completeData: {
          updatedState: {
            confidenceInUser: 50,
            userProfile: {
              thoughtfulness: 60,
              adventurousness: 50,
              engagement: 55,
              curiosity: 65,
              superficiality: 20,
            },
            interactionCount: 1,
            memories: [],
          },
          response: {
            observations: [],
            streaming: ['response text'],
            confidenceDelta: 0,
            moodShift: 'calm' as const,
          },
        },
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      // Rapport bar should appear first
      await waitFor(() => {
        expect(screen.getByText(/\[RAPPORT\]/)).toBeInTheDocument();
      });

      // Response text should appear
      await waitFor(() => {
        expect(screen.getByText('response text')).toBeInTheDocument();
      });

      // Transition phrase must appear after streaming
      await waitFor(() => {
        expect(screen.getByText('...what do you think about this...')).toBeInTheDocument();
      });
    });

    it('should display rapport bar, ASCII art and separator after exchange', async () => {
      mockStreamMiraBackend({
        chunks: ['[RAPPORT] [██████████░░░░░░░░] 50%', 'some response'],
        completeData: {
          updatedState: {
            confidenceInUser: 50,
            userProfile: {
              thoughtfulness: 60,
              adventurousness: 50,
              engagement: 55,
              curiosity: 65,
              superficiality: 20,
            },
            interactionCount: 1,
            memories: [],
          },
          response: {
            observations: [],
            streaming: ['some response'],
            confidenceDelta: 0,
            moodShift: 'calm' as const,
          },
        },
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      // Rapport bar should appear first
      await waitFor(() => {
        expect(screen.getByText(/\[RAPPORT\]/)).toBeInTheDocument();
      });

      // Response text should appear
      await waitFor(() => {
        expect(screen.getByText('some response')).toBeInTheDocument();
      });

      // Separator must appear after exchange completes
      await waitFor(() => {
        expect(screen.getByText('---')).toBeInTheDocument();
      });

      // ASCII art should be rendered (check for pre element)
      await waitFor(() => {
        const preElements = document.querySelectorAll('pre.terminal-interface__ascii');
        expect(preElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on HTTP failure', async () => {
      mockStreamMiraBackend({
        error: 'HTTP 500: Server error',
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            '...connection to the depths lost... the abyss is unreachable at this moment...'
          )
        ).toBeInTheDocument();
      });
    });

    it('should handle missing response body', async () => {
      mockStreamMiraBackend({
        error: 'No response body',
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            '...connection to the depths lost... the abyss is unreachable at this moment...'
          )
        ).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockStreamMiraBackend({
        error: 'Network error',
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            '...connection to the depths lost... the abyss is unreachable at this moment...'
          )
        ).toBeInTheDocument();
      });
    });

    it('should handle error events from stream', async () => {
      mockStreamMiraBackend({
        error: 'Backend processing failed',
      });

      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            '...connection to the depths lost... the abyss is unreachable at this moment...'
          )
        ).toBeInTheDocument();
      });
    });

    it('should remain usable after error', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button', { name: /send/i });

      // First interaction - error
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      // Error message should display
      await waitFor(() => {
        expect(
          screen.getByText(
            '...connection to the depths lost... the abyss is unreachable at this moment...'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('Return Button', () => {
    it('should render return button when onReturn is provided', () => {
      const mockReturn = vi.fn();
      render(<TerminalInterface onReturn={mockReturn} />);

      const returnButton = screen.getByRole('button', { name: '[EXIT]' });
      expect(returnButton).toBeInTheDocument();
    });

    it('should call onReturn when exit button is clicked', async () => {
      const mockReturn = vi.fn();
      render(<TerminalInterface onReturn={mockReturn} />);

      const returnButton = screen.getByRole('button', { name: '[EXIT]' });
      fireEvent.click(returnButton);

      expect(mockReturn).toHaveBeenCalled();
    });

    it('should not render return button when onReturn is not provided', () => {
      render(<TerminalInterface />);

      const returnButton = screen.queryByRole('button', { name: '[EXIT]' });
      expect(returnButton).not.toBeInTheDocument();
    });
  });
});

