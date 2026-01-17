import { useState, useRef, useEffect } from 'react';
import './MinimalInput.css';

interface MinimalInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MinimalInput({
  onSubmit,
  disabled = false,
  placeholder = 'Speak to Dr. Petrovic...',
}: MinimalInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(value.trim());
        setValue('');
      }
    }
  };

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form className="minimal-input" onSubmit={handleSubmit}>
      <div className="minimal-input__prompt">&gt;</div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="minimal-input__field"
        spellCheck={false}
        rows={1}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="minimal-input__submit"
      >
        {disabled ? '...' : 'SEND'}
      </button>
    </form>
  );
}
