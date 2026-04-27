import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint to update the purchase window.
 * Updates NEXT_PUBLIC_WINDOW_OPEN and NEXT_PUBLIC_WINDOW_CLOSE env vars
 * via the Vercel API, then triggers a redeploy.
 *
 * Requires: ADMIN_SECRET, VERCEL_TOKEN, VERCEL_PROJECT_ID in env vars.
 */
export async function POST(request: NextRequest) {
  try {
    const { secret, openDate, closeDate, timezone } = await request.json();

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

    if (!deployRes.ok) {
      const err = await deployRes.text();
      console.error('Redeploy failed:', err);
      // Env vars were still updated — they'll take effect on next deploy
      return NextResponse.json({
        success: true,
        openUTC,
        closeUTC,
        warning: 'Env vars updated but auto-redeploy failed. Push a commit or manually redeploy in Vercel dashboard.',
      });
    }

    return NextResponse.json({ success: true, openUTC, closeUTC });
  } catch (error: any) {
    console.error('Admin window update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
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
