import { NextRequest, NextResponse } from 'next/server';
import { findApplicationsNeedingAI, updateApplicationAI } from '@/lib/sheets';
import { researchChannel } from '@/lib/youtube-research';
import { routeApplicant } from '@/lib/ai-qualify';

/**
 * Backfill the AI research + routing verdict on migrated application rows.
 *
 * Phase 3 dropped ~320 rows into the Applications tab with no AI columns. The
 * YouTube API caps near ~100 channel lookups/day, so a daily scheduled task
 * drives this endpoint a small batch at a time until every row with a channel
 * has been routed.
 *
 * Finds rows where the channel URL is present but the AI Route (col W) is empty,
 * researches the channel, asks Gemini for the verdict, and writes cols Q:Y.
 *
 * Auth: x-backfill-token header (or ?token=) matching SHEETS_RPC_TOKEN, OR a
 * Vercel Cron Authorization: Bearer ${CRON_SECRET} header.
 *
 * Returns { processed, remaining, results } so the caller can loop until done.
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const token = req.headers.get('x-backfill-token') || url.searchParams.get('token') || '';
  const cronAuth = req.headers.get('authorization') || '';
  const expected = process.env.SHEETS_RPC_TOKEN;
  const cronSecret = process.env.CRON_SECRET;
  const authed =
    (!!expected && token === expected) ||
    (!!cronSecret && cronAuth === `Bearer ${cronSecret}`);
  if (!authed) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '6', 10) || 6, 1), 12);

  const rows = await findApplicationsNeedingAI(limit);
  const results: Array<Record<string, unknown>> = [];

  for (const { rowNum, record } of rows) {
    try {
      const research = await researchChannel(record.channel_url || '');
      const verdict = await routeApplicant(record, research);
      await updateApplicationAI(rowNum, {
        subscribers: research.subscriberCount,
        totalVideos: research.videoCount,
        avgViews: research.averageViews,
        cadence: research.uploadCadence,
        contentType: verdict.contentType,
        shorts: research.shortsLabel,
        route: verdict.route,
        evaluation: verdict.reasoning,
        confidence: verdict.confidence,
      });
      results.push({
        row: rowNum,
        email: record.email,
        route: verdict.route,
        resolved: research.resolved,
        subs: research.subscriberCount ?? null,
      });
    } catch (err: any) {
      results.push({ row: rowNum, email: record.email, error: String(err?.message || err) });
    }
  }

  const more = await findApplicationsNeedingAI(1);
  return NextResponse.json({ ok: true, processed: results.length, remaining: more.length > 0, results });
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
