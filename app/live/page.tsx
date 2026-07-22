'use client';

import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';

/**
 * Live stream RSVP page. Designed to fit one screen with no scroll.
 * Posts to /api/live-rsvp (Kit "Livestream RSVP" form, double opt-in).
 * Reusable monthly: change the EVENT object and the .ics file.
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
  background: var(--bc-ink-900); color: var(--bc-text-200);
}
.live-page * { box-sizing: border-box; }
.live-page strong { color: var(--bc-text-100); font-weight: 600; }
.live-page .blue-em { color:var(--bc-blue-300); font-weight:700; }

.live-page .wrap {
  min-height: 100vh; display: flex; flex-direction: column;
  padding: 0 clamp(16px,4vw,40px); position: relative; overflow: hidden;
}
.live-page .wrap::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: linear-gradient(to right,rgba(255,255,255,.018) 1px,transparent 1px),
                    linear-gradient(to bottom,rgba(255,255,255,.018) 1px,transparent 1px);
  background-size: 64px 64px;
}
.live-page .glow {
  position:absolute; top:-160px; left:50%; width:900px; height:460px; transform:translateX(-50%);
  background:radial-gradient(ellipse at center, rgba(58,133,255,0.18) 0%, rgba(58,133,255,0.08) 40%, rgba(58,133,255,0) 100%);
  pointer-events:none; filter:blur(40px); z-index:0;
}
.live-page .top-strip {
  display:flex; justify-content:center; padding: 18px 0 0; position:relative; z-index:1;
  font-family: var(--font-urbanist), 'Urbanist', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--bc-blue-300); letter-spacing: -0.01em;
}
.live-page .top-strip a { color: inherit; text-decoration: none; }
.live-page .stage {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; position: relative; z-index: 1; padding: 16px 0;
}
.live-page .inner { width: 100%; max-width: 900px; }

.live-page .date-chip {
  display:inline-flex; align-items:center; gap:8px; margin:0 0 14px;
  padding:7px 15px; border-radius:999px;
  background:rgba(58,133,255,0.10); border:1px solid var(--bc-ink-600);
  color:var(--bc-blue-200); font-size:13px; font-weight:600;
}
.live-page .date-chip .dot { color: var(--bc-text-500); }
.live-page h1 {
  font-size: clamp(28px, 4.4vw, 46px); font-weight: 600; letter-spacing: -0.025em;
  line-height: 1.06; color: var(--bc-text-100); margin: 0 0 12px;
}
.live-page p.lead { font-size: 15px; line-height: 1.55; color: var(--bc-text-300); max-width: 52ch; margin: 0 auto; }

.live-page .cols {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  align-items: center; margin-top: 22px; text-align: left;
}
@media (max-width: 760px) { .live-page .cols { grid-template-columns: 1fr; gap: 16px; max-width: 420px; margin-left:auto; margin-right:auto; } }
.live-page .col-form { order: 1; }
.live-page .col-cal { order: 2; }
@media (min-width: 761px) { .live-page .col-cal { order: 1; } .live-page .col-form { order: 2; } }

.live-page .cal { padding: 16px; background: var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:16px; }
.live-page .cal__title { text-align:center; color:var(--bc-text-100); font-weight:600; font-size:14px; margin:0 0 10px; }
.live-page .cal__grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
.live-page .cal__dow { text-align:center; font-size:10px; color:var(--bc-text-500); padding:1px 0 4px; text-transform:uppercase; letter-spacing:0.04em; }
.live-page .cal__day { text-align:center; font-size:12px; color:var(--bc-text-300); padding:6px 0; border-radius:8px; border:1px solid transparent; }
.live-page button.cal__day { font:inherit; background:none; }
.live-page .cal__day.event {
  background:linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500)); color:#fff; font-weight:700;
  cursor:pointer; box-shadow:0 6px 16px -6px var(--bc-blue-glow); transition:filter 120ms, transform 120ms;
}
.live-page .cal__day.event:hover { filter:brightness(1.09); }
.live-page .cal__day.event:active { transform:translateY(1px); }
.live-page .cal__day.event.selected { outline:2px solid var(--bc-blue-200); outline-offset:2px; }
.live-page .cal__away { text-align:center; font-size:12px; color:var(--bc-text-400); margin:12px 0 0; }
.live-page .cal__away b { color:var(--bc-text-100); font-weight:600; }
.live-page .cal-btns { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:12px; }
.live-page .cal-btn {
  display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:11px;
  font-size:13px; font-weight:600; text-decoration:none; cursor:pointer;
  border:1px solid var(--bc-ink-600); background:var(--bc-ink-900); color:var(--bc-text-100);
  transition: border-color 150ms;
}
.live-page .cal-btn:hover { border-color: var(--bc-blue-400); }
.live-page .cal-btn--primary {
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  border:1px solid rgba(255,255,255,0.08); color:#fff; box-shadow: 0 8px 32px -8px var(--bc-blue-glow);
}
.live-page .cal-btn--primary:hover { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }

.live-page .form-card {
  background: linear-gradient(180deg, var(--bc-ink-800), var(--bc-ink-850));
  border: 1px solid var(--bc-ink-600); border-radius: 16px; padding: 22px 22px 20px;
  position: relative; overflow: hidden;
}
.live-page .form-card::before {
  content:""; position:absolute; top:-100px; right:-100px; width:280px; height:280px;
  background:radial-gradient(closest-side, rgba(58,133,255,0.14) 0%, rgba(58,133,255,0) 100%);
  filter:blur(36px); pointer-events:none;
}
.live-page .form-card h3 { font-size: 18px; font-weight: 600; color: var(--bc-text-100); margin: 0 0 4px; text-align: center; position:relative; }
.live-page .form-card .sub { font-size: 13px; color: var(--bc-text-300); text-align: center; margin: 0 0 14px; position:relative; }
.live-page form { display: flex; flex-direction: column; gap: 9px; position: relative; }
.live-page form input {
  appearance: none; width: 100%; padding: 12px 14px; border-radius: 11px;
  background: var(--bc-ink-900); border: 1px solid var(--bc-ink-600);
  color: var(--bc-text-100); font: inherit; font-size: 15px; outline: none; transition: border-color 150ms;
}
.live-page form input:focus { border-color: var(--bc-blue-400); }
.live-page form input::placeholder { color: var(--bc-text-500); }
.live-page form button {
  width: 100%; padding: 13px 20px; border-radius: 11px;
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  color: #fff; font: inherit; font-weight: 600; font-size: 15px;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
  box-shadow: 0 8px 32px -8px var(--bc-blue-glow); transition: background 120ms, transform 120ms;
}
.live-page form button:hover:not(:disabled) { background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.live-page form button:disabled { opacity: 0.6; cursor: not-allowed; }
.live-page form button:active:not(:disabled) { transform: translateY(1px); }
.live-page .err { color:#ff8a8a; font-size: 13px; margin: 2px 0 0; }
.live-page .nospam { color: var(--bc-text-500); font-size: 11px; text-align: center; margin: 12px 0 0; line-height:1.5; }

.live-page .success {
  max-width: 460px; margin: 0 auto;
  background: rgba(47,203,134,0.08); border: 1px solid rgba(47,203,134,0.3);
  border-radius: 16px; padding: 32px; text-align: center;
}
.live-page .success__icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(47,203,134,0.16); color: var(--bc-green-400);
  display: grid; place-items: center; margin: 0 auto 14px;
}
.live-page .success h2 { font-size: 22px; color: var(--bc-text-100); margin: 0 0 8px; }
.live-page .success p { color: var(--bc-text-300); margin: 0 0 4px; font-size: 14px; }
.live-page .signoff { color: var(--bc-text-400); font-size: 13px; margin-top: 16px; }

.live-page .footer {
  text-align: center; color: var(--bc-text-500); font-size: 11px;
  padding: 12px 0 16px; position: relative; z-index: 1;
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
      <div className="wrap">
        <div className="glow" />
        <div className="top-strip">
          <a href="https://www.boundlesscreator.com" target="_blank" rel="noopener noreferrer">Boundless Creator</a>
        </div>

        <div className="stage">
          <div className="inner">
            <div className="date-chip">
              {EVENT.dateLabel} <span className="dot">·</span> {EVENT.timeLabel} <span className="dot">·</span> {EVENT.platform}
            </div>
            <h1>Live channel reviews <span className="blue-em">with Dave</span></h1>
            <p className="lead">
              My first live stream. I&apos;ll pull up real channels and tell you what&apos;s working and what I&apos;d change next.
            </p>

            {submitted ? (
              <div className="success" style={{ marginTop: 22 }}>
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
              <div className="cols">
                <div className="col-cal">
                  <MiniCalendar selected={calOpen} onPick={() => setCalOpen((v) => !v)} />
                  {calOpen ? (
                    <CalendarButtons />
                  ) : (
                    <p className="cal__away"><b>{awayLabel}</b>. Tap the 13th to add it to your calendar.</p>
                  )}
                </div>

                <div className="col-form">
                  <div className="form-card">
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
                      Free. The Zoom link is in the calendar invite, plus a couple of reminders. You&apos;ll get my weekly newsletter too.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="footer">
          <a href="https://privacy.boundlesscreator.com">Privacy</a>
          {' · '}
          <a href="mailto:hello@boundlesscreator.com">Contact</a>
        </div>
      </div>
    </div>
  );
}
