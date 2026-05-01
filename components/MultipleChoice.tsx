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
  const handleKeyPress = (choiceValue: string) => {
    onChange(choiceValue);
    // Auto-advance after selection
    setTimeout(() => {
      onNext();
    }, 300);
  };

  return (
    <div className="space-y-3">
      {choices.map((choice, index) => {
        const isSelected = value === choice.value;

        return (
          <button
            key={choice.value}
            onClick={() => handleKeyPress(choice.value)}
            className={`w-full text-left p-4 md:p-5 rounded-lg border-2 transition-all duration-200 ${
              isSelected
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-[1.02]'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:bg-slate-750'
            }`}
          >
            <span className="text-base md:text-lg">{choice.text}</span>
          </button>
        );
      })}
    </div>
  );
}
