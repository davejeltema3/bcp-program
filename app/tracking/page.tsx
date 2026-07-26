import type { CSSProperties } from 'react';
import { readRange, readRangeFrom, MEMBERS_SHEET_ID } from '@/lib/tracking';
import { REGISTRY } from '@/lib/tracking-registry';
import PasteBox from './PasteBox';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type View = 'program' | 'livestream' | 'leadmagnets';

/**
 * Boundless Tracking dashboard. Admin-gated by ?key=<ADMIN_SECRET>.
 * Three views (?view=): program clicks/sales, livestream link + signup funnel,
 * and lead-magnet clicks. Each view reads only the tabs it needs.
 */
export default async function TrackingDashboard({
  searchParams,
}: {
  searchParams: { key?: string; sort?: string; dir?: string; view?: string };
}) {
  const adminSecret = process.env.ADMIN_SECRET || '';
  const authed = adminSecret && searchParams.key === adminSecret;

  if (!authed) {
    return (
      <main style={shell}>
        <h1 style={{ fontSize: 22, color: 'var(--bc-text-100, #f4f6fb)' }}>Boundless Tracking</h1>
        <p style={{ color: 'var(--bc-text-300, #9aa4be)' }}>Add <code>?key=YOUR_ADMIN_SECRET</code> to the URL to view the dashboard.</p>
      </main>
    );
  }

  const key = searchParams.key || '';
  const view: View = (['program', 'livestream', 'leadmagnets'] as const).includes(searchParams.view as View)
    ? (searchParams.view as View)
    : 'program';

  if (view === 'livestream') return <Livestream searchParams={searchParams} keyStr={key} />;
  if (view === 'leadmagnets') return <LeadMagnets searchParams={searchParams} keyStr={key} />;
  return <Program searchParams={searchParams} keyStr={key} />;
}

// --- shared styling ---------------------------------------------------------

const shell: CSSProperties = { maxWidth: 920, margin: '48px auto', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--bc-text-200, #d6dcea)' };
const th: CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--bc-text-400, #6b7591)', borderBottom: '1px solid var(--bc-ink-600, #2a3654)' };
const td: CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--bc-ink-700, #1c273f)', fontSize: 14, color: 'var(--bc-text-200, #d6dcea)' };
const num: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const thNum: CSSProperties = { ...th, textAlign: 'right' };
const thLink: CSSProperties = { color: 'inherit', textDecoration: 'none' };
const codeCell: CSSProperties = { ...td, color: 'var(--bc-text-400, #6b7591)', fontFamily: 'ui-monospace, monospace', fontSize: 13 };
const dateCell: CSSProperties = { ...td, color: 'var(--bc-text-300, #9aa4be)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

function TabNav({ view, keyStr }: { view: View; keyStr: string }) {
  const tabs: { id: View; label: string }[] = [
    { id: 'program', label: 'Program' },
    { id: 'livestream', label: 'Live Stream' },
    { id: 'leadmagnets', label: 'Lead Magnets' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, margin: '16px 0 8px', borderBottom: '1px solid var(--bc-ink-600, #2a3654)' }}>
      {tabs.map((t) => {
        const active = t.id === view;
        return (
          <a
            key={t.id}
            href={`/tracking?key=${encodeURIComponent(keyStr)}&view=${t.id}`}
            style={{
              padding: '8px 14px',
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--bc-text-100, #f4f6fb)' : 'var(--bc-text-300, #9aa4be)',
              textDecoration: 'none',
              borderBottom: active ? '2px solid var(--bc-blue-400, #5b9cff)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}

// --- program view (clicks + sales, program codes only) ----------------------

async function Program({ searchParams, keyStr }: { searchParams: any; keyStr: string }) {
  const [clicks, sales, registry] = await Promise.all([
    readRange('Clicks!A2:F'),
    readRange('Sales!A2:G'),
    readRange('Registry!A2:I'),
  ]);

  // Publish-burst filter: ignore clicks in the 15 min after a code's Activated
  // (col I) timestamp, when crawlers hit a freshly published link.
  const BURST_WINDOW_MS = 15 * 60 * 1000;
  const activatedByCode: Record<string, number> = {};
  for (const r of registry) {
    const code = (r[0] || '').trim();
    const activated = (r[8] || '').trim();
    if (!code || !activated) continue;
    const t = Date.parse(activated);
    if (!Number.isNaN(t)) activatedByCode[code] = t;
  }

  // Only program-registry codes are valid here. Livestream / lead-magnet codes
  // also land in Clicks; they belong to their own views, not this list.
  const programCodes = new Set(registry.map((r) => (r[0] || '').trim()).filter(Boolean));

  const clicksByCode: Record<string, number> = {};
  let burstFiltered = 0;
  for (const r of clicks) {
    const code = (r[1] || '').trim();
    if (!code || !programCodes.has(code)) continue;
    const activatedAt = activatedByCode[code];
    if (activatedAt !== undefined) {
      const clickAt = Date.parse((r[0] || '').trim());
      if (!Number.isNaN(clickAt) && clickAt >= activatedAt && clickAt < activatedAt + BURST_WINDOW_MS) {
        burstFiltered++;
        continue;
      }
    }
    clicksByCode[code] = (clicksByCode[code] || 0) + 1;
  }

  const salesByCode: Record<string, number> = {};
  for (const r of sales) {
    const code = (r[2] || '').trim();
    if (code && programCodes.has(code)) salesByCode[code] = (salesByCode[code] || 0) + 1;
  }

  const codes: string[] = registry.map((r) => (r[0] || '').trim()).filter(Boolean);
  const rows = codes.map((code) => {
    const regRow = registry.find((r) => (r[0] || '').trim() === code);
    const title = regRow?.[2] || REGISTRY[code]?.title || '(unknown)';
    const published = (regRow?.[3] || '').trim();
    const c = clicksByCode[code] || 0;
    const s = salesByCode[code] || 0;
    const cvrNum = c > 0 ? s / c : -1;
    const cvr = c > 0 ? (cvrNum * 100).toFixed(1) + '%' : '—';
    return { code, title, published, clicks: c, sales: s, cvr, cvrNum };
  });

  const sortKey = (['published', 'clicks', 'sales', 'cvr'].includes(searchParams.sort || '') ? searchParams.sort : 'clicks') as 'published' | 'clicks' | 'sales' | 'cvr';
  const sortDir = searchParams.dir === 'asc' ? 'asc' : 'desc';
  const sortVal = (r: (typeof rows)[number]): string | number =>
    sortKey === 'published' ? r.published : sortKey === 'cvr' ? r.cvrNum : sortKey === 'sales' ? r.sales : r.clicks;
  rows.sort((a, b) => {
    const av = sortVal(a), bv = sortVal(b);
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const sortHref = (col: string) => {
    const nextDir = sortKey === col && sortDir === 'desc' ? 'asc' : 'desc';
    return `/tracking?key=${encodeURIComponent(keyStr)}&view=program&sort=${col}&dir=${nextDir}`;
  };
  const arrow = (col: string) => (sortKey === col ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '');
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalSales = rows.reduce((s, r) => s + r.sales, 0);

  return (
    <main style={shell}>
      <h1 style={{ fontSize: 24, marginBottom: 4, color: 'var(--bc-text-100, #f4f6fb)' }}>Boundless Tracking</h1>
      <TabNav view="program" keyStr={keyStr} />
      <p style={{ color: 'var(--bc-text-300, #9aa4be)', marginTop: 8 }}>
        {totalClicks} program clicks and {totalSales} sales across {rows.length} videos.
        {burstFiltered > 0 ? ` (${burstFiltered} publish-time crawler clicks filtered)` : ''}
      </p>
      <p style={{ marginTop: 0 }}>
        <a href="/tracking/calculator" style={{ color: 'var(--bc-blue-300, #5b9cff)', textDecoration: 'none' }}>Open the revenue calculator &rarr;</a>
      </p>

      <PasteBox adminKey={keyStr} />

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>Video</th>
            <th style={th}><a href={sortHref('published')} style={thLink}>Published{arrow('published')}</a></th>
            <th style={th}>Code</th>
            <th style={thNum}><a href={sortHref('clicks')} style={thLink}>Clicks{arrow('clicks')}</a></th>
            <th style={thNum}><a href={sortHref('sales')} style={thLink}>Sales{arrow('sales')}</a></th>
            <th style={thNum}><a href={sortHref('cvr')} style={thLink}>CVR{arrow('cvr')}</a></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td style={{ ...td, maxWidth: 420, color: 'var(--bc-text-100, #f4f6fb)' }}>{r.title}</td>
              <td style={dateCell}>{r.published || '—'}</td>
              <td style={codeCell}>{r.code}</td>
              <td style={num}>{r.clicks}</td>
              <td style={{ ...num, color: r.sales > 0 ? 'var(--bc-green-400, #5ce0a3)' : 'var(--bc-text-400, #6b7591)' }}>{r.sales}</td>
              <td style={{ ...num, color: r.clicks > 0 ? 'var(--bc-blue-300, #5b9cff)' : 'var(--bc-text-400, #6b7591)' }}>{r.cvr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

// --- livestream view (link -> click -> signup -> review) --------------------

async function Livestream({ searchParams, keyStr }: { searchParams: any; keyStr: string }) {
  const [registry, clickLog, waitlist] = await Promise.all([
    readRange("'Livestream Registry'!A2:I"),
    readRange('Livestream!A2:F'),
    readRangeFrom(MEMBERS_SHEET_ID, "'Livestream Waitlist'!A2:N"),
  ]);

  const liveCodes = new Set(registry.map((r) => (r[0] || '').trim()).filter(Boolean));

  // Publish-burst filter: ignore clicks in the 30 min after a link's Activated
  // (col I) time, when link scanners hit a freshly written /t link.
  const BURST_WINDOW_MS = 30 * 60 * 1000;
  const activatedByCode: Record<string, number> = {};
  for (const r of registry) {
    const code = (r[0] || '').trim();
    const activated = (r[8] || '').trim();
    if (!code || !activated) continue;
    const t = Date.parse(activated);
    if (!Number.isNaN(t)) activatedByCode[code] = t;
  }

  const clicksByCode: Record<string, number> = {};
  let burstFiltered = 0;
  for (const r of clickLog) {
    const code = (r[1] || '').trim();
    if (!code || !liveCodes.has(code)) continue;
    const activatedAt = activatedByCode[code];
    if (activatedAt !== undefined) {
      const clickAt = Date.parse((r[0] || '').trim());
      if (!Number.isNaN(clickAt) && clickAt >= activatedAt && clickAt < activatedAt + BURST_WINDOW_MS) {
        burstFiltered++;
        continue;
      }
    }
    clicksByCode[code] = (clicksByCode[code] || 0) + 1;
  }

  // Waitlist: col N (index 13) = source, cols D–J = review answers.
  const signupsByCode: Record<string, number> = {};
  const reviewsByCode: Record<string, number> = {};
  let totalSignups = 0, totalReviews = 0, attributedSignups = 0;
  for (const r of waitlist) {
    if (!r || !(r[2] || '').trim()) continue; // needs an email to count as a signup
    totalSignups++;
    const reviewed = [3, 4, 5, 6, 7, 8, 9].some((i) => (r[i] || '').trim());
    if (reviewed) totalReviews++;
    const code = (r[13] || '').trim();
    if (code && liveCodes.has(code)) {
      attributedSignups++;
      signupsByCode[code] = (signupsByCode[code] || 0) + 1;
      if (reviewed) reviewsByCode[code] = (reviewsByCode[code] || 0) + 1;
    }
  }

  const rows = registry.map((r) => {
    const code = (r[0] || '').trim();
    return {
      code,
      title: (r[2] || '').trim() || '(untitled)',
      published: (r[3] || '').trim(),
      clicks: clicksByCode[code] || 0,
      signups: signupsByCode[code] || 0,
      reviews: reviewsByCode[code] || 0,
    };
  }).filter((r) => r.code);

  const sortKey = (['published', 'clicks', 'signups', 'reviews'].includes(searchParams.sort || '') ? searchParams.sort : 'clicks') as 'published' | 'clicks' | 'signups' | 'reviews';
  const sortDir = searchParams.dir === 'asc' ? 'asc' : 'desc';
  const sortVal = (r: (typeof rows)[number]): string | number => (sortKey === 'published' ? r.published : (r as any)[sortKey]);
  rows.sort((a, b) => {
    const av = sortVal(a), bv = sortVal(b);
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const sortHref = (col: string) => {
    const nextDir = sortKey === col && sortDir === 'desc' ? 'asc' : 'desc';
    return `/tracking?key=${encodeURIComponent(keyStr)}&view=livestream&sort=${col}&dir=${nextDir}`;
  };
  const arrow = (col: string) => (sortKey === col ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '');

  const totalClicks = Object.values(clicksByCode).reduce((s, n) => s + n, 0);

  return (
    <main style={shell}>
      <h1 style={{ fontSize: 24, marginBottom: 4, color: 'var(--bc-text-100, #f4f6fb)' }}>Boundless Tracking</h1>
      <TabNav view="livestream" keyStr={keyStr} />
      <p style={{ color: 'var(--bc-text-300, #9aa4be)', marginTop: 8 }}>
        {totalClicks} livestream link clicks across {rows.length} videos · {totalSignups} signups ({totalReviews} with a review submitted).
        {' '}{attributedSignups} signups are attributed to a specific video link so far.
        {burstFiltered > 0 ? ` (${burstFiltered} publish-time crawler clicks filtered)` : ''}
      </p>
      <p style={{ marginTop: 0, fontSize: 13, color: 'var(--bc-text-400, #6b7591)' }}>
        Signups attribute to a video only when the visitor arrived through its /t link (bt_src cookie). Older or direct signups show under no video.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>Video</th>
            <th style={th}><a href={sortHref('published')} style={thLink}>Published{arrow('published')}</a></th>
            <th style={th}>Code</th>
            <th style={thNum}><a href={sortHref('clicks')} style={thLink}>Clicks{arrow('clicks')}</a></th>
            <th style={thNum}><a href={sortHref('signups')} style={thLink}>Signups{arrow('signups')}</a></th>
            <th style={thNum}><a href={sortHref('reviews')} style={thLink}>Reviews{arrow('reviews')}</a></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td style={{ ...td, maxWidth: 420, color: 'var(--bc-text-100, #f4f6fb)' }}>{r.title}</td>
              <td style={dateCell}>{r.published || '—'}</td>
              <td style={codeCell}>{r.code}</td>
              <td style={num}>{r.clicks}</td>
              <td style={{ ...num, color: r.signups > 0 ? 'var(--bc-green-400, #5ce0a3)' : 'var(--bc-text-400, #6b7591)' }}>{r.signups}</td>
              <td style={{ ...num, color: r.reviews > 0 ? 'var(--bc-blue-300, #5b9cff)' : 'var(--bc-text-400, #6b7591)' }}>{r.reviews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

// --- lead magnets view (reads a registry tab if it exists) ------------------

async function LeadMagnets({ keyStr }: { searchParams: any; keyStr: string }) {
  let registry: string[][] = [];
  let missing = false;
  try {
    registry = await readRange("'Lead Magnet Registry'!A2:H");
  } catch {
    missing = true;
  }

  const clicks = missing ? [] : await readRange('Clicks!A2:F');
  const magnetCodes = new Set(registry.map((r) => (r[0] || '').trim()).filter(Boolean));
  const clicksByCode: Record<string, number> = {};
  for (const r of clicks) {
    const code = (r[1] || '').trim();
    if (code && magnetCodes.has(code)) clicksByCode[code] = (clicksByCode[code] || 0) + 1;
  }

  const rows = registry.map((r) => ({
    code: (r[0] || '').trim(),
    title: (r[2] || '').trim() || '(untitled)',
    magnet: (r[6] || '').trim(),          // destination = the magnet
    published: (r[3] || '').trim(),
    clicks: clicksByCode[(r[0] || '').trim()] || 0,
  })).filter((r) => r.code);
  rows.sort((a, b) => b.clicks - a.clicks);

  return (
    <main style={shell}>
      <h1 style={{ fontSize: 24, marginBottom: 4, color: 'var(--bc-text-100, #f4f6fb)' }}>Boundless Tracking</h1>
      <TabNav view="leadmagnets" keyStr={keyStr} />
      {rows.length === 0 ? (
        <div style={{ marginTop: 16, padding: 16, border: '1px dashed var(--bc-ink-600, #2a3654)', borderRadius: 10, color: 'var(--bc-text-300, #9aa4be)' }}>
          <p style={{ marginTop: 0, color: 'var(--bc-text-100, #f4f6fb)', fontWeight: 600 }}>Lead magnet tracking isn’t set up yet.</p>
          <p style={{ marginBottom: 0 }}>
            Once the Lead Magnet Registry is populated, each video’s magnet link (whichever magnet it points to) shows here with its clicks. The registry is built to hold many different magnets, one row per video, so a single view covers them all.
          </p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--bc-text-300, #9aa4be)', marginTop: 8 }}>
            {rows.reduce((s, r) => s + r.clicks, 0)} lead magnet clicks across {rows.length} videos.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr>
                <th style={th}>Video</th>
                <th style={th}>Magnet</th>
                <th style={th}>Code</th>
                <th style={thNum}>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td style={{ ...td, maxWidth: 360, color: 'var(--bc-text-100, #f4f6fb)' }}>{r.title}</td>
                  <td style={{ ...td, maxWidth: 280, color: 'var(--bc-text-300, #9aa4be)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.magnet}</td>
                  <td style={codeCell}>{r.code}</td>
                  <td style={num}>{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
