import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint to update the purchase window.
 * Updates NEXT_PUBLIC_WINDOW_OPEN and NEXT_PUBLIC_WINDOW_CLOSE env vars
 * via the Vercel API, then triggers a redeploy.
 *
 * Optionally notifies waitlist subscribers by tagging them in Kit.
 *
 * Requires: ADMIN_SECRET, VERCEL_TOKEN, VERCEL_PROJECT_ID in env vars.
 */
export async function POST(request: NextRequest) {
  try {
    const { secret, openDate, closeDate, timezone, notifyWaitlist } = await request.json();

    // Auth check
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) {
      return NextResponse.json({ error: 'Vercel API not configured' }, { status: 500 });
    }

    // Convert local datetime to UTC ISO string
    // Input format: "2026-05-01T09:00" from datetime-local input
    const openUTC = localToUTC(openDate, timezone);
    const closeUTC = localToUTC(closeDate, timezone);

    if (!openUTC || !closeUTC) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }

    // Update env vars via Vercel API
    const envVars = [
      { key: 'NEXT_PUBLIC_WINDOW_OPEN', value: openUTC },
      { key: 'NEXT_PUBLIC_WINDOW_CLOSE', value: closeUTC },
    ];

    for (const env of envVars) {
      // Try to update existing, fall back to create
      // First, get current env var ID
      const listRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env?key=${env.key}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );

      const listData = await listRes.json();
      const existing = listData.envs?.find((e: any) => e.key === env.key);

      if (existing) {
        // Update existing
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: env.value }),
          }
        );
      } else {
        // Create new
        await fetch(
          `https://api.vercel.com/v10/projects/${projectId}/env`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key: env.key,
              value: env.value,
              type: 'plain',
              target: ['production', 'preview'],
            }),
          }
        );
      }
    }

    // Trigger redeploy
    const deployRes = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'bcp-program',
          project: projectId,
          target: 'production',
          gitSource: {
            type: 'github',
            repoId: process.env.VERCEL_GIT_REPO_ID,
            ref: 'main',
          },
        }),
      }
    );

    let deployWarning: string | undefined;
    if (!deployRes.ok) {
      const err = await deployRes.text();
      console.error('Redeploy failed:', err);
      deployWarning = 'Env vars updated but auto-redeploy failed. Push a commit or manually redeploy in Vercel dashboard.';
    }

    // Optionally notify waitlist
    let waitlistNotified = false;
    let waitlistCount = 0;

    if (notifyWaitlist) {
      const result = await notifyWaitlistSubscribers();
      waitlistNotified = true;
      waitlistCount = result.tagged;

      // Discord notification with waitlist info
      if (process.env.DISCORD_WEBHOOK_URL) {
        try {
          await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '📢 Window opened & waitlist notified',
                color: 0x22c55e,
                description: `${result.tagged} subscribers will receive the email sequence.`,
                fields: [
                  { name: 'Window Opens', value: openUTC, inline: true },
                  { name: 'Window Closes', value: closeUTC, inline: true },
                  { name: 'Waitlist Tagged', value: `${result.tagged}`, inline: true },
                ],
                timestamp: new Date().toISOString(),
              }],
            }),
          });
        } catch (err) {
          console.error('Discord notification failed:', err);
        }
      }
    } else {
      // Discord notification without waitlist
      if (process.env.DISCORD_WEBHOOK_URL) {
        try {
          await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '🪟 Window updated',
                color: 0x3b82f6,
                fields: [
                  { name: 'Opens', value: openUTC, inline: true },
                  { name: 'Closes', value: closeUTC, inline: true },
                ],
                timestamp: new Date().toISOString(),
              }],
            }),
          });
        } catch (err) {
          console.error('Discord notification failed:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      openUTC,
      closeUTC,
      waitlistNotified,
      waitlistCount,
      ...(deployWarning ? { warning: deployWarning } : {}),
    });
  } catch (error: any) {
    console.error('Admin window update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}

/**
 * Tag all BCP Waitlist Member subscribers with the notification tag.
 * Reuses the logic from notify-waitlist endpoint but inline.
 */
async function notifyWaitlistSubscribers(): Promise<{ tagged: number; failed: number; total: number }> {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.error('KIT_API_KEY not configured');
    return { tagged: 0, failed: 0, total: 0 };
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

    if (subscribers.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (allSubscribers.length === 0) {
    return { tagged: 0, failed: 0, total: 0 };
  }

  // Tag each subscriber
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

  return { tagged, failed, total: allSubscribers.length };
}

function localToUTC(localDatetime: string, timezone: string): string | null {
  try {
    // localDatetime is "2026-05-01T09:00"
    // We need to interpret this in the given timezone and convert to UTC ISO
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    // Parse the input
    const [datePart, timePart] = localDatetime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    // Create a date in UTC, then adjust for timezone offset
    // Use a trick: format a known date in the target timezone to find the offset
    const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    // Get what this UTC time looks like in the target timezone
    const parts = formatter.formatToParts(testDate);
    const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');

    // Calculate offset and adjust
    const hourDiff = tzHour - hour;
    const dayDiff = tzDay - day;

    // Adjust for timezone: if tzHour > hour, we need to subtract the difference
    const offsetMs = (hourDiff + dayDiff * 24) * 60 * 60 * 1000;
    const utcDate = new Date(testDate.getTime() - offsetMs);

    return utcDate.toISOString();
  } catch {
    return null;
  }
}
