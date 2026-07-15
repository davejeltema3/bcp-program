'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Boundless Tracking — revenue calculator.
 * Pure math, no data. Shows how views turn into clicks, sales, and revenue,
 * with the conversion percentage at each funnel stage.
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

  const wrap: CSSProperties = { maxWidth: 720, margin: '48px auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' };
  const label: CSSProperties = { display: 'block', fontSize: 13, color: '#475569', marginBottom: 6 };
  const input: CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' };
  const cell: CSSProperties = { padding: '14px 16px', borderBottom: '1px solid #f1f5f9' };
  const stageName: CSSProperties = { ...cell, fontWeight: 600 };
  const stageNum: CSSProperties = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const stagePct: CSSProperties = { ...cell, textAlign: 'right', color: '#2563eb', fontSize: 13, fontVariantNumeric: 'tabular-nums' };

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
        {suffix ? <span style={{ position: 'absolute', right: 12, top: 10, color: '#94a3b8', fontSize: 14 }}>{suffix}</span> : null}
      </div>
    </div>
  );

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Revenue Calculator</h1>
      <p style={{ color: '#475569', marginTop: 0 }}>
        A rough model of how a video's views turn into revenue. Estimates only.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {field('Monthly views', views, setViews)}
        {field('Link click-through rate', ctr, setCtr, '%')}
        {field('Landing conversion rate', cvr, setCvr, '%')}
        {field('Price', price, setPrice, '$')}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 28, border: '1px solid #e2e8f0', borderRadius: 8 }}>
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
            <td style={stageNum}>{n(sales)}</td>
            <td style={stagePct}>{n(cvr)}% of clicks</td>
          </tr>
          <tr>
            <td style={{ ...stageName, borderBottom: 'none' }}>Monthly revenue</td>
            <td style={{ ...stageNum, borderBottom: 'none', fontWeight: 700 }}>{money(revMonth)}</td>
            <td style={{ ...stagePct, borderBottom: 'none' }}>{money(revYear)}/yr</td>
          </tr>
        </tbody>
      </table>

      <p style={{ color: '#64748b', fontSize: 13, marginTop: 16 }}>
        Overall, {n(viewToSale)}% of views become a sale. So every {viewToSale > 0 ? n(100 / viewToSale) : '—'} views is worth one sale, or about {viewToSale > 0 ? money((viewToSale / 100) * price) : '$0'} per view.
      </p>

      <p style={{ marginTop: 24 }}>
        <a href="/tracking" style={{ color: '#2563eb', textDecoration: 'none' }}>&larr; Back to the dashboard</a>
      </p>
    </main>
  );
}
