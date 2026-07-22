'use client';

import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';

/**
 * Live stream RSVP page.
 * Posts to /api/live-rsvp, which subscribes through the Kit "Livestream RSVP"
 * form (double opt-in) and tags on confirm. Reusable monthly: change the
 * EVENT object and the .ics file, everything else follows.
 */

const EVENT = {
  title: 'Live Channel Reviews with Dave',
  dateLabel: 'Thursday, August 13',
  timeLabel: '2:00 PM ET',
  platform: 'Live on Zoom',
  // Countdown target. 2:00 PM ET on Aug 13 2026 (EDT, UTC-4) = 18:00 UTC.
  startISO: '2026-08-13T18:00:00Z',
  // Mini-calendar (0-based month). Update these three for a new month.
  calYear: 2026,
  calMonthIndex: 7,
  eventDay: 13,
  monthLabel: 'August 2026',
  // Calendar stamps (UTC). 90 minute block.
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
  --bc-green-400:#5ce0a3;
  --bc-green-glow:rgba(47,203,134,0.22);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  background: var(--bc-ink-900);
  color: var(--bc-text-200);
  min-height: 100vh;
  position: relative;
}
.live-page::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: linear-gradient(to right,rgba(255,255,255,.018) 1px,transparent 1px),
                    linear-gradient(to bottom,rgba(255,255,255,.018) 1px,transparent 1px);
  background-size: 64px 64px;
}
.live-page * { box-sizing: border-box; }
.live-page strong { color: var(--bc-text-100); font-weight: 600; }
.live-page .blue-em { color:var(--bc-blue-300); font-weight:700; }

.live-page .container { max-width: 720px; margin: 0 auto; padding: 0 clamp(20px,5vw,48px); position: relative; z-index: 1; }

.live-page .top-strip {
  display:flex; justify-content:center; padding: 24px 0 0;
  font-family: var(--font-urbanist), 'Urbanist', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--bc-blue-300);
  letter-spacing: -0.01em;
}
.live-page .top-strip a { color: inherit; text-decoration: none; }

.live-page .hero { text-align: center; padding: 32px 0 40px; position: relative; }
.live-page .hero__glow {
  position:absolute; top:-100px; left:50%; width:900px; height:480px;
  transform:translateX(-50%);
  background:radial-gradient(ellipse at center,
    rgba(58,133,255,0.20) 0%, rgba(58,133,255,0.10) 40%, rgba(58,133,255,0) 100%);
  pointer-events:none; filter:blur(40px);
}
.live-page .hero__inner { position:relative; }
.live-page .date-chip {
  display:inline-flex; align-items:center; gap:8px; margin:0 0 20px;
  padding:8px 16px; border-radius:999px;
  background:rgba(58,133,255,0.10); border:1px solid var(--bc-ink-600);
  color:var(--bc-blue-200); font-size:14px; font-weight:600; letter-spacing:-0.01em;
}
.live-page .date-chip .dot { color: var(--bc-text-500); }
.live-page .hero h1 {
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 600; letter-spacing: -0.025em; line-height: 1.05;
  color: var(--bc-text-100); margin: 0 0 16px;
}
.live-page .hero p.lead {
  font-size: 17px; line-height: 1.6; color: var(--bc-text-300);
  max-width: 54ch; margin: 0 auto;
}

.live-page .cal { max-width: 320px; margin: 30px auto 0; padding: 18px; background: var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:16px; }
.live-page .cal__title { text-align:center; color:var(--bc-text-100); font-weight:600; font-size:15px; margin:0 0 14px; letter-spacing:-0.01em; }
.live-page .cal__grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
.live-page .cal__dow { text-align:center; font-size:11px; color:var(--bc-text-500); padding:2px 0 6px; text-transform:uppercase; letter-spacing:0.04em; }
.live-page .cal__day { text-align:center; font-size:13px; color:var(--bc-text-300); padding:8px 0; border-radius:9px; border:1px solid transparent; }
.live-page button.cal__day { font:inherit; background:none; }
.live-page .cal__day.event {
  background:linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff; font-weight:700;
  cursor:pointer; box-shadow:0 6px 18px -6px var(--bc-blue-glow); transition:filter 120ms, transform 120ms;
}
.live-page .cal__day.event:hover { filter:brightness(1.09); }
.live-page .cal__day.event:active { transform:translateY(1px); }
.live-page .cal__day.event.selected { outline:2px solid var(--bc-blue-200); outline-offset:2px; }
.live-page .cal__hint { text-align:center; font-size:12px; color:var(--bc-text-500); margin:14px 0 0; }
.live-page .cal__away { text-align:center; font-size:13px; color:var(--bc-text-300); margin:18px 0 0; }
.live-page .cal__away b { color:var(--bc-text-100); font-weight:600; }

.live-page .cal-btns { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:16px; }
.live-page .cal-btn {
  display:inline-flex; align-items:center; gap:8px; padding:12px 18px; border-radius:12px;
  font-size:14px; font-weight:600; text-decoration:none; cursor:pointer;
  border:1px solid var(--bc-ink-600); background:var(--bc-ink-900); color:var(--bc-text-100);
  transition: border-color 150ms, background 150ms;
}
.live-page .cal-btn:hover { border-color: var(--bc-blue-400); }
.live-page .cal-btn--primary {
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  border:1px solid rgba(255,255,255,0.08); color:#fff;
  box-shadow: 0 8px 32px -8px var(--bc-blue-glow);
}
.live-page .cal-btn--primary:hover { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); border-color:rgba(255,255,255,0.08); }

.live-page .features {
  background: var(--bc-ink-800); border: 1px solid var(--bc-ink-600);
  border-radius: 16px; padding: 32px; margin-bottom: 32px;
}
.live-page .features h2 {
  font-size: 22px; font-weight: 600; color: var(--bc-text-100);
  margin: 0 0 24px; letter-spacing: -0.01em;
}
.live-page .features__grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
@media (max-width: 640px) { .live-page .features__grid { grid-template-columns: 1fr; } }
.live-page .feature { display: flex; gap: 12px; }
.live-page .feature__icon {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
  background: rgba(58,133,255,0.12); display: grid; place-items: center; font-size: 20px;
}
.live-page .feature__title { color: var(--bc-text-100); font-weight: 600; font-size: 15px; margin: 0 0 4px; }
.live-page .feature__body { color: var(--bc-text-400); font-size: 13px; line-height: 1.5; margin: 0; }

.live-page .form-card {
  background: linear-gradient(180deg, var(--bc-ink-800), var(--bc-ink-850));
  border: 1px solid var(--bc-ink-600);
  border-radius: 16px; padding: 32px; margin-bottom: 32px;
  position: relative; overflow: hidden;
}
.live-page .form-card::before {
  content:""; position:absolute; top:-100px; right:-100px; width:300px; height:300px;
  background:radial-gradient(closest-side, rgba(58,133,255,0.14) 0%, rgba(58,133,255,0) 100%);
  filter:blur(36px); pointer-events:none;
}
.live-page .form-card h3 {
  font-size: 20px; font-weight: 600; color: var(--bc-text-100);
  margin: 0 0 8px; text-align: center; position: relative;
}
.live-page .form-card .sub {
  font-size: 14px; color: var(--bc-text-300); text-align: center; margin: 0 0 20px; position: relative;
}
.live-page form { display: flex; flex-direction: column; gap: 10px; max-width: 420px; margin: 0 auto; position: relative; }
.live-page form input {
  appearance: none; width: 100%; padding: 14px 16px; border-radius: 12px;
  background: var(--bc-ink-900); border: 1px solid var(--bc-ink-600);
  color: var(--bc-text-100); font: inherit; font-size: 15px; outline: none;
  transition: border-color 150ms;
}
.live-page form input:focus { border-color: var(--bc-blue-400); }
.live-page form input::placeholder { color: var(--bc-text-500); }
.live-page form button {
  width: 100%; padding: 14px 22px; border-radius: 12px;
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  color: #fff; font: inherit; font-weight: 600; font-size: 16px;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
  box-shadow: 0 8px 32px -8px var(--bc-blue-glow);
  transition: background 120ms ease, transform 120ms ease;
}
.live-page form button:hover:not(:disabled) { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.live-page form button:disabled { opacity: 0.6; cursor: not-allowed; }
.live-page form button:active { transform: translateY(1px); }
.live-page .err { color:#ff8a8a; font-size: 13px; margin: 4px 0 0; }
.live-page .nospam { color: var(--bc-text-500); font-size: 12px; text-align: center; margin: 14px 0 0; line-height:1.5; }

.live-page .success {
  background: rgba(47,203,134,0.08); border: 1px solid rgba(47,203,134,0.3);
  border-radius: 16px; padding: 40px; text-align: center;
}
.live-page .success__icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(47,203,134,0.16); color: var(--bc-green-400);
  display: grid; place-items: center; margin: 0 auto 16px;
}
.live-page .success h2 { font-size: 24px; color: var(--bc-text-100); margin: 0 0 8px; }
.live-page .success p { color: var(--bc-text-300); margin: 0 0 4px; }
.live-page .signoff { color: var(--bc-text-400); font-size: 13px; margin-top: 20px; }

.live-page .footer {
  text-align: center; color: var(--bc-text-500); font-size: 12px;
  padding: 24px 0 32px; border-top: 1px solid var(--bc-ink-700); margin-top: 32px;
}
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
      <a className="cal-btn" href={EVENT.icsUrl} download>Apple or Outlook (.ics)</a>
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
    <div className="cal">
      <p className="cal__title">{EVENT.monthLabel}</p>
      <div className="cal__grid">
        {dow.map((d) => <div key={d} className="cal__dow">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal__day" />;
          if (d === EVENT.eventDay) {
            return (
              <button
                key={d}
                type="button"
                className={`cal__day event${selected ? ' selected' : ''}`}
                onClick={onPick}
                aria-label={`Event on ${EVENT.monthLabel} ${d}`}
              >
                {d}
              </button>
            );
          }
          return <div key={d} className="cal__day">{d}</div>;
        })}
      </div>
    </div>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/live-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
        }),
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
        <a href="https://www.boundlesscreator.com" target="_blank" rel="noopener noreferrer">Boundless</a>
      </div>

      <section className="hero">
        <div className="hero__glow" />
        <div className="container hero__inner">
          <div className="date-chip">
            {EVENT.dateLabel} <span className="dot">·</span> {EVENT.timeLabel} <span className="dot">·</span> {EVENT.platform}
          </div>
          <h1>Live channel reviews <span className="blue-em">with Dave</span></h1>
          <p className="lead">
            It&apos;s my first live stream, and I want you there. I&apos;ll pull up real channels and tell you what&apos;s working and what I&apos;d change next. Grab your spot below.
          </p>

          <MiniCalendar selected={calOpen} onPick={() => setCalOpen((v) => !v)} />
          {calOpen ? (
            <>
              <p className="cal__hint">The Zoom link is inside. Claim your spot below so I can send reminders.</p>
              <CalendarButtons />
            </>
          ) : (
            <>
              <p className="cal__away"><b>{awayLabel}</b>. Tap the 13th to add it to your calendar.</p>
            </>
          )}
        </div>
      </section>

      <div className="container">
        {submitted ? (
          <div className="success">
            <div className="success__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Almost in.</h2>
            <p>Check your email and confirm your spot.</p>
            <p>Then add the event to your calendar below. The Zoom link is right inside it, so you can join in one tap when we go live:</p>
            <CalendarButtons />
            <p className="signoff">See you on the 13th.</p>
          </div>
        ) : (
          <>
            <section className="features">
              <h2>What to expect</h2>
              <div className="features__grid">
                <div className="feature">
                  <div className="feature__icon">🎥</div>
                  <div>
                    <div className="feature__title">Real channel reviews</div>
                    <p className="feature__body">I&apos;ll pull up channels live and break down what&apos;s working and what I&apos;d change.</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature__icon">📺</div>
                  <div>
                    <div className="feature__title">Submit for a review</div>
                    <p className="feature__body">Sign up and I&apos;ll email you a form to put your channel in for a live review.</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature__icon">💬</div>
                  <div>
                    <div className="feature__title">Ask me anything</div>
                    <p className="feature__body">Bring your questions about growth, packaging, or ideas. I&apos;ll answer in real time.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="form-card">
              <h3>Claim your spot</h3>
              <p className="sub">Save your seat for {EVENT.dateLabel} at {EVENT.timeLabel}.</p>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                />
                {error && <p className="err">{error}</p>}
                <button type="submit" disabled={loading || !email}>
                  {loading ? 'Saving your spot...' : 'Claim my spot'}
                </button>
              </form>
              <p className="nospam">
                Free. The Zoom link is in the calendar invite, and I&apos;ll send a couple of reminders before we go live. You&apos;ll get my weekly newsletter too. Unsubscribe anytime.
              </p>
            </section>
          </>
        )}

        <footer className="footer">
          <p>
            <a href="https://privacy.boundlesscreator.com">Privacy Policy</a>
            {' · '}
            <a href="mailto:hello@boundlesscreator.com">Contact</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
