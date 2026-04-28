import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint to change the live checkout mode and redeploy.
 *
 * POST /api/admin/checkout-mode
 * Body: { secret, mode: 'one-time' | 'subscription' | 'both' }
 *
 * Updates NEXT_PUBLIC_ENABLE_SUBSCRIPTION and NEXT_PUBLIC_CHECKOUT_MODE
 * env vars via Vercel API, then triggers a production redeploy.
 *
 * Mode mapping:
 *   'one-time'     → ENABLE_SUBSCRIPTION=false, CHECKOUT_MODE=one-time
 *   'subscription'  → ENABLE_SUBSCRIPTION=true,  CHECKOUT_MODE=subscription
 *   'both'          → ENABLE_SUBSCRIPTION=true,  CHECKOUT_MODE=both
 */
export async function POST(request: NextRequest) {
  try {
    const { secret, mode } = await request.json();

    // Auth
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!['one-time', 'subscription', 'both'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Must be one-time, subscription, or both.' }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) {
      return NextResponse.json({ error: 'Vercel API not configured' }, { status: 500 });
    }

    // Determine env var values
    const enableSubscription = mode !== 'one-time' ? 'true' : 'false';

    const envVars = [
      { key: 'NEXT_PUBLIC_ENABLE_SUBSCRIPTION', value: enableSubscription },
      { key: 'NEXT_PUBLIC_CHECKOUT_MODE', value: mode },
    ];

    // Update each env var
    for (const env of envVars) {
      const listRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env?key=${env.key}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );

      const listData = await listRes.json();
      const existing = listData.envs?.find((e: any) => e.key === env.key);

      if (existing) {
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
    let deployWarning: string | undefined;
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
      deployWarning = 'Env vars updated but auto-redeploy failed. Push a commit or redeploy manually.';
    }

    // Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        const modeLabels: Record<string, string> = {
          'one-time': '💳 One-Time Only ($999)',
          'subscription': '🔄 Subscription Only ($999/quarter)',
          'both': '💳🔄 Both Options',
        };
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '🛒 Checkout mode updated',
              color: 0x3b82f6,
              description: `Live checkout mode changed to: **${modeLabels[mode]}**`,
              fields: [
                { name: 'CHECKOUT_MODE', value: mode, inline: true },
                { name: 'ENABLE_SUBSCRIPTION', value: enableSubscription, inline: true },
              ],
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
      mode,
      enableSubscription,
      ...(deployWarning ? { warning: deployWarning } : {}),
    });
  } catch (error: any) {
    console.error('Checkout mode update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}
