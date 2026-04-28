'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from '@/components/CountdownTimer';
import WaitlistForm from '@/components/WaitlistForm';

type WindowState = 'before' | 'open' | 'after';

export default function HomePage() {
  const [logoError, setLogoError] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>('before');
  const [windowOpen, setWindowOpen] = useState<Date | null>(null);
  const [windowClose, setWindowClose] = useState<Date | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  useEffect(() => {
    const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
    const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;

    if (!openStr || !closeStr) {
      setWindowState('open');
      return;
    }

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

  const faqs = [
    { q: "What if I'm brand new?", a: "Works for any sub count. The review is tailored to where you actually are." },
    { q: "What if I'm already at 50K?", a: "Same answer. The system covers both." },
    { q: "Is this auto-renewing?", a: "No. You pay $999 for three months. That's it." },
    { q: "Can I cancel?", a: "30-day refund window. No conditions, no questions." },
    { q: "What about the high-ticket program?", a: "The Boundless Creator Accelerator is 1-on-1, $6K+. This is the same systems, less hand-holding. Depth, not access." },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg text-center">
        {/* Logo */}
        {!logoError && (
          <div className="mb-6">
            <img
              src="/images/logo.png"
              alt="Boundless Creator"
              onError={() => setLogoError(true)}
              className="max-h-[50px] object-contain mx-auto"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Boundless Creator Program
        </h1>
        <p className="text-green-400 text-sm font-medium mb-6">
          Founders Edition — $999 for 3 months
        </p>

        {/* Timer */}
        {windowState === 'before' && windowOpen && (
          <div className="mb-6">
            <CountdownTimer target={windowOpen} label="Opens in" onComplete={handleWindowOpened} />
          </div>
        )}
        {windowState === 'open' && windowClose && (
          <div className="mb-6">
            <CountdownTimer target={windowClose} label="Window closes in" onComplete={handleWindowClosed} />
          </div>
        )}

        {/* The card */}
        <div className="bg-slate-900 border border-green-500/30 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)] overflow-hidden mb-6">
          {/* What you get — compact */}
          <div className="p-6 text-left">
            <ul className="space-y-2.5">
              {[
                'Personal channel review in your first week',
                'Weekly live session — Wednesdays 2 PM EST',
                'Full BCP resource library',
                'Direct access to Dave in Discord',
                'Founder\'s rate locked in for as long as you stay',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            {windowState === 'open' ? (
              <a
                href="/checkout"
                className="block w-full text-center bg-green-600 hover:bg-green-500 text-white font-semibold text-lg py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-green-500/20 hover:shadow-green-500/40"
              >
                Join — $999
              </a>
            ) : windowState === 'before' ? (
              <div className="text-slate-400 text-sm py-3">
                Payment opens when the timer hits zero.
              </div>
            ) : (
              <WaitlistForm context="after" />
            )}
          </div>
        </div>

        {/* 30-day guarantee + details link */}
        <p className="text-slate-500 text-xs mb-3">
          30-day money-back guarantee. No questions, no conditions.
        </p>
        <a
          href="https://docs.google.com/document/d/PLACEHOLDER/edit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-400 text-xs underline"
        >
          Full details about the program →
        </a>

        {/* Collapsible FAQ */}
        <div className="mt-6">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="text-slate-500 hover:text-slate-400 text-xs underline"
          >
            {showFaq ? 'Hide FAQ' : 'FAQ'}
          </button>

          {showFaq && (
            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg p-5 text-left space-y-4">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-white text-sm font-medium mb-0.5">{faq.q}</h3>
                  <p className="text-slate-400 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact */}
        <p className="text-slate-600 text-xs mt-6">
          Questions? <a href="mailto:hello@boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">hello@boundlesscreator.com</a>
        </p>
      </div>
    </div>
  );
}
