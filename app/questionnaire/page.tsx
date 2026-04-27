'use client';

import { useState } from 'react';
import { questionnaire, sections, type QuestionnaireData } from '@/lib/questionnaire';

/**
 * Standalone questionnaire page — accessible via direct link.
 * Used in automated email reminders for members who haven't submitted yet.
 * URL: /questionnaire?email=their@email.com
 */
export default function QuestionnairePage() {
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [analyticsGranted, setAnalyticsGranted] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const getEmail = (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('email') || undefined;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { ...answers, analytics_access: analyticsGranted },
          email: getEmail(),
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Questionnaire submitted!</h1>
            <p className="text-slate-300 mb-4">
              I&apos;ll use your answers to write your personal channel review. Expect it within your first week.
            </p>
            <p className="text-slate-400 text-sm">
              Head to the Discord if you haven&apos;t already — that&apos;s home base.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 md:p-12 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">BCP Onboarding Questionnaire</h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Take your time. These answers directly shape your personal channel review.
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
                            Without your analytics, I&apos;m working with one hand tied behind my back. Public data shows what&apos;s happening on the surface. Your private analytics show me <em>why</em>.
                          </p>
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
                              <input type="radio" name="analytics" value="granted" checked={analyticsGranted === 'granted'} onChange={() => setAnalyticsGranted('granted')} className="w-4 h-4 text-blue-600" />
                              <span className="text-white text-sm">I&apos;ve granted access</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="radio" name="analytics" value="skipped" checked={analyticsGranted === 'skipped'} onChange={() => setAnalyticsGranted('skipped')} className="w-4 h-4 text-blue-600" />
                              <span className="text-white text-sm">I&apos;ll skip for now</span>
                            </label>
                          </div>
                          {analyticsGranted === 'skipped' && (
                            <p className="text-slate-500 text-xs mt-2">No problem. You can grant access later if you change your mind.</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={q.id}>
                        <label className="block text-white font-medium mb-1">
                          {q.question}{q.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {q.subtext && <p className="text-slate-500 text-sm mb-2">{q.subtext}</p>}
                        {q.type === 'text' && (
                          <input type="text" value={answers[q.id] || ''} onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} placeholder={q.placeholder} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                        )}
                        {q.type === 'textarea' && (
                          <textarea value={answers[q.id] || ''} onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} placeholder={q.placeholder} rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-y" />
                        )}
                        {q.type === 'select' && q.options && (
                          <div className="space-y-2">
                            {q.options.map(opt => (
                              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name={q.id} value={opt.value} checked={answers[q.id] === opt.value} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))} className="w-4 h-4 text-blue-600" />
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

          <button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed">
            {submitting ? 'Submitting...' : 'Submit Questionnaire'}
          </button>
        </div>
      </div>
    </div>
  );
}
