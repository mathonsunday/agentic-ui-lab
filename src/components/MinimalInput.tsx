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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form className="minimal-input" onSubmit={handleSubmit}>
      <span className="minimal-input__prompt">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="minimal-input__field"
        autoComplete="off"
        spellCheck={false}
      />
      {disabled && <span className="minimal-input__thinking">...</span>}
    </form>
  );
}
