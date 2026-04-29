'use client';

import { useState } from 'react';

/**
 * Boundless Insight lead magnet landing page.
 * Submits to Kit Form #9377397 — Kit handles double opt-in,
 * confirmation email, incentive delivery, and redirect to Chrome Web Store.
 */

const KIT_FORM_ID = '9377397';
const KIT_API_KEY = '8r2gDZv9vgYKgeS4TAeKdw';

export default function InsightPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(undefined);

    try {
      // Submit directly to Kit's form endpoint
      const response = await fetch(`https://api.convertkit.com/v3/forms/${KIT_FORM_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: KIT_API_KEY,
          email: email,
          first_name: firstName || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-2xl font-bold text-white mb-2">Check your email!</h2>
            <p className="text-slate-300">
              Confirm your email and you&apos;ll be taken straight to the download. 
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
        {!logoError && (
          <div className="mb-8 flex justify-center">
            <img
              src="/images/logo.png"
              alt="Boundless Creator"
              onError={() => setLogoError(true)}
              className="max-h-[60px] object-contain"
            />
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Boundless Insight
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            A free Chrome extension that shows you exactly why some YouTube videos get clicked and others don&apos;t — so you can apply what works to your own channel.
          </p>
        </div>

        {/* What It Does */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">What it does</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">🎯</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Packaging Analysis</h3>
                  <p className="text-slate-400 text-sm">AI-powered breakdown of any video&apos;s thumbnail, title, and metadata.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">📊</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Learn From Any Video</h3>
                  <p className="text-slate-400 text-sm">Study what top creators do right and apply it to your own packaging.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">🔍</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Actionable Feedback</h3>
                  <p className="text-slate-400 text-sm">Not just &quot;this is good&quot; — specific notes you can act on.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">⚡</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">One Click</h3>
                  <p className="text-slate-400 text-sm">Works right on any YouTube video page. No setup required.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Email Capture */}
        <section className="mb-12">
          <div className="rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2 text-center">Get Boundless Insight</h3>
            <p className="text-slate-400 text-sm text-center mb-4">
              Drop your email, confirm it, and you&apos;ll be taken straight to the Chrome Web Store to install.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : 'Get It Free'}
              </button>
            </form>

            <p className="text-slate-600 text-xs text-center mt-3">No spam. Unsubscribe anytime.</p>
          </div>
        </section>

        {/* About */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 text-center">
            <p className="text-slate-300 leading-relaxed">
              Built by{' '}
              <a href="https://www.youtube.com/@davejeltema3" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Dave Jeltema
              </a>{' '}
              — YouTube creator and coach helping educational creators grow their channels.
            </p>
          </div>
        </section>

        <footer className="text-center text-slate-600 text-xs pb-8">
          <p>
            <a href="https://privacy.boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
              Privacy Policy
            </a>
            {' · '}
            <a href="mailto:hello@boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
              Contact
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
