import { ChangeEvent } from 'react';

interface TextInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'url' | 'email';
  multiline?: boolean;
  required?: boolean;
  error?: string;
}

export default function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  required = false,
  error,
}: TextInputProps) {
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange(e.target.value);
  };

  const baseStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    background: 'var(--bc-ink-900)',
    border: `1px solid ${error ? '#ff6b6b' : 'var(--bc-ink-600)'}`,
    color: 'var(--bc-text-100)',
    font: 'inherit',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 150ms',
  } as const;

  const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = error ? '#ff6b6b' : 'var(--bc-blue-400)';
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = error ? '#ff6b6b' : 'var(--bc-ink-600)';
  };

  if (multiline) {
    return (
      <div>
        <textarea
          value={value || ''}
          onChange={handleChange}
          onFocus={focusHandler}
          onBlur={blurHandler}
          placeholder={placeholder}
          required={required}
          rows={5}
          style={{ ...baseStyle, resize: 'none' }}
        />
        {error && <p className="text-sm mt-2" style={{ color: '#ff8a8a' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <input
        type={type}
        value={value || ''}
        onChange={handleChange}
        onFocus={focusHandler}
        onBlur={blurHandler}
        placeholder={placeholder}
        required={required}
        style={baseStyle}
      />
      {error && <p className="text-sm mt-2" style={{ color: '#ff8a8a' }}>{error}</p>}
    </div>
  );
}
