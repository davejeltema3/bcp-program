'use client';

import { useState, useEffect } from 'react';
import { questions, type QuestionnaireData } from '@/lib/questionnaire';
import ProgressBar from '@/components/ProgressBar';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';
import MultipleChoice from '@/components/MultipleChoice';

interface WelcomeData {
  success: boolean;
  customerName?: string;
  customerEmail?: string;
  error?: string;
}

type Screen = 'loading' | 'error' | 'welcome' | 'questionnaire' | 'done';

export default function WelcomePage() {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [logoError, setLogoError] = useState(false);
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

    const apiUrl = testMode
      ? '/api/welcome?test=true'
      : `/api/welcome?session_id=${sessionId}`;

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
        body: JSON.stringify({
          answers,
          email: data?.customerEmail,
          name: data?.customerName,
        }),
      });
    } catch (err) {
      console.error('Questionnaire submission error:', err);
    } finally {
      setSubmitting(false);
      setScreen('done');
    }
  };

  // Enter key to advance on text/url inputs
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (screen === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-slate-400 mb-6">
              We couldn&apos;t verify your payment. Don&apos;t worry — if you were charged, your payment is safe.
            </p>
            <p className="text-slate-400">
              Please reach out to{' '}
              <a href="mailto:hello@boundlesscreator.com" className="text-blue-400 hover:text-blue-300 underline">
                hello@boundlesscreator.com
              </a>{' '}
              and I&apos;ll get you sorted right away.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Welcome (post-payment confirmation) ──
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {!logoError && (
            <div className="mb-6 flex justify-center">
              <img
                src="/images/logo.png"
                alt="Boundless Creator"
                onError={() => setLogoError(true)}
                className="max-h-[60px] object-contain"
              />
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 md:p-12 shadow-xl mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Welcome{firstName ? `, ${firstName}` : ''}!
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed">
                Your payment is confirmed. You&apos;re a founding member of the Boundless Creator Program.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 mb-6 text-left">
              <h2 className="text-lg font-semibold text-white mb-4">What Happens Next</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">1</span>
                  <div>
                    <div className="text-white font-medium">Fill out the quick questionnaire</div>
                    <div className="text-slate-400 text-sm">
                      10 questions, about 5 minutes. This is how I write your personal channel review.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">2</span>
                  <div>
                    <div className="text-white font-medium">Check your email</div>
                    <div className="text-slate-400 text-sm">
                      You&apos;ll receive a welcome email with your Discord invite and everything you need to get started.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">3</span>
                  <div>
                    <div className="text-white font-medium">Your review arrives within a week</div>
                    <div className="text-slate-400 text-sm">
                      I&apos;ll send you an audio note when it&apos;s posted in Discord.
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">4</span>
                  <div>
                    <div className="text-white font-medium">First live session: Wednesday at 2 PM EST</div>
                    <div className="text-slate-400 text-sm">
                      Recurring Wednesdays. Recorded if you can&apos;t make it.
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setScreen('questionnaire')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30"
            >
              Start Questionnaire →
            </button>
            <p className="text-slate-500 text-xs mt-4">
              Not ready right now? No problem. We&apos;ll email you a link to fill this out later.
            </p>
          </div>

          <div className="mt-8 text-center text-slate-600 text-xs">
            <p>A receipt has been sent to your email.</p>
            <p className="mt-1">
              Questions?{' '}
              <a href="mailto:hello@boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Questionnaire submitted!</h2>
            <p className="text-slate-300 mb-4">
              I&apos;ll use your answers to write your personal channel review. Expect it within your first week.
            </p>
            <p className="text-slate-400 text-sm">
              Check your email for the Discord invite and keep an eye out for my audio note.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Questionnaire (multi-page flow) ──
  const question = questions[currentIndex];
  const currentAnswer = answers[question.id];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <>
      {!logoError && (
        <div className="pt-6 flex justify-center">
          <img
            src="/images/logo.png"
            alt="Boundless Creator"
            onError={() => setLogoError(true)}
            className="max-h-[60px] object-contain"
          />
        </div>
      )}
      <ProgressBar current={currentIndex + 1} total={questions.length + 1} />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-3xl">
          <QuestionCard question={question.question} subtext={question.subtext}>
            {question.type === 'multiple-choice' && question.choices && (
              <>
                <MultipleChoice
                  choices={question.choices}
                  value={currentAnswer}
                  onChange={(value) => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                  onNext={handleNext}
                />
                {currentIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="mt-6 px-6 py-3 text-slate-400 hover:text-white transition-colors"
                  >
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
                    <button
                      onClick={handleBack}
                      className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={question.required && !currentAnswer}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
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
                    <button
                      onClick={handleBack}
                      className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={question.required && !currentAnswer}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isLastQuestion ? (submitting ? 'Submitting...' : 'Submit →') : 'Continue →'}
                  </button>
                </div>
              </>
            )}
          </QuestionCard>
        </div>

        <div className="mt-8 text-center text-slate-500 text-xs">
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>
    </>
  );
}
