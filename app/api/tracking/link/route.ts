import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getVideoSnippet, updateVideoDescription, parseVideoId } from '@/lib/youtube';
import { findByVideoId, swapLinks } from '@/lib/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Swap the plain program and /live links in a video's description for that
 * video's tracked /t links, pulled from the Registry and Livestream Registry.
 *
 * POST { token, url|videoId, apply }
 *   - token: the SHEETS_RPC_TOKEN (backend auth).
 *   - apply: false (default) returns a dry-run preview; true writes it.
 * Idempotent: a link already tracked has no plain form to match, so it's left
 * alone. Refuses to write a description over YouTube's 5000-char limit.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, url, videoId: vidIn, apply } = await request.json();
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

    const { after, liveSwapped, programSwapped } = swapLinks(before, {
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
      programSwapped,
      liveSwapped,
      changed,
      length: after.length,
      tooLong,
      applied: false,
      beforeHead: before.split('\n').slice(0, 3).join('\n'),
      afterHead: after.split('\n').slice(0, 3).join('\n'),
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
