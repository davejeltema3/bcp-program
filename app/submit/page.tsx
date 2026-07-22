'use client';

import { useState, useEffect } from 'react';
import { reviewQuestions } from '@/lib/livestream-review';

/**
 * Channel-review submission page.
 * Emailed to people on the Livestream tag. Reads ?email= and ?name= from the
 * link (Kit merge tags) and pre-fills them; still asks for email if missing.
 * Posts to /api/submit, which writes to the "Livestream Reviews" sheet tab.
 */

const STYLES = `
.submit-page {
  --bc-ink-900:#0b1220; --bc-ink-850:#0f1729; --bc-ink-800:#131c33;
  --bc-ink-700:#1c273f; --bc-ink-600:#2a3654; --bc-ink-500:#3d4a6b;
  --bc-text-100:#f4f6fb; --bc-text-200:#d6dcea; --bc-text-300:#9aa4be;
  --bc-text-400:#6b7591; --bc-text-500:#4a546d;
  --bc-blue-200:#8fbcff; --bc-blue-300:#5b9cff; --bc-blue-400:#3a85ff; --bc-blue-500:#1f6dff;
  --bc-blue-glow:rgba(58,133,255,0.32);
  --bc-green-400:#5ce0a3;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  background: var(--bc-ink-900); color: var(--bc-text-200); min-height: 100vh; position: relative;
}
.submit-page::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: linear-gradient(to right,rgba(255,255,255,.018) 1px,transparent 1px),
                    linear-gradient(to bottom,rgba(255,255,255,.018) 1px,transparent 1px);
  background-size: 64px 64px;
}
.submit-page * { box-sizing: border-box; }
.submit-page .container { max-width: 640px; margin: 0 auto; padding: 0 clamp(20px,5vw,40px); position: relative; z-index: 1; }
.submit-page .top-strip {
  display:flex; justify-content:center; padding: 24px 0 0;
  font-family: var(--font-urbanist), 'Urbanist', sans-serif;
  font-size: 18px; font-weight: 700; color: var(--bc-blue-300); letter-spacing: -0.01em;
}
.submit-page .top-strip a { color: inherit; text-decoration: none; }
.submit-page .hero { text-align:center; padding: 32px 0 28px; }
.submit-page .hero h1 { font-size: clamp(28px,4vw,40px); font-weight:600; letter-spacing:-0.02em; line-height:1.1; color:var(--bc-text-100); margin:0 0 12px; }
.submit-page .hero p { font-size:16px; line-height:1.6; color:var(--bc-text-300); max-width:48ch; margin:0 auto; }
.submit-page .card {
  background: linear-gradient(180deg, var(--bc-ink-800), var(--bc-ink-850));
  border:1px solid var(--bc-ink-600); border-radius:16px; padding:28px; margin-bottom:32px;
}
.submit-page .field { margin-bottom:22px; }
.submit-page .field:last-of-type { margin-bottom:0; }
.submit-page label { display:block; color:var(--bc-text-100); font-weight:600; font-size:15px; margin:0 0 4px; }
.submit-page .req { color:var(--bc-blue-300); }
.submit-page .sub { color:var(--bc-text-400); font-size:13px; margin:0 0 10px; line-height:1.5; }
.submit-page input, .submit-page textarea {
  appearance:none; width:100%; padding:13px 15px; border-radius:12px;
  background:var(--bc-ink-900); border:1px solid var(--bc-ink-600);
  color:var(--bc-text-100); font:inherit; font-size:15px; outline:none; transition:border-color 150ms;
}
.submit-page textarea { resize:vertical; min-height:90px; }
.submit-page input:focus, .submit-page textarea:focus { border-color:var(--bc-blue-400); }
.submit-page input::placeholder, .submit-page textarea::placeholder { color:var(--bc-text-500); }
.submit-page .choices { display:flex; flex-direction:column; gap:8px; }
.submit-page .choice {
  padding:13px 16px; border-radius:12px; cursor:pointer; font-size:15px;
  background:var(--bc-ink-900); border:1px solid var(--bc-ink-600); color:var(--bc-text-200);
  transition:border-color 120ms, background 120ms;
}
.submit-page .choice:hover { border-color:var(--bc-blue-400); }
.submit-page .choice.selected { border-color:var(--bc-blue-400); background:rgba(58,133,255,0.12); color:var(--bc-text-100); }
.submit-page .consent { display:flex; align-items:flex-start; gap:11px; cursor:pointer; color:var(--bc-text-200); font-size:14px; line-height:1.5; font-weight:400; margin:0; }
.submit-page .consent input { width:19px; height:19px; margin:1px 0 0; padding:0; accent-color:var(--bc-blue-400); flex-shrink:0; }
.submit-page button.submit {
  width:100%; padding:14px 22px; border-radius:12px;
  background:linear-gradient(180deg, var(--bc-blue-400), var(--bc-blue-500));
  color:#fff; font:inherit; font-weight:600; font-size:16px;
  border:1px solid rgba(255,255,255,0.08); cursor:pointer;
  box-shadow:0 8px 32px -8px var(--bc-blue-glow); transition:background 120ms, transform 120ms;
}
.submit-page button.submit:hover:not(:disabled) { background:linear-gradient(180deg, var(--bc-blue-300), var(--bc-blue-400)); }
.submit-page button.submit:disabled { opacity:0.55; cursor:not-allowed; }
.submit-page button.submit:active:not(:disabled) { transform:translateY(1px); }
.submit-page .err { color:#ff8a8a; font-size:13px; margin:10px 0 0; text-align:center; }
.submit-page .success {
  background:rgba(47,203,134,0.08); border:1px solid rgba(47,203,134,0.3);
  border-radius:16px; padding:40px; text-align:center; margin-bottom:32px;
}
.submit-page .success__icon {
  width:64px; height:64px; border-radius:50%; background:rgba(47,203,134,0.16);
  color:var(--bc-green-400); display:grid; place-items:center; margin:0 auto 16px;
}
.submit-page .success h2 { font-size:24px; color:var(--bc-text-100); margin:0 0 8px; }
.submit-page .success p { color:var(--bc-text-300); margin:0; }
.submit-page .footer { text-align:center; color:var(--bc-text-500); font-size:12px; padding:8px 0 32px; }
`;

export default function SubmitPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setFirstName(params.get('name') || '');
  }, []);

  const setAnswer = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const missingRequired =
    !email ||
    reviewQuestions.some((q) => q.required && !(answers[q.id] || '').trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missingRequired) {
      setError('Please fill in the required fields.');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, email, name: firstName }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-page">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="top-strip">
        <a href="https://www.boundlesscreator.com" target="_blank" rel="noopener noreferrer">Boundless</a>
      </div>

      <div className="container">
        {submitted ? (
          <div className="success" style={{ marginTop: 40 }}>
            <div className="success__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Got it.</h2>
            <p>Your channel is in. I will pull from these on the live stream. See you on the 13th.</p>
          </div>
        ) : (
          <>
            <section className="hero">
              <h1>Submit your channel for a live review</h1>
              <p>Fill this out and your channel is in the running for a live review on the stream. It helps me come prepared.</p>
            </section>

            <form className="card" onSubmit={handleSubmit}>
              <div className="field">
                <label>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="field">
                <label>Email <span className="req">*</span></label>
                <p className="sub">So I can match your submission to your spot.</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                />
              </div>

              {reviewQuestions.map((q) =>
                q.type === 'checkbox' ? (
                  <div className="field" key={q.id}>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={answers[q.id] === 'Yes'}
                        onChange={(e) => setAnswer(q.id, e.target.checked ? 'Yes' : '')}
                      />
                      <span>{q.question}{q.required && <span className="req"> *</span>}</span>
                    </label>
                  </div>
                ) : (
                  <div className="field" key={q.id}>
                    <label>{q.question} {q.required && <span className="req">*</span>}</label>
                    {q.subtext && <p className="sub">{q.subtext}</p>}
                    {q.type === 'multiple-choice' && q.choices ? (
                      <div className="choices">
                        {q.choices.map((c) => (
                          <div
                            key={c.value}
                            className={`choice${answers[q.id] === c.value ? ' selected' : ''}`}
                            onClick={() => setAnswer(q.id, c.value)}
                          >
                            {c.text}
                          </div>
                        ))}
                      </div>
                    ) : q.type === 'textarea' ? (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder}
                      />
                    ) : (
                      <input
                        type={q.type === 'url' ? 'url' : 'text'}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder}
                      />
                    )}
                  </div>
                )
              )}

              {error && <p className="err">{error}</p>}
              <div style={{ marginTop: 24 }}>
                <button type="submit" className="submit" disabled={loading || missingRequired}>
                  {loading ? 'Submitting...' : 'Submit my channel'}
                </button>
              </div>
            </form>
          </>
        )}

        <footer className="footer">
          <a href="mailto:hello@boundlesscreator.com" style={{ color: 'var(--bc-text-400)', textDecoration: 'none' }}>Questions? Email me</a>
        </footer>
      </div>
    </div>
  );
}
