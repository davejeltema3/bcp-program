'use client';

import { useState, useEffect } from 'react';
import { questions, type QuestionnaireData } from '@/lib/questionnaire';
import ProgressBar from '@/components/ProgressBar';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';
import MultipleChoice from '@/components/MultipleChoice';
import AnalyticsAccessGuide from '@/components/AnalyticsAccessGuide';

/**
 * Standalone questionnaire page.
 * Used when a member comes back from the email reminder link.
 * Expects ?email= query param to identify who's submitting.
 *
 * Preview-only query params (used by /preview admin tab):
 *   ?q=N           — start at question index N (0-based)
 *   ?show=all      — render every question stacked, read-only preview mode
 */

const PRIMARY_BTN = {
  background: 'linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500))',
  color: '#fff',
  fontWeight: 600,
  padding: '14px 28px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px -8px var(--bc-blue-glow), 0 1px 0 rgba(255,255,255,0.18) inset',
  cursor: 'pointer',
  fontSize: 16,
  transition: 'background 120ms ease, transform 120ms ease',
} as const;

const GHOST_BTN = {
  background: 'transparent',
  color: 'var(--bc-text-300)',
  fontWeight: 500,
  padding: '12px 24px',
  borderRadius: '12px',
  border: '1px solid var(--bc-ink-500)',
  cursor: 'pointer',
  fontSize: 15,
  transition: 'all 120ms ease',
} as const;

const BrandStrip = () => (
  <div style={{
    textAlign: 'center',
    paddingTop: 24,
    fontFamily: 'var(--font-urbanist), Urbanist, sans-serif',
    fontSize: 18, fontWeight: 700,
    color: 'var(--bc-blue-300)', letterSpacing: '-0.01em',
  }}>
    Boundless Creator
  </div>
);

const HeroGlow = () => (
  <div style={{
    position: 'absolute',
    top: -160, left: '50%',
    width: 900, height: 480,
    transform: 'translateX(-50%)',
    background: `radial-gradient(
      ellipse at center,
      rgba(58,133,255,0.18) 0%,
      rgba(58,133,255,0.08) 40%,
      rgba(58,133,255,0) 100%
    )`,
    pointerEvents: 'none',
    filter: 'blur(40px)',
    zIndex: 0,
  }} />
);

const Eyebrow = ({ index, total }: { index: number; total: number }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12, color: 'var(--bc-blue-300)',
    letterSpacing: '0.16em', textTransform: 'uppercase',
    marginBottom: 16,
  }}>
    <span style={{ width: 24, height: 1, background: 'currentColor', opacity: 0.55 }} />
    Question {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}
  </div>
);

export default function QuestionnairePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [channelUrlError, setChannelUrlError] = useState<string>();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setName(params.get('name') || '');

    // Preview-only modes for the /preview admin tab
    if (params.get('show') === 'all') {
      setShowAll(true);
      return;
    }
    const qParam = params.get('q');
    if (qParam !== null) {
      const n = parseInt(qParam, 10);
      if (!isNaN(n) && n >= 0 && n < questions.length) {
        setCurrentIndex(n);
      }
    }
  }, []);

  const validateChannelUrl = (url: string): boolean => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    return trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.startsWith('@') || trimmed.includes('youtube');
  };

  const handleNext = () => {
    const question = questions[currentIndex];
    const answer = answers[question.id];
    if (question.id === 'channel_url' && answer) {
      if (!validateChannelUrl(answer)) {
        setChannelUrlError('Please enter a valid YouTube channel URL');
        return;
      }
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setChannelUrlError(undefined);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setChannelUrlError(undefined);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, email, name }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (showAll) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const question = questions[currentIndex];
        if (question.type === 'text' || question.type === 'url') {
          const answer = answers[question.id];
          if (answer) handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, answers, showAll]);

  // ── Submitted state ──
  if (submitted) {
    return (
      <div className="bc-bg-grid min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="rounded-2xl p-8" style={{
            background: 'var(--bc-ink-800)',
            border: '1px solid var(--bc-ink-600)',
            boxShadow: '0 12px 40px -12px rgba(0,0,0,0.5)',
          }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{
              background: 'rgba(47,203,134,0.16)',
              boxShadow: '0 0 32px var(--bc-green-glow)',
            }}>
              <svg className="w-8 h-8" style={{ color: 'var(--bc-green-400)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--bc-text-100)' }}>Questionnaire submitted</h2>
            <p className="mb-4" style={{ color: 'var(--bc-text-200)' }}>
              I will use your answers to write your personal channel review.
            </p>
            <p className="text-sm" style={{ color: 'var(--bc-text-400)' }}>
              Check your email for the community invite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Show all mode (preview) ──
  if (showAll) {
    return (
      <div className="bc-bg-grid min-h-screen pb-12">
        <BrandStrip />
        <div className="text-center pt-4 pb-8">
          <span style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 9999,
            background: 'rgba(245,184,107,0.12)', border: '1px solid rgba(245,184,107,0.3)',
            color: '#f5b86b', fontSize: 12, fontFamily: 'monospace',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Preview · All questions
          </span>
        </div>
        <div className="space-y-8 px-4 pt-4">
          {questions.map((q, i) => (
            <div key={q.id} className="w-full max-w-2xl mx-auto">
              <Eyebrow index={i} total={questions.length} />
              <QuestionCard
                question={q.question}
                subtext={q.subtext === 'ANALYTICS_ACCESS_STRUCTURED' ? undefined : q.subtext}
              >
                {q.subtext === 'ANALYTICS_ACCESS_STRUCTURED' && <AnalyticsAccessGuide />}
                {q.type === 'multiple-choice' && q.choices && (
                  <div className="space-y-3 opacity-60 pointer-events-none">
                    {q.choices.map((c) => (
                      <div key={c.value} style={{
                        padding: '14px 18px', borderRadius: 12,
                        background: 'var(--bc-ink-700)',
                        border: '1px solid var(--bc-ink-600)',
                        color: 'var(--bc-text-200)',
                      }}>{c.text}</div>
                    ))}
                  </div>
                )}
                {(q.type === 'text' || q.type === 'url') && (
                  <input
                    disabled
                    placeholder={q.placeholder}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12,
                      background: 'var(--bc-ink-900)', border: '1px solid var(--bc-ink-600)',
                      color: 'var(--bc-text-300)', fontSize: 16, opacity: 0.6,
                    }}
                  />
                )}
                {q.type === 'textarea' && (
                  <textarea
                    disabled rows={4}
                    placeholder={q.placeholder}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12,
                      background: 'var(--bc-ink-900)', border: '1px solid var(--bc-ink-600)',
                      color: 'var(--bc-text-300)', fontSize: 16, opacity: 0.6, resize: 'none',
                    }}
                  />
                )}
              </QuestionCard>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Normal flow (one question at a time) ──
  const question = questions[currentIndex];
  const currentAnswer = answers[question.id];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="bc-bg-grid">
      <BrandStrip />
      <ProgressBar current={currentIndex + 1} total={questions.length + 1} />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative">
        <HeroGlow />
        <div className="w-full max-w-3xl relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-4">
            <Eyebrow index={currentIndex} total={questions.length} />
          </div>
          <QuestionCard
            question={question.question}
            subtext={question.subtext === 'ANALYTICS_ACCESS_STRUCTURED' ? undefined : question.subtext}
          >
            {question.subtext === 'ANALYTICS_ACCESS_STRUCTURED' && <AnalyticsAccessGuide />}
            {question.type === 'multiple-choice' && question.choices && (
              <>
                <MultipleChoice
                  choices={question.choices}
                  value={currentAnswer}
                  onChange={(value) => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                  onNext={handleNext}
                />
                {currentIndex > 0 && (
                  <button onClick={handleBack} className="mt-6" style={{ ...GHOST_BTN, padding: '10px 20px' }}>
                    ← Back
                  </button>
                )}
              </>
            )}

            {(question.type === 'text' || question.type === 'url') && (
              <>
                <TextInput
                  value={currentAnswer}
                  onChange={(value) => {
                    setAnswers(prev => ({ ...prev, [question.id]: value }));
                    if (question.id === 'channel_url') setChannelUrlError(undefined);
                  }}
                  placeholder={question.placeholder}
                  type={question.type === 'url' ? 'url' : 'text'}
                  required={question.required}
                  error={question.id === 'channel_url' ? channelUrlError : undefined}
                />
                <div className="flex gap-4 mt-6">
                  {currentIndex > 0 && (
                    <button onClick={handleBack} style={GHOST_BTN}>← Back</button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={question.required && !currentAnswer}
                    className="flex-1"
                    style={{
                      ...PRIMARY_BTN,
                      opacity: question.required && !currentAnswer ? 0.5 : 1,
                      cursor: question.required && !currentAnswer ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLastQuestion ? (submitting ? 'Submitting...' : 'Submit →') : 'Continue →'}
                  </button>
                </div>
              </>
            )}

            {question.type === 'textarea' && (
              <>
                <TextInput
                  value={currentAnswer}
                  onChange={(value) => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                  placeholder={question.placeholder}
                  multiline={true}
                  required={question.required}
                />
                <div className="flex gap-4 mt-6">
                  {currentIndex > 0 && (
                    <button onClick={handleBack} style={GHOST_BTN}>← Back</button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={question.required && !currentAnswer}
                    className="flex-1"
                    style={{
                      ...PRIMARY_BTN,
                      opacity: question.required && !currentAnswer ? 0.5 : 1,
                      cursor: question.required && !currentAnswer ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLastQuestion ? (submitting ? 'Submitting...' : 'Submit →') : 'Continue →'}
                  </button>
                </div>
              </>
            )}
          </QuestionCard>
        </div>

        <div className="mt-8 text-center text-xs" style={{ color: 'var(--bc-text-500)', position: 'relative', zIndex: 1 }}>
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>
    </div>
  );
}
