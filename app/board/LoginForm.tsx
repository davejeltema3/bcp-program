'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/board/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      setErr('Wrong password.');
    } catch {
      setErr('Something went wrong. Try again.');
    }
    setBusy(false);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bc-ink-900, #0b1220)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 320,
          background: 'var(--bc-ink-800, #131c33)',
          border: '1px solid var(--bc-ink-600, #2a3654)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h1 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--bc-text-100, #f4f6fb)' }}>The Board</h1>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--bc-text-300, #9aa4be)' }}>
          Enter your password to open the dashboard.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--bc-ink-600, #2a3654)',
            background: 'var(--bc-ink-850, #0f1729)',
            color: 'var(--bc-text-100, #f4f6fb)',
            fontSize: 15,
            outline: 'none',
          }}
        />
        {err && <div style={{ color: '#e5484d', fontSize: 13, marginTop: 8 }}>{err}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--bc-blue-500, #1f6dff)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Checking…' : 'Open'}
        </button>
      </form>
    </main>
  );
}
