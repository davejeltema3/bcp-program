import { NextRequest, NextResponse } from 'next/server';

/**
 * TEMPORARY diagnostic for the broken Discord invite flow.
 *
 * Reports (without ever exposing secret values) whether the Discord env vars
 * are set, and what the Discord API actually says when the bot tries to read
 * the invite channel and create an invite. This pinpoints token vs channel vs
 * permission problems. Gated by SHEETS_RPC_TOKEN. Delete after diagnosing.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!process.env.SHEETS_RPC_TOKEN || token !== process.env.SHEETS_RPC_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_INVITE_CHANNEL_ID;

  const out: Record<string, unknown> = {
    botTokenSet: !!botToken,
    channelIdSet: !!channelId,
    inviteSecretSet: !!process.env.DISCORD_INVITE_SECRET,
    channelIdLength: channelId ? channelId.length : 0,
  };

  if (!botToken || !channelId) {
    return NextResponse.json({ ...out, note: 'bot token or channel id missing' });
  }

  // 1. Can the bot see the channel? (401 bad token, 404 wrong id, 403 no access)
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    const body = await r.json().catch(() => ({}));
    out.channelGet = {
      status: r.status,
      name: (body as any)?.name ?? null,
      guildId: (body as any)?.guild_id ?? null,
      message: (body as any)?.message ?? null,
      code: (body as any)?.code ?? null,
    };
  } catch (e: any) {
    out.channelGet = { error: String(e?.message || e) };
  }

  // 2. Can the bot create an invite? (403 = missing CREATE_INSTANT_INVITE)
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_age: 300, max_uses: 1, unique: true }),
    });
    const body = await r.json().catch(() => ({}));
    out.inviteCreate = {
      status: r.status,
      gotCode: !!(body as any)?.code && typeof (body as any).code === 'string',
      message: (body as any)?.message ?? null,
      code: (body as any)?.code ?? null,
    };
  } catch (e: any) {
    out.inviteCreate = { error: String(e?.message || e) };
  }

  return NextResponse.json(out);
}
