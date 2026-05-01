import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback Discord invite endpoint.
 * 
 * Primary flow: Stripe webhook generates a unique single-use invite per subscriber
 * and stores it in Kit's discord_invite custom field. Kit emails use that.
 * 
 * This endpoint is the fallback ({{ subscriber.discord_invite | default: this_url }}).
 * It reuses an existing invite if one is still valid, rather than creating
 * a new one on every request (which caused 168+ orphaned invites from
 * email client link prefetching, crawlers, etc.).
 */

// In-memory cache for the fallback invite (survives across requests in the same serverless instance)
let cachedInvite: { code: string; expiresAt: number } | null = null;

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

  // Return cached invite if still valid (with 1-hour buffer before expiry)
  const now = Date.now();
  if (cachedInvite && cachedInvite.expiresAt > now + 3600_000) {
    return NextResponse.redirect(`https://discord.gg/${cachedInvite.code}`);
  }

  try {
    // Check for an existing reusable invite on this channel first
    const existingRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (existingRes.ok) {
      const invites = await existingRes.json();
      // Look for a Hazel-created multi-use invite that's still valid
      const reusable = invites.find((inv: any) =>
        inv.inviter?.bot === true &&
        inv.max_uses === 0 && // unlimited uses
        inv.max_age > 0 &&
        new Date(inv.expires_at).getTime() > now + 3600_000
      );

      if (reusable) {
        cachedInvite = {
          code: reusable.code,
          expiresAt: new Date(reusable.expires_at).getTime(),
        };
        return NextResponse.redirect(`https://discord.gg/${reusable.code}`);
      }
    }

    // No reusable invite found — create one (unlimited uses, 7 days)
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_age: 604800, // 7 days
        max_uses: 0,     // unlimited uses (this is the fallback, not per-subscriber)
        unique: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Discord API error:', data);
      return NextResponse.json({ error: `Discord error: ${data.message || 'Failed to create invite'}` }, { status: 500 });
    }

    if (data.code && typeof data.code === 'string') {
      cachedInvite = {
        code: data.code,
        expiresAt: now + 604800_000,
      };
      return NextResponse.redirect(`https://discord.gg/${data.code}`);
    }

    return NextResponse.json({ error: 'Failed to create invite — no invite code returned' }, { status: 500 });
  } catch (error) {
    console.error('Discord invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
