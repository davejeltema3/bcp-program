'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from '@/components/CountdownTimer';
import WaitlistForm from '@/components/WaitlistForm';
import { questionnaire, sections } from '@/lib/questionnaire';

type Section = 'checkout' | 'post-payment' | 'questionnaire' | 'insight' | 'admin';
type WindowState = 'before' | 'open' | 'after' | 'none';

export default function PreviewPage() {
  const [activeSection, setActiveSection] = useState<Section>('checkout');
  const [windowState, setWindowState] = useState<WindowState>('none');
  const [windowOpen, setWindowOpen] = useState<Date | null>(null);
  const [windowClose, setWindowClose] = useState<Date | null>(null);

  // Admin state
  const [adminOpen, setAdminOpen] = useState('');
  const [adminClose, setAdminClose] = useState('');
  const [adminTz, setAdminTz] = useState('America/New_York');
  const [adminSecret, setAdminSecret] = useState('');
  const [adminResult, setAdminResult] = useState<string>();
  const [adminLoading, setAdminLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string>();
  const [notifyLoading, setNotifyLoading] = useState(false);

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

  const handleNotifyWaitlist = async () => {
    if (!adminSecret) { setNotifyResult('❌ Enter admin secret first.'); return; }
    if (!confirm('This will email ALL waitlist subscribers that the window is open. Continue?')) return;
    setNotifyLoading(true);
    setNotifyResult(undefined);
    try {
      const response = await fetch('/api/admin/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: adminSecret }),
      });
      const data = await response.json();
      setNotifyResult(data.success
        ? `✅ ${data.message}`
        : `❌ ${data.error || 'Failed'}`);
    } catch { setNotifyResult('❌ Failed to connect.'); }
    finally { setNotifyLoading(false); }
  };

  const handleAdminUpdate = async () => {
    if (!adminOpen || !adminClose || !adminSecret) return;
    setAdminLoading(true);
    setAdminResult(undefined);
    try {
      const response = await fetch('/api/admin/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: adminSecret, openDate: adminOpen, closeDate: adminClose, timezone: adminTz }),
      });
      const data = await response.json();
      setAdminResult(data.success
        ? `✅ Window updated! Open: ${data.openUTC} → Close: ${data.closeUTC}. Redeploying (~30s).`
        : `❌ ${data.error || 'Failed'}`);
    } catch { setAdminResult('❌ Failed to connect.'); }
    finally { setAdminLoading(false); }
  };

  const formatDate = (d: Date) => d.toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const sectionTabs: { id: Section; label: string }[] = [
    { id: 'checkout', label: 'Checkout / Landing' },
    { id: 'post-payment', label: 'Post-Payment' },
    { id: 'questionnaire', label: 'Questionnaire' },
    { id: 'insight', label: 'Boundless Insight' },
    { id: 'admin', label: 'Admin' },
  ];

  /* ─── Checkout Tab ─── */
  const renderCheckout = () => (
    <div className="space-y-8">
      {/* Window BEFORE state */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          / — Window Not Yet Open (waitlist + countdown)
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 700 }}>
          <div className="w-full max-w-2xl">
            {/* Logo placeholder */}
            <div className="mb-8 flex justify-center">
              <div className="text-3xl font-bold text-blue-400 italic">Boundless Creator</div>
            </div>

            {/* Timer */}
            <div className="text-center mb-6">
              <div className="text-sm text-slate-400 mb-3">Opens in</div>
              <div className="flex items-center justify-center gap-3">
                {[{v:'03',l:'days'},{v:'10',l:'hours'},{v:'18',l:'min'},{v:'42',l:'sec'}].map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg w-16 h-16 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white font-mono">{u.v}</span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1">{u.l}</span>
                    </div>
                    {i < 3 && <span className="text-slate-600 text-xl font-bold mb-4">:</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border-b border-slate-800 p-6">
                <div className="text-blue-400 text-sm font-medium mb-1">Founders Edition — 3 months</div>
                <h1 className="text-2xl font-bold text-white mb-2">Boundless Creator Program</h1>
                <p className="text-slate-300">Personal channel reviews, weekly live sessions, and direct access to Dave.</p>
              </div>
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white mb-4">What&apos;s Included</h2>
                <ul className="space-y-3">
                  {['Personal channel review in your first week','Weekly live session (Wednesdays 2 PM EST)','Full BCP resource library','Direct access to Dave in Discord','Founder\'s rate locked in for as long as you stay'].map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white mb-4">Payment</h2>
                <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Pay in Full</div>
                      <div className="text-sm text-slate-400 mt-0.5">One-time payment — no auto-renewal</div>
                    </div>
                    <div className="text-2xl font-bold text-white">$999</div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <WaitlistForm context="before" />
              </div>
            </div>

            <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
              <p className="text-slate-400 text-sm"><span className="text-white font-medium">30-Day Guarantee:</span> If you join and it&apos;s not for you, I refund you within 30 days. No questions, no conditions.</p>
            </div>
            <div className="mt-4 text-center">
              <span className="text-slate-500 text-xs underline">Full details about the program →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Window OPEN state */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          / — Window Open (checkout active)
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 700 }}>
          <div className="w-full max-w-2xl">
            <div className="mb-8 flex justify-center">
              <div className="text-3xl font-bold text-blue-400 italic">Boundless Creator</div>
            </div>
            <div className="text-center mb-6">
              <div className="text-sm text-slate-400 mb-3">Window closes in</div>
              <div className="flex items-center justify-center gap-3">
                {[{v:'02',l:'days'},{v:'14',l:'hours'},{v:'37',l:'min'},{v:'09',l:'sec'}].map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg w-16 h-16 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white font-mono">{u.v}</span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1">{u.l}</span>
                    </div>
                    {i < 3 && <span className="text-slate-600 text-xl font-bold mb-4">:</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border-b border-slate-800 p-6">
                <div className="text-blue-400 text-sm font-medium mb-1">Founders Edition — 3 months</div>
                <h1 className="text-2xl font-bold text-white mb-2">Boundless Creator Program</h1>
                <p className="text-slate-300">Personal channel reviews, weekly live sessions, and direct access to Dave.</p>
              </div>
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white mb-4">What&apos;s Included</h2>
                <ul className="space-y-3">
                  {['Personal channel review in your first week','Weekly live session (Wednesdays 2 PM EST)','Full BCP resource library','Direct access to Dave in Discord','Founder\'s rate locked in for as long as you stay'].map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white mb-4">Payment</h2>
                <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Pay in Full</div>
                      <div className="text-sm text-slate-400 mt-0.5">One-time payment — no auto-renewal</div>
                    </div>
                    <div className="text-2xl font-bold text-white">$999</div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <button className="w-full bg-blue-600 text-white font-semibold text-lg px-8 py-4 rounded-lg opacity-75 cursor-default">
                  Pay $999
                </button>
                <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secure payment powered by Stripe
                </div>
              </div>
            </div>
            <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
              <p className="text-slate-400 text-sm"><span className="text-white font-medium">30-Day Guarantee:</span> If you join and it&apos;s not for you, I refund you within 30 days. No questions, no conditions.</p>
            </div>
            <div className="mt-4 text-center space-y-3">
              <span className="text-slate-500 text-xs underline block">Full details about the program →</span>
              <span className="text-slate-500 text-xs underline">FAQ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Page Links</div>
        <div className="bg-slate-950 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <a href="/" target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Main Checkout <span className="text-slate-600">→</span>
            </a>
            <a href="/join" target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Invite Page (no window) <span className="text-slate-600">→</span>
            </a>
            <a href="/welcome?test=true" target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Post-Payment Test <span className="text-slate-600">→</span>
            </a>
          </div>
          <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-white text-sm font-medium mb-2">Subscription Mode</h4>
            <p className="text-slate-400 text-xs">
              {process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTION === 'true'
                ? '🟢 Quarterly auto-renew option is ENABLED — both one-time and subscription options shown.'
                : '⚪ Quarterly auto-renew is OFF. Set NEXT_PUBLIC_ENABLE_SUBSCRIPTION=true in Vercel to enable.'}
            </p>
          </div>
        </div>
      </div>

      {/* Window CLOSED state */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          / — Window Closed (waitlist mode)
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 600 }}>
          <div className="w-full max-w-2xl">
            <div className="mb-8 flex justify-center">
              <div className="text-3xl font-bold text-blue-400 italic">Boundless Creator</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border-b border-slate-800 p-6">
                <div className="text-blue-400 text-sm font-medium mb-1">Founders Edition — 3 months</div>
                <h1 className="text-2xl font-bold text-white mb-2">Boundless Creator Program</h1>
                <p className="text-slate-300">Personal channel reviews, weekly live sessions, and direct access to Dave.</p>
              </div>
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white mb-4">What&apos;s Included</h2>
                <ul className="space-y-3">
                  {['Personal channel review in your first week','Weekly live session (Wednesdays 2 PM EST)','Full BCP resource library','Direct access to Dave in Discord','Founder\'s rate locked in for as long as you stay'].map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white mb-4">Payment</h2>
                <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Pay in Full</div>
                      <div className="text-sm text-slate-400 mt-0.5">One-time payment — no auto-renewal</div>
                    </div>
                    <div className="text-2xl font-bold text-white">$999</div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <WaitlistForm context="after" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
                    { title: 'Your review arrives within a week', desc: "I'll send you an audio note when it's posted in Discord." },
                    { title: 'First live session: Wednesday May 6 at 2 PM EST', desc: "Recurring Wednesdays. Recorded if you can't make it." },
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

            {/* Questionnaire prompt */}
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
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          /welcome — Error State ❌
        </div>
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
          <span className="text-sm text-slate-400 font-mono">/questionnaire — Standalone (for email reminder links)</span>
          <a href="/questionnaire" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open in new tab →</a>
        </div>
        <div className="bg-slate-950 p-6">
          <p className="text-slate-400 text-sm mb-2">
            Shareable link: <code className="text-blue-400">bcp.boundlesscreator.com/questionnaire?email=their@email.com</code>
          </p>
          <p className="text-slate-400 text-sm">
            {questionnaire.length} questions across {sections.length} sections. Kit tag &quot;BCP Questionnaire Submitted&quot; applied on submit to stop reminder emails.
          </p>
        </div>
      </div>

      {sections.map((section) => {
        const qs = questionnaire.filter(q => q.section === section.id);
        return (
          <div key={section.id} className="border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
              Section {section.number}: {section.title} ({qs.length} {qs.length === 1 ? 'question' : 'questions'})
            </div>
            <div className="bg-slate-950 p-6 space-y-4">
              {qs.map(q => (
                <div key={q.id} className="border-l-2 border-slate-700 pl-4">
                  <div className="text-white text-sm font-medium">
                    {q.question || '(Analytics access section)'}
                    {q.required && <span className="text-red-400 ml-1">*</span>}
                  </div>
                  {q.subtext && <div className="text-slate-500 text-xs mt-0.5">{q.subtext}</div>}
                  <div className="text-slate-600 text-xs mt-1 font-mono">
                    id: {q.id} | type: {q.type}
                    {q.options && ` | options: ${q.options.map(o => o.value).join(', ')}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
              <div className="rounded-lg">
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
          {adminResult && <p className="text-sm">{adminResult}</p>}
          <button onClick={handleAdminUpdate} disabled={adminLoading || !adminOpen || !adminClose || !adminSecret} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed">
            {adminLoading ? 'Updating...' : 'Update Window & Redeploy'}
          </button>
        </div>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Quick Links</div>
        <div className="bg-slate-950 p-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Checkout Page', href: '/' },
              { label: 'Welcome / Post-Payment', href: '/welcome?test=true' },
              { label: 'Questionnaire', href: '/questionnaire' },
              { label: 'Boundless Insight', href: '/insight' },
              { label: 'Invite Page', href: '/join' },
            ].map(link => (
              <a key={link.href} href={link.href} target="_blank" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                {link.label} <span className="text-slate-600">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Notify Waitlist */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Notify Waitlist</div>
        <div className="bg-slate-950 p-6 space-y-4">
          <p className="text-slate-400 text-sm">
            Tags all &quot;BCP Waitlist Member&quot; subscribers with &quot;BCP Window Open Notification&quot; — which triggers the Kit email automation you set up.
          </p>
          <p className="text-slate-500 text-xs">
            ⚠️ Requires admin secret above. Uses Kit automation (tag ID: 19208524) — set up the email sequence in Kit first.
          </p>
          {notifyResult && <p className="text-sm">{notifyResult}</p>}
          <button onClick={handleNotifyWaitlist} disabled={notifyLoading || !adminSecret} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed">
            {notifyLoading ? 'Notifying...' : '📢 Notify Waitlist — Window is Open'}
          </button>
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
                ['BCP Window Open Notification', '19208524', 'Triggers "window open" email'],
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

  const content = activeSection === 'checkout' ? renderCheckout()
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
            <span className="text-sm text-slate-400">
              {questionnaire.length} questions · {sections.length} sections · Full funnel
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sectionTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeSection === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">{content}</div>
    </div>
  );
}
