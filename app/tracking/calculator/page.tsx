'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Boundless Tracking — revenue calculator.
 * Pure math, no data. Shows how views turn into clicks, sales, and revenue,
 * with the conversion percentage at each funnel stage. BC dark theme.
 */
export default function TrackingCalculator() {
  const [views, setViews] = useState(10000);
  const [ctr, setCtr] = useState(1.5);
  const [cvr, setCvr] = useState(3);
  const [price, setPrice] = useState(999);

  const clicks = views * (ctr / 100);
  const sales = clicks * (cvr / 100);
  const revMonth = sales * price;
  const revYear = revMonth * 12;
  const viewToSale = ctr && cvr ? (ctr / 100) * (cvr / 100) * 100 : 0;

  const n = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
  const money = (x: number) => '$' + x.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const wrap: CSSProperties = { maxWidth: 720, margin: '48px auto', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--bc-text-200, #d6dcea)' };
  const label: CSSProperties = { display: 'block', fontSize: 13, color: 'var(--bc-text-300, #9aa4be)', marginBottom: 6 };
  const input: CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 15, color: 'var(--bc-text-100, #f4f6fb)', background: 'var(--bc-ink-800, #131c33)', border: '1px solid var(--bc-ink-600, #2a3654)', borderRadius: 8, boxSizing: 'border-box' };
  const cell: CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--bc-ink-700, #1c273f)' };
  const stageName: CSSProperties = { ...cell, fontWeight: 600, color: 'var(--bc-text-100, #f4f6fb)' };
  const stageNum: CSSProperties = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--bc-text-100, #f4f6fb)' };
  const stagePct: CSSProperties = { ...cell, textAlign: 'right', color: 'var(--bc-blue-300, #5b9cff)', fontSize: 13, fontVariantNumeric: 'tabular-nums' };

  const field = (labelText: string, value: number, set: (v: number) => void, suffix?: string) => (
    <div>
      <label style={label}>{labelText}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={0}
          step="any"
          onChange={(e) => set(Number(e.target.value) || 0)}
          style={input}
        />
        {suffix ? <span style={{ position: 'absolute', right: 12, top: 10, color: 'var(--bc-text-400, #6b7591)', fontSize: 14 }}>{suffix}</span> : null}
      </div>
    </div>
  );

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 24, marginBottom: 4, color: 'var(--bc-text-100, #f4f6fb)' }}>Revenue Calculator</h1>
      <p style={{ color: 'var(--bc-text-300, #9aa4be)', marginTop: 0 }}>
        A rough model of how a video's views turn into revenue. Estimates only.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {field('Monthly views', views, setViews)}
        {field('Link click-through rate', ctr, setCtr, '%')}
        {field('Landing conversion rate', cvr, setCvr, '%')}
        {field('Price', price, setPrice, '$')}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 28, border: '1px solid var(--bc-ink-600, #2a3654)', borderRadius: 8 }}>
        <tbody>
          <tr>
            <td style={stageName}>Views</td>
            <td style={stageNum}>{n(views)}</td>
            <td style={stagePct}>—</td>
          </tr>
          <tr>
            <td style={stageName}>Clicks to your page</td>
            <td style={stageNum}>{n(clicks)}</td>
            <td style={stagePct}>{n(ctr)}% of views</td>
          </tr>
          <tr>
            <td style={stageName}>Sales</td>
            <td style={{ ...stageNum, color: 'var(--bc-green-400, #5ce0a3)' }}>{n(sales)}</td>
            <td style={stagePct}>{n(cvr)}% of clicks</td>
          </tr>
          <tr>
            <td style={{ ...stageName, borderBottom: 'none' }}>Monthly revenue</td>
            <td style={{ ...stageNum, borderBottom: 'none', fontWeight: 700, color: 'var(--bc-green-400, #5ce0a3)' }}>{money(revMonth)}</td>
            <td style={{ ...stagePct, borderBottom: 'none' }}>{money(revYear)}/yr</td>
          </tr>
        </tbody>
      </table>

      <p style={{ color: 'var(--bc-text-400, #6b7591)', fontSize: 13, marginTop: 16 }}>
        Overall, {n(viewToSale)}% of views become a sale. So every {viewToSale > 0 ? n(100 / viewToSale) : '—'} views is worth one sale, or about {viewToSale > 0 ? money((viewToSale / 100) * price) : '$0'} per view.
      </p>

      <p style={{ marginTop: 24 }}>
        <a href="/tracking" style={{ color: 'var(--bc-blue-300, #5b9cff)', textDecoration: 'none' }}>&larr; Back to the dashboard</a>
      </p>
    </main>
  );
}
