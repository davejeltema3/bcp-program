import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getVideoSnippet, updateVideoDescription, parseVideoId } from '@/lib/youtube';
import {
  findByVideoId,
  readAllRegistryCodes,
  ensureMagnetsTracked,
  normalizePromo,
} from '@/lib/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Normalize a video's promo block to the canonical two-line form with its
 * tracked /t links (Registry = program, Livestream Registry = live). Backend
 * counterpart of the paste button, gated by SHEETS_RPC_TOKEN for bulk runs.
 * For program/live it uses whatever codes already exist (no minting). Pass
 * `magnets: true` to also detect + track lead-magnet links (which does mint a
 * Lead Magnet Registry row per new video-magnet pair).
 *
 * POST { token, url|videoId, apply, magnets }
 *   - token: the SHEETS_RPC_TOKEN (backend auth).
 *   - apply: false (default) returns a dry-run preview; true writes it.
 *   - magnets: false (default) skips magnet detection.
 * Idempotent: a description already in canonical form maps to itself.
 * Refuses to write a description over YouTube's 5000-char limit.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, url, videoId: vidIn, apply, magnets: doMagnets } = await request.json();
    if (!process.env.SHEETS_RPC_TOKEN || token !== process.env.SHEETS_RPC_TOKEN) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const videoId = parseVideoId(vidIn || url || '');
    if (!videoId) {
      return NextResponse.json({ ok: false, error: 'could not parse a video id' }, { status: 400 });
    }

    const prog = await findByVideoId(videoId, 'Registry');
    const live = await findByVideoId(videoId, 'Livestream Registry');

    const accessToken = await getAccessToken();
    const snippet = await getVideoSnippet(videoId, accessToken);
    const before = snippet.description || '';

    let working = before;
    let magnets: { name: string; code: string; created: boolean }[] = [];
    if (doMagnets) {
      const existing = await readAllRegistryCodes();
      const now = new Date().toISOString();
      const res = await ensureMagnetsTracked(before, {
        videoId,
        title: snippet.title || '',
        published: (snippet.publishedAt || '').slice(0, 10),
        today: now.slice(0, 10),
        nowIso: now,
        existingCodes: existing,
      });
      working = res.after;
      magnets = res.magnets;
    }

    const after = normalizePromo(working, {
      programCode: prog?.code,
      liveCode: live?.code,
    });

    const changed = after !== before;
    const tooLong = after.length > 5000;
    const result: any = {
      ok: true,
      videoId,
      title: snippet.title,
      programCode: prog?.code || null,
      liveCode: live?.code || null,
      magnets,
      changed,
      length: after.length,
      tooLong,
      applied: false,
      beforeHead: before.split('\n').slice(0, 6).join('\n'),
      afterHead: after.split('\n').slice(0, 6).join('\n'),
    };

    if (apply && changed && !tooLong) {
      await updateVideoDescription(videoId, snippet, after, accessToken);
      result.applied = true;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
