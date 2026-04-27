'use client';

import { useState } from 'react';

interface WaitlistFormProps {
  context: 'before' | 'after' | 'insight';
}

export default function WaitlistForm({ context }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          source: context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join');
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
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
        <div className="text-green-400 text-lg font-semibold mb-1">You&apos;re on the list!</div>
        <p className="text-slate-400 text-sm">
          {context === 'insight'
            ? "Check your email for the download link."
            : "I'll let you know when the next window opens."}
        </p>
      </div>
    );
  }

  const headlines: Record<string, { title: string; subtitle: string; button: string }> = {
    before: {
      title: 'The window isn\'t open yet',
      subtitle: 'Drop your email and I\'ll notify you the moment it opens.',
      button: 'Notify Me',
    },
    after: {
      title: 'This window has closed',
      subtitle: 'Drop your email to get notified when the next one opens.',
      button: 'Join the Waitlist',
    },
    insight: {
      title: 'Get Boundless Insight',
      subtitle: 'A free tool that gives you instant feedback on your YouTube thumbnails, titles, and descriptions.',
      button: 'Get It Free',
    },
  };

  const h = headlines[context];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
      <h3 className="text-xl font-bold text-white mb-2 text-center">{h.title}</h3>
      <p className="text-slate-400 text-center mb-6">{h.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="flex-[2] bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : h.button}
        </button>
      </form>

      <p className="text-slate-600 text-xs text-center mt-3">No spam. Unsubscribe anytime.</p>
    </div>
  );
}
