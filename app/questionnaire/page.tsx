'use client';

import { useState, useEffect } from 'react';
import { questions, type QuestionnaireData } from '@/lib/questionnaire';
import ProgressBar from '@/components/ProgressBar';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';
import MultipleChoice from '@/components/MultipleChoice';

/**
 * Standalone questionnaire page.
 * Used when a member comes back from the email reminder link.
 * Expects ?email= query param to identify who's submitting.
 */
export default function QuestionnairePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [channelUrlError, setChannelUrlError] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setName(params.get('name') || '');
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
      setSubmitted(true); // Don't block them
    } finally {
      setSubmitting(false);
    }
  };

  // Enter key to advance on text inputs
  useEffect(() => {
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
  }, [currentIndex, answers]);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-8">
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

  const question = questions[currentIndex];
  const currentAnswer = answers[question.id];
  const isLastQuestion = currentIndex === questions.length - 1;
  const canAdvance = question.required ? !!currentAnswer : true;

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
