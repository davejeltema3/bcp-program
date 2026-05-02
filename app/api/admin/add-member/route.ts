import { NextRequest, NextResponse } from 'next/server';
import { addCompMember } from '@/lib/sheets';

/**
 * Admin endpoint to manually add a member without payment.
 * Creates a sheet row with comp defaults, tags them in Kit (triggers welcome email),
 * and generates a Discord invite.
 *
 * POST /api/admin/add-member
 * Body: { secret, name, email, durationDays? }
 */
export async function POST(request: NextRequest) {
  try {
    const { secret, name, email, durationDays } = await request.json();

    // Auth check
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const duration = durationDays || 90;

    // 1. Add to Google Sheet
    const { isNew } = await addCompMember(name, email, duration);

    // 2. Generate Discord invite
    let discordInviteUrl: string | null = null;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_INVITE_CHANNEL_ID;
    if (botToken && channelId) {
      try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max_age: 604800, max_uses: 1, unique: true }),
        });
        const data = await response.json();
        if (data.code && typeof data.code === 'string') {
          discordInviteUrl = `https://discord.gg/${data.code}`;
        }
      } catch (err) {
        console.error('Discord invite generation failed:', err);
      }
    }

    // 3. Tag as BCP Member in Kit (triggers welcome email sequence)
    const kitApiKey = process.env.KIT_API_KEY;
    if (kitApiKey) {
      try {
        // Create/update subscriber with discord invite
        await fetch('https://api.kit.com/v4/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': kitApiKey },
          body: JSON.stringify({
            email_address: email,
            first_name: name.split(' ')[0],
            ...(discordInviteUrl ? { fields: { discord_invite: discordInviteUrl } } : {}),
          }),
        });

        // Apply BCP Member tag
        const tagId = process.env.KIT_BCP_MEMBER_TAG_ID || '8240961';
        await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': kitApiKey },
          body: JSON.stringify({ email_address: email }),
        });
      } catch (err) {
        console.error('Kit tagging failed:', err);
      }
    }

    // 4. Discord notification
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '🎁 New BCP Member Added (Comp)',
              color: 0x8b5cf6,
              fields: [
                { name: 'Name', value: name, inline: true },
                { name: 'Email', value: email, inline: true },
                { name: 'Duration', value: `${duration} days`, inline: true },
                { name: 'Type', value: isNew ? 'New member' : 'Returning member (row updated)', inline: false },
              ],
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch (err) {
        console.error('Discord notification failed:', err);
      }
    }

    // Generate questionnaire link
    const questionnaireLink = `https://bcp.boundlesscreator.com/questionnaire?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name.split(' ')[0])}`;

    return NextResponse.json({
      success: true,
      isNew,
      questionnaireLink,
      discordInviteUrl,
      message: isNew
        ? `${name} added as new comp member (${duration} days). Kit tagged, welcome email triggered.`
        : `${name} reactivated as comp member (${duration} days). Existing row updated.`,
    });
  } catch (error: any) {
    console.error('Add member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add member' },
      { status: 500 },
    );
  }
}
