'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

type WindowState = 'before' | 'open' | 'after';

/* =====================================================================
   STYLES — BC design system inlined
   ===================================================================== */
const STYLES = `
:root {
  --bc-ink-950:#070b14; --bc-ink-900:#0b1220; --bc-ink-850:#0f1729;
  --bc-ink-800:#131c33; --bc-ink-700:#1c273f; --bc-ink-600:#2a3654; --bc-ink-500:#3d4a6b;
  --bc-text-100:#f4f6fb; --bc-text-200:#d6dcea; --bc-text-300:#9aa4be;
  --bc-text-400:#6b7591; --bc-text-500:#4a546d;
  --bc-blue-50:#e6f0ff; --bc-blue-100:#c2dbff; --bc-blue-200:#8fbcff;
  --bc-blue-300:#5b9cff; --bc-blue-400:#3a85ff; --bc-blue-500:#1f6dff;
  --bc-blue-600:#1656d4; --bc-blue-navy:#14213d;
  --bc-blue-glow:rgba(58,133,255,0.32);
  --bc-green-400:#5ce0a3; --bc-green-500:#2fcb86;
  --bc-green-glow:rgba(47,203,134,0.22);
  --bc-amber-400:#f5b86b;
  --bc-strike:#4a546d;
  --bc-font-sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --bc-font-mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --bc-fs-h2:clamp(28px,3vw,40px); --bc-fs-h3:22px; --bc-fs-body:17px;
  --bc-fs-body-sm:15px; --bc-fs-caption:13px;
  --bc-lh-heading:1.1; --bc-lh-body:1.55;
  --bc-ls-heading:-0.015em; --bc-ls-overline:0.16em; --bc-ls-mono:0.02em;
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:24px;
  --s-7:32px; --s-8:40px; --s-9:48px; --s-10:64px; --s-11:80px; --s-12:96px;
  --r-2:8px; --r-3:12px; --r-4:16px; --r-pill:9999px;
  --shadow-card:0 1px 0 rgba(255,255,255,0.03) inset,0 12px 40px -12px rgba(0,0,0,0.5);
  --shadow-cta:0 8px 32px -8px var(--bc-blue-glow),0 1px 0 rgba(255,255,255,0.18) inset;
  --bc-content-w:1180px; --bc-narrow-w:760px;
  --bc-page-x:clamp(20px,5vw,48px);
}
.bcp-page * { box-sizing: border-box; }
.bcp-page {
  font-family: var(--bc-font-sans);
  background: var(--bc-ink-900);
  color: var(--bc-text-200);
  font-size: var(--bc-fs-body);
  line-height: var(--bc-lh-body);
  -webkit-font-smoothing: antialiased;
  position: relative;
  min-height: 100vh;
}
.bcp-page::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: linear-gradient(to right,rgba(255,255,255,.018) 1px,transparent 1px),
                    linear-gradient(to bottom,rgba(255,255,255,.018) 1px,transparent 1px);
  background-size: 64px 64px;
}
.bcp-page .page { position:relative; z-index:1; }
.bcp-page .container { max-width:var(--bc-content-w); margin:0 auto; padding:0 var(--bc-page-x); }
.bcp-page .narrow { max-width:var(--bc-narrow-w); margin:0 auto; padding:0 var(--bc-page-x); }
.bcp-page section { padding: var(--s-12) 0; position:relative; }
.bcp-page section.alt { background: var(--bc-ink-850); }
.bcp-page strong, .bcp-page b { font-weight:600; color:var(--bc-text-100); }
.bcp-page .blue-em { color:var(--bc-blue-300); font-weight:700; }
.bcp-page p { margin: 0; }
.bcp-page a { color: inherit; }

.bcp-page .nav {
  position:sticky; top:0; z-index:50;
  background:rgba(7,11,20,.75);
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  border-bottom:1px solid var(--bc-ink-700);
}
.bcp-page .nav__inner {
  max-width:1320px; margin:0 auto; padding:12px var(--bc-page-x);
  display:flex; align-items:center; justify-content:space-between; gap:var(--s-5);
}
.bcp-page .bc-logo { font-size:24px; font-weight:700; color:var(--bc-blue-300); letter-spacing:-0.02em; }
.bcp-page .nav__cta { padding:10px 16px; font-size:14px; flex-shrink:0; }
@media(max-width:520px) { .bcp-page .bc-logo { font-size:20px; } }

.bcp-page .btn {
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  padding:14px 22px; border-radius:var(--r-3);
  font-family:var(--bc-font-sans); font-weight:600; font-size:16px;
  border:1px solid transparent; cursor:pointer; text-decoration:none; white-space:nowrap;
  transition:transform 120ms ease,box-shadow 200ms ease,background 120ms ease;
}
.bcp-page .btn:active { transform:translateY(1px); }
.bcp-page .btn:disabled { opacity:.6; cursor:not-allowed; }
.bcp-page .btn--primary {
  background:linear-gradient(180deg,var(--bc-blue-400),var(--bc-blue-500));
  color:#fff; box-shadow:var(--shadow-cta);
  border-color:rgba(255,255,255,.08);
}
.bcp-page .btn--primary:hover:not(:disabled) { background:linear-gradient(180deg,var(--bc-blue-300),var(--bc-blue-400)); }
.bcp-page .btn--ghost {
  background:transparent; color:var(--bc-text-100);
  border:1px solid var(--bc-ink-500);
}
.bcp-page .btn--ghost:hover:not(:disabled) { background:var(--bc-ink-800); border-color:var(--bc-blue-400); color:var(--bc-blue-200); }
.bcp-page .btn--lg { padding:18px 28px; font-size:17px; }
.bcp-page .btn--xl { padding:20px 36px; font-size:19px; border-radius:14px; font-weight:700; }
.bcp-page .btn--block { display:flex; width:100%; }

.bcp-page .overline {
  display:inline-flex; align-items:center; gap:8px;
  font-family:var(--bc-font-mono); font-size:var(--bc-fs-caption);
  color:var(--bc-blue-300); letter-spacing:var(--bc-ls-overline);
  text-transform:uppercase;
}
.bcp-page .overline::before { content:""; width:24px; height:1px; background:currentColor; opacity:.5; }

.bcp-page .section-num { font-family:var(--bc-font-mono); font-size:var(--bc-fs-caption); color:var(--bc-text-400); letter-spacing:var(--bc-ls-mono); }
.bcp-page .section-h {
  font-size:var(--bc-fs-h2); font-weight:600; letter-spacing:var(--bc-ls-heading);
  line-height:var(--bc-lh-heading); color:var(--bc-text-100); margin:0 0 var(--s-4); max-width:24ch;
}
.bcp-page .section-sub { color:var(--bc-text-300); font-size:18px; margin:0 0 var(--s-9); max-width:62ch; }
.bcp-page .section-sub strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .section-head {
  display:flex; align-items:baseline; gap:var(--s-5); margin-bottom:var(--s-7);
  border-bottom:1px solid var(--bc-ink-700); padding-bottom:var(--s-5);
}
.bcp-page .subsection-h { font-size:24px; font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0 0 8px; }
.bcp-page .subsection-sub { color:var(--bc-text-300); margin:0 0 var(--s-7); font-size:16px; }

.bcp-page .hero { padding:var(--s-9) 0 var(--s-9); position:relative; overflow:hidden; text-align:center; }
.bcp-page .hero__glow {
  position:absolute; top:-260px; left:50%; width:1500px; height:780px;
  transform:translateX(-50%);
  background:radial-gradient(closest-side,var(--bc-blue-glow),transparent 70%);
  pointer-events:none; filter:blur(8px);
}
.bcp-page .hero__inner { position:relative; }
.bcp-page .hero__top { display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:var(--s-5); }
.bcp-page .hero__title {
  font-size:clamp(30px,3.4vw,52px); font-weight:600;
  letter-spacing:-0.025em; line-height:1.05;
  color:var(--bc-text-100); margin:0 auto var(--s-4); max-width:30ch; text-wrap:balance;
}
.bcp-page .hero__sub { font-size:16px; color:var(--bc-text-300); max-width:58ch; margin:0 auto var(--s-6); line-height:1.5; }
.bcp-page .hero__sub strong { color:var(--bc-text-100); font-weight:600; }

.bcp-page .hero__trust {
  display:grid; grid-template-columns:repeat(3,1fr);
  margin:var(--s-7) auto 0; padding:var(--s-5) 0;
  border-top:1px solid var(--bc-ink-700); border-bottom:1px solid var(--bc-ink-700);
  max-width:760px;
}
.bcp-page .hero__trust > div { padding:0 var(--s-5); text-align:center; }
.bcp-page .hero__trust > div + div { border-left:1px solid var(--bc-ink-700); }
.bcp-page .cred__num { font-size:40px; font-weight:700; line-height:1; letter-spacing:-0.03em; color:var(--bc-blue-300); }
.bcp-page .cred__sup { font-size:24px; vertical-align:super; margin-left:2px; color:var(--bc-blue-300); }
.bcp-page .cred__sub { font-size:14px; color:var(--bc-text-300); margin-top:8px; max-width:22ch; margin-left:auto; margin-right:auto; }
.bcp-page .cred__sub strong { color:var(--bc-text-100); font-weight:600; }

.bcp-page .hero__cta-stack { display:flex; flex-direction:column; align-items:center; gap:var(--s-3); margin-bottom:0; }
.bcp-page .hero__price-line { font-size:14px; color:var(--bc-text-300); display:inline-flex; flex-wrap:wrap; justify-content:center; gap:8px; align-items:center; }
.bcp-page .hero__price-line strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .hero__price-line .strike { text-decoration:line-through; text-decoration-color:var(--bc-strike); color:var(--bc-text-400); }
.bcp-page .hero__price-line .dot-sep { color:var(--bc-text-500); }

.bcp-page .hero-quote {
  max-width:680px; margin:var(--s-7) auto 0; padding:var(--s-5) var(--s-6);
  background:linear-gradient(180deg,rgba(58,133,255,.06),rgba(58,133,255,.02));
  border:1px solid rgba(58,133,255,.2); border-radius:var(--r-4);
  position:relative; text-align:left;
}
.bcp-page .hero-quote__mark { position:absolute; top:18px; left:20px; color:var(--bc-blue-400); opacity:.5; }
.bcp-page .hero-quote__text {
  font-size:20px; font-weight:500; color:var(--bc-text-100);
  margin:0 0 var(--s-5); padding-left:42px; line-height:1.4;
}
.bcp-page .hero-quote__cite { display:flex; align-items:center; gap:10px; padding-left:42px; font-size:13px; }
.bcp-page .hero-quote__name { color:var(--bc-text-100); font-weight:600; }
.bcp-page .hero-quote__role { color:var(--bc-text-400); }

.bcp-page .hero__vsl-wrap { max-width:880px; margin:0 auto var(--s-5); position:relative; }
.bcp-page .hero__vsl-wrap .vsl { aspect-ratio:16/9; max-height:520px; }
.bcp-page .vsl { position:relative; border-radius:var(--r-4); overflow:hidden; aspect-ratio:16/9; background:var(--bc-ink-900); }
.bcp-page .vsl__glow { position:absolute; inset:-60px; background:radial-gradient(closest-side,var(--bc-blue-glow),transparent 70%); filter:blur(40px); pointer-events:none; z-index:0; }
.bcp-page .vsl__inner { position:relative; z-index:1; width:100%; height:100%; }
.bcp-page .vsl iframe { width:100%; height:100%; border:0; display:block; }

.bcp-page .window-badge {
  display:inline-flex; align-items:center; gap:10px;
  padding:8px 14px; border-radius:var(--r-pill);
  background:rgba(47,203,134,.08); border:1px solid rgba(47,203,134,.3);
  font-family:var(--bc-font-mono); font-size:12px; letter-spacing:var(--bc-ls-mono);
  color:var(--bc-green-400);
}
.bcp-page .window-badge .dot { width:8px; height:8px; border-radius:50%; background:var(--bc-green-400); box-shadow:0 0 12px var(--bc-green-glow); animation:bcp-pulse 2s ease-in-out infinite; }
.bcp-page .window-badge--closed { background:rgba(154,164,190,.06); border-color:rgba(154,164,190,.3); color:var(--bc-text-300); }
.bcp-page .window-badge--closed .dot { background:var(--bc-text-400); box-shadow:none; animation:none; }
.bcp-page .window-badge--soon { background:rgba(245,184,107,.08); border-color:rgba(245,184,107,.3); color:var(--bc-amber-400); }
.bcp-page .window-badge--soon .dot { background:var(--bc-amber-400); box-shadow:0 0 12px rgba(245,184,107,.4); }
@keyframes bcp-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.bcp-page .countdown {
  display:inline-flex; align-items:center; gap:var(--s-4);
  padding:10px 16px; border-radius:var(--r-3);
  background:var(--bc-ink-800); border:1px solid var(--bc-ink-600);
  font-family:var(--bc-font-mono);
}
.bcp-page .countdown__label { font-size:11px; letter-spacing:var(--bc-ls-overline); text-transform:uppercase; color:var(--bc-text-400); }
.bcp-page .countdown__value { font-size:16px; font-weight:500; color:var(--bc-green-400); letter-spacing:var(--bc-ls-mono); }
.bcp-page .countdown--urgent .countdown__value { color:#ff6b6b; }

.bcp-page .card { background:var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:var(--r-4); padding:var(--s-7); position:relative; }
.bcp-page .card--raised { background:var(--bc-ink-700); }
.bcp-page .card__title { font-size:var(--bc-fs-h3); font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-blue-200); margin:0 0 var(--s-3); }
.bcp-page .card--raised .card__title { color:var(--bc-blue-300); }
.bcp-page .card__body { font-size:var(--bc-fs-body-sm); color:var(--bc-text-200); line-height:var(--bc-lh-body); margin:0; }
.bcp-page .card__body strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--s-6); }
.bcp-page .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--s-6); }
@media(max-width:900px) { .bcp-page .grid-3, .bcp-page .grid-2 { grid-template-columns:1fr; } }

.bcp-page .problem-grid { align-items:start; gap:var(--s-9); }
.bcp-page .problem-quote {
  font-size:clamp(28px,3.5vw,40px); font-weight:500; color:var(--bc-text-100);
  letter-spacing:-0.015em; line-height:1.25; max-width:24ch; margin:0;
}
.bcp-page .problem-list { display:flex; flex-direction:column; gap:var(--s-5); margin:0; padding:0; list-style:none; }
.bcp-page .problem-list li { font-size:18px; color:var(--bc-text-200); padding-left:var(--s-6); position:relative; line-height:1.5; }
.bcp-page .problem-list li::before { content:""; position:absolute; left:0; top:14px; width:14px; height:1px; background:var(--bc-blue-400); }
.bcp-page .problem-list strong { color:var(--bc-text-100); font-weight:600; }

.bcp-page .wedge-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--s-7); align-items:start; }
@media(max-width:1080px) { .bcp-page .wedge-grid { grid-template-columns:1fr; } }

.bcp-page .review { background:var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:var(--r-4); overflow:hidden; box-shadow:var(--shadow-card); }
.bcp-page .review__head { padding:var(--s-7); border-bottom:1px solid var(--bc-ink-600); background:linear-gradient(180deg,rgba(58,133,255,.04),transparent); }
.bcp-page .review__eyebrow { display:inline-block; font-family:var(--bc-font-mono); font-size:12px; color:var(--bc-blue-300); margin-bottom:var(--s-3); letter-spacing:.04em; text-transform:uppercase; }
.bcp-page .review__title { font-size:24px; font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0; line-height:1.25; }
.bcp-page .review__sub { font-size:14px; color:var(--bc-text-300); margin:var(--s-3) 0 0; max-width:50ch; }
.bcp-page .review__body { padding:var(--s-5) var(--s-7) var(--s-7); }
.bcp-page .review__row { padding:var(--s-5) 0; border-bottom:1px solid var(--bc-ink-700); }
.bcp-page .review__row:last-of-type { border-bottom:0; }
.bcp-page .review__rowtitle { font-size:16px; font-weight:600; color:var(--bc-blue-200); margin:0 0 6px; }
.bcp-page .review__rowtext { font-size:14px; color:var(--bc-text-200); margin:0; line-height:1.55; }

.bcp-page .checklist { background:var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:var(--r-4); overflow:hidden; box-shadow:var(--shadow-card); }
.bcp-page .checklist__head { padding:var(--s-7); border-bottom:1px solid var(--bc-ink-600); background:linear-gradient(180deg,rgba(47,203,134,.04),transparent); }
.bcp-page .checklist__eyebrow { display:inline-block; font-family:var(--bc-font-mono); font-size:12px; color:var(--bc-green-400); margin-bottom:var(--s-3); letter-spacing:.04em; text-transform:uppercase; }
.bcp-page .checklist__title { font-size:24px; font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0; line-height:1.25; }
.bcp-page .checklist__sub { font-size:14px; color:var(--bc-text-300); margin:var(--s-3) 0 0; }
.bcp-page .checklist__list { list-style:none; margin:0; padding:var(--s-3) var(--s-7) var(--s-7); }
.bcp-page .checklist__row { display:grid; grid-template-columns:36px 1fr 22px; gap:14px; align-items:center; padding:var(--s-4) 0; border-bottom:1px solid var(--bc-ink-700); }
.bcp-page .checklist__row:last-child { border-bottom:0; }
.bcp-page .checklist__num { font-family:var(--bc-font-mono); font-size:11px; color:var(--bc-text-500); }
.bcp-page .checklist__rowtitle { font-size:16px; font-weight:600; color:var(--bc-blue-200); }
.bcp-page .checklist__rowtext { font-size:13px; color:var(--bc-text-300); margin-top:2px; }
.bcp-page .checklist__check { color:var(--bc-green-400); opacity:.8; }

.bcp-page .filter-list { display:flex; flex-direction:column; gap:14px; margin:14px 0 0; padding:0; list-style:none; }
.bcp-page .filter-list li { display:grid; grid-template-columns:22px 1fr; gap:12px; align-items:start; font-size:16px; color:var(--bc-text-200); line-height:1.5; }
.bcp-page .filter-list strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .filter-list .ico { width:22px; height:22px; display:grid; place-items:center; margin-top:1px; }
.bcp-page .filter-list .ico--check { color:var(--bc-green-400); }
.bcp-page .filter-list .ico--ex { color:var(--bc-text-500); }

.bcp-page .system { background:var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:var(--r-4); padding:var(--s-7); }
.bcp-page .system__head { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--s-5); margin-bottom:var(--s-6); flex-wrap:wrap; }
.bcp-page .system__title { margin:0; font-size:22px; font-weight:600; color:var(--bc-text-100); }
.bcp-page .system__sub { margin:8px 0 0; color:var(--bc-text-300); font-size:14px; max-width:60ch; }
.bcp-page .system__count { font-family:var(--bc-font-mono); font-size:11px; color:var(--bc-text-400); letter-spacing:var(--bc-ls-overline); text-transform:uppercase; }
.bcp-page .system__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
@media(max-width:760px) { .bcp-page .system__grid { grid-template-columns:1fr; } }
.bcp-page .system__node { background:var(--bc-ink-700); border:1px solid var(--bc-ink-600); border-radius:var(--r-3); padding:14px 16px; display:flex; flex-direction:column; gap:8px; transition:border-color 200ms,background 200ms; }
.bcp-page .system__node:hover { border-color:var(--bc-blue-400); background:var(--bc-ink-600); }
.bcp-page .system__node-head { display:flex; align-items:baseline; gap:10px; }
.bcp-page .system__node-num { font-family:var(--bc-font-mono); font-size:10px; color:var(--bc-text-500); }
.bcp-page .system__node-name { font-size:15px; font-weight:600; color:var(--bc-blue-200); }
.bcp-page .system__node-sub { font-size:12px; color:var(--bc-text-400); margin:0; line-height:1.5; }

.bcp-page .weekstrip {
  display:grid; grid-template-columns:repeat(4,1fr); gap:1px;
  background:var(--bc-ink-600); border:1px solid var(--bc-ink-600);
  border-radius:var(--r-4); overflow:hidden;
}
@media(max-width:1000px) { .bcp-page .weekstrip { grid-template-columns:repeat(2,1fr); } }
@media(max-width:560px) { .bcp-page .weekstrip { grid-template-columns:1fr; } }
.bcp-page .weekstrip__day { background:var(--bc-ink-800); padding:var(--s-5) var(--s-4) var(--s-6); display:flex; flex-direction:column; gap:8px; }
.bcp-page .weekstrip__day[data-highlight="1"] { background:linear-gradient(180deg,rgba(58,133,255,.08),var(--bc-ink-800)); position:relative; }
.bcp-page .weekstrip__day[data-highlight="1"]::before { content:""; position:absolute; top:0; left:0; right:0; height:2px; background:var(--bc-blue-400); }
.bcp-page .weekstrip__d { font-family:var(--bc-font-mono); font-size:11px; color:var(--bc-text-500); letter-spacing:var(--bc-ls-overline); text-transform:uppercase; }
.bcp-page .weekstrip__day[data-highlight="1"] .weekstrip__d { color:var(--bc-blue-300); }
.bcp-page .weekstrip__t { font-size:15px; font-weight:600; color:var(--bc-blue-200); line-height:1.25; }
.bcp-page .weekstrip__b { font-size:12.5px; color:var(--bc-text-400); line-height:1.5; }

.bcp-page .price { background:linear-gradient(180deg,var(--bc-ink-800),var(--bc-ink-850)); border:1px solid var(--bc-ink-600); border-radius:var(--r-4); padding:var(--s-8); position:relative; overflow:hidden; }
.bcp-page .price::before { content:""; position:absolute; top:-160px; right:-160px; width:380px; height:380px; background:radial-gradient(closest-side,var(--bc-blue-glow),transparent 70%); filter:blur(24px); pointer-events:none; }
.bcp-page .price__title { font-size:26px; font-weight:600; color:var(--bc-text-100); margin:12px 0 24px; position:relative; }
.bcp-page .price__row { display:flex; align-items:baseline; gap:var(--s-4); position:relative; flex-wrap:wrap; }
.bcp-page .price__strike { font-family:var(--bc-font-mono); font-size:20px; color:var(--bc-text-400); text-decoration:line-through; text-decoration-color:var(--bc-strike); }
.bcp-page .price__main { font-weight:700; font-size:64px; color:var(--bc-text-100); letter-spacing:-0.025em; line-height:1; }
.bcp-page .price__alt { font-family:var(--bc-font-mono); font-size:13px; color:var(--bc-text-300); margin-left:8px; }
.bcp-page .price__sub { font-size:15px; color:var(--bc-text-300); margin:var(--s-3) 0 var(--s-7); position:relative; }
.bcp-page .price__sub strong { color:var(--bc-green-400); font-weight:600; }
.bcp-page .price__rule { height:1px; background:var(--bc-ink-600); margin:var(--s-6) 0; position:relative; }
.bcp-page .price__included { display:flex; flex-direction:column; gap:10px; position:relative; list-style:none; padding:0; margin:0; }
.bcp-page .price__included li { display:grid; grid-template-columns:18px 1fr; gap:10px; font-size:14px; color:var(--bc-text-200); align-items:start; }
.bcp-page .price__included li svg { margin-top:3px; color:var(--bc-blue-300); }
.bcp-page .price__guarantee { display:flex; align-items:flex-start; gap:var(--s-3); font-size:13px; color:var(--bc-text-300); margin-top:var(--s-5); position:relative; line-height:1.5; }
.bcp-page .price__guarantee svg { color:var(--bc-green-400); flex-shrink:0; margin-top:1px; }
.bcp-page .price__waitlist-form { display:flex; flex-direction:column; gap:10px; margin:0; position:relative; }
.bcp-page .price__waitlist-form input {
  appearance:none; width:100%; padding:14px 16px; border-radius:var(--r-3);
  background:var(--bc-ink-900); border:1px solid var(--bc-ink-600);
  color:var(--bc-text-100); font:inherit; font-size:15px; outline:none;
  transition:border-color 150ms;
}
.bcp-page .price__waitlist-form input:focus { border-color:var(--bc-blue-400); }
.bcp-page .price__waitlist-form input::placeholder { color:var(--bc-text-500); }
.bcp-page .price__buttons { display:flex; flex-direction:column; gap:10px; position:relative; }
.bcp-page .price__btn-split { font-size:14px; padding:14px 20px; }

.bcp-page .faq { border-top:1px solid var(--bc-ink-600); max-width:800px; margin-left:auto; margin-right:auto; }
.bcp-page .faq__item { border-bottom:1px solid var(--bc-ink-600); }
.bcp-page .faq__q {
  display:flex; justify-content:space-between; align-items:center;
  padding:var(--s-5) 0; font-size:18px; font-weight:500;
  color:var(--bc-blue-200); cursor:pointer; list-style:none; gap:var(--s-5);
}
.bcp-page .faq__q::-webkit-details-marker { display:none; }
.bcp-page .faq__q::after { content:"+"; font-family:var(--bc-font-mono); color:var(--bc-text-400); font-size:22px; flex-shrink:0; }
.bcp-page details[open] .faq__q::after { content:"−"; color:var(--bc-blue-300); }
.bcp-page .faq__a { padding:0 0 var(--s-5); font-size:15px; color:var(--bc-text-300); max-width:70ch; line-height:1.65; }
.bcp-page .faq__a strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .faq__h { margin-left:auto; margin-right:auto; text-align:center; max-width:30ch; }

.bcp-page .cta-band {
  background:var(--bc-ink-850); border-top:1px solid var(--bc-ink-700); border-bottom:1px solid var(--bc-ink-700);
  padding:var(--s-10) 0; text-align:center; position:relative; overflow:hidden;
}
.bcp-page .cta-band__glow { position:absolute; inset:0; background:radial-gradient(ellipse at center,var(--bc-blue-glow) 0%,transparent 60%); filter:blur(20px); pointer-events:none; opacity:.6; }
.bcp-page .cta-band__content { position:relative; }
.bcp-page .cta-band__title { font-size:clamp(28px,3.5vw,42px); font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0 auto var(--s-5); max-width:24ch; text-wrap:balance; }
.bcp-page .cta-band__sub { color:var(--bc-text-300); font-size:17px; margin:0 auto var(--s-7); max-width:52ch; }
.bcp-page .cta-band__fineprint { margin-top:var(--s-5); font-size:13px; color:var(--bc-text-400); }

.bcp-page .founder__title { font-size:clamp(34px,4vw,52px); font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0 0 var(--s-7); line-height:1.1; }
.bcp-page .founder__body { font-size:18px; color:var(--bc-text-200); line-height:1.65; display:flex; flex-direction:column; gap:var(--s-5); }
.bcp-page .founder__body strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .founder__pull {
  font-size:24px; font-weight:500; color:var(--bc-blue-200);
  border-left:3px solid var(--bc-blue-400); padding-left:var(--s-6);
  line-height:1.4;
}
.bcp-page .founder__sig { font-family:var(--bc-font-mono); font-size:14px; color:var(--bc-text-300); }

.bcp-page .ps-section { padding:var(--s-10) 0; }
.bcp-page .ps {
  border-left:3px solid var(--bc-blue-400); padding-left:var(--s-7);
  font-size:18px; color:var(--bc-text-200); line-height:1.65;
  display:flex; flex-direction:column; gap:var(--s-4);
}
.bcp-page .ps strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .ps__label { font-family:var(--bc-font-mono); font-size:11px; letter-spacing:var(--bc-ls-overline); text-transform:uppercase; color:var(--bc-blue-300); display:block; margin-bottom:var(--s-2); }

.bcp-page .checkout-section { padding:var(--s-12) 0; background:var(--bc-ink-850); }
.bcp-page .checkout-stack { max-width:680px; margin:0 auto; display:flex; flex-direction:column; gap:var(--s-7); }
.bcp-page .checkout-stack__head { text-align:center; }
.bcp-page .checkout-fineprint { font-family:var(--bc-font-mono); font-size:13px; color:var(--bc-text-400); letter-spacing:.02em; text-transform:uppercase; margin:var(--s-5) 0 0; text-align:center; }

.bcp-page footer { border-top:1px solid var(--bc-ink-700); padding:var(--s-9) 0 var(--s-7); font-size:13px; color:var(--bc-text-400); }
.bcp-page footer .container { display:flex; justify-content:space-between; align-items:center; gap:var(--s-5); flex-wrap:wrap; }
.bcp-page .footer__links { display:flex; gap:20px; }
.bcp-page .footer__links a { color:var(--bc-text-400); text-decoration:none; }
.bcp-page .footer__links a:hover { color:var(--bc-text-200); }

.bcp-page .card--for { border-color:rgba(108,210,150,.28); background:linear-gradient(180deg,rgba(108,210,150,.05),rgba(108,210,150,.015)); }
.bcp-page .card--not { border-color:rgba(154,164,190,.18); background:linear-gradient(180deg,rgba(154,164,190,.04),rgba(154,164,190,.01)); }
.bcp-page .is-for-tag, .bcp-page .is-not-tag {
  display:inline-flex; align-items:center; gap:8px;
  font-family:var(--bc-font-mono); font-size:12px; letter-spacing:var(--bc-ls-overline); text-transform:uppercase;
  padding:6px 12px; border-radius:var(--r-pill); font-weight:500; margin-bottom:var(--s-5);
}
.bcp-page .is-for-tag { background:rgba(108,210,150,.1); color:var(--bc-green-400); border:1px solid rgba(108,210,150,.25); }
.bcp-page .is-not-tag { background:rgba(154,164,190,.06); color:var(--bc-text-300); border:1px solid rgba(154,164,190,.2); }
.bcp-page .is-for-tag::before, .bcp-page .is-not-tag::before { content:""; width:6px; height:6px; border-radius:50%; }
.bcp-page .is-for-tag::before { background:var(--bc-green-400); box-shadow:0 0 8px var(--bc-green-glow); }
.bcp-page .is-not-tag::before { background:var(--bc-text-400); }
.bcp-page .filter-list--for li { color:var(--bc-text-100); }
.bcp-page .filter-list--not li { color:var(--bc-text-400); }
.bcp-page .filter-list--not strong { color:var(--bc-text-200); }

.bcp-page .tw__head { margin-bottom:var(--s-7); text-align:center; }
.bcp-page .tw__sub { margin:14px auto 0; max-width:60ch; color:var(--bc-text-300); font-size:15px; }
.bcp-page .tw__grid { column-count:3; column-gap:var(--s-5); }
@media(max-width:1100px) { .bcp-page .tw__grid { column-count:2; } }
@media(max-width:680px) { .bcp-page .tw__grid { column-count:1; } }

.bcp-page .tw-card { break-inside:avoid; display:flex; flex-direction:column; gap:var(--s-4); background:var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:var(--r-4); padding:var(--s-6); margin:0 0 var(--s-5); position:relative; }
.bcp-page .tw-card__mark { color:var(--bc-blue-400); opacity:.5; }
.bcp-page .tw-card__text { margin:0; color:var(--bc-text-100); font-size:15px; line-height:1.55; }
.bcp-page .tw-card__text strong { color:var(--bc-blue-300); font-weight:600; }
.bcp-page .tw-card__cite { display:flex; flex-direction:column; gap:2px; padding-top:var(--s-4); border-top:1px solid var(--bc-ink-700); font-size:13px; }
.bcp-page .tw-card__name { color:var(--bc-text-100); font-weight:600; }
.bcp-page .tw-card__role { color:var(--bc-text-400); font-size:12px; }
.bcp-page .tw-card--featured { background:linear-gradient(180deg,rgba(58,133,255,.08),rgba(58,133,255,.02)); border-color:rgba(58,133,255,.35); }
.bcp-page .tw-card--featured .tw-card__text { font-size:17px; font-weight:500; }
.bcp-page .tw-card--video { padding:0; overflow:hidden; }
.bcp-page .tw-card--video .tw-card__cite { padding:var(--s-4) var(--s-6) var(--s-6); }
.bcp-page .tw-card--video .tw-video__pull { padding:var(--s-5) var(--s-6) 0; }
.bcp-page .tw-video { position:relative; aspect-ratio:16/10; width:100%; background:var(--bc-ink-900); cursor:pointer; overflow:hidden; }
.bcp-page .tw-video video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.bcp-page .tw-video__poster { position:absolute; inset:0; display:grid; place-items:center; }
.bcp-page .tw-video__poster img { width:100%; height:100%; object-fit:cover; display:block; }
.bcp-page .tw-video__play {
  position:relative; z-index:2; width:64px; height:64px; border-radius:50%;
  display:grid; place-items:center;
  background:linear-gradient(180deg,var(--bc-blue-400),var(--bc-blue-500));
  color:#fff; box-shadow:0 12px 32px rgba(58,133,255,.35),0 0 0 6px rgba(58,133,255,.12);
  transition:transform 200ms ease;
  border:0; cursor:pointer;
}
.bcp-page .tw-video:hover .tw-video__play { transform:scale(1.06); }
.bcp-page .tw-video__overlay { position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.4) 100%); z-index:1; pointer-events:none; }

.bcp-page .form-msg { font-size:13px; color:var(--bc-text-300); margin:8px 0 0; }
.bcp-page .form-msg--error { color:#ff8a8a; }
.bcp-page .form-msg--success { color:var(--bc-green-400); }
`;

/* =====================================================================
   ICONS
   ===================================================================== */
const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'check': return <svg {...props}><polyline points="20 6 9 17 4 12" /></svg>;
    case 'x': return <svg {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case 'shield': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case 'play': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3" /></svg>;
    case 'arrow-right': return <svg {...props}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
    case 'quote': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M3 17h6l2-4V7H5v6h3zm10 0h6l2-4V7h-6v6h3z" /></svg>;
    default: return null;
  }
};

/* =====================================================================
   WINDOW BADGE
   ===================================================================== */
function WindowBadge({ state }: { state: WindowState }) {
  if (state === 'open') return <span className="window-badge"><span className="dot" />Founders Round &middot; Open Now</span>;
  if (state === 'before') return <span className="window-badge window-badge--soon"><span className="dot" />Founders Round &middot; Opens Soon</span>;
  return <span className="window-badge window-badge--closed"><span className="dot" />Founders Round &middot; Closed</span>;
}

/* =====================================================================
   COUNTDOWN
   ===================================================================== */
function Countdown({ target, label, onComplete }: { target: Date; label: string; onComplete?: () => void }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, total: 0 });
  useEffect(() => {
    const tick = () => {
      const total = Math.max(0, target.getTime() - Date.now());
      const s = Math.floor((total / 1000) % 60);
      const m = Math.floor((total / 1000 / 60) % 60);
      const h = Math.floor((total / (1000 * 60 * 60)) % 24);
      const d = Math.floor(total / (1000 * 60 * 60 * 24));
      setTime({ d, h, m, s, total });
      if (total <= 0 && onComplete) onComplete();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [target, onComplete]);

  if (time.total <= 0) return null;
  const urgent = time.total / (1000 * 60 * 60) <= 8;
  const parts: string[] = [];
  if (time.d > 0) parts.push(`${time.d}d`);
  if (time.h > 0 || time.d > 0) parts.push(`${String(time.h).padStart(2, '0')}h`);
  parts.push(`${String(time.m).padStart(2, '0')}m`);
  parts.push(`${String(time.s).padStart(2, '0')}s`);

  return (
    <div className={`countdown ${urgent ? 'countdown--urgent' : ''}`}>
      <span className="countdown__label">{label}</span>
      <span className="countdown__value">{parts.join(' ')}</span>
    </div>
  );
}

/* =====================================================================
   VSL — Wistia iframe embed
   ===================================================================== */
function VSL() {
  return (
    <div className="hero__vsl-wrap">
      <div className="vsl">
        <div className="vsl__glow" />
        <div className="vsl__inner">
          <iframe
            src="https://fast.wistia.net/embed/iframe/iypjgbm6ot?seo=true&videoFoam=true"
            title="Boundless Creator Program intro"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   REVIEW ARTIFACT
   ===================================================================== */
function ReviewArtifact() {
  return (
    <div className="review">
      <div className="review__head">
        <span className="review__eyebrow">Personal Review &middot; Sample</span>
        <h3 className="review__title">Where you actually are. The one bottleneck. The next action.</h3>
        <p className="review__sub">A document I write about your specific channel. Not a list of ten things. The one read you need this week.</p>
      </div>
      <div className="review__body">
        <div className="review__row">
          <h4 className="review__rowtitle">Where I think you actually are</h4>
          <p className="review__rowtext">Not where you think you are. Not where the algorithm tells you to think you are. Where you are based on what I see in your content, your packaging, and your data.</p>
        </div>
        <div className="review__row">
          <h4 className="review__rowtitle">The one bottleneck to fix first</h4>
          <p className="review__rowtext">Not a list of ten things. One. The thing that, if you fix it, the rest gets easier.</p>
        </div>
        <div className="review__row">
          <h4 className="review__rowtitle">The concrete next action this week</h4>
          <p className="review__rowtext">Specific. Doable. Something you can start before our first live call.</p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   CHECKLIST ARTIFACT
   ===================================================================== */
const CHECKLIST_ROWS = [
  { t: 'Foundational principles', b: 'Why this content exists. Who it serves.' },
  { t: 'Strategy', b: 'The bigger goal this video moves toward.' },
  { t: 'Ideation', b: 'Filter ideas through a real problem worth solving.' },
  { t: 'Titles', b: 'Earn the click. Set the right expectation.' },
  { t: 'Thumbnails', b: 'Land the promise visually in under a second.' },
  { t: 'Scripting', b: 'Earn every minute. Cut what does not serve.' },
  { t: 'Hooks', b: 'First 30 seconds. Honest tension. No bait.' },
  { t: 'Production', b: 'Ship something you would watch yourself.' },
  { t: 'Mindset', b: 'Stay in the work without burning out.' },
];

function ChecklistArtifact() {
  return (
    <div className="checklist">
      <div className="checklist__head">
        <span className="checklist__eyebrow">Content Checklist &middot; Sample</span>
        <h3 className="checklist__title">The step-by-step I run on every piece of content I make.</h3>
        <p className="checklist__sub">No more blank-page paralysis. Work through it with the bottleneck from your review in mind.</p>
      </div>
      <ul className="checklist__list">
        {CHECKLIST_ROWS.map((row, i) => (
          <li key={i} className="checklist__row">
            <span className="checklist__num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div className="checklist__rowtitle">{row.t}</div>
              <div className="checklist__rowtext">{row.b}</div>
            </div>
            <span className="checklist__check"><Icon name="check" size={18} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =====================================================================
   SYSTEM MAP
   ===================================================================== */
function SystemMap() {
  return (
    <div className="system">
      <div className="system__head">
        <div>
          <h3 className="system__title">The full course</h3>
          <p className="system__sub">Drips into the community starting your second week. Nine reference docs. The same systems I use on my own channel.</p>
        </div>
        <span className="system__count">9 / 9 modules</span>
      </div>
      <div className="system__grid">
        {CHECKLIST_ROWS.map((row, i) => (
          <div key={i} className="system__node">
            <div className="system__node-head">
              <span className="system__node-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="system__node-name">{row.t}</span>
            </div>
            <p className="system__node-sub">{row.b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
   WEEK STRIP
   ===================================================================== */
const WEEK = [
  { d: 'Mon', t: 'Drop your work', b: 'Post the script, title, or thumbnail you are working on.' },
  { d: 'Wed', t: '90-minute live', b: 'I work through your stuck points live. 2pm EST. Recorded.', highlight: 1 },
  { d: 'Fri', t: 'Get a read', b: 'I drop responses on what you posted that week.' },
  { d: 'Anytime', t: 'Direct access', b: 'Drop in whenever. Daily access between sessions.' },
];

function WeekStrip() {
  return (
    <div className="weekstrip">
      {WEEK.map((day, i) => (
        <div key={i} className="weekstrip__day" data-highlight={day.highlight ?? 0}>
          <span className="weekstrip__d">{day.d}</span>
          <div className="weekstrip__t">{day.t}</div>
          <div className="weekstrip__b">{day.b}</div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   VIDEO TESTIMONIAL — chapter chaining for multi-clip creators
   ===================================================================== */
type VideoTestimonialProps = {
  clips: string[];
  poster: string;
  pull: string;
  name: string;
  role: string;
  featured?: boolean;
};

function VideoTestimonial({ clips, poster, pull, name, role, featured }: VideoTestimonialProps) {
  const [playing, setPlaying] = useState(false);
  const [clipIdx, setClipIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    setClipIdx(0);
  };

  useEffect(() => {
    if (playing && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [playing, clipIdx]);

  const handleEnded = useCallback(() => {
    if (clipIdx < clips.length - 1) {
      setClipIdx((i) => i + 1);
    } else {
      setPlaying(false);
      setClipIdx(0);
    }
  }, [clipIdx, clips.length]);

  return (
    <div className={`tw-card tw-card--video ${featured ? 'tw-card--featured' : ''}`}>
      <div className="tw-video" onClick={!playing ? handlePlay : undefined}>
        {playing ? (
          <video
            ref={videoRef}
            src={clips[clipIdx]}
            controls
            autoPlay
            playsInline
            onEnded={handleEnded}
          />
        ) : (
          <>
            <div className="tw-video__poster">
              <img src={poster} alt={`${name} testimonial`} loading="lazy" />
            </div>
            <div className="tw-video__overlay" />
            <button type="button" className="tw-video__play" aria-label={`Play ${name} testimonial`}>
              <Icon name="play" size={22} />
            </button>
          </>
        )}
      </div>
      <p className="tw-card__text tw-video__pull">&ldquo;{pull}&rdquo;</p>
      <div className="tw-card__cite">
        <span className="tw-card__name">{name}</span>
        <span className="tw-card__role">{role}</span>
      </div>
    </div>
  );
}

/* =====================================================================
   TEXT TESTIMONIAL CARD
   ===================================================================== */
type TextTestimonial = { quote: string; name: string; role: string; featured?: boolean };

function TextTestimonialCard({ data }: { data: TextTestimonial }) {
  return (
    <div className={`tw-card ${data.featured ? 'tw-card--featured' : ''}`}>
      <span className="tw-card__mark"><Icon name="quote" size={20} /></span>
      <p className="tw-card__text">{data.quote}</p>
      <div className="tw-card__cite">
        <span className="tw-card__name">{data.name}</span>
        <span className="tw-card__role">{data.role}</span>
      </div>
    </div>
  );
}

/* =====================================================================
   TESTIMONIALS DATA
   ===================================================================== */
type AnyTestimonial =
  | { kind: 'text'; data: TextTestimonial }
  | { kind: 'video'; data: VideoTestimonialProps };

const TESTIMONIALS: AnyTestimonial[] = [
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/peter-byrne-1.mp4', '/testimonials/peter-byrne-2.mp4', '/testimonials/peter-byrne-3.mp4', '/testimonials/peter-byrne-4.mp4'],
      poster: '/testimonials/posters/peter-byrne-1.jpg',
      pull: 'Dave is a very skilled YouTube coach. He understands the platform and the audience. I am very happy with his coaching.',
      name: 'Peter Byrne',
      role: 'YouTube Creator',
      featured: true,
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/mark-young-1.mp4', '/testimonials/mark-young-2.mp4'],
      poster: '/testimonials/posters/mark-young-1.jpg',
      pull: 'Since joining the program my average view count has tripled to around 15K and my subscriber count has increased by over 45%.',
      name: 'Mark Young',
      role: 'Artisan Woodworks',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/chanelle-neilson-1.mp4', '/testimonials/chanelle-neilson-2.mp4'],
      poster: '/testimonials/posters/chanelle-neilson-1.jpg',
      pull: 'Dave gave me a clear roadmap. I stopped guessing and started shipping with intent.',
      name: 'Chanelle Neilson',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/daniel-bassett-1.mp4', '/testimonials/daniel-bassett-2.mp4'],
      poster: '/testimonials/posters/daniel-bassett-1.jpg',
      pull: 'Dave does not give you fluff. He looks at your channel and tells you what to fix.',
      name: 'Daniel Bassett',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/mireille-nicole-1.mp4', '/testimonials/mireille-nicole-2.mp4'],
      poster: '/testimonials/posters/mireille-nicole-1.jpg',
      pull: 'I left every session with concrete next steps. That changed everything.',
      name: 'Mireille Nicole',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/morgan-joan-kennedy.mp4'],
      poster: '/testimonials/posters/morgan-joan-kennedy.jpg',
      pull: 'Working with Dave was the highest leverage thing I did for my channel.',
      name: 'Morgan Joan Kennedy',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/tim-gardner.mp4'],
      poster: '/testimonials/posters/tim-gardner.jpg',
      pull: 'Direct, specific, no hype. Exactly the kind of feedback I needed.',
      name: 'Tim Gardner',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'He reviewed my channel, watched my videos, and took detailed notes on exactly where I could improve. He not only pointed out my weak spots, he gave concrete examples of how to fix them. People love to say "make a better title or thumbnail," but no one shows you how or why it works. Dave did both.',
      name: 'Melissa Terzis',
      role: 'DC Real Estate Mama',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'I have spent thousands of dollars in books and courses on YouTube. None of those things solved my problems. I needed to hear the brutal truth, that I had to rethink how I was approaching YouTube. Dave was that reality check.',
      name: 'Paul Backstrom',
      role: 'Screenwriting Scribe',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'Despite my best efforts, my YouTube channel had been stuck for a long time and I just couldn’t figure out what I was missing. In one coaching session, Dave helped me identify the main issues, demystified the whole process, and gave me clear, actionable next steps.',
      name: 'Tara Malone',
      role: 'My Catholic Homecoming',
    },
  },
  {
    kind: 'text',
    data: {
      quote: "I've completed several YouTube coachings, even Ali Abdaal's. Nothing comes close to what Dave has to offer.",
      name: 'Matt Moss',
      role: 'Matt Moss PBSM',
      featured: true,
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'Dave is sharp. He saw the holes in my channel I had been missing for two years and pointed me at the one thing to fix this week.',
      name: 'Jasim Eisa',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'I came in expecting generic tips. I left with a personal read on my channel I have not gotten anywhere else.',
      name: 'SBtrader82',
      role: 'YouTube Creator',
    },
  },
];

/* =====================================================================
   TESTIMONIAL WALL
   ===================================================================== */
function TestimonialWall() {
  return (
    <div className="tw__grid">
      {TESTIMONIALS.map((t, i) =>
        t.kind === 'video' ? (
          <VideoTestimonial key={i} {...t.data} />
        ) : (
          <TextTestimonialCard key={i} data={t.data} />
        )
      )}
    </div>
  );
}

/* =====================================================================
   WAITLIST FORM (BC styled)
   ===================================================================== */
const KIT_FORM_ID = '8175003';
const KIT_API_KEY = '8r2gDZv9vgYKgeS4TAeKdw';

function WaitlistFormBC({ context }: { context: 'before' | 'after' }) {
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
      const res = await fetch(`https://api.convertkit.com/v3/forms/${KIT_FORM_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: KIT_API_KEY, email, first_name: firstName || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-msg form-msg--success" style={{ padding: '14px 0' }}>
        Check your email. Confirm to get on the waitlist.
      </div>
    );
  }

  const heads = {
    before: { title: 'The window opens soon', sub: 'Drop your email. I will let you know the moment it opens.', btn: 'Notify me' },
    after: { title: 'This window has closed', sub: 'Get on the list for the next round at the same founders rate.', btn: 'Join the waitlist' },
  };
  const h = heads[context];

  return (
    <div>
      <h3 className="price__title" style={{ marginTop: 0 }}>{h.title}</h3>
      <p className="price__sub" style={{ marginTop: 0 }}>{h.sub}</p>
      <form onSubmit={handleSubmit} className="price__waitlist-form">
        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name (optional)" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
        {error && <p className="form-msg form-msg--error">{error}</p>}
        <button type="submit" disabled={loading || !email} className="btn btn--primary btn--block btn--lg">
          {loading ? 'Joining...' : h.btn}
        </button>
      </form>
    </div>
  );
}

/* =====================================================================
   PRICING CARD
   ===================================================================== */
type PricingCardProps = {
  windowState: WindowState;
  isLoadingFull: boolean;
  isLoadingInstall: boolean;
  error?: string;
  onCheckout: (mode: 'full' | 'installment') => void;
  windowOpen: Date | null;
  windowClose: Date | null;
  onWindowOpened: () => void;
  onWindowClosed: () => void;
};

function PricingCard({
  windowState, isLoadingFull, isLoadingInstall, error, onCheckout,
  windowOpen, windowClose, onWindowOpened, onWindowClosed,
}: PricingCardProps) {
  return (
    <div className="price">
      <span className="overline" style={{ position: 'relative' }}>Founders Round</span>
      <h3 className="price__title">Personal review. Live calls. Direct access.</h3>

      {windowState === 'before' && windowOpen && (
        <div style={{ marginBottom: 'var(--s-5)' }}>
          <Countdown target={windowOpen} label="Opens in" onComplete={onWindowOpened} />
        </div>
      )}
      {windowState === 'open' && windowClose && (
        <div style={{ marginBottom: 'var(--s-5)' }}>
          <Countdown target={windowClose} label="Enrollment closes in" onComplete={onWindowClosed} />
        </div>
      )}

      {windowState === 'open' ? (
        <>
          <div className="price__row">
            <span className="price__strike">$1,998</span>
            <span className="price__main">$999</span>
            <span className="price__alt">or 2 &times; $599</span>
          </div>
          <p className="price__sub"><strong>Founders rate. 50% off every future version.</strong></p>

          {error && <p className="form-msg form-msg--error" style={{ marginBottom: 'var(--s-3)' }}>{error}</p>}

          <div className="price__buttons">
            <button
              onClick={() => onCheckout('full')}
              disabled={isLoadingFull}
              className="btn btn--primary btn--xl btn--block"
            >
              {isLoadingFull ? 'Redirecting to Stripe...' : 'Join now — $999'}
            </button>
            <button
              onClick={() => onCheckout('installment')}
              disabled={isLoadingInstall}
              className="btn btn--ghost btn--block price__btn-split"
            >
              {isLoadingInstall ? 'Redirecting...' : 'Or pay in two installments — $599'}
            </button>
          </div>

          <div className="price__rule" />

          <ul className="price__included">
            <li><Icon name="check" size={16} /><span><strong>Personal review</strong> in your first week</span></li>
            <li><Icon name="check" size={16} /><span><strong>Content checklist</strong> the same day</span></li>
            <li><Icon name="check" size={16} /><span>Weekly 90-minute live session, Wednesdays 2pm EST</span></li>
            <li><Icon name="check" size={16} /><span>Direct access to me every day</span></li>
            <li><Icon name="check" size={16} /><span>The full course as it drips week by week</span></li>
            <li><Icon name="check" size={16} /><span>Full resource library and past cohort recaps</span></li>
          </ul>

          <div className="price__guarantee">
            <Icon name="shield" size={18} />
            <span><strong>30-day guarantee.</strong> No questions, no conditions. You walk away with your personal review either way.</span>
          </div>
        </>
      ) : (
        <WaitlistFormBC context={windowState} />
      )}
    </div>
  );
}

/* =====================================================================
   CTA BAND
   ===================================================================== */
function CTABand({ title, sub, onClick, fineprint }: { title: string; sub?: string; onClick: () => void; fineprint?: string }) {
  return (
    <div className="cta-band">
      <div className="cta-band__glow" />
      <div className="cta-band__content container">
        <h3 className="cta-band__title">{title}</h3>
        {sub && <p className="cta-band__sub">{sub}</p>}
        <button onClick={onClick} className="btn btn--primary btn--xl">
          Join now &mdash; $999
        </button>
        {fineprint && <p className="cta-band__fineprint">{fineprint}</p>}
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN PAGE
   ===================================================================== */
export default function TestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInstallment, setIsLoadingInstallment] = useState(false);
  const [error, setError] = useState<string>();
  const [windowState, setWindowState] = useState<WindowState>('open');
  const [windowOpen, setWindowOpen] = useState<Date | null>(null);
  const [windowClose, setWindowClose] = useState<Date | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const previewState = params.get('preview_state');
    if (previewState === 'before' || previewState === 'open' || previewState === 'after') {
      setWindowState(previewState);
      if (previewState === 'before') {
        setWindowOpen(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
        setWindowClose(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
      } else if (previewState === 'open') {
        setWindowOpen(new Date(Date.now() - 24 * 60 * 60 * 1000));
        setWindowClose(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
      }
      return;
    }

    const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
    const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;
    if (!openStr || !closeStr) { setWindowState('open'); return; }
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

  const handleCheckout = useCallback(async (mode: 'full' | 'installment') => {
    const setLoaderFn = mode === 'full' ? setIsLoading : setIsLoadingInstallment;
    setLoaderFn(true);
    setError(undefined);
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email') || undefined;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
          paymentMode: mode === 'installment' ? 'installment' : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoaderFn(false); return; }
      if (data.url) { window.location.href = data.url; }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoaderFn(false);
    }
  }, []);

  const scrollToCheckout = useCallback(() => {
    document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const closeAdjusted = useMemo(
    () => (windowClose ? new Date(windowClose.getTime() - 1) : null),
    [windowClose]
  );
  const closeDay = closeAdjusted
    ? closeAdjusted.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
    : null;
  const closeTime = closeAdjusted
    ? closeAdjusted.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
    : null;

  return (
    <div className="bcp-page">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav__inner">
            <a href="#top" className="nav__brand"><span className="bc-logo">Boundless Creator Program</span></a>
            <button onClick={scrollToCheckout} className="btn btn--primary nav__cta">Join now</button>
          </div>
        </nav>

        {/* 01 — HERO */}
        <section id="top" className="hero">
          <div className="hero__glow" />
          <div className="container hero__inner">
            <div className="hero__top">
              <WindowBadge state={windowState} />
            </div>
            <h1 className="hero__title">
              Stop guessing what to fix on your channel. Get a <span className="blue-em">personal review</span> from me in your first week.
            </h1>
            <p className="hero__sub">
              Three months working with me. Weekly live calls. Direct access every day. The systems I use to grow channels, handed to you.
            </p>

            <VSL />

            <div className="hero__cta-stack">
              <button onClick={scrollToCheckout} className="btn btn--primary btn--xl">
                Join now &mdash; $999
              </button>
              <p className="hero__price-line">
                <span className="strike">$1,998</span>
                <span><strong>$999</strong> founders rate</span>
                <span className="dot-sep">&middot;</span>
                <span>50% off every future version</span>
              </p>
            </div>

            <div className="hero__trust">
              <div>
                <div className="cred__num">15<span className="cred__sup">+</span></div>
                <div className="cred__sub">years on YouTube</div>
              </div>
              <div>
                <div className="cred__num">65K</div>
                <div className="cred__sub">subscribers</div>
              </div>
              <div>
                <div className="cred__num">100<span className="cred__sup">+</span></div>
                <div className="cred__sub">creators coached</div>
              </div>
            </div>

            <div className="hero-quote">
              <span className="hero-quote__mark"><Icon name="quote" size={28} /></span>
              <p className="hero-quote__text">
                My average view count tripled to around 15K. My subscriber count is up over 45%. I now have a clear roadmap.
              </p>
              <div className="hero-quote__cite">
                <span className="hero-quote__name">Mark Young</span>
                <span className="hero-quote__role">Artisan Woodworks</span>
              </div>
            </div>
          </div>
        </section>

        {/* 02 — WEEK ONE (the wedge) */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">02</span>
              <span className="overline">Week one</span>
            </div>
            <h2 className="section-h">What every founder gets in their first week.</h2>
            <p className="section-sub">
              Two artifacts. The personal review tells you what is broken on your specific channel. The checklist tells you what to do about it on every upload after that. <strong>You stop guessing.</strong>
            </p>
            <div className="wedge-grid">
              <ReviewArtifact />
              <ChecklistArtifact />
            </div>
          </div>
        </section>

        {/* 03 — THE PROBLEM */}
        <section>
          <div className="container">
            <div className="section-head">
              <span className="section-num">03</span>
              <span className="overline">The problem</span>
            </div>
            <div className="grid-2 problem-grid">
              <p className="problem-quote">
                You are not guessing because you are new. You are guessing because nobody has told you what is broken on your channel.
              </p>
              <ul className="problem-list">
                <li>Most creators here have already <strong>watched the courses</strong> and read the threads.</li>
                <li>Posted dozens of videos. Every upload still feels like a coin flip.</li>
                <li>Information is free. <strong>That is not the problem.</strong></li>
                <li>The problem is you do not have a clear read on your specific channel.</li>
                <li>Generic advice cannot give you that. Most creators stay stuck here for years.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 04 — REPEAT CTA */}
        <CTABand
          title="Get a personal read on your channel this week."
          sub="Founders rate. 50% off every future version."
          onClick={scrollToCheckout}
          fineprint="30-day guarantee. No questions. You keep the review."
        />

        {/* 05 — WHAT ELSE YOU GET */}
        <section>
          <div className="container">
            <div className="section-head">
              <span className="section-num">05</span>
              <span className="overline">What else you get</span>
            </div>
            <h2 className="section-h">The rest of the program.</h2>
            <p className="section-sub">
              Week one hands you a personal read and a checklist. Here is what comes after.
            </p>

            <div className="grid-2" style={{ marginBottom: 'var(--s-9)' }}>
              <div className="card card--raised">
                <h3 className="card__title">Direct work with me</h3>
                <p className="card__body">
                  A <strong>90-minute live strategy session every week</strong>. Wednesdays at 2pm EST. Bring questions, videos, anything you are stuck on. I work through them live.
                </p>
                <p className="card__body" style={{ marginTop: 'var(--s-4)' }}>
                  <strong>Direct access to me every day</strong> in the community between sessions. Drop your work and I give you a read on it.
                </p>
              </div>
              <div className="card card--raised">
                <h3 className="card__title">A real community</h3>
                <p className="card__body">
                  Other serious creators going through the same work at the same time. Public threads. <strong>Not a paid Discord with a content dump.</strong>
                </p>
                <p className="card__body" style={{ marginTop: 'var(--s-4)' }}>
                  Every review I do is posted in a thread the rest of the cohort can read. You learn from your own review and from theirs.
                </p>
              </div>
            </div>

            <SystemMap />
          </div>
        </section>

        {/* 06 — A WEEK IN THE PROGRAM */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">06</span>
              <span className="overline">A week in the program</span>
            </div>
            <h2 className="section-h">What a normal week looks like.</h2>
            <p className="section-sub">
              You do not need to live in the community. You need to use it where it actually moves your channel.
            </p>
            <WeekStrip />
          </div>
        </section>

        {/* 07 — WHO THIS IS FOR */}
        <section>
          <div className="container">
            <div className="section-head">
              <span className="section-num">07</span>
              <span className="overline">Who this is for</span>
            </div>
            <h2 className="section-h">Who this is for. Who it is not.</h2>
            <div className="grid-2">
              <div className="card card--for">
                <span className="is-for-tag">This is for</span>
                <ul className="filter-list filter-list--for">
                  <li><span className="ico ico--check"><Icon name="check" size={18} /></span><span><strong>YouTubers</strong> trying to make this their full-time job</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={18} /></span><span><strong>Channel owners</strong> ready to ditch scattered tips for a real system</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={18} /></span><span><strong>Niche experts</strong> who want a clear plan, not another upload-and-pray</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={18} /></span><span><strong>Long-game thinkers</strong> who refuse to chase viral moments</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={18} /></span><span>Anyone who wants <strong>my eyes on their work</strong></span></li>
                </ul>
              </div>
              <div className="card card--not">
                <span className="is-not-tag">This is not for</span>
                <ul className="filter-list filter-list--not">
                  <li><span className="ico ico--ex"><Icon name="x" size={18} /></span><span><strong>Viral moment chasers</strong></span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={18} /></span><span><strong>Get-rich-quick types</strong> with no love for the craft</span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={18} /></span><span><strong>AI slop publishers</strong></span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={18} /></span><span><strong>Know-it-alls</strong> who think they have nothing left to learn</span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={18} /></span><span>People looking for <strong>someone else to do the work</strong></span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 08 — TESTIMONIAL WALL */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">08</span>
              <span className="overline">What creators say</span>
            </div>
            <div className="tw__head">
              <h2 className="section-h" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', maxWidth: '24ch' }}>
                People who used to be exactly where you are.
              </h2>
              <p className="tw__sub">
                Most of these creators came in stuck. They left with a clear read and a system. Same offer. Same promise.
              </p>
            </div>
            <TestimonialWall />
          </div>
        </section>

        {/* 09 — FOUNDER BLOCK */}
        <section>
          <div className="container narrow">
            <div className="section-head">
              <span className="section-num">09</span>
              <span className="overline">From me</span>
            </div>
            <h2 className="founder__title">Why I built this.</h2>
            <div className="founder__body">
              <p>
                I launched my high-ticket program last year after about 35 conversations with creators. Almost every one of them said the same thing.
              </p>
              <p className="founder__pull">
                &ldquo;I want to work with you. I am not at the spot where it makes sense to pay this much.&rdquo;
              </p>
              <p>
                I have taken close to 200 applications since. Most of them are not the right fit for the high-ticket. For most of my audience, it is not the right offer.
              </p>
              <p>
                <strong>This program is the bridge.</strong> For the creators who are not far in their journey yet, who want my systems, my attention, and my help, but who do not need the full one-on-one container.
              </p>
              <p>
                There are no barriers here. If you want to grow your channel, you are welcome.
              </p>
              <p>
                I think about YouTube all day. Constantly learning, reassessing, reverse-engineering content. Hours and hours every day. I enjoy helping. I can talk about this stuff all day long.
              </p>
              <p>
                I think I can help somebody who wants to follow in my footsteps and treat YouTube seriously.
              </p>
              <p className="founder__sig">&mdash; Dave Jeltema</p>
            </div>
          </div>
        </section>

        {/* 10 — CHECKOUT */}
        <section id="checkout" className="checkout-section">
          <div className="container">
            <div className="checkout-stack">
              <div className="checkout-stack__head">
                <span className="overline" style={{ position: 'relative', display: 'inline-flex' }}>Founders Round</span>
                <h2 className="section-h" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', maxWidth: '24ch', marginTop: 'var(--s-3)' }}>
                  Join the Founders Round.
                </h2>
                <p className="section-sub" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
                  This price never goes up for you. Founders lock in 50% off every future version.
                </p>
              </div>

              <PricingCard
                windowState={windowState}
                isLoadingFull={isLoading}
                isLoadingInstall={isLoadingInstallment}
                error={error}
                onCheckout={handleCheckout}
                windowOpen={windowOpen}
                windowClose={windowClose}
                onWindowOpened={handleWindowOpened}
                onWindowClosed={handleWindowClosed}
              />

              <p className="checkout-fineprint">Secure checkout via Stripe</p>
            </div>
          </div>
        </section>

        {/* 11 — FAQ */}
        <section>
          <div className="container narrow">
            <div className="section-head" style={{ borderBottom: 0, paddingBottom: 0 }}>
              <span className="section-num">11</span>
              <span className="overline">Common questions</span>
            </div>
            <h2 className="section-h faq__h">Common questions.</h2>
            <div className="faq">
              <details className="faq__item">
                <summary className="faq__q">Why is this $999?</summary>
                <div className="faq__a">
                  It is intentionally low. The polished version targets a higher price. This is the founders edition. You get in early for 50% off, locked in for every future version. <strong>The personal review alone is the kind of work clients pay multiple thousands for in my high-ticket Boundless Creator Accelerator.</strong>
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">Is this just a paid community?</summary>
                <div className="faq__a">
                  No. <strong>The personal review is the headline.</strong> The community is the container. The mentorship is the work.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">What if I am brand new or already at 50K?</summary>
                <div className="faq__a">
                  Same answer to both. The review is tailored to where you are. Any sub count. Any niche. <strong>I look at your specific channel and tell you the one bottleneck to fix first.</strong>
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">How much time will it take?</summary>
                <div className="faq__a">
                  The live session is <strong>90 minutes Wednesdays at 2pm EST</strong>. Recorded for VOD if you cannot make it. Everything else is at your own pace.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">What if it is not for me?</summary>
                <div className="faq__a">
                  <strong>30 days. No questions. No conditions. Full refund.</strong> You walk away with your personal review either way.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">Is this auto-renewing?</summary>
                <div className="faq__a">
                  No. It is a one-time payment for three months. After three months, you can renew at the founders rate (50% off whatever the going rate becomes) or walk. <strong>Your call.</strong>
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">What about the installment option?</summary>
                <div className="faq__a">
                  Two payments of $599, billed 30 days apart. Same program, same access, just split into two.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* 12 — P.S. (only when window open) */}
        {windowState === 'open' && (
          <section className="ps-section">
            <div className="container narrow">
              <div className="ps">
                <span className="ps__label">P.S.</span>
                <p>
                  The window closes <strong>{closeDay && closeTime ? `${closeDay} at ${closeTime} EST` : 'soon'}</strong>. After that, the next round opens at the same founders price.
                </p>
                <p>
                  Eventually I launch the polished version. That number could shift. Could be a month from now. Could be longer.
                </p>
                <p>
                  Founders who join now lock in <strong>half off whatever the going rate becomes</strong>. Same dollars per month for as long as they stay.
                </p>
                <p>
                  If you want the better price, come now. If you want to wait, come later. <strong>Both are fine.</strong>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer>
          <div className="container">
            <div>
              <span className="bc-logo" style={{ fontSize: 14, fontWeight: 600, color: 'var(--bc-text-300)' }}>Boundless Creator Program</span>
            </div>
            <div className="footer__links">
              <a href="mailto:hello@boundlesscreator.com">Contact</a>
              <a href="https://www.youtube.com/@boundlesscreator" target="_blank" rel="noopener noreferrer">YouTube</a>
            </div>
            <div style={{ color: 'var(--bc-text-500)' }}>&copy; {new Date().getFullYear()} Boundless Creator</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
