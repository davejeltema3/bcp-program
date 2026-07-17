'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BoardData, BoardItem } from '@/lib/board';

/* ---------- helpers ---------- */

function updateChecked(b: BoardData, id: string, checked: boolean): BoardData {
  const fix = (arr: BoardItem[]) => arr.map((it) => (it.id === id ? { ...it, checked } : it));
  return {
    ...b,
    goals: fix(b.goals),
    needsYou: fix(b.needsYou),
    today: fix(b.today),
    soon: b.soon.map((grp) => ({ ...grp, items: fix(grp.items) })),
  };
}

function removeFromBoard(b: BoardData, id: string): BoardData {
  const drop = (arr: BoardItem[]) => arr.filter((it) => it.id !== id);
  return {
    ...b,
    goals: drop(b.goals),
    needsYou: drop(b.needsYou),
    today: drop(b.today),
    soon: b.soon.map((grp) => ({ ...grp, items: drop(grp.items) })),
  };
}

function setFavicon(red: boolean) {
  try {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = '#14213d';
    g.beginPath();
    g.arc(16, 16, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#5b9cff';
    g.font = 'bold 15px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('B', 16, 17);
    if (red) {
      g.fillStyle = '#e5484d';
      g.beginPath();
      g.arc(24, 8, 8, 0, Math.PI * 2);
      g.fill();
    }
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = c.toDataURL('image/png');
  } catch {
    /* no-op */
  }
}

async function post(body: Record<string, unknown>) {
  return fetch('/api/board', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/* ---------- styles ---------- */

const wrap: CSSProperties = {
  maxWidth: 840,
  margin: '0 auto',
  padding: '20px 18px 80px',
  fontFamily: 'Inter, system-ui, sans-serif',
  color: 'var(--bc-text-200, #d6dcea)',
};
const card: CSSProperties = {
  background: 'var(--bc-ink-800, #131c33)',
  border: '1px solid var(--bc-ink-600, #2a3654)',
  borderRadius: 14,
  padding: '14px 16px',
  margin: '12px 0',
};
const h2: CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  color: 'var(--bc-text-400, #6b7591)',
  margin: '0 0 10px',
};
const groupLabel: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--bc-text-300, #9aa4be)',
  margin: '10px 0 2px',
};
const xBtn: CSSProperties = {
  border: 'none',
  background: 'none',
  color: 'var(--bc-text-500, #4a546d)',
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
  padding: '0 2px',
  flex: '0 0 auto',
};

/* ---------- item row ---------- */

function ItemRow({
  item,
  onToggle,
  onRemove,
  sensitive,
}: {
  item: BoardItem;
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  sensitive?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '7px 0',
        borderTop: '1px solid var(--bc-ink-700, #1c273f)',
        cursor: 'pointer',
        fontSize: 14.5,
      }}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        style={{ marginTop: 3, width: 16, height: 16, accentColor: '#1f6dff', flex: '0 0 auto' }}
      />
      <span
        className={sensitive ? 'bc-sensitive' : undefined}
        style={{
          flex: 1,
          color: item.checked ? 'var(--bc-text-500, #4a546d)' : 'var(--bc-text-200, #d6dcea)',
          textDecoration: item.checked ? 'line-through' : 'none',
        }}
      >
        {item.text}
        {item.tag ? (
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--bc-text-400, #6b7591)' }}>{item.tag}</span>
        ) : null}
      </span>
      <button
        type="button"
        title="Remove"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.id);
        }}
        style={xBtn}
      >
        &times;
      </button>
    </label>
  );
}

/* ---------- add row ---------- */

function AddRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText('');
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder="Add an item…"
        style={{
          flex: 1,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid var(--bc-ink-600, #2a3654)',
          background: 'var(--bc-ink-850, #0f1729)',
          color: 'var(--bc-text-100, #f4f6fb)',
          fontSize: 13.5,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={submit}
        style={{
          border: '1px solid var(--bc-ink-600, #2a3654)',
          background: 'var(--bc-ink-700, #1c273f)',
          color: 'var(--bc-text-200, #d6dcea)',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Add
      </button>
    </div>
  );
}

/* ---------- main ---------- */

export default function BoardClient({ initial }: { initial: BoardData }) {
  const [board, setBoard] = useState<BoardData>(initial);
  const [seen, setSeen] = useState<number>(initial.notifLastSeen);
  const [privacy, setPrivacy] = useState(false);

  const unseen = useMemo(() => board.notifications.filter((n) => n.ts > seen), [board.notifications, seen]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/board', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.board) setBoard(data.board);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const markSeen = useCallback(async () => {
    setSeen(Math.floor(Date.now() / 1000));
    try {
      await post({ action: 'markSeen' });
    } catch {
      /* the dot just re-shows next load */
    }
  }, []);

  // Tab red-dot: favicon + title, like unread mail.
  useEffect(() => {
    const has = unseen.length > 0;
    document.title = (has ? '● ' : '') + 'The Board';
    setFavicon(has);
  }, [unseen.length]);

  // Clear the dot when the tab becomes visible.
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible' && unseen.length > 0) {
        setTimeout(() => markSeen(), 900);
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [unseen.length, markSeen]);

  const toggle = useCallback((id: string, checked: boolean) => {
    setBoard((b) => updateChecked(b, id, checked));
    post({ action: 'toggle', id, checked }).catch(() => setBoard((b) => updateChecked(b, id, !checked)));
  }, []);

  const remove = useCallback((id: string) => {
    setBoard((b) => removeFromBoard(b, id));
    post({ action: 'remove', id }).catch(() => refresh());
  }, [refresh]);

  const add = useCallback(
    async (section: string, group: string, text: string) => {
      await post({ action: 'add', section, group, text });
      refresh();
    },
    [refresh],
  );

  return (
    <main
      className={privacy ? 'bc-private' : undefined}
      style={{ background: 'var(--bc-ink-900, #0b1220)', minHeight: '100vh' }}
    >
      <style>{`
        .bc-private .bc-sensitive { filter: blur(7px); transition: filter .12s; }
        .bc-private .bc-sensitive:hover { filter: none; }
      `}</style>

      <div style={wrap}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, margin: 0, letterSpacing: '-0.4px', color: 'var(--bc-text-100, #f4f6fb)' }}>
              The Board
            </h1>
            <div style={{ color: 'var(--bc-text-400, #6b7591)', fontSize: 13, marginTop: 2 }}>
              {board.updated ? `Synced ${board.updated}` : 'Your daily driver'}
            </div>
          </div>
          <button
            onClick={() => setPrivacy((p) => !p)}
            style={{
              border: '1px solid var(--bc-ink-600, #2a3654)',
              background: privacy ? 'var(--bc-blue-500, #1f6dff)' : 'var(--bc-ink-800, #131c33)',
              color: privacy ? '#fff' : 'var(--bc-text-300, #9aa4be)',
              borderRadius: 8,
              padding: '6px 11px',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Blur content for streaming. Hover any line to reveal it."
          >
            {privacy ? 'Privacy on' : 'Privacy'}
          </button>
        </div>

        {/* notifications */}
        {board.notifications.length > 0 && (
          <section style={{ ...card, borderColor: unseen.length ? 'var(--bc-blue-400, #3a85ff)' : 'var(--bc-ink-600, #2a3654)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ ...h2, margin: 0, color: unseen.length ? 'var(--bc-blue-300, #5b9cff)' : 'var(--bc-text-400, #6b7591)' }}>
                Notifications{unseen.length ? ` · ${unseen.length} new` : ''}
              </h2>
              {unseen.length > 0 && (
                <button
                  onClick={markSeen}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--bc-blue-300, #5b9cff)' }}
                >
                  Mark seen
                </button>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              {board.notifications.map((n) => {
                const isNew = n.ts > seen;
                return (
                  <div key={n.id} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 14 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flex: '0 0 auto', background: isNew ? '#e5484d' : 'transparent' }} />
                    <span className="bc-sensitive">
                      <span style={{ color: 'var(--bc-text-100, #f4f6fb)' }}>{n.text}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--bc-text-400, #6b7591)' }}>
                        {n.tag ? `${n.tag} · ` : ''}
                        {n.date}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* north star */}
        {board.northstar && (
          <div style={{ background: 'var(--bc-blue-navy, #14213d)', color: 'var(--bc-text-200, #d6dcea)', borderRadius: 12, padding: '13px 16px', margin: '14px 0 4px', fontSize: 14 }}>
            <span className="bc-sensitive">{board.northstar}</span>
          </div>
        )}

        {/* goals */}
        {board.goals.length > 0 && (
          <section style={card}>
            <h2 style={h2}>This week&apos;s goals</h2>
            {board.goals.map((g, i) => (
              <div key={g.id} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 15 }}>
                <span style={{ color: g.checked ? 'var(--bc-text-500, #4a546d)' : 'var(--bc-blue-300, #5b9cff)', fontWeight: 700 }}>{i + 1}</span>
                <span className="bc-sensitive" style={{ flex: 1, textDecoration: g.checked ? 'line-through' : 'none', color: g.checked ? 'var(--bc-text-500, #4a546d)' : undefined }}>
                  {g.text}
                </span>
                <button type="button" title="Remove" onClick={() => remove(g.id)} style={xBtn}>&times;</button>
              </div>
            ))}
          </section>
        )}

        {/* needs you */}
        {board.needsYou.length > 0 && (
          <section style={{ ...card, borderColor: 'var(--bc-ink-500, #3d4a6b)' }}>
            <h2 style={{ ...h2, color: 'var(--bc-amber-400, #f5b86b)' }}>Needs You</h2>
            {board.needsYou.map((it) =>
              it.kind === 'item' ? (
                <ItemRow key={it.id} item={it} onToggle={toggle} onRemove={remove} sensitive />
              ) : (
                <p key={it.id} className="bc-sensitive" style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--bc-text-300, #9aa4be)' }}>
                  {it.text}
                </p>
              ),
            )}
            <AddRow onAdd={(t) => add('needs-you', '', t)} />
          </section>
        )}

        {/* today */}
        <section style={card}>
          <h2 style={h2}>Today</h2>
          {board.today.map((it) => (
            <ItemRow key={it.id} item={it} onToggle={toggle} onRemove={remove} sensitive />
          ))}
          <AddRow onAdd={(t) => add('today', '', t)} />
        </section>

        {/* soon */}
        {board.soon.length > 0 && (
          <section style={card}>
            <h2 style={h2}>Soon, before the trip</h2>
            {board.soon.map((grp) => (
              <div key={grp.group}>
                <div style={groupLabel}>{grp.group}</div>
                {grp.items.map((it) => (
                  <ItemRow key={it.id} item={it} onToggle={toggle} onRemove={remove} sensitive />
                ))}
                <AddRow onAdd={(t) => add('soon', grp.group, t)} />
              </div>
            ))}
          </section>
        )}

        {/* horizon */}
        {board.horizon.length > 0 && (
          <section style={card}>
            <h2 style={h2}>Horizon</h2>
            {board.horizon.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', borderTop: i ? '1px solid var(--bc-ink-700, #1c273f)' : 'none', fontSize: 14 }}>
                <span style={{ flex: '0 0 92px', color: 'var(--bc-blue-300, #5b9cff)', fontWeight: 600, fontSize: 13 }}>{r.date}</span>
                <span className="bc-sensitive">{r.text}</span>
              </div>
            ))}
          </section>
        )}

        {/* parked */}
        {board.parked.length > 0 && (
          <section style={card}>
            <h2 style={h2}>Parked, post-trip</h2>
            <p className="bc-sensitive" style={{ margin: 0, fontSize: 13.5, color: 'var(--bc-text-400, #6b7591)' }}>
              {board.parked.join(' ')}
            </p>
          </section>
        )}

        <div style={{ color: 'var(--bc-text-500, #4a546d)', fontSize: 12, marginTop: 18 }}>
          Check off, add, or delete here, or just tell Claude in a chat. Both write to the same board.
        </div>
      </div>
    </main>
  );
}
