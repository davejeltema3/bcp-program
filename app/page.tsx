'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { yearsOnYouTube, formatSubscribers, SUBSCRIBER_FALLBACK } from '@/lib/site-stats';

type WindowState = 'before' | 'open' | 'after';

// Toggle to show/hide the hero VSL embed. Flip to true to bring it back.
const SHOW_VSL = true;

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
.bcp-page .green-em { color:var(--bc-green-400); font-weight:700; }
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
.bcp-page .bc-logo {
  font-family: var(--font-urbanist), 'Urbanist', 'Inter', ui-sans-serif, sans-serif;
  font-size:22px; font-weight:700; color:var(--bc-blue-300); letter-spacing:-0.01em;
}
.bcp-page .nav__cta { padding:10px 16px; font-size:14px; flex-shrink:0; }
.bcp-page .nav__timer {
  /* Push timer + button to the right edge together. margin-left:auto
     consumes all the slack between brand and timer, so timer sits right
     next to the CTA button instead of free-floating in the middle. */
  display:flex; align-items:center; flex-shrink:0; margin-left:auto;
}
.bcp-page .nav__timer .countdown { padding:6px 12px; }
.bcp-page .nav__timer .countdown__label { font-size:10px; }
.bcp-page .nav__timer .countdown__value { font-size:14px; }
@media(max-width:820px) { .bcp-page .nav__timer { display:none; } }
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

.bcp-page .eyebrow {
  /* Renamed from .overline because Tailwind has a built-in .overline utility
     that adds text-decoration:overline (the literal CSS overline). That was
     stacking on top of every eyebrow on the page. */
  display:inline-flex; align-items:center; gap:10px; vertical-align:middle;
  font-family:var(--bc-font-mono); font-size:var(--bc-fs-caption);
  color:var(--bc-blue-300); letter-spacing:var(--bc-ls-overline);
  text-transform:uppercase; line-height:1;
  text-decoration:none;
}
.bcp-page .eyebrow__line {
  display:inline-block; width:24px; height:1px; background:currentColor; opacity:.55;
  flex-shrink:0;
}

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

.bcp-page .hero { padding:var(--s-5) 0 var(--s-8); position:relative; overflow:hidden; text-align:center; }
.bcp-page .hero__glow {
  position:absolute; top:-180px; left:50%; width:1000px; height:520px;
  transform:translateX(-50%);
  /* Same-hue at 0 alpha avoids banding (default 'transparent' interpolates
     through middle gray which causes visible rings). Tighter and dimmer
     than the smoothed version so the glow sits behind the headline like
     a soft halo instead of washing the whole hero. */
  background:radial-gradient(
    ellipse at center,
    rgba(58,133,255,0.20) 0%,
    rgba(58,133,255,0.14) 24%,
    rgba(58,133,255,0.07) 48%,
    rgba(58,133,255,0.02) 72%,
    rgba(58,133,255,0) 100%
  );
  pointer-events:none; filter:blur(40px); will-change:filter;
}
.bcp-page .hero__inner { position:relative; }
.bcp-page .hero__top { display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:var(--s-5); }
.bcp-page .hero__title {
  font-size:clamp(28px,3vw,46px); font-weight:600;
  letter-spacing:-0.025em; line-height:1.08;
  color:var(--bc-text-100); margin:0 auto var(--s-4); max-width:46ch; text-wrap:balance;
}
@media(max-width:760px) {
  .bcp-page .hero__title { max-width:36ch; }
}
.bcp-page .hero__sub { font-size:16px; color:var(--bc-text-300); max-width:58ch; margin:0 auto var(--s-5); line-height:1.5; text-wrap:pretty; }
.bcp-page .hero__sub strong { color:var(--bc-text-100); font-weight:600; }

.bcp-page .hero__trust {
  display:grid; grid-template-columns:repeat(3,1fr);
  margin:var(--s-5) auto 0; padding:var(--s-4) 0;
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
.bcp-page .hero__price-line strong { color:var(--bc-green-400); font-weight:700; }
.bcp-page .hero__price-line .strike { text-decoration:line-through; text-decoration-color:var(--bc-strike); color:var(--bc-text-400); }
.bcp-page .hero__price-line .dot-sep { color:var(--bc-text-500); }
.bcp-page .price-pill { display:inline-flex; align-items:center; gap:8px; background:var(--bc-ink-800); border:1px solid var(--bc-ink-600); border-radius:999px; padding:7px 16px; font-size:14px; }
.bcp-page .price-pill strong { color:var(--bc-green-400); font-weight:600; }
.bcp-page .price-pill .strike { color:var(--bc-text-400); text-decoration:line-through; text-decoration-color:var(--bc-strike); font-family:var(--bc-font-mono); font-size:13px; }

.bcp-page .hero-quote {
  max-width:680px; margin:var(--s-5) auto 0; padding:var(--s-5) var(--s-6);
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

.bcp-page .hero__vsl-wrap { max-width:920px; margin:0 auto var(--s-5); position:relative; }
/* Soft blue halo around the player, same family as the hero glow. Inset is a
   percentage so the glow scales with the player (looks right on mobile too). */
.bcp-page .hero__vsl-wrap::before {
  content:''; position:absolute; inset:-3%; z-index:0; pointer-events:none;
  border-radius:var(--r-4);
  background:rgba(58,133,255,0.26);
  filter:blur(42px);
}
.bcp-page .hero__vsl-wrap .vsl { aspect-ratio:16/9; max-height:520px; position:relative; z-index:1; }
.bcp-page .vsl { position:relative; border-radius:var(--r-4); overflow:hidden; aspect-ratio:16/9; background:var(--bc-ink-900); }
.bcp-page .vsl__glow { position:absolute; inset:-60px; background:radial-gradient(closest-side,var(--bc-blue-glow),transparent 70%); filter:blur(40px); pointer-events:none; z-index:0; }
.bcp-page .vsl__inner { position:relative; z-index:1; width:100%; height:100%; }
/* Persistent blurred poster behind the player. Stays put while Wistia loads,
   so the placeholder hands off to the video with no dark flash. */
.bcp-page .vsl__inner::before {
  content:''; position:absolute; inset:-12px; z-index:0;
  background: center / cover no-repeat url('https://fast.wistia.com/embed/medias/jy79qz36k3/swatch');
  filter: blur(12px);
}
.bcp-page .vsl iframe { width:100%; height:100%; border:0; display:block; position:relative; z-index:1; }
.bcp-page wistia-player { display:block; width:100%; height:100%; position:relative; z-index:1; }

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
.bcp-page .review__rowtext mark { background:transparent; color:var(--bc-blue-200); font-weight:600; position:relative; padding:0 2px; }
.bcp-page .review__rowtext mark::before { content:""; position:absolute; left:-2px; right:-2px; bottom:-1px; height:7px; background:var(--bc-blue-glow); filter:blur(3px); z-index:-1; }

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
.bcp-page .price::before {
  content:""; position:absolute; top:-160px; right:-160px;
  width:380px; height:380px;
  background:radial-gradient(
    closest-side,
    rgba(58,133,255,0.16) 0%,
    rgba(58,133,255,0.08) 40%,
    rgba(58,133,255,0.02) 70%,
    rgba(58,133,255,0) 100%
  );
  filter:blur(40px); pointer-events:none;
}
.bcp-page .price__head-row {
  display:flex; align-items:center; justify-content:space-between;
  gap:var(--s-4); flex-wrap:wrap; position:relative;
}
.bcp-page .price__head-row .countdown { padding:8px 12px; }
.bcp-page .price__title { font-size:26px; font-weight:600; color:var(--bc-text-100); margin:16px 0 24px; position:relative; }
.bcp-page .price__row { display:flex; align-items:baseline; gap:var(--s-5); position:relative; flex-wrap:wrap; }
.bcp-page .price__strike { font-family:var(--bc-font-mono); font-size:28px; color:var(--bc-text-400); text-decoration:line-through; text-decoration-color:var(--bc-strike); }
.bcp-page .price__main { font-weight:700; font-size:64px; color:var(--bc-text-100); letter-spacing:-0.025em; line-height:1; }
.bcp-page .price__alt { font-family:var(--bc-font-mono); font-size:13px; color:var(--bc-text-300); margin-left:8px; }
.bcp-page .price__sub { font-size:15px; color:var(--bc-text-300); margin:var(--s-3) 0 var(--s-7); position:relative; }
.bcp-page .price__sub strong { color:var(--bc-green-400); font-weight:600; }
.bcp-page .price__rule { height:1px; background:var(--bc-ink-600); margin:var(--s-6) 0; position:relative; }
.bcp-page .price__included { display:flex; flex-direction:column; gap:10px; position:relative; list-style:none; padding:0; margin:0; }
.bcp-page .price__included li { display:grid; grid-template-columns:18px 1fr; gap:10px; font-size:14px; color:var(--bc-text-200); align-items:start; }
.bcp-page .price__included li svg { margin-top:3px; color:var(--bc-blue-300); }
.bcp-page .price__assurances {
  list-style:none; margin:var(--s-5) 0 0; padding:0;
  display:flex; flex-direction:column; gap:8px;
  font-size:13px; color:var(--bc-text-300); position:relative;
}
.bcp-page .price__assurances li { display:flex; align-items:center; gap:10px; }
.bcp-page .price__pip {
  width:6px; height:6px; border-radius:50%;
  background:var(--bc-green-400);
  box-shadow:0 0 8px var(--bc-green-glow);
  flex-shrink:0;
}
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
  background:var(--bc-ink-850);
  border-top:1px solid var(--bc-ink-700); border-bottom:1px solid var(--bc-ink-700);
  padding:var(--s-10) 0; text-align:center; position:relative; overflow:hidden;
}
.bcp-page .cta-band__glow {
  /* Squished vertically (height 60%) so the gradient doesn't reach the
     top or bottom edge of the section. Section background shows through
     above and below, no hard edge. */
  position:absolute; inset:0; pointer-events:none; opacity:.6;
  background:radial-gradient(
    ellipse 45% 60% at center,
    rgba(58,133,255,0.32) 0%,
    rgba(58,133,255,0.20) 22%,
    rgba(58,133,255,0.10) 46%,
    rgba(58,133,255,0.04) 68%,
    rgba(58,133,255,0.01) 86%,
    rgba(58,133,255,0) 100%
  );
  filter:blur(20px); will-change:filter;
}
.bcp-page .cta-band__content { position:relative; }
.bcp-page .cta-band__title { font-size:clamp(28px,3.5vw,42px); font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0 auto var(--s-5); max-width:24ch; text-wrap:balance; }
.bcp-page .cta-band__sub { color:var(--bc-text-300); font-size:17px; margin:0 auto var(--s-7); max-width:52ch; }
.bcp-page .cta-band__fineprint { margin-top:var(--s-5); font-size:13px; color:var(--bc-text-400); }

.bcp-page .founder__title { font-size:clamp(34px,4vw,52px); font-weight:600; letter-spacing:var(--bc-ls-heading); color:var(--bc-text-100); margin:0 0 var(--s-8); line-height:1.1; }
.bcp-page .founder__body { font-size:18px; color:var(--bc-text-200); line-height:1.75; display:flex; flex-direction:column; gap:var(--s-6); }
.bcp-page .founder__body strong { color:var(--bc-text-100); font-weight:600; }
.bcp-page .founder__pull {
  font-size:26px; font-weight:500; color:var(--bc-blue-200);
  border-left:3px solid var(--bc-blue-400); padding-left:var(--s-6);
  line-height:1.4; margin:var(--s-2) 0 !important;
}
.bcp-page .founder__sig { font-family:var(--bc-font-mono); font-size:16px; color:var(--bc-text-200); margin-top:var(--s-5) !important; }

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
  position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%);
  z-index:2; width:64px; height:64px; border-radius:50%;
  display:grid; place-items:center;
  background:rgba(15,23,41,.55);
  color:#fff; opacity:.5;
  border:1px solid rgba(255,255,255,.25);
  cursor:pointer;
  transition:opacity 200ms ease, transform 200ms ease, background 200ms ease;
}
.bcp-page .tw-video:hover .tw-video__play {
  opacity:1;
  background:linear-gradient(180deg,var(--bc-blue-400),var(--bc-blue-500));
  transform:translate(-50%,-50%) scale(1.06);
}
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
   VSL — Wistia web component with swatch placeholder (no load flash)
   ===================================================================== */
const WISTIA_MEDIA_ID = 'jy79qz36k3';

function VSL() {
  useEffect(() => {
    // Load Wistia player runtime once
    if (!document.querySelector('script[src*="fast.wistia.com/player.js"]')) {
      const s1 = document.createElement('script');
      s1.src = 'https://fast.wistia.com/player.js';
      s1.async = true;
      document.head.appendChild(s1);
    }
    // Load this media's embed script once
    if (!document.querySelector(`script[src*="${WISTIA_MEDIA_ID}.js"]`)) {
      const s2 = document.createElement('script');
      s2.src = `https://fast.wistia.com/embed/${WISTIA_MEDIA_ID}.js`;
      s2.async = true;
      s2.type = 'module';
      document.head.appendChild(s2);
    }
  }, []);

  return (
    <div className="hero__vsl-wrap">
      <div className="vsl">
        <div className="vsl__glow" />
        <div className="vsl__inner">
          {/* Wistia custom element. Rendered via createElement so TS does not
              complain about the unknown intrinsic. */}
          {React.createElement('wistia-player', {
            'media-id': WISTIA_MEDIA_ID,
            aspect: '1.7777777777777777',
          })}
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
        <span className="review__eyebrow">Personal review &middot; Week 01</span>
        <h3 className="review__title">&ldquo;Where you actually are. Not where you think you are.&rdquo;</h3>
        <p className="review__sub">A document about your specific channel. Written from research on your niche, your questionnaire, twenty minutes of me dictating what I see, and your analytics if you give me access.</p>
      </div>
      <div className="review__body">
        <div className="review__row">
          <p className="review__rowtitle">Where you are</p>
          <p className="review__rowtext">Not where you think you are. Not where the algorithm tells you to think you are. <mark>Where you are based on what I see.</mark> Your packaging, your retention shape, your title and thumb language compared to the people winning in your niche right now.</p>
        </div>
        <div className="review__row">
          <p className="review__rowtitle">The one bottleneck to fix first</p>
          <p className="review__rowtext">Not a list of ten things. <mark>One.</mark> The thing that, if you fix it, makes the rest get easier. Most creators have a packaging bottleneck pretending to be a content bottleneck. Some have it the other way around. I name yours.</p>
        </div>
        <div className="review__row">
          <p className="review__rowtitle">The concrete next action this week</p>
          <p className="review__rowtext">Specific. Doable. Something you can <mark>start before our first live call</mark>. Not &ldquo;rebrand your channel.&rdquo; Something like: re-cut these three titles, or audit retention on these last four uploads.</p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   CHECKLIST ARTIFACT
   ===================================================================== */
// Content checklist rows shown inside the ChecklistArtifact (the 7-step weekly process)
const CHECKLIST_ROWS = [
  { t: 'Idea', b: 'Outlier translation. The Acute Moment Test. The five validation questions.' },
  { t: 'Title', b: 'The Three-Layer Test. Layer 1 viewer language. Honesty filter. Target Moments.' },
  { t: 'Thumbnail', b: "Reinforce, do not repeat. Obvious over clever. Sit next to the big creators." },
  { t: 'Hook', b: 'Six components. Six templates. Start at dislike. The 20-second rule.' },
  { t: 'Script', b: 'Setup-tension-payoff. Forward pulls. WHY moments. Structure that earns retention.' },
  { t: 'Production', b: 'Audio over camera. Three-take minimum. What matters and what does not.' },
  { t: 'Publish + behavior', b: 'The post-upload moves most creators skip. Where you actually get found.' },
];

// The nine course documents (Foundational, Strategy, Ideation, etc.) shown in the system map
const NINE_DOCS: Array<[string, string]> = [
  ['Foundational Principles', 'Effort × strategy. The chain. Inevitability math. Information vs transformation. Packaging beats content. Good enough beats perfect. The valley of death.'],
  ['Strategy', 'Who you talk to. What problem you solve. What formats you use. What goals you are working toward. The decisions that decide everything downstream.'],
  ['Ideation', 'Finding ideas, validating them, knowing when to invest the hours and when to pass. Outlier translation. The Acute Moment Test.'],
  ['Titles', 'What makes a title work. The Three-Layer Test. Layer 1 viewer language. The Honesty Filter. Target Moments. The anatomy of a great title.'],
  ['Thumbnails', 'Reinforce, do not repeat. Obvious over clever. The amateur signaling mistakes. Sit next to the big creators.'],
  ['Scripting', 'Setup-tension-payoff. Forward pulls. WHY moments. The Ed Lawrence pattern. How structure earns retention.'],
  ['Hooks', 'Six components. Six templates. They start at dislike. The 20-second rule. Why hooks are not summaries.'],
  ['Production', 'Filming, editing, upload, publish, all combined. Audio over camera. Three-take minimum. Post-upload behavior.'],
  ['Mindset', 'Named playbooks. When you want to quit. When the comparison trap catches you. When you are stuck. What to do, not what to feel.'],
];

function ChecklistArtifact() {
  return (
    <div className="checklist">
      <div className="checklist__head">
        <span className="checklist__eyebrow">Content checklist &middot; The system you use every week</span>
        <h3 className="checklist__title">The same step-by-step process I use to make every piece of content.</h3>
        <p className="checklist__sub">You are not building your own workflow from scratch. You are working through this with the bottleneck from your review in mind.</p>
      </div>
      <ol className="checklist__list">
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
      </ol>
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
          <h3 className="system__title">The nine documents</h3>
          <p className="system__sub">The prototype course. Foundational and mental layers everything else sits on top of. Released over your time in the program. You give feedback, I revise. Founders shape the final version.</p>
        </div>
        <span className="system__count">09 / docs</span>
      </div>
      <div className="system__grid">
        {NINE_DOCS.map(([n, sub], i) => (
          <div key={n} className="system__node">
            <div className="system__node-head">
              <span className="system__node-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="system__node-name">{n}</span>
            </div>
            <p className="system__node-sub">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
   RHYTHM STRIP — Wednesday live, daily access, anytime system, at your pace
   ===================================================================== */
const RHYTHM_ITEMS: Array<[string, string, string, '0' | '1']> = [
  ['WEDNESDAY 2PM EST', 'Live Q&A', '60 minutes on Zoom. Anyone who shows up can ask. Recorded.', '1'],
  ['DAILY', 'Direct access', "Drop a thumb, a title, a script question. I am there every day.", '0'],
  ['ANYTIME', 'The system', 'Course documents, worksheets, resource library. Use what you need when you need it.', '0'],
  ['AT YOUR PACE', 'Plan, ship, review', 'The checklist guides every video. Your bottleneck guides every decision.', '0'],
];

function RhythmStrip() {
  return (
    <div className="weekstrip">
      {RHYTHM_ITEMS.map(([d, t, body, hl], i) => (
        <div key={i} className="weekstrip__day" data-highlight={hl}>
          <div className="weekstrip__d">{d}</div>
          <div className="weekstrip__t">{t}</div>
          <div className="weekstrip__b">{body}</div>
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
  /** CSS object-position value for the poster img. Defaults to 'center center'. */
  posterPosition?: string;
};

function VideoTestimonial({ clips, poster, pull, name, role, featured, posterPosition }: VideoTestimonialProps) {
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
            {/* Switched from <img> to background-image. object-position was being
                ignored for some reason; background-position works reliably. */}
            <div
              className="tw-video__poster"
              role="img"
              aria-label={`${name} testimonial`}
              style={{
                backgroundImage: `url(${poster})`,
                backgroundSize: 'cover',
                backgroundPosition: posterPosition || 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
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

// Mixed and interleaved video + text. Order tuned for 3-column masonry so each
// column gets a mix of video and text instead of all video left, all text right.
const TESTIMONIALS: AnyTestimonial[] = [
  // Column 1 leads
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/peter-byrne-1.mp4', '/testimonials/peter-byrne-2.mp4', '/testimonials/peter-byrne-3.mp4', '/testimonials/peter-byrne-4.mp4'],
      poster: '/testimonials/posters/peter-byrne-1.gif',
      pull: 'In the space of three months, the information has been invaluable. My channel gained over 600 subscribers and broke past 5,000 total.',
      name: 'Peter Byrne',
      role: '@PSXGamingMemories',
      featured: true,
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'I have spent thousands of dollars in books and courses on YouTube. None of those things solved my problems. I needed to hear the brutal truth, that I had to rethink how I was approaching YouTube. Dave was that reality check.',
      name: 'Paul Backstrom',
      role: '@ScreenwritingScribe',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/chanelle-neilson-1.mp4', '/testimonials/chanelle-neilson-2.mp4'],
      poster: '/testimonials/posters/chanelle-neilson-1.gif',
      pull: 'I chose Dave because there was such a personalized approach. He was very invested in making sure I got the help I needed. Nothing was off limits.',
      name: 'Chanelle Neilson',
      role: 'YouTube Creator',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'Dave was extremely generous with his time and tactical with his advice. Understands current constraints well and points to issues that need to be currently addressed.',
      name: 'Jasim Eisa',
      role: '@JasimEisa',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'My channel was not growing. Talking with Dave was extremely eye-opening. He gave me new insights and a different way to view my channel and who I am making content for.',
      name: 'Michael Dean',
      role: '@TimberSmokeCo',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/tim-gardner.mp4'],
      poster: '/testimonials/posters/tim-gardner.gif',
      pull: 'If you actually want to get serious about filling the top of the funnel and having a process, this would be a perfect system. Ten out of ten.',
      name: 'Tim Gardner',
      role: '@timgardner4166',
    },
  },

  // Column 2 mid
  {
    kind: 'text',
    data: {
      quote: 'He reviewed my channel, watched my videos, and took detailed notes on exactly where I could improve. He not only pointed out my weak spots, he gave concrete examples of how to fix them. People love to say "make a better title or thumbnail," but no one shows you how or why it works. Dave did both.',
      name: 'Melissa Terzis',
      role: '@DCRealEstateMama',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/mark-young-1.mp4', '/testimonials/mark-young-2.mp4'],
      poster: '/testimonials/posters/mark-young-1.gif',
      pull: 'My average view count tripled to around 15K and my subscriber count increased by over 45%. I now have a clear roadmap.',
      name: 'Mark Young',
      role: '@aw_artisanwoodworks',
    },
  },
  {
    kind: 'text',
    data: {
      quote: "I've completed several YouTube coachings, even Ali Abdaal's. Nothing comes close to what Dave has to offer.",
      name: 'Matt Moss',
      role: '@MattMossPBSM',
      featured: true,
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/mireille-nicole-1.mp4', '/testimonials/mireille-nicole-2.mp4'],
      poster: '/testimonials/posters/mireille-nicole-1.gif',
      pull: 'Information is not what we are missing. It is applying it and seeing my blind spots. Dave will tell you the truth and give you constructive feedback.',
      name: 'Mireille Nicole',
      role: '@mireillenicolecoaching',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'Despite my best efforts, my YouTube channel had been stuck for a long time and I just could not figure out what I was missing. In one coaching session, Dave helped me identify the main issues, demystified the whole process, and gave me clear, actionable next steps.',
      name: 'Tara Malone',
      role: '@MyCatholicHomecoming',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'Before the meeting, he rewrote every title for my shows and used that as a training example in the call. I left with great advice and a roadmap. If you are wondering if this is worth the investment, stop wondering.',
      name: 'Brett Hill',
      role: '@themindfulcoachpodcast',
    },
  },

  // Column 3 trailing
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/daniel-bassett-1.mp4', '/testimonials/daniel-bassett-2.mp4'],
      poster: '/testimonials/posters/daniel-bassett-1.gif',
      pull: 'Thumbnails were the most concrete thing. They lifted my game from 2% CTR to 3 to 4%. That increased it massively.',
      name: 'Daniel Bassett',
      role: '@MyLifeByAI',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'My conversation with Dave was incredibly helpful and insightful. It was clear he took the time to understand my channel and tailor a personalized strategy that addressed my specific challenges.',
      name: 'Xander Mason',
      role: '@XanderMasonCooking',
    },
  },
  {
    kind: 'video',
    data: {
      clips: ['/testimonials/morgan-joan-kennedy.mp4'],
      poster: '/testimonials/posters/morgan-joan-kennedy.gif',
      posterPosition: 'center 35%',
      pull: 'What was really amazing was how deep of an analysis he did on my channel. Dave really helped me see my blind spots and re-energized me to restart.',
      name: 'Morgan Joan Kennedy',
      role: '@DearestJoanie',
    },
  },
  {
    kind: 'text',
    data: {
      quote: "Dave's input and advice was highly customised to my channel and my blind spots. I have tried other YouTube coaching services and none of them were as good.",
      name: 'Andrew Gray',
      role: '@andrewgraymanshow',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'He really helped me a lot to structure the steps to take, to grow my YT business. He went way beyond what I would have expected and exceeded my expectations.',
      name: 'SBtrader82',
      role: '@SBtrader82',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'Dave is very knowledgeable. As someone who has walked the walk, it is clear he knows what he is talking about and is able to provide helpful and compassionate insight tailored to me.',
      name: 'Charlie',
      role: '@FromAcrossTheWeb',
    },
  },
  {
    kind: 'text',
    data: {
      quote: 'I am very impressed with Dave Jeltema’s professionalism and his honest feedback. He was very thoughtful and detailed in his audit of my YT channel.',
      name: 'Jacob Eapen',
      role: '@NewCompassPoint-xz9jp',
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
   - Posts to /api/waitlist (server-side) which handles Kit + Google Sheet
   - On success, redirects to /waitlist-question to capture the challenge
   ===================================================================== */
function WaitlistFormBC({ context }: { context: 'before' | 'after' }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: firstName || undefined, source: context }),
      });
      const data = await res.json();
      if (!res.ok && !data.success) throw new Error('Failed');
      track('waitlist_submit', { source: context });
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        // Fallback: redirect to question page anyway with what we have
        const params = new URLSearchParams({ email, ...(firstName ? { name: firstName } : {}) });
        window.location.href = `/waitlist-question?${params.toString()}`;
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const heads = {
    before: { title: 'The window opens soon', sub: 'Drop your email. I will let you know the moment it opens.', btn: 'Notify me' },
    after: { title: 'This window has closed', sub: 'Get on the list for the next round at the same founders rate.', btn: 'Join the waitlist' },
  };
  const h = heads[context];

  return (
    <div>
      <h3 className="price__title" style={{ marginTop: 0, fontSize: '20px' }}>{h.title}</h3>
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
    <div className="price" id="checkout">
      <div className="price__head-row">
        <span className="eyebrow"><span className="eyebrow__line" />Founders Round</span>
        {windowState === 'before' && windowOpen && (
          <Countdown target={windowOpen} label="Opens in" onComplete={onWindowOpened} />
        )}
        {windowState === 'open' && windowClose && (
          <Countdown target={windowClose} label="Closes in" onComplete={onWindowClosed} />
        )}
      </div>
      <h3 className="price__title">Full access to the program. <span className="blue-em">Six months.</span></h3>

      <div className="price__row">
        <span className="price__strike">$1,999</span>
        <span className="price__main">$999</span>
      </div>
      <p className="price__sub">
        <strong>Founders keep 50% off every future version.</strong> When the price goes up, your renewal stays half off whatever it becomes.
      </p>

      <div className="price__rule" />
      <ul className="price__included">
        <li><Icon name="check" size={16} /><span>I review your channel &mdash; what is broken, what to fix first (week one)</span></li>
        <li><Icon name="check" size={16} /><span>My weekly content system &mdash; the checklist I run before every upload</span></li>
        <li><Icon name="check" size={16} /><span>All nine pillars of how I make content, broken down inside and out</span></li>
        <li><Icon name="check" size={16} /><span>14 worksheets and guides &mdash; every framework I use</span></li>
        <li><Icon name="check" size={16} /><span>Weekly 60-minute live session (Wednesdays at 2pm EST &middot; recorded)</span></li>
        <li><Icon name="check" size={16} /><span>Direct access to me every day</span></li>
      </ul>

      <div className="price__rule" />

      {windowState === 'open' ? (
        <>
          {error && <p className="form-msg form-msg--error" style={{ marginBottom: 'var(--s-3)' }}>{error}</p>}

          <div className="price__buttons">
            <button
              onClick={() => onCheckout('full')}
              disabled={isLoadingFull}
              className="btn btn--primary btn--lg btn--block"
            >
              <span className="price__btn-main">{isLoadingFull ? 'Redirecting to Stripe...' : 'Pay in full — $999'}</span>
            </button>
            <button
              onClick={() => onCheckout('installment')}
              disabled={isLoadingInstall}
              className="btn btn--ghost btn--lg btn--block price__btn-split"
            >
              <span className="price__btn-main">{isLoadingInstall ? 'Redirecting...' : 'Split into 2 — $599 now, $599 in 30 days'}</span>
            </button>
          </div>

          <ul className="price__assurances">
            <li><span className="price__pip" />Community access the moment you join</li>
            <li><span className="price__pip" />Direct access to me starts immediately</li>
          </ul>

          <div className="price__guarantee">
            <Icon name="shield" size={18} />
            <span><strong style={{ color: 'var(--bc-text-100)' }}>30-day no-questions refund.</strong> Use the first month. Get the review, the checklist, and a live call. If it is not worth it, full refund.</span>
          </div>
        </>
      ) : (
        <WaitlistFormBC context={windowState} />
      )}
    </div>
  );
}

/* =====================================================================
   PRICE PILL — founders price shown under CTAs in before/after states
   ===================================================================== */
function PricePill() {
  return (
    <span className="price-pill">
      <strong>$999 founders price</strong>
      <span className="strike">$1,999</span>
    </span>
  );
}

/* =====================================================================
   CTA BAND
   ===================================================================== */
function CTABand({
  windowState, title, sub, onClick,
}: {
  windowState: WindowState;
  title: React.ReactNode;
  sub?: React.ReactNode;
  onClick: () => void;
}) {
  const buttonCopy =
    windowState === 'open' ? 'Join now — $999'
    : windowState === 'before' ? 'Join the waitlist'
    : 'Notify me when it reopens';
  return (
    <section className="cta-band">
      <div className="cta-band__glow" />
      <div className="container cta-band__content">
        <h2 className="cta-band__title">{title}</h2>
        {sub && <p className="cta-band__sub">{sub}</p>}
        <button onClick={onClick} className="btn btn--primary btn--lg">
          {buttonCopy}
        </button>
        {windowState !== 'open' && (
          <div style={{ marginTop: 'var(--s-4)' }}><PricePill /></div>
        )}
        <p className="cta-band__fineprint">30-day refund &middot; One-time payment or 2&times; split &middot; No subscription</p>
      </div>
    </section>
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

  // Auto-updating credibility numbers. Initialized to null so the server render
  // and first client render match (avoids hydration mismatch), then filled in.
  const [yearsCreating, setYearsCreating] = useState<number | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  useEffect(() => {
    setYearsCreating(yearsOnYouTube());
    fetch('/api/channel-stats')
      .then((r) => r.json())
      .then((d) => { if (d?.subscriberCount) setSubscriberCount(d.subscriberCount); })
      .catch(() => {});
  }, []);

  const subs = formatSubscribers(subscriberCount ?? SUBSCRIBER_FALLBACK);

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
    if (!openStr || !closeStr) {
      // No env vars (e.g. local dev). Default to 'open' with placeholder dates
      // so the nav countdown still renders and we can see the layout.
      setWindowState('open');
      setWindowOpen(new Date(Date.now() - 24 * 60 * 60 * 1000));
      setWindowClose(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000));
      return;
    }
    const open = new Date(openStr);
    const close = new Date(closeStr);
    setWindowOpen(open);
    setWindowClose(close);

    const preOpenStr = process.env.NEXT_PUBLIC_WINDOW_PREOPEN;
    const preOpen = preOpenStr ? new Date(preOpenStr) : null;

    const now = new Date();
    if (now > close) setWindowState('after');
    else if (now >= open) setWindowState('open');
    else if (preOpen && !isNaN(preOpen.getTime()) && now < preOpen) setWindowState('after');
    else setWindowState('before');
  }, []);

  const handleWindowOpened = useCallback(() => setWindowState('open'), []);
  const handleWindowClosed = useCallback(() => setWindowState('after'), []);

  const handleCheckout = useCallback(async (mode: 'full' | 'installment') => {
    const setLoaderFn = mode === 'full' ? setIsLoading : setIsLoadingInstallment;
    setLoaderFn(true);
    setError(undefined);
    track('checkout_start', { mode });
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
            <a href="#top" className="nav__brand"><span className="bc-logo">Boundless Creator</span></a>
            <div className="nav__timer">
              {windowState === 'open' && windowClose && (
                <Countdown target={windowClose} label="Closes in" onComplete={handleWindowClosed} />
              )}
              {windowState === 'before' && windowOpen && (
                <Countdown target={windowOpen} label="Opens in" onComplete={handleWindowOpened} />
              )}
            </div>
            <button onClick={scrollToCheckout} className="btn btn--primary nav__cta">Join now</button>
          </div>
        </nav>

        {/* HERO (no number) */}
        <section id="top" className="hero">
          <div className="hero__glow" />
          <div className="container hero__inner">
            <div className="hero__top">
              <WindowBadge state={windowState} />
            </div>
            <h1 className="hero__title">
              Stop <span className="blue-em">guessing</span> what to fix on your channel. Get a personal review from me in your first week.
            </h1>
            <p className="hero__sub">
              Working with me directly. A deep-dive on your specific channel. The systems I use to make content. Weekly Q&amp;A on Zoom. Direct access every day.
            </p>

            {SHOW_VSL && <VSL />}

            <div className="hero__cta-stack">
              {windowState === 'open' ? (
                <>
                  <button onClick={scrollToCheckout} className="btn btn--primary btn--xl">
                    Join now &mdash; $999
                  </button>
                  <p className="hero__price-line">
                    <span className="strike">$1,999</span>
                    <span className="dot-sep">&mdash;</span>
                    <strong>$999 founders price</strong>
                    <span className="dot-sep">&mdash;</span>
                    <strong>50% off every future version</strong>
                  </p>
                </>
              ) : (
                <>
                  <button onClick={scrollToCheckout} className="btn btn--primary btn--xl">
                    {windowState === 'before' ? 'Join the waitlist' : 'Notify me when it reopens'}
                  </button>
                  <PricePill />
                  {windowState === 'after' && (
                    <p className="hero__price-line">I will email you the moment the next window opens.</p>
                  )}
                </>
              )}
            </div>

            <figure className="hero-quote">
              <span className="hero-quote__mark"><Icon name="quote" size={28} /></span>
              <blockquote className="hero-quote__text">
                My average view count tripled to around <span className="blue-em">15K</span>. My subscriber count is up over <span className="blue-em">45%</span>. I now have a clear roadmap.
              </blockquote>
              <figcaption className="hero-quote__cite">
                <span className="hero-quote__name">Mark Young</span>
                <span className="hero-quote__role">Artisan Woodworks</span>
              </figcaption>
            </figure>

            <div className="hero__trust">
              <div>
                <div className="cred__num">{yearsCreating ?? 15}</div>
                <div className="cred__sub">years <strong>on YouTube</strong></div>
              </div>
              <div>
                <div className="cred__num">{subs.value}<span className="cred__sup">{subs.suffix}</span></div>
                <div className="cred__sub"><strong>subscribers</strong> on my channel</div>
              </div>
              <div>
                <div className="cred__num">100<span className="cred__sup">+</span></div>
                <div className="cred__sub">creators <strong>coached</strong> directly</div>
              </div>
            </div>
          </div>
        </section>

        {/* 01 — THE PROBLEM */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">01 — The problem</span>
            </div>
            <div className="grid-2 problem-grid">
              <h2 className="problem-quote">
                You&apos;re not lazy. You&apos;re not casual. You&apos;re doing the work. <span className="blue-em">The work just isn&apos;t paying off.</span>
              </h2>
              <ul className="problem-list">
                <li>You have been <strong>consistent</strong>. You are posting. The views still are not compounding.</li>
                <li>You are getting <strong>crickets</strong> on uploads you spent days on.</li>
                <li>You have watched the courses. Read the threads. You <strong>still do not know what is wrong</strong>.</li>
                <li>Every upload feels like a <strong>coin flip</strong>. No clear next move.</li>
                <li>You do not need motivation. You do not need another tutorial. You need <strong>pattern recognition</strong> on your specific channel.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 02 — WEEK ONE (the wedge) */}
        <section>
          <div className="container">
            <div className="section-head">
              <span className="section-num">02 — Week one</span>
            </div>
            <h2 className="section-h">What every founder gets in their <span className="blue-em">first week</span>.</h2>
            <p className="section-sub">
              Two things, both delivered in your own thread. The personal review tells you what is broken on your specific channel. The checklist tells you what to do about it every week. <strong>Together, you stop guessing on every upload.</strong>
            </p>
            <div className="wedge-grid">
              <ReviewArtifact />
              <ChecklistArtifact />
            </div>
          </div>
        </section>

        {/* CTA BAND 1 */}
        <CTABand
          windowState={windowState}
          title={<>Know the <span className="blue-em">one thing</span> to fix this week.</>}
          sub="That is what the first week of the program gets you. Everything else is built on top."
          onClick={scrollToCheckout}
        />

        {/* 03 — FULL ACCESS */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">03 — Full access</span>
            </div>
            <h2 className="section-h">You also get <span className="blue-em">all of this</span>.</h2>
            <p className="section-sub">
              Renew or leave when you are ready. <strong className="green-em">Founders keep 50% off every future version.</strong>
            </p>
            <div className="grid-2 perks-grid">
              <div className="card card--raised">
                <h3 className="card__title">Weekly <span className="blue-em">live Q&amp;A</span></h3>
                <p className="card__body">
                  Wednesdays, <strong>2pm EST</strong> on Zoom. 60 minutes. Anyone who shows up can ask whatever they like. <strong>Recorded</strong>, so missing one is not fatal.
                </p>
              </div>
              <div className="card card--raised">
                <h3 className="card__title"><span className="blue-em">Direct access</span>, every day</h3>
                <p className="card__body">
                  Only for people in the program. <strong>Drop a thumb, get a reaction</strong>. Drop a script, get notes. I am there daily helping you get unstuck.
                </p>
              </div>
              <div className="card card--raised">
                <h3 className="card__title">The <span className="blue-em">prototype course</span></h3>
                <p className="card__body">
                  Nine documents. Foundational, Strategy, Ideation, Titles, Thumbnails, Scripting, Hooks, Production, Mindset. Released as you go. You <strong>give feedback, I revise</strong>. Founders shape the final version.
                </p>
              </div>
              <div className="card card--raised">
                <h3 className="card__title">The <span className="blue-em">resource library</span></h3>
                <p className="card__body">
                  <strong>14 worksheets and systems</strong>: Audience Analysis, Title Frameworks, Title + Thumbnail Validation, Script Workflow, Hook Generation, 90-Day Action Plan, Niche Worksheet, Avatar Worksheet, Recommended Gear. The building blocks of the system.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'var(--s-9)' }}>
              <SystemMap />
            </div>

            <div style={{ marginTop: 'var(--s-9)' }}>
              <h3 className="subsection-h">The rhythm of the program</h3>
              <p className="subsection-sub">Not a rigid schedule. A rhythm that fits your life, how you learn, and how you want to work. Repeat as long as you are in.</p>
              <RhythmStrip />
            </div>
          </div>
        </section>

        {/* 04 — WHO THIS IS FOR */}
        <section>
          <div className="container">
            <div className="section-head">
              <span className="section-num">04 — Who this is for</span>
            </div>
            <h2 className="section-h"><span className="blue-em">No barriers.</span> If you want to grow your channel, you are welcome.</h2>
            <p className="section-sub">But honesty about who this works best for and who it does not.</p>
            <div className="grid-2">
              <div className="card card--for">
                <span className="is-for-tag">This is for</span>
                <ul className="filter-list filter-list--for">
                  <li><span className="ico ico--check"><Icon name="check" size={20} /></span><span>YouTubers trying to make this their <strong>full-time job</strong>.</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={20} /></span><span>Channel owners ready to ditch <strong>scattered tips</strong> for a real system.</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={20} /></span><span>Niche experts who want a <strong>clear plan</strong>, not another upload-and-pray.</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={20} /></span><span>Long-game thinkers who refuse to chase <strong>viral moments</strong>.</span></li>
                  <li><span className="ico ico--check"><Icon name="check" size={20} /></span><span>Anyone who wants <strong>my eyes on their work</strong>.</span></li>
                </ul>
              </div>
              <div className="card card--not">
                <span className="is-not-tag">This is not for</span>
                <ul className="filter-list filter-list--not">
                  <li><span className="ico ico--ex"><Icon name="x" size={20} /></span><span><strong>Viral moment chasers.</strong></span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={20} /></span><span><strong>Get-rich-quick types</strong> with no love for the craft.</span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={20} /></span><span><strong>AI slop publishers.</strong></span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={20} /></span><span><strong>Know-it-alls</strong> who think they have nothing left to learn.</span></li>
                  <li><span className="ico ico--ex"><Icon name="x" size={20} /></span><span>People looking for someone else <strong>to do the work</strong>.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BAND 2 */}
        <CTABand
          windowState={windowState}
          title={<>If this sounds like the room you have been <span className="blue-em">missing</span>, the door is open.</>}
          onClick={scrollToCheckout}
        />

        {/* 05 — REASON TO BELIEVE */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">05 — Reason to believe</span>
            </div>
            <h2 className="section-h">Try it for <span className="blue-em">thirty days</span>. If it is not worth it, full refund.</h2>
            <p className="section-sub">
              Use the first month. Get my read on your specific channel. Read the checklist. Show up to a live call. Spend a week in the community. <strong>If it is not worth $999, I do not want your $999.</strong>
            </p>
            <div className="tw">
              <div className="tw__head">
                <span className="eyebrow"><span className="eyebrow__line" />From founders + past clients</span>
                <p className="tw__sub">Different niches. Different stages. People I have actually worked with.<br /><strong>Every one of them real.</strong></p>
              </div>
              <TestimonialWall />
            </div>
          </div>
        </section>

        {/* 06 — FROM ME (founder block) */}
        <section>
          <div className="container narrow">
            <div className="section-head">
              <span className="section-num">06 — From me</span>
            </div>
            <h2 className="founder__title">Why this exists.</h2>
            <div className="founder__body">
              <p>If you have been doing the work for a year or two and the views still are not compounding, you are who I built this for.</p>
              <p>Last year I launched my one-on-one program. Out of about <strong>35 conversations</strong> I had with creators before launch, almost every one of them said some version of:</p>
              <p className="founder__pull">&ldquo;I want to work with you. I am not at the spot where it makes sense to pay this much.&rdquo;</p>
              <p>I have taken more than <strong>300 applications</strong> since. Most are not the right fit for the high-ticket. For most of my audience, it is not the right offer.</p>
              <p>So I built this. The program for the creators who want my systems, my attention, and my help, but who <strong>do not need a year of one-on-one</strong>. The ones who are one or two decisions away from the channel actually working.</p>
              <p>I think about YouTube all day. Constantly reverse-engineering content, watching what is pulling and leaking on other channels, refining my own. <strong>Hours and hours every day.</strong> I am good at this. I enjoy it.</p>
              <p>If you want a clear read on your specific channel and a system to follow, I think I can help.</p>
              <p className="founder__sig">&mdash; Dave Jeltema</p>
            </div>
          </div>
        </section>

        {/* 07 — FAQ */}
        <section className="alt">
          <div className="container">
            <div className="section-head">
              <span className="section-num">07 — FAQ</span>
            </div>
            <h2 className="section-h faq__h">Questions, <span className="blue-em">answered straight</span>.</h2>
            <div className="faq">
              <details className="faq__item" open>
                <summary className="faq__q">Why is the founders price $999?</summary>
                <div className="faq__a">
                  It is intentionally low for the founders round. I want a <strong>small group of founders</strong> who are serious, and who will shape the final version of the course with their feedback. When the price goes up to $1,999, your renewal stays <strong className="green-em">50% off every future version</strong>.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">Is it a subscription?</summary>
                <div className="faq__a">
                  No. <strong>$999 once</strong> (or 2&times; $599) gets you six months of full access. After that, you renew or you leave. Nothing auto-charges.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">What if I cannot make Wednesday at 2pm EST?</summary>
                <div className="faq__a">
                  Calls are recorded with AI summary and transcript. <strong>Daily access is where most of the back-and-forth happens.</strong>
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">How is this different from a course?</summary>
                <div className="faq__a">
                  A course is a vault you do not open. This is a <strong>relationship with a coach and a system</strong>. The course is half of what you pay for. The other half is the read I write on your channel and the community.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">Will this work if I have not published yet?</summary>
                <div className="faq__a">
                  Probably not yet. This is built for creators who have shipped videos and are <strong>treating YouTube seriously</strong>. If you have not started, the resources I have on YouTube and my newsletter are a better fit until you do.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">What if it is not working for me?</summary>
                <div className="faq__a">
                  Inside thirty days, full refund, no questions. Get the review, read the checklist, show up to a live call, spend a week in the community. If you do not think it is worth $999, I do not want your $999.
                </div>
              </details>
              <details className="faq__item">
                <summary className="faq__q">How often does the door open?</summary>
                <div className="faq__a">
                  I open the door in small windows for now. Small groups. Eventually it will stay open and you can join whenever. <strong>Founders lock in the founders price either way.</strong>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* P.S. (only when window open) */}
        {windowState === 'open' && (
          <section className="ps-section">
            <div className="container narrow">
              <div className="ps">
                <span className="ps__label">P.S. &mdash; From Dave</span>
                <p>If you have read this far, you are the person I built it for.</p>
                <p>The next founders round either has your name on it or it does not. Either way, six months pass.</p>
                <p>If you want the systems, the attention, and the help, I will see you Monday.</p>
                <p className="founder__sig">&mdash; Dave</p>
              </div>
            </div>
          </section>
        )}

        {/* 08 — CHECKOUT */}
        <section className="checkout-section">
          <div className="container">
            <div className="section-head">
              <span className="section-num">08 — Checkout</span>
            </div>
            <div className="checkout-stack">
              <div className="checkout-stack__head">
                <h2 className="section-h checkout-stack__title">One price. <span className="blue-em">No upsells.</span> No subscription.</h2>
                <p className="section-sub checkout-stack__sub">
                  Six months of full access. The personal review, the checklist, the prototype course, the resource library, weekly Q&amp;A, and direct access every day. <strong>Renew or leave at month six.</strong>
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

              <p className="checkout-fineprint">
                Comparable programs run multiple thousands. The founders price stays locked in across every future version.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="container">
            <div>
              <span className="bc-logo" style={{ fontSize: 14, fontWeight: 600, color: 'var(--bc-text-300)' }}>Boundless Creator</span>
            </div>
            <div className="footer__links">
              <a href="https://docs.google.com/document/d/1s6-4kCsW94o9FM-nNoFPxJkGMwgjpqCPLmcxWEtNxTs" target="_blank" rel="noopener noreferrer">Full program details</a>
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
