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
  const [iframeKey, setIframeKey] = useState(0); // force iframe reload on tab change

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
    { id: 'open', label: '🟢 Window Open' },
    { id: 'before', label: '⏳ Before Window' },
    { id: 'after', label: '🔴 After Window' },
    { id: 'invite', label: '🔗 Invite Page' },
  ];

  // Build iframe URL for landing page previews
  const getLandingIframeSrc = () => {
    if (landingSubTab === 'invite') return '/join';
    return `/?preview_state=${landingSubTab}`;
  };

  /* ─── Landing Page Preview ─── */
  const renderLanding = () => {
    const src = getLandingIframeSrc();
    const isInvite = landingSubTab === 'invite';

    return (
      <div className="space-y-4">
        {/* Info bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-sm font-mono">{isInvite ? '/join' : '/'}</span>
            <span className="text-slate-600 text-sm ml-2">—</span>
            <span className="text-slate-400 text-sm ml-2">
              {landingSubTab === 'open' && 'Full sales page with checkout buttons'}
              {landingSubTab === 'before' && 'Countdown to open + waitlist at checkout'}
              {landingSubTab === 'after' && 'Waitlist form at checkout section'}
              {landingSubTab === 'invite' && 'Bypasses window — checkout always available'}
            </span>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs underline flex-shrink-0 ml-4"
          >
            Open in new tab →
          </a>
        </div>

        {/* Iframe */}
        <div className="border border-slate-700 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
          <iframe
            key={`${landingSubTab}-${iframeKey}`}
            src={src}
            className="w-full h-full border-0"
            title={`Preview: ${landingSubTab}`}
          />
        </div>
      </div>
    );
  };

  /* ─── Post-Payment Tab ─── */
  const renderPostPayment = () => (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-slate-400 text-sm font-mono">/welcome</span>
        <a href="/welcome?test=true" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open in new tab →</a>
      </div>
      <div className="border border-slate-700 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
        <iframe
          src="/welcome?test=true"
          className="w-full h-full border-0"
          title="Preview: Post-Payment"
        />
      </div>
    </div>
  );

  /* ─── Questionnaire Tab ─── */
  const renderQuestionnaire = () => (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-slate-400 text-sm font-mono">/questionnaire</span>
          <span className="text-slate-600 text-sm ml-2">—</span>
          <span className="text-slate-400 text-sm ml-2">{questions.length} questions, multi-page flow</span>
        </div>
        <a href="/questionnaire" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open in new tab →</a>
      </div>
      <div className="border border-slate-700 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
        <iframe
          src="/questionnaire"
          className="w-full h-full border-0"
          title="Preview: Questionnaire"
        />
      </div>
    </div>
  );

  /* ─── Insight Tab ─── */
  const renderInsight = () => (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-slate-400 text-sm font-mono">/insight</span>
        <a href="/insight" target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline">Open in new tab →</a>
      </div>
      <div className="border border-slate-700 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
        <iframe
          src="/insight"
          className="w-full h-full border-0"
          title="Preview: Boundless Insight"
        />
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
          <p className="text-slate-500 text-xs mt-4">Server-side enforced. Update below to change.</p>
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

      {/* Payment Flows */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">Payment Flows</div>
        <div className="bg-slate-950 p-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-white font-semibold text-sm mb-2">Full Payment — $999</h4>
            <p className="text-slate-400 text-sm">Stripe Checkout → payment mode → one-time charge → webhook → Kit tagged + Discord invite + Discord notification</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-white font-semibold text-sm mb-2">Installment — $599 × 2</h4>
            <p className="text-slate-400 text-sm">Stripe Checkout → subscription mode → $599 charged immediately → webhook sets cancel_at (62 days) → $599 charged 30 days later → auto-cancels</p>
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

      {/* System Map */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-sm text-slate-400 font-mono">System Map</div>
        <div className="bg-slate-950 p-6">
          <p className="text-slate-400 text-sm mb-4">Full documentation of how everything connects.</p>
          <a href="/system-map.md" target="_blank" className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-6 py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View Full System Map →
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
                    setIframeKey(k => k + 1);
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
      <div className="max-w-7xl mx-auto px-4 py-4">{content}</div>
    </div>
  );
}
