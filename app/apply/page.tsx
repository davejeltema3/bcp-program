'use client';

import { useState, useEffect } from 'react';
import { applicationQuestions as questions, type ApplicationData } from '@/lib/application';
import ProgressBar from '@/components/ProgressBar';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';
import MultipleChoice from '@/components/MultipleChoice';

/**
 * BCP/BCA application form. One application, both offers.
 * Flow: welcome -> questions -> contact -> thank-you.
 * UTM params captured silently on mount. Submits to /api/apply.
 * Styled on the BC design system (matches /questionnaire and the landing page).
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

const INPUT_STYLE = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  background: 'var(--bc-ink-900)',
  border: '1px solid var(--bc-ink-600)',
  color: 'var(--bc-text-100)',
  fontSize: 16,
  outline: 'none',
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
    background: 'radial-gradient(ellipse at center, rgba(58,133,255,0.18) 0%, rgba(58,133,255,0.08) 40%, rgba(58,133,255,0) 100%)',
    pointerEvents: 'none',
    filter: 'blur(40px)',
    zIndex: 0,
  }} />
);

const Eyebrow = ({ label }: { label: string }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12, color: 'var(--bc-blue-300)',
    letterSpacing: '0.16em', textTransform: 'uppercase',
    marginBottom: 16,
  }}>
    <span style={{ width: 24, height: 1, background: 'currentColor', opacity: 0.55 }} />
    {label}
  </div>
);

type Screen = 'welcome' | 'questions' | 'contact' | 'thank-you';

export default function ApplyPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<ApplicationData>({});
  const [submitting, setSubmitting] = useState(false);
  const [channelUrlError, setChannelUrlError] = useState<string>();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('show') === 'all') setShowAll(true);
    setData(prev => ({
      ...prev,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    }));
  }, []);

  const set = (id: string, value: string) => {
    setData(prev => ({ ...prev, [id]: value }));
    if (id === 'channel_url') setChannelUrlError(undefined);
  };

  const validateChannelUrl = (url: string) => {
    if (!url) return false;
    const t = url.trim().toLowerCase();
    return t.includes('youtube.com') || t.includes('youtu.be') || t.startsWith('@') || t.includes('youtube');
  };

  const handleNext = () => {
    const q = questions[index];
    const answer = data[q.id as keyof ApplicationData];
    if (q.id === 'channel_url' && answer && !validateChannelUrl(answer)) {
      setChannelUrlError('Please enter a valid YouTube channel URL');
      return;
    }
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      setScreen('contact');
    }
  };

  const handleBack = () => {
    if (screen === 'contact') {
      setScreen('questions');
      setIndex(questions.length - 1);
    } else if (index > 0) {
      setIndex(index - 1);
    }
  };

  useEffect(() => {
    if (screen !== 'questions') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const q = questions[index];
        if (q.type === 'text' || q.type === 'url') {
          if (data[q.id as keyof ApplicationData]) handleNext();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, index, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setScreen('thank-you');
    } catch (err) {
      console.error('Application submit error:', err);
      setScreen('thank-you');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Preview: every screen stacked, read-only (admin /preview) ──
  if (showAll) {
    const readonlyInput = (q: (typeof questions)[number]) => {
      if (q.type === 'multiple-choice' && q.choices) {
        return (
          <div className="space-y-3 opacity-60 pointer-events-none">
            {q.choices.map((c) => (
              <div key={c.value} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--bc-ink-700)', border: '1px solid var(--bc-ink-600)', color: 'var(--bc-text-200)' }}>{c.text}</div>
            ))}
          </div>
        );
      }
      if (q.type === 'textarea') {
        return <textarea disabled rows={3} placeholder={q.placeholder} style={{ ...INPUT_STYLE, color: 'var(--bc-text-400)', opacity: 0.6, resize: 'none' }} />;
      }
      return <input disabled placeholder={q.placeholder} style={{ ...INPUT_STYLE, color: 'var(--bc-text-400)', opacity: 0.6 }} />;
    };
    return (
      <div className="bc-bg-grid min-h-screen pb-12">
        <BrandStrip />
        <div className="text-center pt-4 pb-6">
          <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 9999, background: 'rgba(245,184,107,0.12)', border: '1px solid rgba(245,184,107,0.3)', color: '#f5b86b', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Preview · Full application
          </span>
        </div>
        <div className="space-y-6 px-4 pt-2 w-full max-w-2xl mx-auto">
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bc-ink-800)', border: '1px solid var(--bc-ink-600)' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Eyebrow label="Welcome screen" /></div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--bc-text-100)', marginBottom: 8 }}>Apply to work with me</h2>
            <p style={{ color: 'var(--bc-text-300)', fontSize: 15 }}>A few quick questions about your channel and what you want. I read every application myself and reach out personally.</p>
          </div>
          {questions.map((q, i) => (
            <div key={q.id}>
              <Eyebrow label={`Question ${String(i + 1).padStart(2, '0')} of ${String(questions.length).padStart(2, '0')}${q.required ? '' : ' · optional'}`} />
              <QuestionCard question={q.question} subtext={q.subtext}>
                {readonlyInput(q)}
              </QuestionCard>
            </div>
          ))}
          <div>
            <Eyebrow label="Last step · contact" />
            <QuestionCard question="Where can I reach you?" subtext="So I can follow up about your channel personally.">
              <div className="space-y-3 opacity-60 pointer-events-none">
                <input disabled placeholder="First name" style={{ ...INPUT_STYLE, opacity: 0.6 }} />
                <input disabled placeholder="Email address" style={{ ...INPUT_STYLE, opacity: 0.6 }} />
                <input disabled placeholder="Phone / WhatsApp (optional)" style={{ ...INPUT_STYLE, opacity: 0.6 }} />
              </div>
            </QuestionCard>
          </div>
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bc-ink-800)', border: '1px solid var(--bc-ink-600)' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Eyebrow label="Thank-you screen" /></div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--bc-text-100)', marginBottom: 8 }}>Application received</h2>
            <p style={{ color: 'var(--bc-text-200)', fontSize: 15 }}>I read every one of these myself. You&apos;ll hear from me directly within a few days, usually by email.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Welcome ──
  if (screen === 'welcome') {
    return (
      <div className="bc-bg-grid min-h-screen flex flex-col">
        <BrandStrip />
        <div className="flex-1 flex items-center justify-center px-4 relative">
          <HeroGlow />
          <div className="w-full max-w-2xl text-center relative" style={{ zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Eyebrow label="Application" /></div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 600, color: 'var(--bc-text-100)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
              Apply to work with me
            </h1>
            <p style={{ color: 'var(--bc-text-300)', fontSize: 17, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 28px' }}>
              A few quick questions about your channel and what you want. I read every application myself and reach out personally. It takes about three minutes.
            </p>
            <button onClick={() => setScreen('questions')} style={{ ...PRIMARY_BTN, padding: '16px 36px', fontSize: 17 }}>
              Start application →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Thank you ──
  if (screen === 'thank-you') {
    return (
      <div className="bc-bg-grid min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="rounded-2xl p-8" style={{ background: 'var(--bc-ink-800)', border: '1px solid var(--bc-ink-600)', boxShadow: '0 12px 40px -12px rgba(0,0,0,0.5)' }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(47,203,134,0.16)', boxShadow: '0 0 32px var(--bc-green-glow)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--bc-green-400)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--bc-text-100)' }}>Application received</h2>
            <p className="mb-4" style={{ color: 'var(--bc-text-200)' }}>
              I read every one of these myself. You&apos;ll hear from me directly within a few days, usually by email. Keep an eye out for a message from Dave.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Contact ──
  if (screen === 'contact') {
    const canSubmit = !submitting && data.first_name && data.email;
    return (
      <div className="bc-bg-grid">
        <BrandStrip />
        <ProgressBar current={questions.length + 1} total={questions.length + 1} />
        <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative">
          <HeroGlow />
          <div className="w-full max-w-2xl relative" style={{ zIndex: 1 }}>
            <div className="text-center mb-4"><div style={{ display: 'flex', justifyContent: 'center' }}><Eyebrow label="Last step" /></div></div>
            <QuestionCard question="Where can I reach you?" subtext="So I can follow up about your channel personally.">
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input style={INPUT_STYLE} placeholder="First name" value={data.first_name || ''} onChange={(e) => set('first_name', e.target.value)} required />
                  <input style={INPUT_STYLE} type="email" placeholder="Email address" value={data.email || ''} onChange={(e) => set('email', e.target.value)} required />
                  <div>
                    <input style={INPUT_STYLE} type="tel" placeholder="Phone / WhatsApp (optional)" value={data.phone || ''} onChange={(e) => set('phone', e.target.value)} />
                    <p style={{ color: 'var(--bc-text-500)', fontSize: 13, marginTop: 6 }}>Only if you&apos;d rather I reach out there instead of email.</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={handleBack} style={GHOST_BTN}>← Back</button>
                  <button type="submit" disabled={!canSubmit} className="flex-1" style={{ ...PRIMARY_BTN, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                    {submitting ? 'Submitting...' : 'Submit application →'}
                  </button>
                </div>
              </form>
            </QuestionCard>
          </div>
          <div className="mt-8 text-center text-xs" style={{ color: 'var(--bc-text-500)', position: 'relative', zIndex: 1 }}>
            Your info stays private. No spam, no selling your data.
          </div>
        </div>
      </div>
    );
  }

  // ── Questions ──
  const q = questions[index];
  const answer = data[q.id as keyof ApplicationData];
  const isLast = index === questions.length - 1;
  const continueLabel = isLast ? 'Continue →' : 'Continue →';

  return (
    <div className="bc-bg-grid">
      <BrandStrip />
      <ProgressBar current={index + 1} total={questions.length + 1} />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative">
        <HeroGlow />
        <div className="w-full max-w-3xl relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-4">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Eyebrow label={`Question ${String(index + 1).padStart(2, '0')} of ${String(questions.length).padStart(2, '0')}`} />
            </div>
          </div>
          <QuestionCard question={q.question} subtext={q.subtext}>
            {q.type === 'multiple-choice' && q.choices && (
              <>
                <MultipleChoice
                  choices={q.choices}
                  value={answer}
                  onChange={(value) => set(q.id, value)}
                  onNext={handleNext}
                />
                {index > 0 && (
                  <button onClick={handleBack} className="mt-6" style={{ ...GHOST_BTN, padding: '10px 20px' }}>← Back</button>
                )}
              </>
            )}

            {(q.type === 'text' || q.type === 'url' || q.type === 'textarea') && (
              <>
                <TextInput
                  value={answer}
                  onChange={(value) => set(q.id, value)}
                  placeholder={q.placeholder}
                  type={q.type === 'url' ? 'url' : 'text'}
                  multiline={q.type === 'textarea'}
                  required={q.required}
                  error={q.id === 'channel_url' ? channelUrlError : undefined}
                />
                <div className="flex gap-4 mt-6">
                  {index > 0 && <button onClick={handleBack} style={GHOST_BTN}>← Back</button>}
                  <button
                    onClick={handleNext}
                    disabled={q.required && !answer}
                    className="flex-1"
                    style={{ ...PRIMARY_BTN, opacity: q.required && !answer ? 0.5 : 1, cursor: q.required && !answer ? 'not-allowed' : 'pointer' }}
                  >
                    {continueLabel}
                  </button>
                </div>
              </>
            )}
          </QuestionCard>
        </div>
        <div className="mt-8 text-center text-xs" style={{ color: 'var(--bc-text-500)', position: 'relative', zIndex: 1 }}>
          Question {index + 1} of {questions.length}
        </div>
      </div>
    </div>
  );
}
