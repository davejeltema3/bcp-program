'use client';

import { useState } from 'react';

/**
 * Boundless Insight lead magnet landing page.
 * Submits to Kit Form #9377397 — Kit handles double opt-in,
 * confirmation email, incentive delivery, and redirect to Chrome Web Store.
 */

const KIT_FORM_ID = '9377397';
const KIT_API_KEY = '8r2gDZv9vgYKgeS4TAeKdw';

const STYLES = `
.bi-page {
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
.bi-page::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: linear-gradient(to right,rgba(255,255,255,.018) 1px,transparent 1px),
                    linear-gradient(to bottom,rgba(255,255,255,.018) 1px,transparent 1px);
  background-size: 64px 64px;
}
.bi-page * { box-sizing: border-box; }
.bi-page strong { color: var(--bc-text-100); font-weight: 600; }
.bi-page .blue-em { color:var(--bc-blue-300); font-weight:700; }

.bi-page .container { max-width: 720px; margin: 0 auto; padding: 0 clamp(20px,5vw,48px); position: relative; z-index: 1; }

.bi-page .top-strip {
  display:flex; justify-content:center; padding: 24px 0 0;
  font-family: var(--font-urbanist), 'Urbanist', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--bc-blue-300);
  letter-spacing: -0.01em;
}
.bi-page .top-strip a { color: inherit; text-decoration: none; }

.bi-page .hero {
  text-align: center; padding: 32px 0 48px; position: relative;
}
.bi-page .hero__glow {
  position:absolute; top:-100px; left:50%; width:900px; height:480px;
  transform:translateX(-50%);
  background:radial-gradient(
    ellipse at center,
    rgba(58,133,255,0.20) 0%,
    rgba(58,133,255,0.10) 40%,
    rgba(58,133,255,0) 100%
  );
  pointer-events:none; filter:blur(40px);
}
.bi-page .hero__inner { position:relative; }
.bi-page .hero h1 {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 600; letter-spacing: -0.025em; line-height: 1.05;
  color: var(--bc-text-100); margin: 0 0 16px;
}
.bi-page .hero p.lead {
  font-size: 17px; line-height: 1.6; color: var(--bc-text-300);
  max-width: 56ch; margin: 0 auto;
}

.bi-page .features {
  background: var(--bc-ink-800); border: 1px solid var(--bc-ink-600);
  border-radius: 16px; padding: 32px; margin-bottom: 32px;
}
.bi-page .features h2 {
  font-size: 22px; font-weight: 600; color: var(--bc-text-100);
  margin: 0 0 24px; letter-spacing: -0.01em;
}
.bi-page .features__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 640px) { .bi-page .features__grid { grid-template-columns: 1fr; } }
.bi-page .feature { display: flex; gap: 12px; }
.bi-page .feature__icon {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
  background: rgba(58,133,255,0.12); display: grid; place-items: center;
  font-size: 20px;
}
.bi-page .feature__title {
  color: var(--bc-text-100); font-weight: 600; font-size: 15px; margin: 0 0 4px;
}
.bi-page .feature__body { color: var(--bc-text-400); font-size: 13px; line-height: 1.5; margin: 0; }

.bi-page .form-card {
  background: linear-gradient(180deg, var(--bc-ink-800), var(--bc-ink-850));
  border: 1px solid var(--bc-ink-600);
  border-radius: 16px; padding: 32px; margin-bottom: 32px;
  position: relative; overflow: hidden;
}
.bi-page .form-card::before {
  content:""; position:absolute; top:-100px; right:-100px;
  width:300px; height:300px;
  background:radial-gradient(closest-side, rgba(58,133,255,0.14) 0%, rgba(58,133,255,0) 100%);
  filter:blur(36px); pointer-events:none;
}
.bi-page .form-card h3 {
  font-size: 20px; font-weight: 600; color: var(--bc-text-100);
  margin: 0 0 8px; text-align: center; position: relative;
}
.bi-page .form-card .sub {
  font-size: 14px; color: var(--bc-text-300); text-align: center;
  margin: 0 0 20px; position: relative;
}
.bi-page form { display: flex; flex-direction: column; gap: 10px; max-width: 420px; margin: 0 auto; position: relative; }
.bi-page form input {
  appearance: none; width: 100%; padding: 14px 16px; border-radius: 12px;
  background: var(--bc-ink-900); border: 1px solid var(--bc-ink-600);
  color: var(--bc-text-100); font: inherit; font-size: 15px; outline: none;
  transition: border-color 150ms;
}
.bi-page form input:focus { border-color: var(--bc-blue-400); }
.bi-page form input::placeholder { color: var(--bc-text-500); }
.bi-page form button {
  width: 100%; padding: 14px 22px; border-radius: 12px;
  background: linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  color: #fff; font: inherit; font-weight: 600; font-size: 16px;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
  box-shadow: 0 8px 32px -8px var(--bc-blue-glow);
  transition: background 120ms ease, transform 120ms ease;
}
.bi-page form button:hover:not(:disabled) {
  background: linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400));
}
.bi-page form button:disabled { opacity: 0.6; cursor: not-allowed; }
.bi-page form button:active { transform: translateY(1px); }
.bi-page .err { color:#ff8a8a; font-size: 13px; margin: 4px 0 0; }
.bi-page .nospam { color: var(--bc-text-500); font-size: 12px; text-align: center; margin: 14px 0 0; }

.bi-page .success {
  background: rgba(47,203,134,0.08); border: 1px solid rgba(47,203,134,0.3);
  border-radius: 16px; padding: 40px; text-align: center;
}
.bi-page .success__icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(47,203,134,0.16); color: var(--bc-green-400);
  display: grid; place-items: center; margin: 0 auto 16px;
}
.bi-page .success h2 { font-size: 24px; color: var(--bc-text-100); margin: 0 0 8px; }
.bi-page .success p { color: var(--bc-text-300); margin: 0; }

.bi-page .footer {
  text-align: center; color: var(--bc-text-500); font-size: 12px;
  padding: 24px 0 32px; border-top: 1px solid var(--bc-ink-700); margin-top: 32px;
}
.bi-page .footer a { color: var(--bc-text-400); text-decoration: none; }
.bi-page .footer a:hover { color: var(--bc-text-200); }
`;

export default function InsightPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`https://api.convertkit.com/v3/forms/${KIT_FORM_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: KIT_API_KEY,
          email: email,
          first_name: firstName || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to subscribe');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bi-page">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="top-strip">
        <a href="https://www.boundlesscreator.com" target="_blank" rel="noopener noreferrer">Boundless</a>
      </div>

      <section className="hero">
        <div className="hero__glow" />
        <div className="container hero__inner">
          <h1>Boundless <span className="blue-em">Insight</span></h1>
          <p className="lead">
            I built this so you can break down any YouTube video the way I do. See what is pulling. See what is leaking. Apply what works to your own channel.
          </p>
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
            <h2>Check your email</h2>
            <p>Confirm your email and you will be taken straight to the download.</p>
          </div>
        ) : (
          <>
            <section className="features">
              <h2>What it does</h2>
              <div className="features__grid">
                <div className="feature">
                  <div className="feature__icon">🎯</div>
                  <div>
                    <div className="feature__title">Packaging analysis</div>
                    <p className="feature__body">AI-powered breakdown of any video&apos;s thumbnail, title, and metadata.</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature__icon">📊</div>
                  <div>
                    <div className="feature__title">Learn from any video</div>
                    <p className="feature__body">Study what top creators do right and apply it to your own packaging.</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature__icon">🔍</div>
                  <div>
                    <div className="feature__title">Actionable feedback</div>
                    <p className="feature__body">Not just &ldquo;this is good&rdquo; — specific notes you can act on.</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature__icon">⚡</div>
                  <div>
                    <div className="feature__title">One click</div>
                    <p className="feature__body">Works right on any YouTube video page. No setup required.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="form-card">
              <h3>Get Boundless Insight</h3>
              <p className="sub">Drop your email, confirm it, and you will be taken straight to the Chrome Web Store to install.</p>
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
                  {loading ? 'Joining...' : 'Get it free'}
                </button>
              </form>
              <p className="nospam">No spam. Unsubscribe anytime.</p>
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
