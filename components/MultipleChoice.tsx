import { Choice } from '@/lib/questionnaire';

interface MultipleChoiceProps {
  choices: Choice[];
  value: string | undefined;
  onChange: (value: string) => void;
  onNext: () => void;
}

export default function MultipleChoice({
  choices,
  value,
  onChange,
  onNext,
}: MultipleChoiceProps) {
  const handleSelect = (choiceValue: string) => {
    onChange(choiceValue);
    setTimeout(() => {
      onNext();
    }, 300);
  };

  return (
    <div className="space-y-3">
      {choices.map((choice) => {
        const isSelected = value === choice.value;
        return (
          <button
            key={choice.value}
            onClick={() => handleSelect(choice.value)}
            className="w-full text-left p-4 md:p-5 rounded-xl transition-all duration-200"
            style={{
              background: isSelected ? 'var(--bc-blue-500)' : 'var(--bc-ink-700)',
              border: `1px solid ${isSelected ? 'var(--bc-blue-400)' : 'var(--bc-ink-600)'}`,
              color: isSelected ? '#fff' : 'var(--bc-text-200)',
              boxShadow: isSelected
                ? '0 8px 32px -8px var(--bc-blue-glow), 0 1px 0 rgba(255,255,255,0.18) inset'
                : 'none',
              transform: isSelected ? 'scale(1.02)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--bc-blue-400)';
                e.currentTarget.style.background = 'var(--bc-ink-600)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--bc-ink-600)';
                e.currentTarget.style.background = 'var(--bc-ink-700)';
              }
            }}
          >
            <span className="text-base md:text-lg font-medium">{choice.text}</span>
          </button>
        );
      })}
    </div>
  );
}
