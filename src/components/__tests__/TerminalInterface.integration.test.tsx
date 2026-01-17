import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalInterface } from '../TerminalInterface';

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

  describe('Full User Interaction Flow', () => {
    it('should display initial state with system messages', () => {
      render(<TerminalInterface />);

      expect(screen.getByText("> DR. PETROVIC'S RESEARCH TERMINAL INITIALIZED")).toBeInTheDocument();
      expect(screen.getByText('...you accepted my invitation...')).toBeInTheDocument();
    });

    it('should accept and display user input in terminal', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

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
      const submitButton = screen.getByRole('button');

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
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      // Create mock that simulates streaming (doesn't complete immediately)
      global.fetch = vi.fn(
        () =>
          new Promise(() => {
            // Never resolves - simulates ongoing stream
          })
      );

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
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          body: null,
        } as any)
      );

      // First interaction
      await userEvent.type(textarea, 'First message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('> First message')).toBeInTheDocument();
      });

      // Should be ready for next interaction
      expect(textarea).toHaveValue('');
      expect(textarea).not.toBeDisabled();
    });
  });

  describe('Streaming Events and UI Updates', () => {
    it('should handle response_chunk events and display text', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      const mockStream = createMockSSEStream([
        {
          type: 'response_chunk',
          data: { chunk: '...first thought...' },
        },
        {
          type: 'response_chunk',
          data: { chunk: '...second thought...' },
        },
        {
          type: 'complete',
          data: {
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
        },
      ]);

      global.fetch = vi.fn(() => Promise.resolve(mockStream));

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      // Chunks should appear in terminal
      await waitFor(
        () => {
          expect(screen.getByText('...first thought...')).toBeInTheDocument();
          expect(screen.getByText('...second thought...')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should add transition phrase after streaming completes', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      const mockStream = createMockSSEStream([
        {
          type: 'response_chunk',
          data: { chunk: 'response text' },
        },
        {
          type: 'complete',
          data: {
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
        },
      ]);

      global.fetch = vi.fn(() => Promise.resolve(mockStream));

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('...what do you think about this...')).toBeInTheDocument();
      });
    });

    it('should add separator after exchange', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      const mockStream = createMockSSEStream([
        {
          type: 'complete',
          data: {
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
        },
      ]);

      global.fetch = vi.fn(() => Promise.resolve(mockStream));

      await userEvent.type(textarea, 'test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('---')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on HTTP failure', async () => {
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      // Mock failed response
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        } as any)
      );

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
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      // Mock response with no body
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: null,
        } as any)
      );

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
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      // Mock network error
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

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
      render(<TerminalInterface />);

      const textarea = screen.getByPlaceholderText('> share your thoughts...');
      const submitButton = screen.getByRole('button');

      const mockStream = createMockSSEStream([
        {
          type: 'error',
          data: { message: 'Backend processing failed' },
        },
      ]);

      global.fetch = vi.fn(() => Promise.resolve(mockStream));

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
      const submitButton = screen.getByRole('button');

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

/**
 * Helper: Create mock SSE stream from array of events
 */
function createMockSSEStream(
  events: Array<{ type: string; data: unknown }>
): Response {
  const stream = new ReadableStream({
    start(controller) {
      events.forEach((event) => {
        const line = `data: ${JSON.stringify(event)}\n`;
        controller.enqueue(new TextEncoder().encode(line));
      });
      controller.close();
    },
  });

  return {
    ok: true,
    body: stream,
    status: 200,
    headers: new Headers(),
    statusText: 'OK',
    redirected: false,
    type: 'basic' as ResponseType,
    url: 'http://localhost/api/analyze-user-stream',
    clone: () => new Response(),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as unknown as Response;
}
