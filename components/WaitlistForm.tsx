'use client';

import { useState } from 'react';

interface WaitlistFormProps {
  context: 'before' | 'after' | 'insight';
}

// Kit Form for BCP Waitlist — gives Dave control over double opt-in + incentive email
const KIT_WAITLIST_FORM_ID = '8175003';
const KIT_API_KEY = '8r2gDZv9vgYKgeS4TAeKdw';

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
      // Submit directly to Kit's form endpoint — Kit handles double opt-in
      const response = await fetch(`https://api.convertkit.com/v3/forms/${KIT_WAITLIST_FORM_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: KIT_API_KEY,
          email: email,
          first_name: firstName || undefined,
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
        <div className="text-green-400 text-lg font-semibold mb-1">Check your email!</div>
        <p className="text-slate-400 text-sm">
          {context === 'insight'
            ? "Confirm your email to get the download link."
            : "Confirm your email to get on the waitlist. You're not on the list until you click the button in the email."}
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
    <div className="rounded-lg">
      <h3 className="text-lg font-bold text-white mb-2 text-center">{h.title}</h3>
      <p className="text-slate-400 text-sm text-center mb-4">{h.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3">
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
