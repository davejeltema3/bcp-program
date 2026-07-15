import type { CSSProperties } from 'react';
import { readRange } from '@/lib/tracking';
import { REGISTRY } from '@/lib/tracking-registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Boundless Tracking dashboard (MVP).
 * Admin-gated by ?key=<ADMIN_SECRET>. Shows clicks and sales per video.
 */
export default async function TrackingDashboard({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  const adminSecret = process.env.ADMIN_SECRET || '';
  const authed = adminSecret && searchParams.key === adminSecret;

  if (!authed) {
    return (
      <main style={{ maxWidth: 640, margin: '80px auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
        <h1 style={{ fontSize: 22 }}>Boundless Tracking</h1>
        <p style={{ color: '#475569' }}>Add <code>?key=YOUR_ADMIN_SECRET</code> to the URL to view the dashboard.</p>
      </main>
    );
  }

  const [clicks, sales, registry] = await Promise.all([
    readRange('Clicks!A2:F'),
    readRange('Sales!A2:G'),
    readRange('Registry!A2:H'),
  ]);

  const clicksByCode: Record<string, number> = {};
  for (const r of clicks) {
    const code = (r[1] || '').trim();
    if (code) clicksByCode[code] = (clicksByCode[code] || 0) + 1;
  }

  const salesByCode: Record<string, number> = {};
  for (const r of sales) {
    const code = (r[2] || '').trim();
    if (code) salesByCode[code] = (salesByCode[code] || 0) + 1;
  }

  // Order by the registry, then append any codes seen only in clicks/sales.
  const codes: string[] = registry.map((r) => (r[0] || '').trim()).filter(Boolean);
  for (const code of [...Object.keys(clicksByCode), ...Object.keys(salesByCode)]) {
    if (!codes.includes(code)) codes.push(code);
  }

  const rows = codes.map((code) => {
    const regRow = registry.find((r) => (r[0] || '').trim() === code);
    const title = regRow?.[2] || REGISTRY[code]?.title || '(unknown)';
    const c = clicksByCode[code] || 0;
    const s = salesByCode[code] || 0;
    const cvr = c > 0 ? ((s / c) * 100).toFixed(1) + '%' : '—';
    return { code, title, clicks: c, sales: s, cvr };
  });
  rows.sort((a, b) => b.clicks - a.clicks);

  const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const totalSales = rows.reduce((sum, r) => sum + r.sales, 0);

  const th: CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: '#64748b', borderBottom: '2px solid #e2e8f0' };
  const td: CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#0f172a' };
  const num: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <main style={{ maxWidth: 920, margin: '48px auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Boundless Tracking</h1>
      <p style={{ color: '#475569', marginTop: 0 }}>
        {totalClicks} clicks and {totalSales} sales tracked across {rows.length} videos.
      </p>
      <p style={{ marginTop: 0 }}>
        <a href="/tracking/calculator" style={{ color: '#2563eb', textDecoration: 'none' }}>Open the revenue calculator &rarr;</a>
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>Video</th>
            <th style={th}>Code</th>
            <th style={{ ...th, textAlign: 'right' }}>Clicks</th>
            <th style={{ ...th, textAlign: 'right' }}>Sales</th>
            <th style={{ ...th, textAlign: 'right' }}>CVR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td style={{ ...td, maxWidth: 420 }}>{r.title}</td>
              <td style={{ ...td, color: '#64748b', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{r.code}</td>
              <td style={num}>{r.clicks}</td>
              <td style={num}>{r.sales}</td>
              <td style={num}>{r.cvr}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p style={{ color: '#94a3b8', marginTop: 24 }}>No clicks logged yet. Share a /t/&lt;code&gt; link to start.</p>
      )}
    </main>
  );
}
