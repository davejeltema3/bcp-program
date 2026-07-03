import { NextRequest, NextResponse } from 'next/server';

/**
 * TEMPORARY Discord invite maintenance. Token-gated (SHEETS_RPC_TOKEN).
 * Runs server-side with the bot token so nothing is exposed.
 *
 *   ?action=list                  -> count + sample (with ages) of invites
 *   ?action=purge                 -> delete bot-created invites, rate-limit aware,
 *                                     ~50s budget per call (all=1 = every invite,
 *                                     keep=CODE spares one)
 *   ?action=fresh                 -> mint one invite (default 7-day, unlimited uses)
 *
 * Delete after the cleanup.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API = 'https://discord.com/api/v10';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dfetch(path: string, botToken: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!process.env.SHEETS_RPC_TOKEN || token !== process.env.SHEETS_RPC_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const botToken = process.env.DISCORD_BOT_TOKEN as string;
  const channelId = process.env.DISCORD_INVITE_CHANNEL_ID as string;
  if (!botToken || !channelId) {
    return NextResponse.json({ error: 'missing DISCORD env' }, { status: 500 });
  }

  const action = req.nextUrl.searchParams.get('action') || 'list';

  const ch = await dfetch(`/channels/${channelId}`, botToken);
  const guildId = ch.body?.guild_id as string | undefined;

  async function getInvites(): Promise<{ scope: string; invites: any[]; error?: any }> {
    if (guildId) {
      const g = await dfetch(`/guilds/${guildId}/invites`, botToken);
      if (g.status === 200 && Array.isArray(g.body)) return { scope: 'guild', invites: g.body };
    }
    const c = await dfetch(`/channels/${channelId}/invites`, botToken);
    if (c.status === 200 && Array.isArray(c.body)) return { scope: 'channel', invites: c.body };
    return { scope: 'none', invites: [], error: c.body || c.status };
  }

  if (action === 'list') {
    const { scope, invites, error } = await getInvites();
    const botCount = invites.filter((i) => i.inviter?.bot).length;
    return NextResponse.json({
      scope,
      total: invites.length,
      botCreated: botCount,
      humanCreated: invites.length - botCount,
      sample: invites.slice(0, 10).map((i) => ({
        code: i.code, uses: i.uses, max_uses: i.max_uses, created_at: i.created_at,
        expires_at: i.expires_at, inviter: i.inviter?.username || null, bot: !!i.inviter?.bot,
      })),
      humanInvites: invites.filter((i) => !i.inviter?.bot).map((i) => ({ code: i.code, inviter: i.inviter?.username })),
      error: error || null,
    });
  }

  if (action === 'purge') {
    const all = req.nextUrl.searchParams.get('all') === '1';
    const keep = req.nextUrl.searchParams.get('keep');
    const { scope, invites } = await getInvites();
    const startBot = invites.filter((i) => i.inviter?.bot).length;
    const targets = invites
      .filter((i) => (all ? true : !!i.inviter?.bot))
      .filter((i) => i.code !== keep);

    const deadline = Date.now() + 50000;
    let deleted = 0;
    let rateLimitWaits = 0;
    const failed: any[] = [];
    let idx = 0;
    while (idx < targets.length && Date.now() < deadline) {
      const inv = targets[idx];
      const d = await dfetch(`/invites/${inv.code}`, botToken, { method: 'DELETE' });
      if (d.status === 200 || d.status === 204) { deleted++; idx++; await sleep(300); }
      else if (d.status === 404) { idx++; }
      else if (d.status === 429) { rateLimitWaits++; await sleep(((d.body?.retry_after ?? 1) * 1000) + 350); }
      else { failed.push({ code: inv.code, status: d.status, message: d.body?.message }); idx++; }
    }

    return NextResponse.json({
      scope,
      deleted,
      rateLimitWaits,
      failedCount: failed.length,
      failedSample: failed.slice(0, 5),
      targetedThisCall: targets.length,
      processedThisCall: idx,
      botRemainingEstimate: Math.max(startBot - deleted, targets.length - idx),
    });
  }

  if (action === 'fresh') {
    const maxAge = parseInt(req.nextUrl.searchParams.get('max_age') || '604800', 10); // 7 days
    const maxUses = parseInt(req.nextUrl.searchParams.get('max_uses') || '0', 10);     // unlimited
    const r = await dfetch(`/channels/${channelId}/invites`, botToken, {
      method: 'POST',
      body: JSON.stringify({ max_age: maxAge, max_uses: maxUses, unique: true }),
    });
    if ((r.status === 200 || r.status === 201) && r.body?.code) {
      return NextResponse.json({ url: `https://discord.gg/${r.body.code}`, code: r.body.code, max_age: maxAge, max_uses: maxUses });
    }
    return NextResponse.json({ error: 'create failed', status: r.status, message: r.body?.message }, { status: 500 });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
