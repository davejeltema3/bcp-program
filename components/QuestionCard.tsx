import { ReactNode } from 'react';

interface QuestionCardProps {
  question: string;
  subtext?: string;
  children: ReactNode;
}

export default function QuestionCard({
  question,
  subtext,
  children,
}: QuestionCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 md:p-12 shadow-xl transition-smooth">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          {question}
        </h2>
        {subtext && (
          <p className="text-slate-400 text-sm md:text-base mb-8">{subtext}</p>
        )}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
