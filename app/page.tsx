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

  useEffect(() => {
    const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
    const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;

    if (!openStr || !closeStr) {
      setWindowState('open'); // No window = always open
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

  const handleWindowOpened = useCallback(() => {
    setWindowState('open');
  }, []);

  const handleWindowClosed = useCallback(() => {
    setWindowState('after');
  }, []);

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

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-600/20 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            Founders Edition — Limited Window
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            The Boundless Creator Program
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            A personal channel review, weekly live sessions, and direct access to me.
            Built for YouTube creators who want clear direction on what to do next.
          </p>

          {/* Window status banner */}
          {windowState === 'before' && windowOpen && (
            <div className="mb-6">
              <CountdownTimer
                target={windowOpen}
                label="Opens in"
                onComplete={handleWindowOpened}
              />
            </div>
          )}
          {windowState === 'open' && windowClose && (
            <div className="mb-6">
              <CountdownTimer
                target={windowClose}
                label="Window closes in"
                onComplete={handleWindowClosed}
              />
            </div>
          )}
        </div>

        {/* What This Is */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-4">What this is</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              The Boundless Creator Program is a paid mid-tier program where you get personal attention from me on your specific channel.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              It costs <span className="text-white font-semibold">$999 for three months</span>.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              It&apos;s not a course, not a paid Discord, not a coaching application. It sits between my free content and my high-ticket one-on-one program.
            </p>
            <p className="text-slate-300 leading-relaxed">
              The headline value is a <span className="text-white font-medium">personal channel review I write you in your first week</span>. Everything else is the container around that.
            </p>
          </div>
        </section>

        {/* Who It's For */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Who it&apos;s for</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Anyone who wants to grow their YouTube channel.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              You don&apos;t need to be monetized. You don&apos;t need to be at a specific sub count. You don&apos;t need to be a &quot;serious&quot; creator with pro aspirations. That&apos;s the high-ticket program.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              If you want eyes on your specific channel and a clear point of view on what to focus on next, this is for you.
            </p>
            <p className="text-slate-300 leading-relaxed">
              If you don&apos;t, this isn&apos;t, and that&apos;s fine.
            </p>
          </div>
        </section>

        {/* What Every Founder Gets */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">What every founder gets</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400">✦</span> A personal channel review
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  In your first week, I write you a focused review of your specific channel. I look at your analytics, your videos, and your answers from a short questionnaire. I spend an hour on it. I tell you where I think you actually are, the one bottleneck to focus on first, and the concrete thing to do this week.
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  I post it publicly in a Discord forum thread. The other founders can read it. Their reviews are public too. Everyone learns from everyone else.
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  I send you a private audio note when it&apos;s posted, with the headline.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400">✦</span> A weekly live group session
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Wednesdays at 2 PM EST. Hot seats, channel reviews, your questions answered on real channels and real data. Recorded for VOD if you can&apos;t make it live.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400">✦</span> The full BCP resource library
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Every framework, every worksheet, every recap from past cohorts.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400">✦</span> Me in the Discord between sessions
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Not 24/7. Enough to unstick you when you get stuck.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400">✦</span> A founders role + locked-in rate
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Visible in the member list. When you renew at month three, you keep the founder&apos;s rate. When I launch the polished version, the price goes up.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing + CTA */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 border border-blue-500/30 rounded-lg p-6 md:p-8 text-center">
            <div className="text-blue-400 text-sm font-medium mb-2">Founders Rate</div>
            <div className="text-5xl font-bold text-white mb-2">$999</div>
            <div className="text-slate-400 mb-6">for three months</div>
            <p className="text-slate-300 text-sm leading-relaxed max-w-lg mx-auto mb-8">
              This is intentionally low. The program isn&apos;t polished yet. You&apos;re a founding member helping me build it into the thing it&apos;s going to become. The founder&apos;s rate locks in for as long as you stay.
            </p>

            {windowState === 'open' ? (
              <a
                href="/checkout"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30"
              >
                Join the Program →
              </a>
            ) : (
              <WaitlistForm context={windowState} />
            )}
          </div>
        </section>

        {/* 30-Day Guarantee */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">30-Day Guarantee</h2>
            <p className="text-slate-300">
              If you join and it&apos;s not for you, I refund you within 30 days. No questions, no conditions.
            </p>
          </div>
        </section>

        {/* Schedule */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-4">The schedule</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2.5 bg-blue-500 rounded-full"></div>
                <p className="text-slate-300">
                  The window to join opens <span className="text-white font-medium">Friday May 1 at 9 AM EST</span> and closes <span className="text-white font-medium">Sunday May 3 at midnight EST</span>.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2.5 bg-blue-500 rounded-full"></div>
                <p className="text-slate-300">
                  After Sunday, the founders launch closes. The next monthly drop happens later.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2.5 bg-blue-500 rounded-full"></div>
                <p className="text-slate-300">
                  The first live session is <span className="text-white font-medium">Wednesday May 6 at 2 PM EST</span>. Recurring Wednesdays after that.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2.5 bg-blue-500 rounded-full"></div>
                <p className="text-slate-300">
                  Personal reviews get delivered within your first week of joining.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">FAQ</h2>
            <div className="space-y-6">
              {[
                {
                  q: "What if I'm already at 50K subs?",
                  a: "This works for any sub count. The personal review is tailored to where you actually are. The community has people at all stages.",
                },
                {
                  q: "What if I'm just starting and have under 1,000 subs?",
                  a: "Same answer. The review tells you what to focus on for where you're at. Some founders are scaling. Some are starting. The system covers both.",
                },
                {
                  q: "What if I miss the live session?",
                  a: "It's recorded. The live session isn't the main draw. It's included.",
                },
                {
                  q: "What happens at month three?",
                  a: "You either renew at the founder's rate or you don't. If you do, I do another channel review tied to your renewal payment. If you don't, you're out and the founder's rate stays available if you come back later.",
                },
                {
                  q: "Can I cancel?",
                  a: "The 30-day refund is your cancellation window. No conditions, no questions. After 30 days, you've paid for three months and we ride it out.",
                },
                {
                  q: "Is this auto-renewing?",
                  a: "No. You pay $999 for three months. That's it. If you renew at month three, that's a separate payment.",
                },
                {
                  q: "Why no application?",
                  a: "I don't think a YouTube growth program needs to gate access. If you want in, you're in. The personal review tells me where you actually are without an application.",
                },
                {
                  q: "Why no sales call?",
                  a: "I don't like sales calls. You probably don't either. Everything you need to know is in this doc. Click the link, pay, get started.",
                },
                {
                  q: "What's the difference between this and your high-ticket program?",
                  a: "The high-ticket Boundless Creator Accelerator is for serious creators with pro aspirations. Multi-hour custom strategy sessions. Ongoing one-on-one calls. Full access to me between sessions. $6,000 for three months. This program is the same systems, less direct hand-holding. The wall between the two is depth, not access.",
                },
              ].map((faq, i) => (
                <div key={i}>
                  <h3 className="text-white font-semibold mb-1">{faq.q}</h3>
                  <p className="text-slate-400 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 border border-blue-500/30 rounded-lg p-6 md:p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Ready?</h2>
            <p className="text-slate-300 mb-6">Founders rate. $999 for three months. 30-day guarantee.</p>

            {windowState === 'open' ? (
              <a
                href="/checkout"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30"
              >
                Join the Boundless Creator Program →
              </a>
            ) : (
              <WaitlistForm context={windowState} />
            )}
          </div>
        </section>

        <footer className="text-center text-slate-600 text-xs pb-8">
          <p>
            Questions?{' '}
            <a href="mailto:hello@boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
              hello@boundlesscreator.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
