'use client';

import { useState, useEffect } from 'react';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';

/**
 * Second step of the waitlist signup.
 * User has already submitted their name + email via the landing form,
 * which triggered the Kit incentive email and created their Waitlist sheet row.
 * Here we collect their answer to the challenge question.
 *
 * Expects ?email= and ?name= query params from the landing form redirect.
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
    textAlign: 'center', paddingTop: 24,
    fontFamily: 'var(--font-urbanist), Urbanist, sans-serif',
    fontSize: 18, fontWeight: 700,
    color: 'var(--bc-blue-300)', letterSpacing: '-0.01em',
  }}>
    Boundless Creator
  </div>
);

const HeroGlow = () => (
  <div style={{
    position: 'absolute', top: -160, left: '50%',
    width: 900, height: 480, transform: 'translateX(-50%)',
    background: `radial-gradient(
      ellipse at center,
      rgba(58,133,255,0.18) 0%,
      rgba(58,133,255,0.08) 40%,
      rgba(58,133,255,0) 100%
    )`,
    pointerEvents: 'none', filter: 'blur(40px)', zIndex: 0,
  }} />
);

const Eyebrow = ({ text }: { text: string }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12, color: 'var(--bc-blue-300)',
    letterSpacing: '0.16em', textTransform: 'uppercase',
    marginBottom: 16,
  }}>
    <span style={{ width: 24, height: 1, background: 'currentColor', opacity: 0.55 }} />
    {text}
  </div>
);

export default function WaitlistQuestionPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [challenge, setChallenge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setName(params.get('name') || '');
  }, []);

  const handleSubmit = async () => {
    if (!email) {
      // No email = nothing to attach the challenge to. Skip to confirmation.
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    try {
      await fetch('/api/waitlist-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, challenge, name }),
      });
    } catch (err) {
      console.error('Waitlist challenge submit error:', err);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const handleSkip = () => {
    // Send empty challenge (no-op on the API), still show confirmation
    setSubmitted(true);
  };

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
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--bc-text-100)' }}>
              Check your email
            </h2>
            <p className="mb-2" style={{ color: 'var(--bc-text-200)' }}>
              I just sent you a confirmation. <strong>You are not on the waitlist until you click the link in that email.</strong>
            </p>
            <p className="text-sm mt-4" style={{ color: 'var(--bc-text-400)' }}>
              You will hear from me when the next window opens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bc-bg-grid">
      <BrandStrip />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative">
        <HeroGlow />
        <div className="w-full max-w-3xl relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-4">
            <Eyebrow text="One quick question" />
          </div>
          <QuestionCard
            question="What is the number one challenge you are facing with your YouTube channel right now?"
            subtext="Your answer helps me understand what to build for the next round. Optional — but the people who answer get the most value when the door opens."
          >
            <TextInput
              value={challenge}
              onChange={setChallenge}
              placeholder="Tell me what you are stuck on..."
              multiline={true}
            />
            <div className="flex gap-4 mt-6">
              <button onClick={handleSkip} style={GHOST_BTN}>
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
                style={{
                  ...PRIMARY_BTN,
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Submitting...' : 'Send my answer →'}
              </button>
            </div>
          </QuestionCard>

          <div className="mt-6 text-center text-xs" style={{ color: 'var(--bc-text-500)' }}>
            Already on the waitlist? Your spot is saved either way. The confirmation email is the only thing that adds you.
          </div>
        </div>
      </div>
    </div>
  );
}
