import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback Discord invite endpoint.
 *
 * Primary flow: the Stripe webhook creates a unique single-use invite per member
 * at payment time and stores it in Kit's discord_invite custom field. The welcome
 * email uses that. This endpoint is only the email's `default:` — hit when a
 * member's personal invite is somehow missing.
 *
 * It now mints a fresh SINGLE-USE, never-expiring invite so no shareable link is
 * ever handed out (a member can't pass their invite to a non-paying friend).
 * Token-gated by DISCORD_INVITE_SECRET.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!process.env.DISCORD_INVITE_SECRET || token !== process.env.DISCORD_INVITE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_INVITE_CHANNEL_ID;
  if (!botToken || !channelId) {
    return NextResponse.json({ error: 'Discord not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_age: 0, max_uses: 1, unique: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Discord API error:', data);
      return NextResponse.json({ error: `Discord error: ${data.message || 'Failed to create invite'}` }, { status: 500 });
    }
    if (data.code && typeof data.code === 'string') {
      return NextResponse.redirect(`https://discord.gg/${data.code}`);
    }
    return NextResponse.json({ error: 'Failed to create invite — no code returned' }, { status: 500 });
  } catch (error) {
    console.error('Discord invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
