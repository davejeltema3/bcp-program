'use client';

import { useState } from 'react';

/**
 * Invite / Direct Join page — bypasses the purchase window.
 * Dave can send this URL directly to people he wants to let in outside the normal window.
 * URL: bcp.boundlesscreator.com/join
 */

type PaymentMode = 'one-time' | 'subscription';

const SUBSCRIPTION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTION === 'true';

export default function JoinPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [logoError, setLogoError] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('one-time');

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email') || undefined;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
          bypassWindow: true,
          paymentMode: SUBSCRIPTION_ENABLED ? paymentMode : undefined,
        }),
      });
      const data = await response.json();
      if (data.error) { setError(data.error); setIsLoading(false); return; }
      if (data.url) { window.location.href = data.url; }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const buttonLabel = paymentMode === 'subscription' ? 'Subscribe — $999/quarter' : 'Pay $999';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
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

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border-b border-slate-800 p-6 md:p-8">
            <div className="text-blue-400 text-sm font-medium mb-1">
              Founders Edition — 3 months
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Boundless Creator Program
            </h1>
            <p className="text-slate-300">
              Personal channel reviews, weekly live sessions, and direct access to Dave.
            </p>
          </div>

          {/* What's Included */}
          <div className="p-6 md:p-8 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">
              What&apos;s Included
            </h2>
            <ul className="space-y-3">
              {[
                'Personal channel review in your first week',
                'Weekly live session (Wednesdays 2 PM EST)',
                'Full BCP resource library',
                'Direct access to Dave in Discord',
                'Founder\'s rate locked in for as long as you stay',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment */}
          <div className="p-6 md:p-8 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">
              Payment
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setPaymentMode('one-time')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  paymentMode === 'one-time'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Pay in Full</div>
                    <div className="text-sm text-slate-400 mt-0.5">One-time payment — no auto-renewal</div>
                  </div>
                  <div className="text-2xl font-bold text-white">$999</div>
                </div>
              </button>

              {SUBSCRIPTION_ENABLED && (
                <button
                  onClick={() => setPaymentMode('subscription')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMode === 'subscription'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Quarterly Auto-Renew</div>
                      <div className="text-sm text-slate-400 mt-0.5">$999 every 3 months — cancel anytime</div>
                    </div>
                    <div className="text-2xl font-bold text-white">$999<span className="text-sm text-slate-400 font-normal">/qtr</span></div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* CTA — always available */}
          <div className="p-6 md:p-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirecting to Stripe...
                </span>
              ) : (
                buttonLabel
              )}
            </button>
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure payment powered by Stripe
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">30-Day Guarantee:</span>{' '}
            If you join and it&apos;s not for you, I refund you within 30 days. No questions, no conditions.
          </p>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://docs.google.com/document/d/1s6-4kCsW94o9FM-nNoFPxJkGMwgjpqCPLmcxWEtNxTs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400 text-xs underline"
          >
            Full details about the program →
          </a>
          <p className="text-slate-600 text-xs mt-3">
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
