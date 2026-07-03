import { NextRequest, NextResponse } from 'next/server';

/**
 * TEMPORARY Discord invite maintenance. Token-gated (SHEETS_RPC_TOKEN).
 * Runs server-side with the bot token so nothing is exposed.
 *
 *   ?action=list                  -> count + sample of the server's invites
 *   ?action=purge&limit=40        -> delete bot-created invites (add all=1 to
 *                                     delete every invite, keep=CODE to spare one)
 *   ?action=fresh                 -> mint one invite (default 7-day, unlimited
 *                                     uses so email prefetch can't burn it)
 *
 * Delete after the cleanup.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API = 'https://discord.com/api/v10';

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
      sample: invites.slice(0, 12).map((i) => ({
        code: i.code, uses: i.uses, max_uses: i.max_uses, max_age: i.max_age,
        inviter: i.inviter?.username || null, bot: !!i.inviter?.bot,
      })),
      error: error || null,
    });
  }

  if (action === 'purge') {
    const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '40', 10) || 40, 1), 80);
    const all = req.nextUrl.searchParams.get('all') === '1';
    const keep = req.nextUrl.searchParams.get('keep');
    const { scope, invites } = await getInvites();
    const targets = invites
      .filter((i) => (all ? true : !!i.inviter?.bot))
      .filter((i) => i.code !== keep)
      .slice(0, limit);

    let deleted = 0;
    const failed: any[] = [];
    for (const inv of targets) {
      const d = await dfetch(`/invites/${inv.code}`, botToken, { method: 'DELETE' });
      if (d.status === 200 || d.status === 204) deleted++;
      else if (d.status === 429) { failed.push({ code: inv.code, status: 429, retry_after: d.body?.retry_after }); break; }
      else failed.push({ code: inv.code, status: d.status, message: d.body?.message });
      await new Promise((r) => setTimeout(r, 350));
    }

    const after = await getInvites();
    const afterBot = after.invites.filter((i) => i.inviter?.bot).length;
    return NextResponse.json({ scope, deleted, failed, remainingTotal: after.invites.length, remainingBotCreated: afterBot });
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
