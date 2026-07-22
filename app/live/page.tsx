'use client';

import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';

/**
 * Live stream RSVP landing page.
 * Centered hero (headline + subhead + CTA + calendar), "Hold my seat" opens a
 * register modal. Frictionless: /api/live-rsvp registers active + enrolls in
 * the welcome sequence. Reusable monthly: change EVENT + the .ics file.
 */

const EVENT = {
  title: 'Live Channel Reviews with Dave',
  dateLabel: 'Thursday, August 13',
  timeLabel: '2:00 PM ET',
  platform: 'Live on Zoom',
  startISO: '2026-08-13T18:00:00Z',
  calYear: 2026,
  calMonthIndex: 7,
  eventDay: 13,
  monthLabel: 'August 2026',
  calStart: '20260813T180000Z',
  calEnd: '20260813T193000Z',
  zoom: 'https://us06web.zoom.us/j/87157268611',
  details: 'Live channel reviews and Q&A with Dave. Your Zoom link is in this event. Watch your inbox for a couple of reminders before we go live.',
  location: 'https://us06web.zoom.us/j/87157268611',
  icsUrl: '/live-aug-2026.ics',
};

const googleCalUrl =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=' + encodeURIComponent(EVENT.title) +
  '&dates=' + EVENT.calStart + '/' + EVENT.calEnd +
  '&details=' + encodeURIComponent(EVENT.details) +
  '&location=' + encodeURIComponent(EVENT.location);

const STYLES = `
.live-page {
  --bc-ink-900:#0b1220; --bc-ink-850:#0f1729; --bc-ink-800:#131c33;
  --bc-ink-700:#1c273f; --bc-ink-600:#2a3654; --bc-ink-500:#3d4a6b;
  --bc-text-100:#f4f6fb; --bc-text-200:#d6dcea; --bc-text-300:#9aa4be;
  --bc-text-400:#6b7591; --bc-text-500:#4a546d;
  --bc-blue-200:#8fbcff; --bc-blue-300:#5b9cff; --bc-blue-400:#3a85ff; --bc-blue-500:#1f6dff;
  --bc-blue-glow:rgba(58,133,255,0.32);
  --bc-green-400:#5ce0a3; --bc-green-glow:rgba(47,203,134,0.22);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  background: var(--bc-ink-900); color: var(--bc-text-200); min-height:100vh; position:relative; overflow-x:hidden;
}
.live-page * { box-sizing: border-box; }
.live-page strong { color: var(--bc-text-100); font-weight: 600; }
.live-page .blue-em { color:var(--bc-blue-300); font-weight:700; }
.live-page::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: linear-gradient(to right,rgba(255,255,255,.018) 1px,transparent 1px),
                    linear-gradient(to bottom,rgba(255,255,255,.018) 1px,transparent 1px);
  background-size: 64px 64px;
}
.live-page .container { max-width: 960px; margin: 0 auto; padding: 0 clamp(20px,5vw,40px); position: relative; z-index: 1; }

.live-page .btn-primary {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding: 13px 24px; border-radius: 12px; font: inherit; font-weight: 600; font-size: 15px; cursor: pointer;
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff;
  border:1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 32px -8px var(--bc-blue-glow);
  transition: background 120ms, transform 120ms;
}
.live-page .btn-primary:hover { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.live-page .btn-primary:active { transform: translateY(1px); }

.live-page .nav { position:sticky; top:0; z-index:40; background:rgba(7,11,20,.75); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--bc-ink-700); }
.live-page .nav__inner { max-width:1320px; margin:0 auto; padding:12px clamp(20px,5vw,40px); display:flex; align-items:center; justify-content:space-between; gap:20px; }
.live-page .nav .brand { font-family: var(--font-urbanist), 'Urbanist', 'Inter', sans-serif; font-size:22px; font-weight:700; color:var(--bc-blue-300); letter-spacing:-0.01em; text-decoration:none; }
.live-page .nav .nav-cta { padding:10px 16px; font-size:14px; }

.live-page .hero { text-align:center; padding: 34px 0 20px; position:relative; }
.live-page .hero__glow {
  position:absolute; top:-120px; left:50%; width:900px; height:460px; transform:translateX(-50%);
  background:radial-gradient(ellipse at center, rgba(58,133,255,0.18) 0%, rgba(58,133,255,0.08) 40%, rgba(58,133,255,0) 100%);
  pointer-events:none; filter:blur(40px);
}
.live-page .hero__inner { position:relative; }
.live-page .date-chip {
  display:inline-flex; align-items:center; gap:8px; margin:0 0 16px;
  padding:8px 16px; border-radius:999px; background:rgba(58,133,255,0.10); border:1px solid var(--bc-ink-600);
  color:var(--bc-blue-200); font-size:14px; font-weight:600;
}
.live-page .date-chip .dot { color: var(--bc-text-500); }
.live-page .hero h1 {
  font-size: clamp(32px, 4.8vw, 52px); font-weight: 600; letter-spacing: -0.025em;
  line-height: 1.06; color: var(--bc-text-100); margin: 0 auto 16px; max-width: 18ch;
}
.live-page .hero p.lead { font-size: 17px; line-height: 1.6; color: var(--bc-text-300); margin: 0 auto 24px; max-width: 54ch; }
.live-page .hero .cta-row { display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; }
.live-page .hero .cta-row .btn-primary { padding: 14px 28px; font-size: 16px; }
.live-page .hero .cta-note { font-size:13px; color:var(--bc-text-500); }

.live-page .cal { max-width:340px; margin:30px auto 0; border:1px solid var(--bc-ink-600); background: var(--bc-ink-800); border-radius:18px; padding: 20px; }
.live-page .cal__title { text-align:center; color:var(--bc-text-100); font-weight:600; font-size:14px; margin:0 0 12px; }
.live-page .cal__grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
.live-page .cal__dow { text-align:center; font-size:10px; color:var(--bc-text-500); padding:1px 0 5px; text-transform:uppercase; letter-spacing:0.04em; }
.live-page .cal__day { text-align:center; font-size:13px; color:var(--bc-text-300); padding:8px 0; border-radius:9px; border:1px solid transparent; }
.live-page button.cal__day { font:inherit; background:none; }
.live-page .cal__day.event {
  background:linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff; font-weight:700;
  cursor:pointer; box-shadow:0 6px 16px -6px var(--bc-blue-glow); transition:filter 120ms, transform 120ms;
}
.live-page .cal__day.event:hover { filter:brightness(1.09); }
.live-page .cal__day.event:active { transform:translateY(1px); }
.live-page .cal__away { text-align:center; font-size:12px; color:var(--bc-text-400); margin:14px 0 0; }
.live-page .cal__away b { color:var(--bc-text-100); font-weight:600; }

.live-page .section { padding: 44px 0; border-top: 1px solid var(--bc-ink-700); margin-top: 40px; }
.live-page .section h2 { text-align:center; font-size: clamp(24px,3.5vw,32px); font-weight:600; letter-spacing:-0.02em; color:var(--bc-text-100); margin:0 0 8px; }
.live-page .section .section-sub { text-align:center; color:var(--bc-text-400); font-size:15px; margin:0 auto 32px; max-width:48ch; }
.live-page .points { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; }
@media (max-width: 720px) { .live-page .points { grid-template-columns:1fr; max-width:420px; margin:0 auto; } }
.live-page .point { background: var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:14px; padding:22px; }
.live-page .point__icon { width:42px; height:42px; border-radius:11px; background:rgba(58,133,255,0.12); display:grid; place-items:center; font-size:21px; margin:0 0 12px; }
.live-page .point__title { color:var(--bc-text-100); font-weight:600; font-size:16px; margin:0 0 6px; }
.live-page .point__body { color:var(--bc-text-400); font-size:14px; line-height:1.55; margin:0; }

.live-page .final { text-align:center; padding: 8px 0 12px; }
.live-page .final h2 { font-size: clamp(24px,3.5vw,32px); font-weight:600; letter-spacing:-0.02em; color:var(--bc-text-100); margin:0 0 10px; }
.live-page .final p { color:var(--bc-text-300); font-size:16px; margin:0 auto 22px; max-width:44ch; }
.live-page .final .btn-primary { padding: 14px 30px; font-size:16px; }

.live-page .footer { text-align: center; color: var(--bc-text-500); font-size: 12px; padding: 28px 0 32px; border-top: 1px solid var(--bc-ink-700); margin-top: 40px; }
.live-page .footer a { color: var(--bc-text-400); text-decoration: none; }
.live-page .footer a:hover { color: var(--bc-text-200); }

.live-page .overlay { position:fixed; inset:0; z-index:50; background:rgba(6,9,18,0.72); -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
.live-page .modal { position:relative; width:100%; max-width:440px; background:var(--bc-ink-850); border:1px solid var(--bc-ink-600); border-radius:18px; padding:28px; box-shadow:0 30px 80px -20px rgba(0,0,0,0.7); }
.live-page .modal__close { position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:8px; border:none; background:none; color:var(--bc-text-400); cursor:pointer; font-size:20px; line-height:1; display:grid; place-items:center; }
.live-page .modal__close:hover { background:var(--bc-ink-700); color:var(--bc-text-100); }
.live-page .modal__eyebrow { font-family:"JetBrains Mono", ui-monospace, monospace; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--bc-blue-300); margin:0 0 10px; }
.live-page .modal h3 { font-size:24px; font-weight:600; color:var(--bc-text-100); margin:0 0 8px; letter-spacing:-0.02em; }
.live-page .modal .msub { font-size:14px; color:var(--bc-text-300); margin:0 0 18px; line-height:1.5; }
.live-page .modal form { display:flex; flex-direction:column; gap:10px; }
.live-page .modal input {
  appearance:none; width:100%; padding:13px 15px; border-radius:11px; background:var(--bc-ink-900);
  border:1px solid var(--bc-ink-600); color:var(--bc-text-100); font:inherit; font-size:15px; outline:none; transition:border-color 150ms;
}
.live-page .modal input:focus { border-color:var(--bc-blue-400); }
.live-page .modal input::placeholder { color:var(--bc-text-500); }
.live-page .modal button.submit {
  width:100%; padding:14px 20px; border-radius:11px; background:linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  color:#fff; font:inherit; font-weight:600; font-size:16px; border:1px solid rgba(255,255,255,0.08); cursor:pointer;
  box-shadow:0 8px 32px -8px var(--bc-blue-glow); transition:background 120ms, transform 120ms;
}
.live-page .modal button.submit:hover:not(:disabled) { background:linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.live-page .modal button.submit:disabled { opacity:0.6; cursor:not-allowed; }
.live-page .modal .err { color:#ff8a8a; font-size:13px; margin:2px 0 0; }
.live-page .modal .checks { display:flex; flex-wrap:wrap; gap:8px 16px; margin:14px 0 0; padding-top:14px; border-top:1px solid var(--bc-ink-700); font-size:12px; color:var(--bc-text-400); }
.live-page .modal .checks span { display:inline-flex; align-items:center; gap:5px; }
.live-page .modal .checks .ck { color:var(--bc-green-400); }
.live-page .modal .signoff2 { margin:12px 0 0; font-size:12px; color:var(--bc-text-500); }
.live-page .modal .signoff2 b { color:var(--bc-text-300); font-weight:600; }
.live-page .modal .cal-btns { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
.live-page .modal .cal-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 15px; border-radius:11px; font-size:13px; font-weight:600; text-decoration:none; cursor:pointer; border:1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff; }
.live-page .modal__ok { text-align:center; }
.live-page .modal__ok .ok-icon { width:56px; height:56px; border-radius:50%; background:rgba(47,203,134,0.16); color:var(--bc-green-400); display:grid; place-items:center; margin:4px auto 14px; }
.live-page .modal__ok h3 { text-align:center; }
.live-page .modal__ok p { color:var(--bc-text-300); font-size:14px; margin:0 0 4px; }
`;

function useCountdown(targetISO: string) {
  const [parts, setParts] = useState<{ d: number; done: boolean }>({ d: 0, done: false });
  useEffect(() => {
    const target = new Date(targetISO).getTime();
    const tick = () => {
      const total = target - Date.now();
      if (total <= 0) { setParts({ d: 0, done: true }); return; }
      setParts({ d: Math.floor(total / (1000 * 60 * 60 * 24)), done: false });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetISO]);
  return parts;
}

function MiniCalendar({ onPick }: { onPick: () => void }) {
  const firstWeekday = new Date(EVENT.calYear, EVENT.calMonthIndex, 1).getDay();
  const daysInMonth = new Date(EVENT.calYear, EVENT.calMonthIndex + 1, 0).getDate();
  const dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <>
      <p className="cal__title">{EVENT.monthLabel}</p>
      <div className="cal__grid">
        {dow.map((d) => <div key={d} className="cal__dow">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal__day" />;
          if (d === EVENT.eventDay) {
            return <button key={d} type="button" className="cal__day event" onClick={onPick} aria-label={`Event on ${EVENT.monthLabel} ${d}`}>{d}</button>;
          }
          return <div key={d} className="cal__day">{d}</div>;
        })}
      </div>
    </>
  );
}

export default function LivePage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const cd = useCountdown(EVENT.startISO);

  const awayLabel = cd.done ? 'Happening now' : cd.d > 0 ? `${cd.d} days away` : 'Today';

  const openModal = () => { setOpen(true); setError(undefined); };
  const closeModal = () => setOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/live-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: firstName || undefined }),
      });
      if (!response.ok) throw new Error('Failed to sign up');
      track('live_rsvp');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="live-page">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <nav className="nav">
        <div className="nav__inner">
          <a className="brand" href="https://www.boundlesscreator.com" target="_blank" rel="noopener noreferrer">Boundless Creator</a>
          <button className="btn-primary nav-cta" onClick={openModal}>Hold my seat</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero__glow" />
        <div className="container hero__inner">
          <div className="date-chip">
            {EVENT.dateLabel} <span className="dot">·</span> {EVENT.timeLabel} <span className="dot">·</span> {EVENT.platform}
          </div>
          <h1>Find out what&apos;s holding your channel back</h1>
          <p className="lead">
            I&apos;m going live to pull up real channels and show you what&apos;s working, what I&apos;d change, and the next move I&apos;d make. Bring yours and your questions. I&apos;d love to have you there.
          </p>
          <div className="cta-row">
            <button className="btn-primary" onClick={openModal}>Hold my seat</button>
            <span className="cta-note">Free · 90 minutes · Live on Zoom</span>
          </div>
          <div className="cal">
            <MiniCalendar onPick={openModal} />
            <p className="cal__away"><b>{awayLabel}</b>. Tap the 13th to hold your seat.</p>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <h2>What happens on the stream</h2>
          <p className="section-sub">No slides, no script. Come with your channel and your questions.</p>
          <div className="points">
            <div className="point">
              <div className="point__icon">🎥</div>
              <div className="point__title">Real reviews, not generic tips</div>
              <p className="point__body">I&apos;ll pull up real channels and give specific feedback you can steal for your own.</p>
            </div>
            <div className="point">
              <div className="point__icon">📺</div>
              <div className="point__title">Your channel could be up</div>
              <p className="point__body">Hold your seat and I&apos;ll send you a form to put yours in for a live review.</p>
            </div>
            <div className="point">
              <div className="point__icon">💬</div>
              <div className="point__title">Ask me anything, live</div>
              <p className="point__body">Bring your growth, packaging, and idea questions. I&apos;ll answer in real time.</p>
            </div>
          </div>
        </section>

        <section className="final">
          <h2>Grab a spot</h2>
          <p>It&apos;s free and it&apos;s live on Zoom. I&apos;d love to see you there.</p>
          <button className="btn-primary" onClick={openModal}>Hold my seat</button>
        </section>
      </div>

      <div className="footer">
        <a href="mailto:hello@boundlesscreator.com">Contact</a>
      </div>

      {open && (
        <div className="overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-label="Hold your seat">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={closeModal} aria-label="Close">×</button>
            {submitted ? (
              <div className="modal__ok">
                <div className="ok-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3>You&apos;re in!</h3>
                <p>You&apos;re on the list for the 13th. Add it to your calendar so the Zoom link is ready when we go live.</p>
                <div className="cal-btns">
                  <a className="cal-btn" href={googleCalUrl} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
                </div>
              </div>
            ) : (
              <>
                <p className="modal__eyebrow">{EVENT.dateLabel} · {EVENT.timeLabel}</p>
                <h3>Hold your seat</h3>
                <p className="msub">Drop your name and email and you&apos;re on the list. I&apos;ll send the Zoom link and a couple of reminders before we go live.</p>
                <form onSubmit={handleSubmit}>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@youremail.com" required />
                  {error && <p className="err">{error}</p>}
                  <button type="submit" className="submit" disabled={loading || !email}>
                    {loading ? 'Holding your seat...' : 'Hold my seat'}
                  </button>
                </form>
                <div className="checks">
                  <span><span className="ck">✓</span> Free</span>
                  <span><span className="ck">✓</span> Live on Zoom</span>
                  <span><span className="ck">✓</span> Channel reviews</span>
                </div>
                <p className="signoff2">See you there, <b>Dave</b> · Boundless Creator</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
