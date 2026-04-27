'use client';

import { useState, useEffect, useCallback } from 'react';
import CountdownTimer from '@/components/CountdownTimer';

type WindowState = 'before' | 'open' | 'after' | 'none';

export default function PreviewPage() {
  const [logoError, setLogoError] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>('none');
  const [windowOpen, setWindowOpen] = useState<Date | null>(null);
  const [windowClose, setWindowClose] = useState<Date | null>(null);

  // Admin panel state
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState('');
  const [adminClose, setAdminClose] = useState('');
  const [adminTz, setAdminTz] = useState('America/New_York');
  const [adminSecret, setAdminSecret] = useState('');
  const [adminResult, setAdminResult] = useState<string>();
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
    const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;

    if (!openStr || !closeStr) {
      setWindowState('none');
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
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAdminResult(`✅ Window updated! Open: ${data.openUTC} → Close: ${data.closeUTC}. Redeploying now (~30 seconds).`);
      } else {
        setAdminResult(`❌ ${data.error || 'Failed to update'}`);
      }
    } catch (err) {
      setAdminResult('❌ Failed to connect. Check your internet.');
    } finally {
      setAdminLoading(false);
    }
  };

  const formatDate = (d: Date) => d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {!logoError && (
          <div className="mb-6 flex justify-center">
            <img
              src="/images/logo.png"
              alt="Boundless Creator"
              onError={() => setLogoError(true)}
              className="max-h-[60px] object-contain"
            />
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-xl mb-8">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">BCP Preview & Admin</h1>

          {/* Current Window Status */}
          <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Current Window Status</h2>

            {windowState === 'none' && (
              <p className="text-yellow-400">⚠️ No window configured. Checkout is always open.</p>
            )}
            {windowState === 'before' && windowOpen && (
              <div>
                <p className="text-blue-400 mb-3">⏳ Window not yet open</p>
                <p className="text-slate-400 text-sm mb-1">Opens: {formatDate(windowOpen)}</p>
                <p className="text-slate-400 text-sm mb-4">Closes: {formatDate(windowClose!)}</p>
                <CountdownTimer target={windowOpen} label="Opens in" onComplete={handleWindowOpened} />
              </div>
            )}
            {windowState === 'open' && windowClose && (
              <div>
                <p className="text-green-400 mb-3">🟢 Window is OPEN — checkout is live</p>
                <p className="text-slate-400 text-sm mb-1">Opened: {formatDate(windowOpen!)}</p>
                <p className="text-slate-400 text-sm mb-4">Closes: {formatDate(windowClose)}</p>
                <CountdownTimer target={windowClose} label="Closes in" onComplete={handleWindowClosed} />
              </div>
            )}
            {windowState === 'after' && (
              <div>
                <p className="text-red-400 mb-3">🔴 Window is CLOSED — checkout is blocked</p>
                <p className="text-slate-400 text-sm">Closed: {formatDate(windowClose!)}</p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Pages</h2>
            <ul className="space-y-2">
              <li><a href="/" className="text-blue-400 hover:text-blue-300 underline">/ — Landing page</a></li>
              <li><a href="/checkout" className="text-blue-400 hover:text-blue-300 underline">/checkout — Checkout page</a></li>
              <li><a href="/welcome?test=true" className="text-blue-400 hover:text-blue-300 underline">/welcome — Post-payment + questionnaire (test mode)</a></li>
              <li><a href="/questionnaire" className="text-blue-400 hover:text-blue-300 underline">/questionnaire — Standalone questionnaire</a></li>
              <li><a href="/insight" className="text-blue-400 hover:text-blue-300 underline">/insight — Boundless Insight landing page</a></li>
            </ul>
          </div>

          {/* Admin Panel */}
          <div className="bg-slate-800/50 rounded-lg p-6">
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="text-lg font-semibold text-white flex items-center gap-2"
            >
              {showAdmin ? '▼' : '►'} Window Admin
            </button>

            {showAdmin && (
              <div className="mt-4 space-y-4">
                <p className="text-slate-400 text-sm">
                  Set the purchase window. This updates the Vercel environment variables and triggers a redeploy (~30 seconds).
                </p>

                <div>
                  <label className="block text-white text-sm font-medium mb-1">Admin Secret</label>
                  <input
                    type="password"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Enter admin secret"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-1">Timezone</label>
                  <select
                    value={adminTz}
                    onChange={(e) => setAdminTz(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
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
                    <input
                      type="datetime-local"
                      value={adminOpen}
                      onChange={(e) => setAdminOpen(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-1">Window Closes</label>
                    <input
                      type="datetime-local"
                      value={adminClose}
                      onChange={(e) => setAdminClose(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {adminResult && (
                  <p className="text-sm">{adminResult}</p>
                )}

                <button
                  onClick={handleAdminUpdate}
                  disabled={adminLoading || !adminOpen || !adminClose || !adminSecret}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {adminLoading ? 'Updating...' : 'Update Window & Redeploy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
