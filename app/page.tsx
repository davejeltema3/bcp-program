'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from '@/components/CountdownTimer';
import WaitlistForm from '@/components/WaitlistForm';

type WindowState = 'before' | 'open' | 'after';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInstallment, setIsLoadingInstallment] = useState(false);
  const [error, setError] = useState<string>();
  const [logoError, setLogoError] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>('before');
  const [windowOpen, setWindowOpen] = useState<Date | null>(null);
  const [windowClose, setWindowClose] = useState<Date | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  useEffect(() => {
    const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
    const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;
    if (!openStr || !closeStr) { setWindowState('open'); return; }
    const open = new Date(openStr);
    const close = new Date(closeStr);
    setWindowOpen(open);
    setWindowClose(close);
    const now = new Date();
    if (now < open) setWindowState('before');
    else if (now > close) setWindowState('after');
    else setWindowState('open');
  }, []);

  const handleWindowOpened = useCallback(() => setWindowState('open'), []);
  const handleWindowClosed = useCallback(() => setWindowState('after'), []);

  const handleCheckout = async (mode: 'full' | 'installment') => {
    const setLoaderFn = mode === 'full' ? setIsLoading : setIsLoadingInstallment;
    setLoaderFn(true);
    setError(undefined);
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email') || undefined;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
          paymentMode: mode === 'installment' ? 'installment' : undefined,
        }),
      });
      const data = await response.json();
      if (data.error) { setError(data.error); setLoaderFn(false); return; }
      if (data.url) { window.location.href = data.url; }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoaderFn(false);
    }
  };

  const faqs = [
    { q: "What if I'm brand new?", a: "Works for any sub count. The review is tailored to where you actually are." },
    { q: "What if I'm already at 50K?", a: "Same answer. The system covers both." },
    { q: "Is this auto-renewing?", a: "No. It's a one-time payment for 12 weeks. That's it." },
    { q: "What about the installment option?", a: "Two payments of $599, billed 30 days apart. Same program, same access, just split into two." },
    { q: "Can I cancel?", a: "30-day refund. No conditions, no questions." },
    { q: "What's the high-ticket program?", a: "The Boundless Creator Accelerator is 1-on-1, $6K+. Same systems, more hand-holding." },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-xl">
        {/* Logo */}
        {!logoError && (
          <div className="mb-5 flex justify-center">
            <img
              src="/images/logo.png"
              alt="Boundless Creator"
              onError={() => setLogoError(true)}
              className="max-h-[50px] object-contain"
            />
          </div>
        )}

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          {/* Header — blue branding to match logo */}
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border-b border-slate-800 px-6 py-5 md:px-8 md:py-6">
            <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Founders Cohort — Limited Spots
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              Join the Founders Cohort
            </h1>
            <p className="text-green-400 text-sm font-medium">
              Get founding member pricing — 50% off
            </p>
          </div>

          {/* Timer */}
          {windowState === 'before' && windowOpen && (
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50">
              <CountdownTimer target={windowOpen} label="Opens in" onComplete={handleWindowOpened} />
            </div>
          )}
          {windowState === 'open' && windowClose && (
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50">
              <CountdownTimer target={windowClose} label="Enrollment closes in" onComplete={handleWindowClosed} />
            </div>
          )}

          {/* Pricing */}
          <div className="px-6 py-5 md:px-8 border-b border-slate-800">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-slate-500 line-through text-lg">$1,998</span>
              <span className="text-4xl font-bold text-white">$999</span>
            </div>
            <div className="text-green-400 text-sm font-medium">
              Founders Edition — You save $999
            </div>
            <p className="text-slate-500 text-xs mt-1">
              12 weeks of direct coaching. One-time payment.
            </p>
          </div>

          {/* What You Get */}
          <div className="px-6 py-5 md:px-8 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              What You Get
            </h2>
            <ul className="space-y-2.5">
              {[
                '12 weeks of intensive YouTube training',
                '90-minute live strategy sessions every week',
                'Daily access to Dave for real-time feedback',
                'A personal deep-dive review of your channel',
                'The exact systems and frameworks I use to grow channels',
                'Founders pricing locked in for every future cohort',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="px-6 py-5 md:px-8">
            {windowState === 'open' ? (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Primary: Pay in Full — blue to match branding */}
                <div className="relative">
                  {/* 50% off badge */}
                  <div className="absolute -top-2.5 -right-2 z-10">
                    <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-500/30">
                      50% OFF
                    </span>
                  </div>
                  <button
                    onClick={() => handleCheckout('full')}
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
                      'Join Now — $999'
                    )}
                  </button>
                </div>

                {/* Secondary: Installments */}
                <button
                  onClick={() => handleCheckout('installment')}
                  disabled={isLoadingInstallment}
                  className="w-full mt-3 bg-transparent border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoadingInstallment ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirecting...
                    </span>
                  ) : (
                    'Or pay in two monthly installments — $599'
                  )}
                </button>

                {/* Key details — below buttons */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-green-500 text-xs">●</span>
                    <span className="text-slate-400 text-xs">Community access the moment you join</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-green-500 text-xs">●</span>
                    <span className="text-slate-400 text-xs">First live session: Wednesday, May 7</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 text-slate-500 text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure checkout via Stripe
                </div>
              </>
            ) : (
              <WaitlistForm context={windowState} />
            )}
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-4 bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">30-Day Guarantee:</span>{' '}
            If you join and it&apos;s not for you, I refund you within 30 days. No questions, no conditions.
          </p>
        </div>

        {/* Details link + FAQ + Contact */}
        <div className="mt-3 mb-6 text-center space-y-2">
          <a
            href="https://docs.google.com/document/d/1s6-4kCsW94o9FM-nNoFPxJkGMwgjpqCPLmcxWEtNxTs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400 text-xs underline block"
          >
            Full details about the program →
          </a>

          <button
            onClick={() => setShowFaq(!showFaq)}
            className="text-slate-500 hover:text-slate-400 text-xs underline"
          >
            {showFaq ? 'Hide FAQ' : 'FAQ'}
          </button>

          {showFaq && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-left space-y-4">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-white text-sm font-medium mb-0.5">{faq.q}</h3>
                  <p className="text-slate-400 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-slate-600 text-xs">
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
