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

  const baseClasses =
    `w-full bg-slate-800 border-2 rounded-lg px-4 py-3 md:py-4 text-white text-base md:text-lg placeholder-slate-500 focus:outline-none transition-all ${
      error
        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
        : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
    }`;

  if (multiline) {
    return (
      <div>
        <textarea
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          rows={5}
          className={`${baseClasses} resize-none`}
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <input
        type={type}
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={baseClasses}
      />
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
