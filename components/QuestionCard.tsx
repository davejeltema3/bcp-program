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
      <div
        className="rounded-2xl p-8 md:p-12 transition-smooth"
        style={{
          background: 'var(--bc-ink-800)',
          border: '1px solid var(--bc-ink-600)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 40px -12px rgba(0,0,0,0.5)',
        }}
      >
        <h2
          className="text-2xl md:text-3xl font-semibold mb-4"
          style={{
            color: 'var(--bc-text-100)',
            letterSpacing: '-0.015em',
            lineHeight: '1.2',
          }}
        >
          {question}
        </h2>
        {subtext && (
          <p className="text-sm md:text-base mb-8" style={{ color: 'var(--bc-text-300)', lineHeight: '1.55' }}>
            {subtext}
          </p>
        )}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
