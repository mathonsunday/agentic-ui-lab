import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinimalInput } from '../MinimalInput';

describe('MinimalInput Component', () => {
  describe('Rendering', () => {
    it('should render textarea and button', () => {
      const handleSubmit = vi.fn();
      render(<MinimalInput onSubmit={handleSubmit} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with correct placeholder', () => {
      const { rerender } = render(<MinimalInput onSubmit={vi.fn()} />);
      expect(screen.getByPlaceholderText('Speak to Dr. Petrovic...')).toBeInTheDocument();

      rerender(<MinimalInput onSubmit={vi.fn()} placeholder="Custom" />);
      expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();
    });

    it('should display correct button text based on disabled state', () => {
      const { rerender } = render(<MinimalInput onSubmit={vi.fn()} />);
      expect(screen.getByRole('button')).toHaveTextContent('SEND');

      rerender(<MinimalInput onSubmit={vi.fn()} disabled={true} />);
      expect(screen.getByRole('button')).toHaveTextContent('...');
    });
  });

  describe('Input State Management', () => {
    it('should update input value as user types', async () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Hello world');

      expect(textarea.value).toBe('Hello world');
    });
  });

  describe('Submit Behavior', () => {
    it('should trim, submit, and clear on form submit', async () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      const form = textarea.closest('form')!;

      await userEvent.type(textarea, '  test  ');
      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalledWith('test');
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(textarea.value).toBe('');
    });

    it('should not submit empty or whitespace-only text', () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const form = getByRole('textbox').closest('form')!;
      fireEvent.submit(form);
      expect(handleSubmit).not.toHaveBeenCalled();

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.submit(form);
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should submit on Enter key and clear input', async () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'test');
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

      expect(handleSubmit).toHaveBeenCalledWith('test');
      expect(textarea.value).toBe('');
    });

    it('should not submit on Shift+Enter', async () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'test');
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true });

      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should not submit on Enter when empty', () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should not submit on Enter when disabled', async () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} disabled={true} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'test');
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} disabled={true} />);

      expect(getByRole('textbox')).toBeDisabled();
      expect(getByRole('button')).toBeDisabled();
    });

    it('should enable button when input has text and disable when cleared', async () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} />);

      const textarea = getByRole('textbox') as HTMLTextAreaElement;
      const button = getByRole('button') as HTMLButtonElement;

      expect(button).toBeDisabled();
      await userEvent.type(textarea, 'test');
      expect(button).not.toBeDisabled();

      await userEvent.clear(textarea);
      expect(button).toBeDisabled();
    });

    it('should not call onSubmit when disabled and form submitted', () => {
      const handleSubmit = vi.fn();
      const { getByRole } = render(<MinimalInput onSubmit={handleSubmit} disabled={true} />);

      fireEvent.submit(getByRole('textbox').closest('form')!);
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

});

