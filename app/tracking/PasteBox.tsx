'use client';

import { useState, type CSSProperties } from 'react';

/**
 * Paste a video URL, get both its links tracked in one click. Talks to
 * /api/tracking/register, which mints registry rows as needed and rewrites the
 * description. The admin key is passed in from the (already key-gated) dashboard,
 * so nothing new is exposed here.
 */
export default function PasteBox({ adminKey }: { adminKey: string }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');

  async function submit() {
    const trimmed = url.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setErr('');
    setResult(null);
    try {
      const res = await fetch('/api/tracking/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, url: trimmed, apply: true }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setErr(j.error || `HTTP ${res.status}`);
      } else {
        setResult(j);
        setUrl('');
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
    setBusy(false);
  }

  const wrap: CSSProperties = {
    marginTop: 20,
    padding: 16,
    border: '1px solid var(--bc-ink-600, #2a3654)',
    borderRadius: 10,
    background: 'var(--bc-ink-800, #141d30)',
  };
  const input: CSSProperties = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--bc-ink-600, #2a3654)',
    background: 'var(--bc-ink-900, #0d1424)',
    color: 'var(--bc-text-100, #f4f6fb)',
    fontSize: 14,
    fontFamily: 'inherit',
  };
  const btn: CSSProperties = {
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: busy ? 'var(--bc-ink-600, #2a3654)' : 'var(--bc-blue-500, #2f6bff)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={wrap}>
      <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--bc-text-400, #6b7591)', marginBottom: 8 }}>
        Add tracked links to a video
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={input}
          placeholder="Paste a YouTube URL or video ID"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          disabled={busy}
        />
        <button style={btn} onClick={submit} disabled={busy}>
          {busy ? 'Working…' : 'Add links'}
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--bc-text-400, #6b7591)' }}>
        Swaps the plain program and Aug 13 live links for tracked /t links, creating registry rows if the video is new.
      </p>

      {err && (
        <p style={{ marginTop: 12, marginBottom: 0, color: 'var(--bc-red-400, #ff6b6b)', fontSize: 14 }}>
          {err}
        </p>
      )}

      {result && <ResultLine r={result} />}
    </div>
  );
}

function ResultLine({ r }: { r: any }) {
  const green = 'var(--bc-green-400, #5ce0a3)';
  const amber = 'var(--bc-amber-400, #ffcc66)';
  const dim = 'var(--bc-text-300, #9aa4be)';

  const linePart = (label: string, code: string | null, created: boolean, swapped: boolean) => {
    if (!code) return `${label}: no plain link found`;
    const state = created ? 'new code' : swapped ? 'tracked' : 'already tracked';
    return `${label}: /t/${code} (${state})`;
  };

  let headline = '';
  let color = green;
  if (r.tooLong) {
    headline = 'Over YouTube’s 5000-char limit — not written. Trim the description, then try again.';
    color = amber;
  } else if (r.applied) {
    headline = `Updated “${r.title}”.`;
  } else if (!r.changed) {
    headline = r.programCode || r.liveCode
      ? `“${r.title}” is already fully tracked — nothing to change.`
      : `No plain program or live link found in “${r.title}”.`;
    color = dim;
  } else {
    headline = 'Ready (dry run) — nothing written.';
    color = dim;
  }

  return (
    <div style={{ marginTop: 12, fontSize: 14 }}>
      <div style={{ color, fontWeight: 600 }}>{headline}</div>
      <div style={{ marginTop: 4, color: dim, fontSize: 13 }}>
        {linePart('Live', r.liveCode, r.liveCreated, r.liveSwapped)}
        {'  ·  '}
        {linePart('Program', r.programCode, r.programCreated, r.programSwapped)}
      </div>
    </div>
  );
}
