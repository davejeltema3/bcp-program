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

  const scrollToCheckout = () => {
    document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Dynamic close day and time. Subtract 1ms so a Monday 12:00 AM env var
  // displays as "Sunday at 11:59 PM" (matches the human convention of
  // "Sunday at midnight").
  const closeAdjusted = windowClose ? new Date(windowClose.getTime() - 1) : null;
  const closeDay = closeAdjusted
    ? closeAdjusted.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'America/New_York',
      })
    : null;
  const closeTime = closeAdjusted
    ? closeAdjusted.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      })
    : null;

  const testimonials = [
    {
      quote: "Since joining the program my average view count has tripled to around 15K and my subscriber count has increased by over 45%. I now have a clear roadmap and the tools that give me confidence my channel will continue to grow.",
      name: "Mark Young",
      handle: "Artisan Woodworks",
    },
    {
      quote: "He reviewed my channel, watched my videos, and took detailed notes on exactly where I could improve. He not only pointed out my weak spots, he gave concrete examples of how to fix them. People love to say 'make a better title or thumbnail,' but no one shows you how or why it works. Dave did both.",
      name: "Melissa Terzis",
      handle: "DC Real Estate Mama",
    },
    {
      quote: "I have spent thousands of dollars in books and courses on YouTube. None of those things solved my problems. I needed to hear the brutal truth, that I had to rethink how I was approaching YouTube. Dave was that reality check.",
      name: "Paul Backstrom",
      handle: "Screenwriting Scribe",
    },
    {
      quote: "Despite my best efforts, my YouTube channel had been stuck for a long time and I just couldn't figure out what I was missing. In one coaching session, Dave helped me identify the main issues, demystified the whole process, and gave me clear, actionable next steps.",
      name: "Tara Malone",
      handle: "My Catholic Homecoming",
    },
    {
      quote: "I've completed several YouTube coachings, even Ali Abdaal's. Nothing comes close to what Dave has to offer.",
      name: "Matt Moss",
      handle: "Matt Moss PBSM",
    },
  ];

  const isForList = [
    "YouTubers trying to make this their full-time job",
    "Channel owners ready to ditch scattered tips for a real system",
    "Niche experts who want a clear plan, not another upload-and-pray",
    "Long-game thinkers who refuse to chase viral moments",
    "Anyone who wants my eyes on their work",
  ];

  const isNotForList = [
    "Viral moment chasers",
    "Get-rich-quick types with no love for the craft",
    "AI slop publishers",
    "Know-it-alls who think they've got nothing left to learn",
    "People looking for someone else to do the work",
  ];

  const faqs = [
    {
      q: "Why is this $999?",
      a: "It's intentionally low. The polished version targets $1,999 for 6 months. This is the founders edition. You get in early for 50% off, locked in for every future version. The personal review alone is the kind of work clients pay multiple thousands for in my high-ticket Boundless Creator Accelerator.",
    },
    {
      q: "Is this just a paid Discord?",
      a: "No. The personal review is the headline. The Discord is the container. The mentorship is the work.",
    },
    {
      q: "What if I'm brand new or already at 50K?",
      a: "Same answer to both. The review is tailored to where you are. Any sub count. Any niche. I look at your specific channel and tell you the one bottleneck to fix first.",
    },
    {
      q: "How much time will it take?",
      a: "The live session is 90 minutes Wednesdays at 2pm EST. Recorded for VOD if you can't make it. Everything else is at your own pace.",
    },
    {
      q: "What if it's not for me?",
      a: "30 days. No questions. No conditions. Full refund. You walk away with your personal review either way.",
    },
    {
      q: "Is this auto-renewing?",
      a: "No. It's a one-time payment for three months. After three months, you can renew at the founders rate (50% off whatever the going rate becomes) or walk. Your call.",
    },
    {
      q: "What about the installment option?",
      a: "Two payments of $599, billed 30 days apart. Same program, same access, just split into two.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* === HERO === */}
        <section className="mb-16">
          {!logoError && (
            <div className="mb-8 flex justify-center">
              <img
                src="/images/logo.png"
                alt="Boundless Creator"
                onError={() => setLogoError(true)}
                className="max-h-[50px] object-contain"
              />
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight text-center">
            Stop guessing what to fix on your channel. Get a personal review from me in your first week.
          </h1>

          <p className="text-lg text-slate-300 mb-8 text-center max-w-2xl mx-auto">
            Three months working with me. Weekly live calls. Full access to the systems I use to grow channels.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">15 years</div>
              <div className="text-xs sm:text-sm text-slate-400">on YouTube</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">65K</div>
              <div className="text-xs sm:text-sm text-slate-400">subscribers</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">100+</div>
              <div className="text-xs sm:text-sm text-slate-400">creators coached</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6 text-center">
            <div className="flex items-baseline justify-center gap-3 mb-2">
              <span className="text-slate-500 line-through text-xl">$1,998</span>
              <span className="text-4xl font-bold text-white">$999</span>
            </div>
            <div className="text-green-400 text-sm font-medium">
              Founders Edition. 50% off. Locked in for every future version.
            </div>
          </div>

          <button
            onClick={scrollToCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30 mb-8"
          >
            Join Now — $999
          </button>

          <blockquote className="border-l-4 border-blue-600 pl-5 py-2">
            <p className="text-slate-300 italic mb-2">
              &quot;My average view count tripled to around 15K. My subscriber count is up over 45%. I now have a clear roadmap.&quot;
            </p>
            <footer className="text-sm text-slate-400">
              — Mark Young, Artisan Woodworks
            </footer>
          </blockquote>
        </section>

        {/* === PROBLEM === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
            You&apos;re not guessing because you&apos;re new. You&apos;re guessing because nobody&apos;s told you what&apos;s broken on your channel.
          </h2>
          <div className="text-slate-300 space-y-4 text-base sm:text-lg">
            <p>
              Most creators in this spot have already done the work. Watched the courses. Read the threads. Posted dozens of videos. Every upload still feels like a coin flip.
            </p>
            <p>
              Information&apos;s free. That&apos;s not the problem. The problem is you don&apos;t have a clear read on your specific channel and what&apos;s pulling versus what&apos;s leaking. Generic advice can&apos;t give you that. Most creators stay stuck here for years.
            </p>
            <p>
              You don&apos;t need more information. You need a clear read on your specific channel.
            </p>
          </div>
        </section>

        {/* === THE WEDGE === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
            What every founder gets in their first week.
          </h2>

          <div className="text-slate-300 space-y-4 text-base sm:text-lg mb-8">
            <p>Two things. Both delivered in your own Discord thread.</p>
            <p>
              The personal review tells you what&apos;s broken on your specific channel. The checklist tells you what to do about it every week. Together, you stop guessing on every upload.
            </p>
            <p>Here&apos;s how each one works.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">The personal review</h3>
            <div className="text-slate-300 space-y-3">
              <p>I write a document about your specific channel. It&apos;s the synthesis of four things.</p>
              <p>First, a public research document I produce on your niche.</p>
              <p>Second, your questionnaire answers.</p>
              <p>Third, 20 minutes of me dictating what I see while I browse everything related to your channel.</p>
              <p>Fourth, your channel analytics if you give me access.</p>
              <p>The review covers three things.</p>
              <p>Where I think you actually are. Not where you think you are. Not where the algorithm tells you to think you are. Where you are based on what I see.</p>
              <p>The one bottleneck to fix first. Not a list of ten things. One. The thing that, if you fix it, the rest gets easier.</p>
              <p>The concrete next action this week. Specific. Doable. Something you can start before our first live call.</p>
              <p>I also send a private audio note pointing you to the document and naming the headline. You don&apos;t have to hunt for it.</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">The content checklist</h3>
            <div className="text-slate-300 space-y-3">
              <p>This is the specific step-by-step process I use to make every piece of content. The same one I follow when I sit down to film, write, or publish. You&apos;re not building your own workflow from scratch.</p>
              <p>When you sit down to create, you&apos;re not staring at a blank page wondering what to do first. You&apos;re working through the checklist with the bottleneck from your review in mind. Every video you make has every advantage to do well on the platform.</p>
            </div>
          </div>

          <p className="text-slate-300 text-base sm:text-lg">
            This is the difference between a paid Discord and this program. Communities give you peers. Courses give you frameworks. The review plus the checklist give you a clear read on your specific channel and a step-by-step path through every piece of content you make.
          </p>
        </section>

        {/* === REPEAT CTA #1 === */}
        <section className="mb-16">
          <button
            onClick={scrollToCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30 mb-3"
          >
            Join Now — $999
          </button>
          <p className="text-green-400 text-sm text-center">
            Founders rate. 50% off. Locks in for every future version.
          </p>
        </section>

        {/* === WHAT ELSE YOU GET === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
            What else you get for three months.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg mb-8">
            The personal review and the checklist hand you week one. Here&apos;s what comes after.
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Direct work with me</h3>
            <div className="text-slate-300 space-y-3">
              <p>90-minute live strategy session every week. Wednesdays at 2pm EST. Bring questions, videos, anything you&apos;re stuck on. I work through them live.</p>
              <p>Daily access to me in Discord between sessions. Drop your work and I&apos;ll give you a read on it.</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">The full system</h3>
            <div className="text-slate-300 space-y-3">
              <p>The course I&apos;m building drips into Discord starting your second week. Foundational principles, strategy, ideation, titles, thumbnails, scripting, hooks, production, and mindset. Nine docs total.</p>
              <p>Plus my full resource library. Every framework, every worksheet, every recap from past cohorts. Indexed by stage and by problem.</p>
            </div>
          </div>
        </section>

        {/* === WHO THIS IS FOR === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-tight">
            Who this is for. Who it&apos;s not.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4">This is for:</h3>
              <ul className="space-y-3">
                {isForList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-300">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-400 mb-4">This isn&apos;t for:</h3>
              <ul className="space-y-3">
                {isNotForList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-400">
                    <svg className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* === REPEAT CTA #2 === */}
        <section className="mb-16">
          <button
            onClick={scrollToCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30 mb-3"
          >
            Join Now — $999
          </button>
          <p className="text-green-400 text-sm text-center">
            Founders rate. 50% off. Locks in for every future version.
          </p>
        </section>

        {/* === REASON TO BELIEVE === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
            The risk is on me.
          </h2>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-10">
            <p className="text-slate-300 text-base sm:text-lg">
              Join the program. If 30 days in it&apos;s not for you, I refund you. No questions. No conditions. You walk away with your personal review either way.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-white mb-6">What creators are saying</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t, i) => (
              <blockquote
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-lg p-5"
              >
                <p className="text-slate-300 italic mb-3">&quot;{t.quote}&quot;</p>
                <footer className="text-sm">
                  <span className="text-white font-medium">— {t.name}</span>
                  <span className="text-slate-500">, {t.handle}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* === FOUNDER BLOCK === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
            Why I built this.
          </h2>
          <div className="text-slate-300 space-y-4 text-base sm:text-lg">
            <p>
              I launched my high-ticket program last year after about 35 conversations with creators. Almost every one of them said the same thing. &quot;I want to work with you. I&apos;m not at the spot where it makes sense to pay this much.&quot;
            </p>
            <p>
              I&apos;ve taken close to 200 applications since. Most of them aren&apos;t the right fit for the high-ticket. For most of my audience, it isn&apos;t the right offer.
            </p>
            <p>
              This program is the bridge. For the creators who aren&apos;t far in their journey yet, who want my systems, my attention, and my help, but who don&apos;t need the full one-on-one container.
            </p>
            <p>
              There are no barriers here. If you want to grow your channel, you are welcome.
            </p>
            <p>
              I think about YouTube all day. Constantly learning, reassessing, reverse-engineering content. Hours and hours every day. I enjoy helping. I can talk about this stuff all day long.
            </p>
            <p>
              I think I can help somebody who wants to follow in my footsteps and treat YouTube seriously.
            </p>
          </div>
        </section>

        {/* === FAQ === */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-tight">
            Common questions.
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === FINAL P.S. (only when window is open) === */}
        {windowState === 'open' && (
          <section className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
              One last thing.
            </h2>
            <div className="text-slate-300 space-y-4 text-base sm:text-lg mb-6">
              <p>
                The window closes {closeDay && closeTime ? `${closeDay} at ${closeTime} EST` : 'soon'}. After that, the next mini cohort opens at the same founders price.
              </p>
              <p>
                Eventually I launch the polished version. Target price is $1,999 for 6 months. That number could shift. Could be a month from now. Could be longer.
              </p>
              <p>
                Founders who join now lock in half off whatever the going rate becomes. Same dollars per month for as long as they stay.
              </p>
              <p>
                If you want the better price, come now. If you want to wait, come later. Both are fine.
              </p>
            </div>
            <button
              onClick={scrollToCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30 mb-3"
            >
              Join Now — $999
            </button>
            <p className="text-green-400 text-sm text-center">
              Founders rate. 50% off. Locks in for every future version.
            </p>
          </section>
        )}

        {/* === EXISTING CHECKOUT SECTION (preserved functionality) === */}
        <section id="checkout" className="scroll-mt-8 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
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
                Founders Edition. You save $999.
              </div>
              <p className="text-slate-500 text-xs mt-1">
                12 weeks of direct coaching. One-time payment.
              </p>
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

                  {/* Primary: Pay in Full */}
                  <div className="relative">
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

                  {/* Key details */}
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

          {/* Details link + contact */}
          <div className="mt-3 text-center space-y-2">
            <a
              href="https://docs.google.com/document/d/1s6-4kCsW94o9FM-nNoFPxJkGMwgjpqCPLmcxWEtNxTs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-400 text-xs underline block"
            >
              Full details about the program →
            </a>

            <p className="text-slate-600 text-xs">
              Questions?{' '}
              <a href="mailto:hello@boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
                hello@boundlesscreator.com
              </a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
