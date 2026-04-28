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

  const renderCheckout = () => (
    <div className="space-y-8">
      {/* Window open state */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          / — Window Open (checkout active)
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 500 }}>
          <div className="w-full max-w-lg text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Boundless Creator Program</h1>
            <p className="text-green-400 text-sm font-medium mb-6">Founders Edition — $999 for 3 months</p>
            <div className="mb-6">
              <div className="text-sm text-slate-400 mb-3">Window closes in</div>
              <div className="flex items-center justify-center gap-3">
                {['02','14','37','09'].map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg w-16 h-16 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white font-mono">{v}</span>
                    </div>
                    {i < 3 && <span className="text-slate-600 text-xl font-bold mb-4">:</span>}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-[4.75rem] mt-1">
                {['days','hours','min','sec'].map(l => (
                  <span key={l} className="text-xs text-slate-500">{l}</span>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 text-left">
                <ul className="space-y-2.5">
                  {['Personal channel review in your first week','Weekly live session — Wednesdays 2 PM EST','Full BCP resource library','Direct access to Dave in Discord','Founder\'s rate locked in for as long as you stay'].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 pb-6">
                <button className="w-full bg-green-600 text-white font-semibold text-lg py-4 rounded-lg opacity-75 cursor-default">
                  Join — $999
                </button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure payment via Stripe
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-6 mb-3">30-day money-back guarantee. No questions, no conditions.</p>
            <span className="text-slate-500 text-xs underline">Full details about the program →</span>
          </div>
        </div>
      </div>

      {/* Window closed state */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          / — Window Closed (waitlist mode)
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 400 }}>
          <div className="w-full max-w-lg text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Boundless Creator Program</h1>
            <p className="text-green-400 text-sm font-medium mb-6">Founders Edition — $999 for 3 months</p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 text-left">
                <ul className="space-y-2.5">
                  {['Personal channel review in your first week','Weekly live session — Wednesdays 2 PM EST','Full BCP resource library','Direct access to Dave in Discord','Founder\'s rate locked in for as long as you stay'].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 pb-6">
                <WaitlistForm context="after" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPostPayment = () => (
    <div className="space-y-8">
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          /welcome — Payment Confirmed + Questionnaire Prompt
        </div>
        <div className="bg-slate-950 p-6">
          <p className="text-slate-400 text-sm mb-4">
            After Stripe payment succeeds, the member lands here. Shows confirmation, what happens next, and a button to start the onboarding questionnaire inline.
          </p>
          <a href="/welcome?test=true" target="_blank" className="text-blue-400 hover:text-blue-300 underline text-sm">
            Open test version in new tab →
          </a>
        </div>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          /welcome — Payment Confirmed ✅
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 400 }}>
          <div className="max-w-2xl text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Welcome, Dave!</h1>
              <p className="text-lg text-slate-300 mb-6">Your payment is confirmed. You&apos;re a founding member.</p>
              <div className="bg-slate-800/50 rounded-lg p-6 text-left">
                {['Check your email — Discord invite incoming','Fill out the questionnaire below','Your review arrives within a week','First live session: Wednesday May 6 at 2 PM EST'].map((step, i) => (
                  <div key={i} className="flex gap-3 mb-3 last:mb-0">
                    <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">{i+1}</span>
                    <span className="text-slate-300 text-sm mt-1">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          /welcome — Error State ❌
        </div>
        <div className="bg-slate-950 flex items-center justify-center p-8" style={{ minHeight: 300 }}>
          <div className="max-w-lg text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl">
              <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
              <p className="text-slate-400">We couldn&apos;t verify your payment. Reach out to <span className="text-blue-400">hello@boundlesscreator.com</span>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestionnaire = () => (
    <div className="space-y-8">
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
          /questionnaire — Standalone (for email reminder links)
        </div>
        <div className="bg-slate-950 p-6">
          <p className="text-slate-400 text-sm mb-2">
            Shareable link: <code className="text-blue-400">bcp.boundlesscreator.com/questionnaire?email=their@email.com</code>
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {questionnaire.length} questions across {sections.length} sections. Kit tag &quot;BCP Questionnaire Submitted&quot; applied on submit to stop reminder emails.
          </p>
          <a href="/questionnaire" target="_blank" className="text-blue-400 hover:text-blue-300 underline text-sm">
            Open in new tab →
          </a>
        </div>
      </div>

      {sections.map((section) => {
        const qs = questionnaire.filter(q => q.section === section.id);
        return (
          <div key={section.id} className="border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
              Section {section.number}: {section.title} ({qs.length} questions)
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

  const renderInsight = () => (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">
        /insight — Boundless Insight Lead Magnet Page
      </div>
      <div className="bg-slate-950 p-6">
        <p className="text-slate-400 text-sm mb-4">
          Email capture page for the Boundless Insight Chrome extension. Tags with &quot;Boundless Insight&quot; in Kit (tag ID: 19206528).
        </p>
        <a href="/insight" target="_blank" className="text-blue-400 hover:text-blue-300 underline text-sm">
          Open in new tab →
        </a>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="space-y-8">
      {/* Window Status */}
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
          <p className="text-slate-500 text-xs mt-4">
            Default: First Friday of each month 9AM EST → Sunday midnight EST. Server-side enforced.
          </p>
        </div>
      </div>

      {/* Window Controls */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Update Window</div>
        <div className="bg-slate-950 p-6 space-y-4">
          <p className="text-slate-400 text-sm">
            Updates env vars via Vercel API and triggers a redeploy (~30 seconds).
          </p>
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

      {/* Kit Tags */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Kit Tags</div>
        <div className="bg-slate-950 p-6">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {[
                ['BCP Member', '8240961', 'Applied on payment'],
                ['BCP Waitlist Member', '8231366', 'Waitlist signup'],
                ['BCP Questionnaire Submitted', '19206526', 'Stops reminder emails'],
                ['Boundless Insight', '19206528', '/insight email capture'],
              ].map(([name, id, desc]) => (
                <tr key={id}>
                  <td className="py-2 text-white font-medium">{name}</td>
                  <td className="py-2 text-slate-500 font-mono">{id}</td>
                  <td className="py-2 text-slate-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <h1 className="text-xl font-bold text-white">BCP Program — Preview</h1>
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
