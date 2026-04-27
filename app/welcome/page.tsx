'use client';

import { useState, useEffect } from 'react';
import { questionnaire, sections, type QuestionnaireData } from '@/lib/questionnaire';

interface WelcomeData {
  success: boolean;
  customerName?: string;
  customerEmail?: string;
  error?: string;
}

export default function WelcomePage() {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [analyticsGranted, setAnalyticsGranted] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const testMode = params.get('test') === 'true';

    if (!sessionId && !testMode) {
      setData({ success: false, error: 'No session found' });
      setLoading(false);
      return;
    }

    const apiUrl = testMode
      ? '/api/welcome?test=true'
      : `/api/welcome?session_id=${sessionId}`;

    fetch(apiUrl)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
        // Pre-fill name/channel if we have it
        if (result.customerName) {
          setAnswers(prev => ({ ...prev, name_channel: result.customerName + ' — ' }));
        }
      })
      .catch(() => {
        setData({ success: false, error: 'Failed to verify payment' });
        setLoading(false);
      });
  }, []);

  const handleSubmitQuestionnaire = async () => {
    setSubmitting(true);

    try {
      await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { ...answers, analytics_access: analyticsGranted },
          email: data?.customerEmail,
          name: data?.customerName,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Questionnaire submission error:', err);
      // Still show success — we don't want to block them
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  if (!data?.success) {
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

  const firstName = data.customerName?.split(' ')[0];

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

        {/* Confirmation */}
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

          {/* What Happens Next */}
          <div className="bg-slate-800/50 rounded-lg p-6 mb-6 text-left">
            <h2 className="text-lg font-semibold text-white mb-4">What Happens Next</h2>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">1</span>
                <div>
                  <div className="text-white font-medium">Check your email</div>
                  <div className="text-slate-400 text-sm">
                    You&apos;ll receive a welcome email with your Discord invite and everything you need to get started.
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">2</span>
                <div>
                  <div className="text-white font-medium">Fill out the questionnaire below</div>
                  <div className="text-slate-400 text-sm">
                    This is how I write your personal channel review. The more detail you give, the better the review.
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
                  <div className="text-white font-medium">First live session: Wednesday May 6 at 2 PM EST</div>
                  <div className="text-slate-400 text-sm">
                    Recurring Wednesdays. Recorded if you can&apos;t make it.
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Questionnaire */}
        {!submitted ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 md:p-12 shadow-xl">
            {!showQuestionnaire ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Your Onboarding Questionnaire</h2>
                <p className="text-slate-300 mb-2">
                  This takes about 10-15 minutes. Your answers are how I write your personal channel review.
                </p>
                <p className="text-slate-400 text-sm mb-8">
                  The more specific you are, the more useful the review. Don&apos;t rush it.
                </p>
                <button
                  onClick={() => setShowQuestionnaire(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200"
                >
                  Start Questionnaire →
                </button>
                <p className="text-slate-500 text-xs mt-4">
                  Not ready right now? No problem. We&apos;ll email you a link to fill this out later.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Onboarding Questionnaire</h2>
                <p className="text-slate-400 text-sm text-center mb-8">
                  Take your time. These answers directly shape your channel review.
                </p>

                {sections.map((section) => {
                  const sectionQuestions = questionnaire.filter(q => q.section === section.id);
                  if (sectionQuestions.length === 0) return null;

                  return (
                    <div key={section.id} className="mb-10">
                      <h3 className="text-lg font-semibold text-blue-400 mb-4 border-b border-slate-800 pb-2">
                        Section {section.number}: {section.title}
                      </h3>

                      <div className="space-y-6">
                        {sectionQuestions.map((q) => {
                          if (q.type === 'analytics') {
                            return (
                              <div key={q.id} className="bg-slate-800/50 rounded-lg p-6">
                                <h4 className="text-white font-semibold mb-3">Granting Analytics Access</h4>
                                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                                  Here&apos;s the truth. Without your analytics, I&apos;m working with one hand tied behind my back. Public data shows me what&apos;s happening on the surface. Your private analytics show me <em>why</em>.
                                </p>
                                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                  The difference between &quot;your packaging needs work&quot; and &quot;your hook is fine but you lose 40% of viewers at 2:40&quot; is huge. One is a guess. The other is something you can act on Monday morning.
                                </p>

                                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                                  <div className="text-white font-medium text-sm mb-2">Privacy:</div>
                                  <ul className="text-slate-400 text-sm space-y-1">
                                    <li>• Viewer-only access. I can&apos;t edit, post, or change anything.</li>
                                    <li>• You can revoke anytime in YouTube Studio. Two clicks.</li>
                                    <li>• I&apos;ll remove myself after I&apos;ve completed your review (about a week).</li>
                                  </ul>
                                </div>

                                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                                  <div className="text-white font-medium text-sm mb-2">Steps (2 minutes):</div>
                                  <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
                                    <li>YouTube Studio → Settings (bottom left)</li>
                                    <li>Permissions tab</li>
                                    <li>Invite (top right)</li>
                                    <li>Enter: <span className="text-blue-400">hello@boundlesscreator.com</span></li>
                                    <li>Select &quot;Viewer&quot;</li>
                                    <li>Click Done</li>
                                  </ol>
                                </div>

                                <div className="space-y-2">
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="analytics"
                                      value="granted"
                                      checked={analyticsGranted === 'granted'}
                                      onChange={() => setAnalyticsGranted('granted')}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-white text-sm">I&apos;ve granted access</span>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="analytics"
                                      value="skipped"
                                      checked={analyticsGranted === 'skipped'}
                                      onChange={() => setAnalyticsGranted('skipped')}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-white text-sm">I&apos;ll skip for now</span>
                                  </label>
                                </div>
                                {analyticsGranted === 'skipped' && (
                                  <p className="text-slate-500 text-xs mt-2">
                                    No problem. Your review will still be valuable based on what&apos;s publicly visible. You can grant access later if you change your mind.
                                  </p>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={q.id}>
                              <label className="block text-white font-medium mb-1">
                                {q.question}
                                {q.required && <span className="text-red-400 ml-1">*</span>}
                              </label>
                              {q.subtext && (
                                <p className="text-slate-500 text-sm mb-2">{q.subtext}</p>
                              )}

                              {q.type === 'text' && (
                                <input
                                  type="text"
                                  value={answers[q.id] || ''}
                                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  placeholder={q.placeholder}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              )}

                              {q.type === 'textarea' && (
                                <textarea
                                  value={answers[q.id] || ''}
                                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  placeholder={q.placeholder}
                                  rows={4}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-y"
                                />
                              )}

                              {q.type === 'select' && q.options && (
                                <div className="space-y-2">
                                  {q.options.map(opt => (
                                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value={opt.value}
                                        checked={answers[q.id] === opt.value}
                                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span className="text-slate-300 text-sm">{opt.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleSubmitQuestionnaire}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Questionnaire'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl text-center">
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
        )}

        <div className="mt-6 text-center text-slate-600 text-xs">
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
