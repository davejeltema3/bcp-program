'use client';

import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';

/**
 * Live stream RSVP landing page.
 * Applies the landing-page case study: outcome-led headline, above-the-fold
 * CTA, then supporting sections. Posts to /api/live-rsvp (Kit "Livestream
 * RSVP" form, double opt-in). Reusable monthly: change EVENT + the .ics file.
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
  details: 'Live channel reviews and Q&A with Dave. Join on Zoom: https://us06web.zoom.us/j/87157268611',
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
.live-page .container { max-width: 940px; margin: 0 auto; padding: 0 clamp(20px,5vw,40px); position: relative; z-index: 1; }

.live-page .top-strip {
  display:flex; justify-content:center; padding: 22px 0; position:relative; z-index:1;
  font-family: var(--font-urbanist), 'Urbanist', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--bc-blue-300); letter-spacing: -0.01em;
}
.live-page .top-strip a { color: inherit; text-decoration: none; }

.live-page .hero { text-align:center; padding: 20px 0 12px; position:relative; }
.live-page .hero__glow {
  position:absolute; top:-120px; left:50%; width:900px; height:460px; transform:translateX(-50%);
  background:radial-gradient(ellipse at center, rgba(58,133,255,0.18) 0%, rgba(58,133,255,0.08) 40%, rgba(58,133,255,0) 100%);
  pointer-events:none; filter:blur(40px);
}
.live-page .hero__inner { position:relative; }
.live-page .date-chip {
  display:inline-flex; align-items:center; gap:8px; margin:0 0 18px;
  padding:8px 16px; border-radius:999px; background:rgba(58,133,255,0.10); border:1px solid var(--bc-ink-600);
  color:var(--bc-blue-200); font-size:14px; font-weight:600;
}
.live-page .date-chip .dot { color: var(--bc-text-500); }
.live-page .hero h1 {
  font-size: clamp(32px, 5vw, 52px); font-weight: 600; letter-spacing: -0.025em;
  line-height: 1.05; color: var(--bc-text-100); margin: 0 auto 16px; max-width: 16ch;
}
.live-page .hero p.lead { font-size: 17px; line-height: 1.6; color: var(--bc-text-300); max-width: 56ch; margin: 0 auto; }

.live-page .hero-cols {
  display:grid; grid-template-columns: 1.05fr 0.95fr; gap: 22px; align-items:stretch;
  margin-top: 32px; text-align:left; max-width: 820px; margin-left:auto; margin-right:auto;
}
@media (max-width: 820px) { .live-page .hero-cols { grid-template-columns:1fr; max-width:440px; } }

.live-page .form-card {
  background: linear-gradient(180deg, var(--bc-ink-800), var(--bc-ink-850));
  border: 1px solid var(--bc-ink-600); border-radius: 16px; padding: 26px;
  position: relative; overflow: hidden; display:flex; flex-direction:column; justify-content:center;
}
.live-page .form-card::before {
  content:""; position:absolute; top:-100px; right:-100px; width:280px; height:280px;
  background:radial-gradient(closest-side, rgba(58,133,255,0.14) 0%, rgba(58,133,255,0) 100%);
  filter:blur(36px); pointer-events:none;
}
.live-page .form-card h3 { font-size: 19px; font-weight: 600; color: var(--bc-text-100); margin: 0 0 4px; text-align:center; position:relative; }
.live-page .form-card .sub { font-size: 13px; color: var(--bc-text-300); text-align:center; margin: 0 0 16px; position:relative; }
.live-page form { display: flex; flex-direction: column; gap: 10px; position: relative; }
.live-page form input {
  appearance: none; width: 100%; padding: 13px 15px; border-radius: 11px;
  background: var(--bc-ink-900); border: 1px solid var(--bc-ink-600);
  color: var(--bc-text-100); font: inherit; font-size: 15px; outline: none; transition: border-color 150ms;
}
.live-page form input:focus { border-color: var(--bc-blue-400); }
.live-page form input::placeholder { color: var(--bc-text-500); }
.live-page form button {
  width: 100%; padding: 14px 20px; border-radius: 11px;
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  color: #fff; font: inherit; font-weight: 600; font-size: 16px;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
  box-shadow: 0 8px 32px -8px var(--bc-blue-glow); transition: background 120ms, transform 120ms;
}
.live-page form button:hover:not(:disabled) { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.live-page form button:disabled { opacity: 0.6; cursor: not-allowed; }
.live-page form button:active:not(:disabled) { transform: translateY(1px); }
.live-page .err { color:#ff8a8a; font-size: 13px; margin: 2px 0 0; }
.live-page .nospam { color: var(--bc-text-500); font-size: 11px; text-align: center; margin: 12px 0 0; line-height:1.5; }

.live-page .cal { border:1px solid var(--bc-ink-600); background: var(--bc-ink-800); border-radius:16px; padding: 20px; display:flex; flex-direction:column; justify-content:center; }
.live-page .cal__title { text-align:center; color:var(--bc-text-100); font-weight:600; font-size:14px; margin:0 0 12px; }
.live-page .cal__grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
.live-page .cal__dow { text-align:center; font-size:10px; color:var(--bc-text-500); padding:1px 0 5px; text-transform:uppercase; letter-spacing:0.04em; }
.live-page .cal__day { text-align:center; font-size:13px; color:var(--bc-text-300); padding:7px 0; border-radius:9px; border:1px solid transparent; }
.live-page button.cal__day { font:inherit; background:none; }
.live-page .cal__day.event {
  background:linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff; font-weight:700;
  cursor:pointer; box-shadow:0 6px 16px -6px var(--bc-blue-glow); transition:filter 120ms, transform 120ms;
}
.live-page .cal__day.event:hover { filter:brightness(1.09); }
.live-page .cal__day.event:active { transform:translateY(1px); }
.live-page .cal__day.event.selected { outline:2px solid var(--bc-blue-200); outline-offset:2px; }
.live-page .cal__away { text-align:center; font-size:12px; color:var(--bc-text-400); margin:14px 0 0; }
.live-page .cal__away b { color:var(--bc-text-100); font-weight:600; }
.live-page .cal-btns { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:14px; }
.live-page .cal-btn {
  display:inline-flex; align-items:center; gap:8px; padding:11px 15px; border-radius:11px;
  font-size:13px; font-weight:600; text-decoration:none; cursor:pointer;
  border:1px solid var(--bc-ink-600); background:var(--bc-ink-900); color:var(--bc-text-100); transition: border-color 150ms;
}
.live-page .cal-btn:hover { border-color: var(--bc-blue-400); }
.live-page .cal-btn--primary { background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); border:1px solid rgba(255,255,255,0.08); color:#fff; box-shadow: 0 8px 32px -8px var(--bc-blue-glow); }
.live-page .cal-btn--primary:hover { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }

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
.live-page .final button {
  padding: 14px 30px; border-radius: 12px; font: inherit; font-weight:600; font-size:16px; cursor:pointer;
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff;
  border:1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 32px -8px var(--bc-blue-glow); transition: background 120ms, transform 120ms;
}
.live-page .final button:hover { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.live-page .final button:active { transform: translateY(1px); }

.live-page .success {
  max-width: 480px; margin: 24px auto 0;
  background: rgba(47,203,134,0.08); border: 1px solid rgba(47,203,134,0.3);
  border-radius: 16px; padding: 36px; text-align: center;
}
.live-page .success__icon { width: 60px; height: 60px; border-radius: 50%; background: rgba(47,203,134,0.16); color: var(--bc-green-400); display: grid; place-items: center; margin: 0 auto 16px; }
.live-page .success h2 { font-size: 24px; color: var(--bc-text-100); margin: 0 0 8px; }
.live-page .success p { color: var(--bc-text-300); margin: 0 0 4px; }
.live-page .signoff { color: var(--bc-text-400); font-size: 13px; margin-top: 18px; }

.live-page .footer { text-align: center; color: var(--bc-text-500); font-size: 12px; padding: 28px 0 32px; border-top: 1px solid var(--bc-ink-700); margin-top: 40px; }
.live-page .footer a { color: var(--bc-text-400); text-decoration: none; }
.live-page .footer a:hover { color: var(--bc-text-200); }
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

function CalendarButtons() {
  return (
    <div className="cal-btns">
      <a className="cal-btn cal-btn--primary" href={googleCalUrl} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
      <a className="cal-btn" href={EVENT.icsUrl} download>Apple / Outlook (.ics)</a>
    </div>
  );
}

function MiniCalendar({ selected, onPick }: { selected: boolean; onPick: () => void }) {
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
            return (
              <button key={d} type="button" className={`cal__day event${selected ? ' selected' : ''}`} onClick={onPick} aria-label={`Event on ${EVENT.monthLabel} ${d}`}>
                {d}
              </button>
            );
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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [calOpen, setCalOpen] = useState(false);
  const cd = useCountdown(EVENT.startISO);

  const awayLabel = cd.done ? 'Happening now' : cd.d > 0 ? `${cd.d} days away` : 'Today';

  const scrollToForm = () => document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

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

      <div className="top-strip">
        <a href="https://www.boundlesscreator.com" target="_blank" rel="noopener noreferrer">Boundless Creator</a>
      </div>

      <section className="hero">
        <div className="hero__glow" />
        <div className="container hero__inner">
          <div className="date-chip">
            {EVENT.dateLabel} <span className="dot">·</span> {EVENT.timeLabel} <span className="dot">·</span> {EVENT.platform}
          </div>
          <h1>Find out what&apos;s holding your channel back</h1>
          <p className="lead">
            I&apos;m going live to pull up real channels and show you what&apos;s working, what I&apos;d change, and the next move I&apos;d make. It&apos;s my first live stream, and I want you there.
          </p>

          {submitted ? (
            <div className="success">
              <div className="success__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2>Almost in.</h2>
              <p>Check your email and confirm your spot. The Zoom link is in the calendar invite below, so you can join in one tap.</p>
              <CalendarButtons />
              <p className="signoff">See you on the 13th.</p>
            </div>
          ) : (
            <div className="hero-cols">
              <div className="form-card" id="claim">
                <h3>Claim your spot</h3>
                <p className="sub">Free. Save your seat for {EVENT.dateLabel}.</p>
                <form onSubmit={handleSubmit}>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
                  {error && <p className="err">{error}</p>}
                  <button type="submit" disabled={loading || !email}>
                    {loading ? 'Saving your spot...' : 'Claim my spot'}
                  </button>
                </form>
                <p className="nospam">The Zoom link is in the calendar invite, plus a couple of reminders. You&apos;ll get my weekly newsletter too.</p>
              </div>

              <div className="cal">
                <MiniCalendar selected={calOpen} onPick={() => setCalOpen((v) => !v)} />
                {calOpen ? (
                  <CalendarButtons />
                ) : (
                  <p className="cal__away"><b>{awayLabel}</b>. Tap the 13th to add it to your calendar.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {!submitted && (
        <>
          <div className="container">
            <section className="section">
              <h2>What happens on the stream</h2>
              <p className="section-sub">A first-time, no-script live stream. Come with your channel and your questions.</p>
              <div className="points">
                <div className="point">
                  <div className="point__icon">🎥</div>
                  <div className="point__title">Real reviews, not generic tips</div>
                  <p className="point__body">I&apos;ll pull up real channels and give specific feedback you can steal for your own.</p>
                </div>
                <div className="point">
                  <div className="point__icon">📺</div>
                  <div className="point__title">Your channel could be up</div>
                  <p className="point__body">Sign up and I&apos;ll send you a form to put yours in for a live review.</p>
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
              <p>It&apos;s free and it&apos;s my first one. I&apos;d love to see you there.</p>
              <button type="button" onClick={scrollToForm}>Claim my spot</button>
            </section>
          </div>

          <div className="footer">
            <a href="https://privacy.boundlesscreator.com">Privacy</a>
            {' · '}
            <a href="mailto:hello@boundlesscreator.com">Contact</a>
          </div>
        </>
      )}
    </div>
  );
}
