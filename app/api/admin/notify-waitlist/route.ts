import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint: notify all BCP Waitlist Members that the window is open.
 * 
 * Applies the "BCP Window Open Notification" tag (19208524) to all subscribers
 * who have the "BCP Waitlist Member" tag (8231366).
 * 
 * Dave should set up a Kit automation:
 *   Trigger: "BCP Window Open Notification" tag added
 *   Action: Send email "The window is open! Join now: bcp.boundlesscreator.com"
 *   Exit: After email sent (or add exit condition)
 * 
 * This way Dave controls the email content entirely in Kit and can turn it off.
 * 
 * POST /api/admin/notify-waitlist
 * Body: { secret: "admin-secret" }
 */
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();

    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.KIT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'KIT_API_KEY not configured' }, { status: 500 });
    }

    const waitlistTagId = process.env.KIT_TAG_BCP_WAITLIST || '8231366';
    const notifyTagId = process.env.KIT_TAG_WINDOW_OPEN_NOTIFICATION || '19208524';

    // Fetch all subscribers with the BCP Waitlist tag
    let allSubscribers: { id: number; email_address: string }[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://api.kit.com/v4/tags/${waitlistTagId}/subscribers?per_page=100&page=${page}`,
        {
          headers: { 'X-Kit-Api-Key': apiKey },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch waitlist subscribers:', await response.text());
        break;
      }

      const data = await response.json();
      const subscribers = data.subscribers || [];
      allSubscribers = [...allSubscribers, ...subscribers];

      // Check if there are more pages
      if (subscribers.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (allSubscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No waitlist subscribers found.',
        tagged: 0,
      });
    }

    // Tag each subscriber with the notification tag
    let tagged = 0;
    let failed = 0;

    for (const subscriber of allSubscribers) {
      try {
        const tagResponse = await fetch(
          `https://api.kit.com/v4/tags/${notifyTagId}/subscribers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Kit-Api-Key': apiKey,
            },
            body: JSON.stringify({ email_address: subscriber.email_address }),
          }
        );

        if (tagResponse.ok) {
          tagged++;
        } else {
          failed++;
          console.error(`Failed to tag ${subscriber.email_address}:`, await tagResponse.text());
        }
      } catch (err) {
        failed++;
        console.error(`Error tagging ${subscriber.email_address}:`, err);
      }
    }

    // Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '📢 Waitlist Notified — Window Open!',
              color: 0x22c55e,
              fields: [
                { name: 'Total Waitlist', value: `${allSubscribers.length}`, inline: true },
                { name: 'Successfully Tagged', value: `${tagged}`, inline: true },
                { name: 'Failed', value: `${failed}`, inline: true },
              ],
              description: 'Kit automation will send the email to everyone tagged.',
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch (err) {
        console.error('Discord notification failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tagged ${tagged} waitlist subscribers with "BCP Window Open Notification". Kit automation will send the email.`,
      total: allSubscribers.length,
      tagged,
      failed,
    });
  } catch (error: any) {
    console.error('Notify waitlist error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
