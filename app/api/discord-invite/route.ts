import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic Discord invite endpoint.
 * Same as the Accelerator site — creates a one-time invite link.
 */
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
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_age: 604800, // 7 days
        max_uses: 1,
        unique: true,
      }),
    });

    const data = await response.json();

    if (data.code) {
      return NextResponse.redirect(`https://discord.gg/${data.code}`);
    }

    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  } catch (error) {
    console.error('Discord invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
