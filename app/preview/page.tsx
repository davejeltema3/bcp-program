'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from '@/components/CountdownTimer';
import WaitlistForm from '@/components/WaitlistForm';
import { questions } from '@/lib/questionnaire';
import QuestionCard from '@/components/QuestionCard';
import TextInput from '@/components/TextInput';
import MultipleChoice from '@/components/MultipleChoice';
import AnalyticsAccessGuide from '@/components/AnalyticsAccessGuide';

type Section = 'landing' | 'post-payment' | 'questionnaire' | 'insight' | 'admin';
type WindowState = 'before' | 'open' | 'after' | 'none';

export default function PreviewPage() {
  const [activeSection, setActiveSection] = useState<Section>('landing');
  const [landingSubTab, setLandingSubTab] = useState<'open' | 'before' | 'after' | 'invite'>('open');
  const [windowState, setWindowState] = useState<WindowState>('none');
  const [windowOpen, setWindowOpen] = useState<Date | null>(null);
  const [windowClose, setWindowClose] = useState<Date | null>(null);

  // Admin state
  const [adminSecret, setAdminSecret] = useState('');
  const [adminOpen, setAdminOpen] = useState('');
  const [adminClose, setAdminClose] = useState('');
  const [adminTz, setAdminTz] = useState('America/New_York');
  const [adminResult, setAdminResult] = useState<string>();
  const [adminLoading, setAdminLoading] = useState(false);
  const [autoNotify, setAutoNotify] = useState(false);

  // URL hash sync
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    if (hash === 'post-payment') setActiveSection('post-payment');
    else if (hash === 'questionnaire') setActiveSection('questionnaire');
    else if (hash === 'insight') setActiveSection('insight');
    else if (hash === 'admin') setActiveSection('admin');
    else if (hash.startsWith('landing/')) {
      setActiveSection('landing');
      const sub = hash.replace('landing/', '') as any;
      if (['open', 'before', 'after', 'invite'].includes(sub)) setLandingSubTab(sub);
    } else if (hash === 'landing') {
      setActiveSection('landing');
    }
  }, []);

  const updateHash = (section: Section, subTab?: string) => {
    if (section === 'landing') {
      window.location.hash = subTab ? `landing/${subTab}` : 'landing';
    } else {
      window.location.hash = section;
    }
  };

  useEffect(() => {
    const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
    const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;
    if (!openStr || !closeStr) { setWindowState('none'); return; }
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

  const handleAdminUpdate = async () => {
    if (!adminOpen || !adminClose || !adminSecret) return;
    setAdminLoading(true);
    setAdminResult(undefined);
    try {
      const response = await fetch('/api/admin/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: adminSecret,
          openDate: adminOpen,
          closeDate: adminClose,
          timezone: adminTz,
          notifyWaitlist: autoNotify,
        }),
      });
      const data = await response.json();
      if (data.success) {
        let msg = `✅ Window updated! Open: ${data.openUTC} → Close: ${data.closeUTC}. Redeploying (~30s).`;
        if (data.waitlistNotified) msg += `\n✅ Waitlist notified (${data.waitlistCount} subscribers tagged).`;
        else msg += `\n⏭️ Waitlist notification: disabled.`;
        if (data.warning) msg += `\n⚠️ ${data.warning}`;
        setAdminResult(msg);
      } else {
        setAdminResult(`❌ ${data.error || 'Failed'}`);
      }
    } catch { setAdminResult('❌ Failed to connect.'); }
    finally { setAdminLoading(false); }
  };

  const formatDate = (d: Date) => d.toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const sectionTabs: { id: Section; label: string }[] = [
    { id: 'landing', label: 'Landing Page' },
    { id: 'post-payment', label: 'Post-Payment' },
    { id: 'questionnaire', label: 'Questionnaire' },
    { id: 'insight', label: 'Boundless Insight' },
    { id: 'admin', label: 'Admin' },
  ];

  const landingSubTabs: { id: 'open' | 'before' | 'after' | 'invite'; label: string }[] = [
    { id: 'open', label: 'Window Open' },
    { id: 'before', label: 'Before Window' },
    { id: 'after', label: 'After Window' },
    { id: 'invite', label: 'Invite Page' },
  ];

  /* ─── Landing Page Preview ─── */
  const renderLanding = () => {
    const isInvite = landingSubTab === 'invite';
    const state = landingSubTab === 'open' ? 'open' : landingSubTab === 'before' ? 'before' : landingSubTab === 'after' ? 'after' : 'open';
    const stateLabel = landingSubTab === 'open' ? '🟢 Window Open — Full sales page with checkout' :
      landingSubTab === 'before' ? '⏳ Before Window — Countdown + waitlist at checkout' :
      landingSubTab === 'after' ? '🔴 After Window — Waitlist form at checkout' :
      '🔗 Invite Page — Bypasses window, always open';

    return (
      <div className="space-y-6">
        {/* Status banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-300">{stateLabel}</p>
          <p className="text-xs text-slate-500 mt-1">
            {isInvite
              ? 'URL: bcp.boundlesscreator.com/join — Send directly to people you want to let in outside the window.'
              : 'URL: bcp.boundlesscreator.com/ — Main landing page. Checkout section adapts to window state.'}
          </p>
        </div>

        {/* Embedded iframe preview */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-slate-400 font-mono">
              {isInvite ? '/join' : '/'}
            </span>
            <a
              href={isInvite ? '/join' : '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs underline"
            >
              Open in new tab →
            </a>
          </div>

          {/* Sales page structure outline */}
          <div className="bg-slate-950 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Page Sections (top to bottom)</h3>
            <div className="space-y-2">
              {[
                { name: 'Hero', desc: 'Headline, sub, stats (15 years / 65K subs / 100+ coached), price card, CTA, testimonial quote' },
                { name: 'Problem', desc: '"You\'re guessing because nobody\'s told you what\'s broken"' },
                { name: 'The Wedge (Week One)', desc: 'Personal review details (4 inputs → 3 outputs) + Content checklist' },
                { name: 'CTA #1', desc: 'Join Now — $999' },
                { name: 'What Else You Get', desc: 'Weekly live sessions + course drip (9 topics) + resource library' },
                { name: 'Who This Is For / Not For', desc: 'Two-column comparison' },
                { name: 'CTA #2', desc: 'Join Now — $999' },
                { name: 'Reason to Believe', desc: '30-day guarantee + 5 testimonials' },
                { name: 'Founder Block', desc: '"Why I built this" — personal story' },
                { name: 'FAQ', desc: '7 questions (pricing, format, refund, installment, etc.)' },
                ...(state === 'open' ? [{ name: 'Final P.S.', desc: 'Window close date, founders lock-in pitch, final CTA (only shows when window is open)' }] : []),
                { name: 'Checkout Section', desc: state === 'open'
                  ? 'Countdown timer + $999 pay button + $599×2 installment button + Stripe checkout'
                  : state === 'before'
                  ? 'Countdown timer to open + waitlist signup form'
                  : 'Waitlist signup form (window closed)' },
                { name: 'Footer', desc: '30-day guarantee reminder, full details link, contact email' },
              ].map((s, i) => (
                <div key={i} className="flex gap-3 bg-slate-900/50 border border-slate-800 rounded p-3">
                  <span className="text-blue-400 text-xs font-mono font-bold flex-shrink-0 mt-0.5 w-5">{i + 1}</span>
                  <div>
                    <span className="text-white text-sm font-medium">{s.name}</span>
                    <span className="text-slate-500 text-xs ml-2">— {s.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment options detail */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mt-4">
              <h4 className="text-white font-semibold text-sm mb-3">Checkout Options (when window is open)</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">PRIMARY</span>
                  <span className="text-slate-300 text-sm">Pay in full — $999 one-time → Stripe payment mode</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded">SECONDARY</span>
                  <span className="text-slate-300 text-sm">2 installments — $599 × 2 monthly → Stripe subscription, auto-cancels after 2 payments</span>
                </div>
              </div>
            </div>

            {/* What changes per state */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h4 className="text-white font-semibold text-sm mb-2">Current state: {landingSubTab}</h4>
              {landingSubTab === 'open' && (
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Countdown timer shows time until window closes</li>
                  <li>• Both payment buttons visible (full + installment)</li>
                  <li>• &quot;Final P.S.&quot; section visible with close date</li>
                  <li>• &quot;50% OFF&quot; badge on primary button</li>
                </ul>
              )}
              {landingSubTab === 'before' && (
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Countdown timer shows time until window opens</li>
                  <li>• Payment buttons replaced with waitlist form</li>
                  <li>• &quot;Final P.S.&quot; section hidden</li>
                </ul>
              )}
              {landingSubTab === 'after' && (
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• No countdown timer</li>
                  <li>• Payment buttons replaced with waitlist form</li>
                  <li>• &quot;Final P.S.&quot; section hidden</li>
                </ul>
              )}
              {landingSubTab === 'invite' && (
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Same sales page but at /join</li>
                  <li>• Bypasses window — checkout always available</li>
                  <li>• Send this URL directly to people you want in</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Post-Payment Tab ─── */
  const renderPostPayment = () => (
    <div className="space-y-8">
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-slate-400 font-mono">/welcome — Payment Confirmed</span>
          <a href="/welcome?test=true" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open test version →</a>
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 500 }}>
          <div className="w-full max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Welcome, Dave!</h1>
                <p className="text-lg text-slate-300">Your payment is confirmed. You&apos;re a founding member of the Boundless Creator Program.</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 text-left">
                <h2 className="text-lg font-semibold text-white mb-4">What Happens Next</h2>
                <ol className="space-y-4">
                  {[
                    { title: 'Check your email', desc: "You'll receive a welcome email with your Discord invite and everything you need to get started." },
                    { title: 'Fill out the questionnaire below', desc: "This is how I write your personal channel review. The more detail you give, the better the review." },
                    { title: 'Your channel review', desc: "I'll post it in Discord when it's ready." },
                    { title: 'First live session: Wednesday May 7 at 2 PM EST', desc: "Recurring Wednesdays. Recorded if you can't make it." },
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">{i+1}</span>
                      <div>
                        <div className="text-white font-medium">{step.title}</div>
                        <div className="text-slate-400 text-sm">{step.desc}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Your Onboarding Questionnaire</h2>
              <p className="text-slate-300 mb-2">This takes about 10-15 minutes. Your answers are how I write your personal channel review.</p>
              <p className="text-slate-400 text-sm mb-8">The more specific you are, the more useful the review. Don&apos;t rush it.</p>
              <button className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg opacity-75 cursor-default">Start Questionnaire →</button>
              <p className="text-slate-500 text-xs mt-4">Not ready right now? No problem. We&apos;ll email you a link to fill this out later.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">/welcome — Error State ❌</div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 250 }}>
          <div className="max-w-lg text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
              <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
              <p className="text-slate-400">We couldn&apos;t verify your payment. Don&apos;t worry — if you were charged, your payment is safe.</p>
              <p className="text-slate-400 mt-4">Please reach out to <span className="text-blue-400">hello@boundlesscreator.com</span> and I&apos;ll get you sorted right away.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Questionnaire Tab ─── */
  const renderQuestionnaire = () => (
    <div className="space-y-8">
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-slate-400 font-mono">/questionnaire — Multi-page flow ({questions.length} pages)</span>
          <a href="/questionnaire" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open in new tab →</a>
        </div>
        <div className="bg-slate-950 p-6">
          <p className="text-slate-400 text-sm mb-2">
            Shareable link: <code className="text-blue-400">bcp.boundlesscreator.com/questionnaire?email=their@email.com</code>
          </p>
          <p className="text-slate-400 text-sm">
            Kit tag &quot;BCP Questionnaire Submitted&quot; (19206526) applied on submit. Answers go to Google Form → Sheet.
          </p>
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="border border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
            Question {i + 1}/{questions.length}: {q.id}
            {q.type === 'multiple-choice' && <span className="ml-2 text-blue-400">[multiple-choice]</span>}
            {q.type === 'text' && <span className="ml-2 text-green-400">[text]</span>}
            {q.type === 'url' && <span className="ml-2 text-purple-400">[url]</span>}
            {q.type === 'textarea' && <span className="ml-2 text-yellow-400">[textarea]</span>}
          </div>
          <div className="bg-slate-950 relative">
            <div className="h-1 bg-slate-900">
              <div className="h-full bg-blue-500" style={{ width: `${((i + 1) / (questions.length + 1)) * 100}%` }} />
            </div>
            <div className="p-8">
              <QuestionCard
                question={q.question}
                subtext={q.subtext === 'ANALYTICS_ACCESS_STRUCTURED' ? undefined : q.subtext}
              >
                {q.subtext === 'ANALYTICS_ACCESS_STRUCTURED' && <AnalyticsAccessGuide />}
                {q.type === 'multiple-choice' && q.choices && (
                  <>
                    <MultipleChoice choices={q.choices} value="" onChange={() => {}} onNext={() => {}} />
                    {i > 0 && <button className="mt-6 px-6 py-3 text-slate-400 cursor-default">← Back</button>}
                  </>
                )}
                {q.type === 'textarea' && (
                  <>
                    <TextInput value="" onChange={() => {}} placeholder={q.placeholder} multiline={true} required={q.required} />
                    <div className="flex gap-4 mt-6">
                      {i > 0 && <button className="px-6 py-3 text-slate-400 cursor-default">← Back</button>}
                      <button className="flex-1 bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg opacity-50 cursor-default">
                        {i === questions.length - 1 ? 'Submit →' : 'Continue →'}
                      </button>
                    </div>
                  </>
                )}
                {(q.type === 'text' || q.type === 'url') && (
                  <>
                    <TextInput value="" onChange={() => {}} placeholder={q.placeholder} type={q.type === 'url' ? 'url' : 'text'} required={q.required} />
                    <div className="flex gap-4 mt-6">
                      {i > 0 && <button className="px-6 py-3 text-slate-400 cursor-default">← Back</button>}
                      <button className="flex-1 bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg opacity-50 cursor-default">Continue →</button>
                    </div>
                  </>
                )}
              </QuestionCard>
              <div className="mt-6 text-center text-slate-500 text-xs">Question {i + 1} of {questions.length}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Submission Complete</div>
        <div className="bg-slate-950 p-8 flex items-center justify-center" style={{ minHeight: 300 }}>
          <div className="max-w-lg text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Questionnaire submitted!</h2>
              <p className="text-slate-300 mb-4">I&apos;ll use your answers to write your personal channel review.</p>
              <p className="text-slate-400 text-sm">Check your email for the Discord invite.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Insight Tab ─── */
  const renderInsight = () => (
    <div className="space-y-8">
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-slate-400 font-mono">/insight — Boundless Insight Lead Magnet</span>
          <a href="/insight" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open in new tab →</a>
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 600 }}>
          <div className="w-full max-w-3xl">
            <div className="mb-8 flex justify-center">
              <div className="text-3xl font-bold text-blue-400 italic">Boundless Creator</div>
            </div>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4">Boundless Insight</h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                A free Chrome extension that gives you AI-powered analysis of any YouTube video&apos;s packaging — thumbnails, titles, and metadata — so you can learn what works and apply it to your own channel.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">What it does</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: '🎯', title: 'Packaging Analysis', desc: "AI-powered breakdown of any video's thumbnail, title, and metadata." },
                  { icon: '📊', title: 'Learn From Any Video', desc: 'Study what top creators do right and apply it to your own packaging.' },
                  { icon: '🔍', title: 'Actionable Feedback', desc: 'Not just "this is good" — specific notes you can act on.' },
                  { icon: '⚡', title: 'One Click', desc: 'Works right on any YouTube video page. No setup required.' },
                ].map((f, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 text-lg">{f.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">{f.title}</h3>
                      <p className="text-slate-400 text-sm">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-bold text-white mb-2 text-center">Get Boundless Insight</h3>
              <p className="text-slate-400 text-sm text-center mb-4">
                A free tool that gives you instant feedback on your YouTube thumbnails, titles, and descriptions.
              </p>
              <div className="max-w-md mx-auto space-y-3">
                <input type="text" placeholder="First name" disabled className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-500 cursor-default" />
                <input type="email" placeholder="Email address" disabled className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-500 cursor-default" />
                <button disabled className="w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg opacity-75 cursor-default">Get It Free</button>
              </div>
              <p className="text-slate-600 text-xs text-center mt-3">No spam. Unsubscribe anytime.</p>
            </div>
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-sm">
                Submits to Kit Form #9377397. Subscriber confirms email → redirected to Chrome Web Store download.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Admin Tab ─── */
  const renderAdmin = () => (
    <div className="space-y-8">
      {/* Current Window Status */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Current Window Status</div>
        <div className="bg-slate-950 p-6">
          {windowState === 'none' && <p className="text-yellow-400">⚠️ No window configured. Checkout is always open.</p>}
          {windowState === 'before' && windowOpen && (
            <div>
              <p className="text-blue-400 mb-2">⏳ Window not yet open</p>
              <p className="text-slate-400 text-sm">Opens: {formatDate(windowOpen)}</p>
              <p className="text-slate-400 text-sm mb-4">Closes: {formatDate(windowClose!)}</p>
              <CountdownTimer target={windowOpen} label="Opens in" onComplete={handleWindowOpened} />
            </div>
          )}
          {windowState === 'open' && windowClose && (
            <div>
              <p className="text-green-400 mb-2">🟢 Window is OPEN — checkout is live</p>
              <p className="text-slate-400 text-sm">Opened: {formatDate(windowOpen!)}</p>
              <p className="text-slate-400 text-sm mb-4">Closes: {formatDate(windowClose)}</p>
              <CountdownTimer target={windowClose} label="Closes in" onComplete={handleWindowClosed} />
            </div>
          )}
          {windowState === 'after' && (
            <div>
              <p className="text-red-400 mb-2">🔴 Window is CLOSED — checkout blocked</p>
              <p className="text-slate-400 text-sm">Closed: {formatDate(windowClose!)}</p>
            </div>
          )}
          <p className="text-slate-500 text-xs mt-4">Default: First Friday of each month 9AM EST → Sunday midnight EST. Server-side enforced.</p>
        </div>
      </div>

      {/* Update Window */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Update Window</div>
        <div className="bg-slate-950 p-6 space-y-4">
          <p className="text-slate-400 text-sm">Updates env vars via Vercel API and triggers a redeploy (~30 seconds).</p>
          <div>
            <label className="block text-white text-sm font-medium mb-1">Admin Secret</label>
            <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="Enter admin secret" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-1">Timezone</label>
            <select value={adminTz} onChange={(e) => setAdminTz(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
              <option value="America/New_York">Eastern (EST/EDT)</option>
              <option value="America/Chicago">Central (CST/CDT)</option>
              <option value="America/Denver">Mountain (MST/MDT)</option>
              <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-1">Window Opens</label>
              <input type="datetime-local" value={adminOpen} onChange={(e) => setAdminOpen(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-1">Window Closes</label>
              <input type="datetime-local" value={adminClose} onChange={(e) => setAdminClose(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
            <div>
              <div className="text-white text-sm font-medium">Auto-notify waitlist when window opens</div>
              <div className="text-slate-500 text-xs mt-0.5">Tags all &quot;BCP Waitlist Member&quot; subscribers, triggering your Kit email sequence</div>
            </div>
            <button onClick={() => setAutoNotify(!autoNotify)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoNotify ? 'bg-blue-600' : 'bg-slate-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoNotify ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {adminResult && <p className="text-sm whitespace-pre-line">{adminResult}</p>}
          <button onClick={handleAdminUpdate} disabled={adminLoading || !adminOpen || !adminClose || !adminSecret} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed">
            {adminLoading ? 'Updating...' : 'Update Window & Redeploy'}
          </button>
        </div>
      </div>

      {/* Generate Questionnaire Link */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Generate Questionnaire Link</div>
        <div className="bg-slate-950 p-6 space-y-4">
          <p className="text-slate-400 text-sm">Enter a member&apos;s info to generate a personalized questionnaire link you can send them.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white text-sm font-medium mb-1">Email</label>
              <input type="email" id="qlink-email" placeholder="their@email.com" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-1">First Name</label>
              <input type="text" id="qlink-name" placeholder="Their name" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const email = (document.getElementById('qlink-email') as HTMLInputElement)?.value;
                const name = (document.getElementById('qlink-name') as HTMLInputElement)?.value;
                if (!email) return;
                const params = new URLSearchParams();
                params.set('email', email);
                if (name) params.set('name', name);
                const url = `https://bcp.boundlesscreator.com/questionnaire?${params.toString()}`;
                navigator.clipboard.writeText(url);
                const el = document.getElementById('qlink-result');
                if (el) { el.textContent = url; el.classList.remove('hidden'); }
                const btn = document.getElementById('qlink-copied');
                if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = 'Generate & Copy Link'; }, 2000); }
              }}
              id="qlink-copied"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200"
            >
              Generate &amp; Copy Link
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const email = (document.getElementById('qlink-email') as HTMLInputElement)?.value;
                const name = (document.getElementById('qlink-name') as HTMLInputElement)?.value;
                if (!email) return;
                const params = new URLSearchParams();
                params.set('email', email);
                if (name) params.set('name', name);
                window.open(`/questionnaire?${params.toString()}`, '_blank');
              }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-6 py-2 rounded-lg transition-all duration-200 flex items-center"
            >
              Preview →
            </a>
          </div>
          <div id="qlink-result" className="hidden bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-blue-400 font-mono break-all" />
        </div>
      </div>

      {/* Quick Links */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Quick Links</div>
        <div className="bg-slate-950 p-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Landing Page', href: '/' },
              { label: 'Welcome / Post-Payment', href: '/welcome?test=true' },
              { label: 'Boundless Insight', href: '/insight' },
              { label: 'Invite Page (bypasses window)', href: '/join' },
              { label: 'Questionnaire', href: '/questionnaire' },
            ].map(link => (
              <a key={link.href} href={link.href} target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                {link.label} <span className="text-slate-600">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Kit Tags */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Kit Tags</div>
        <div className="bg-slate-950 p-6">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {[
                ['BCP Member', '8240961', 'Applied on payment (webhook)'],
                ['BCP Waitlist Member', '8231366', 'Waitlist signup'],
                ['BCP Questionnaire Submitted', '19206526', 'Stops reminder emails'],
                ['BCP Window Open Notification', '19208524', 'Applied when window opens with auto-notify'],
                ['Boundless Insight', '—', 'Kit Form #9377397 handles tagging'],
              ].map(([name, id, desc]) => (
                <tr key={name}>
                  <td className="py-2 text-white font-medium">{name}</td>
                  <td className="py-2 text-slate-500 font-mono">{id}</td>
                  <td className="py-2 text-slate-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Flows */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Payment Flows</div>
        <div className="bg-slate-950 p-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-white font-semibold text-sm mb-2">Full Payment — $999</h4>
            <p className="text-slate-400 text-sm">Stripe Checkout → payment mode → one-time charge → webhook fires → Kit tagged + Discord invite generated + Discord notification</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-white font-semibold text-sm mb-2">Installment — $599 × 2</h4>
            <p className="text-slate-400 text-sm">Stripe Checkout → subscription mode → $599 charged immediately → $599 charged 30 days later → auto-cancels after 2 payments (cancel_at set at creation)</p>
            <p className="text-slate-500 text-xs mt-1">No additional webhook needed — existing subscription lifecycle events handle notifications.</p>
          </div>
        </div>
      </div>

      {/* System Map */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">System Map</div>
        <div className="bg-slate-950 p-6">
          <p className="text-slate-400 text-sm mb-4">
            Full documentation of how everything connects — Stripe, Kit, Discord, webhooks, tags, and all the pages.
          </p>
          <a href="/system-map.md" target="_blank" className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-6 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View Full System Map <span className="text-slate-600">→</span>
          </a>
        </div>
      </div>
    </div>
  );

  const content = activeSection === 'landing' ? renderLanding()
    : activeSection === 'post-payment' ? renderPostPayment()
    : activeSection === 'questionnaire' ? renderQuestionnaire()
    : activeSection === 'insight' ? renderInsight()
    : renderAdmin();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">BCP Program — Preview & Admin</h1>
            <span className="text-sm text-slate-400">{questions.length} questions · Full funnel</span>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 mb-3">
            {sectionTabs.map((tab) => (
              <button key={tab.id} onClick={() => {
                setActiveSection(tab.id);
                if (tab.id === 'landing') setLandingSubTab('open');
                updateHash(tab.id);
              }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeSection === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tabs for Landing section */}
          {activeSection === 'landing' && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {landingSubTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setLandingSubTab(tab.id);
                    updateHash('landing', tab.id);
                  }}
                  className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                    landingSubTab === tab.id
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">{content}</div>
    </div>
  );
}
