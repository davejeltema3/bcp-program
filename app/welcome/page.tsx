'use client';

import { useState, useEffect } from 'react';
import { questions, type QuestionnaireData } from '@/lib/questionnaire';
import ProgressBar from '@/components/ProgressBar';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';
import MultipleChoice from '@/components/MultipleChoice';
import AnalyticsAccessGuide from '@/components/AnalyticsAccessGuide';

interface WelcomeData {
  success: boolean;
  customerName?: string;
  customerEmail?: string;
  error?: string;
}

type Screen = 'loading' | 'error' | 'welcome' | 'questionnaire' | 'done';

const PRIMARY_BTN = {
  background: 'linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500))',
  color: '#fff',
  fontWeight: 600,
  padding: '14px 28px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px -8px var(--bc-blue-glow), 0 1px 0 rgba(255,255,255,0.18) inset',
  cursor: 'pointer',
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

export default function WelcomePage() {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [submitting, setSubmitting] = useState(false);
  const [channelUrlError, setChannelUrlError] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const testMode = params.get('test') === 'true';

    if (!sessionId && !testMode) {
      setData({ success: false, error: 'No session found' });
      setScreen('error');
      return;
    }

    const apiUrl = testMode ? '/api/welcome?test=true' : `/api/welcome?session_id=${sessionId}`;
    fetch(apiUrl)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setScreen(result.success ? 'welcome' : 'error');
      })
      .catch(() => {
        setData({ success: false, error: 'Failed to verify payment' });
        setScreen('error');
      });
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
        body: JSON.stringify({ answers, email: data?.customerEmail, name: data?.customerName }),
      });
    } catch (err) {
      console.error('Questionnaire submission error:', err);
    } finally {
      setSubmitting(false);
      setScreen('done');
    }
  };

  useEffect(() => {
    if (screen !== 'questionnaire') return;
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
  }, [screen, currentIndex, answers]);

  const firstName = data?.customerName?.split(' ')[0];

  // ── Loading ──
  if (screen === 'loading') {
    return (
      <div className="bc-bg-grid flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4" style={{ color: 'var(--bc-blue-400)' }} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p style={{ color: 'var(--bc-text-300)' }}>Confirming your payment...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (screen === 'error') {
    return (
      <div className="bc-bg-grid flex items-center justify-center min-h-screen px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="rounded-2xl p-8" style={{
            background: 'var(--bc-ink-800)',
            border: '1px solid var(--bc-ink-600)',
            boxShadow: '0 12px 40px -12px rgba(0,0,0,0.5)',
          }}>
            <h1 className="text-2xl font-semibold mb-4" style={{ color: 'var(--bc-text-100)' }}>Something went wrong</h1>
            <p style={{ color: 'var(--bc-text-300)' }} className="mb-6">
              We could not verify your payment. Do not worry — if you were charged, your payment is safe.
            </p>
            <p style={{ color: 'var(--bc-text-300)' }}>
              Please reach out to{' '}
              <a href="mailto:hello@boundlesscreator.com" style={{ color: 'var(--bc-blue-300)', textDecoration: 'underline' }}>
                hello@boundlesscreator.com
              </a>{' '}
              and I will get you sorted right away.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Welcome (post-payment confirmation) ──
  if (screen === 'welcome') {
    return (
      <div className="bc-bg-grid min-h-screen pb-12 px-4">
        <BrandStrip />
        <div className="max-w-2xl mx-auto pt-8">
          <div className="rounded-2xl p-8 md:p-12 mb-8" style={{
            background: 'var(--bc-ink-800)',
            border: '1px solid var(--bc-ink-600)',
            boxShadow: '0 12px 40px -12px rgba(0,0,0,0.5)',
          }}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{
                background: 'rgba(47,203,134,0.16)',
                boxShadow: '0 0 32px var(--bc-green-glow)',
              }}>
                <svg className="w-10 h-10" style={{ color: 'var(--bc-green-400)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-4" style={{
                color: 'var(--bc-text-100)',
                letterSpacing: '-0.02em',
              }}>
                Welcome{firstName ? `, ${firstName}` : ''}.
              </h1>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--bc-text-200)' }}>
                Your payment is confirmed. You are a <strong style={{ color: 'var(--bc-green-400)', fontWeight: 600 }}>founder</strong> of the Boundless Creator Program.
              </p>
            </div>

            <div className="rounded-xl p-6 mb-6 text-left" style={{
              background: 'var(--bc-ink-900)',
              border: '1px solid var(--bc-ink-700)',
            }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--bc-text-100)' }}>What happens next</h2>
              <ol className="space-y-4">
                {[
                  {
                    title: 'Fill out the quick questionnaire',
                    body: 'About 5 minutes. This is how I write your personal channel review.',
                  },
                  {
                    title: 'Check your email',
                    body: 'You will receive a welcome email with your community invite and everything you need to get started.',
                  },
                  {
                    title: 'Your channel review',
                    body: 'I will drop it in your community thread when it is ready.',
                  },
                  {
                    title: 'First live session: Wednesday at 2 PM EST',
                    body: 'Recurring every Wednesday. Recorded if you cannot make it.',
                  },
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{
                      background: 'var(--bc-blue-500)', color: '#fff',
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--bc-text-100)' }}>{step.title}</div>
                      <div className="text-sm mt-0.5" style={{ color: 'var(--bc-text-400)' }}>{step.body}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setScreen('questionnaire')}
              style={{ ...PRIMARY_BTN, fontSize: 17, padding: '16px 32px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500))'; }}
            >
              Start questionnaire →
            </button>
            <p className="text-xs mt-4" style={{ color: 'var(--bc-text-500)' }}>
              Not ready right now? No problem. I will email you a link to fill this out later.
            </p>
          </div>

          <div className="mt-8 text-center text-xs" style={{ color: 'var(--bc-text-500)' }}>
            <p>A receipt has been sent to your email.</p>
            <p className="mt-1">
              Questions?{' '}
              <a href="mailto:hello@boundlesscreator.com" style={{ color: 'var(--bc-text-400)', textDecoration: 'underline' }}>
                hello@boundlesscreator.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (screen === 'done') {
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

  // ── Questionnaire (multi-page flow) — uses updated QuestionCard/TextInput/MultipleChoice ──
  const question = questions[currentIndex];
  const currentAnswer = answers[question.id];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="bc-bg-grid">
      <BrandStrip />
      <ProgressBar current={currentIndex + 1} total={questions.length + 1} />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-3xl">
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

        <div className="mt-8 text-center text-xs" style={{ color: 'var(--bc-text-500)' }}>
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>
    </div>
  );
}
