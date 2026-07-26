import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getVideoSnippet, updateVideoDescription, parseVideoId } from '@/lib/youtube';
import {
  findByVideoId,
  readAllRegistryCodes,
  mintCode,
  appendRegistryRow,
  normalizePromo,
} from '@/lib/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = 'https://bcp.boundlesscreator.com';

/**
 * Paste-a-URL registrar. One call takes a video URL and guarantees its
 * description carries both tracked promo links, in canonical order, with a blank
 * line before the rest — minting registry rows for anything not seen before.
 *
 * POST { key, url|videoId, apply }
 *   - key: the ADMIN_SECRET (same one that unlocks the /tracking dashboard).
 *   - apply: true (default) writes the description; false is a dry run.
 *
 * No need to pre-add the plain links: this adds a missing line and replaces an
 * existing one, so re-pasting is safe and converges to the same result.
 */
export async function POST(request: NextRequest) {
  try {
    const { key, url, videoId: vidIn, apply = true } = await request.json();
    if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const videoId = parseVideoId(vidIn || url || '');
    if (!videoId) {
      return NextResponse.json({ ok: false, error: 'could not parse a video id from that input' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const snippet = await getVideoSnippet(videoId, accessToken);
    const before = snippet.description || '';
    const title = snippet.title || '';
    const published = (snippet.publishedAt || '').slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    // Existing rows (retry-backed, so a throttled read fails loudly rather than
    // masquerading as "not registered" and minting a duplicate).
    const prog = await findByVideoId(videoId, 'Registry');
    const live = await findByVideoId(videoId, 'Livestream Registry');

    let programCode = prog?.code || null;
    let liveCode = live?.code || null;
    let programCreated = false;
    let liveCreated = false;

    // Every video gets both links, so mint whatever isn't already registered.
    if (!liveCode || !programCode) {
      const existing = await readAllRegistryCodes();

      if (!liveCode) {
        liveCode = mintCode(existing);
        existing.add(liveCode);
        await appendRegistryRow('Livestream Registry', {
          code: liveCode,
          videoId,
          title,
          published,
          destination: `${ROOT}/live`,
          createdDate: today,
          activatedIso: nowIso,
        });
        liveCreated = true;
      }
      if (!programCode) {
        programCode = mintCode(existing);
        existing.add(programCode);
        await appendRegistryRow('Registry', {
          code: programCode,
          videoId,
          title,
          published,
          destination: `${ROOT}/`,
          createdDate: today,
          activatedIso: nowIso,
        });
        programCreated = true;
      }
    }

    const after = normalizePromo(before, { liveCode, programCode });
    const changed = after !== before;
    const tooLong = after.length > 5000;

    let applied = false;
    if (apply && changed && !tooLong) {
      await updateVideoDescription(videoId, snippet, after, accessToken);
      applied = true;
    }

    return NextResponse.json({
      ok: true,
      videoId,
      title,
      programCode,
      liveCode,
      programCreated,
      liveCreated,
      changed,
      tooLong,
      applied,
      length: after.length,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
