import { NextRequest, NextResponse } from 'next/server';
import { REGISTRY, DEFAULT_DESTINATION } from '@/lib/tracking-registry';
import { appendClick, appendLivestreamClick, resolveFromRegistry } from '@/lib/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Boundless Tracking short link: /t/<code>
 *
 * Resolution order:
 *   1. The deployed REGISTRY (fast path, all baked-in program links).
 *   2. The Registry sheet at runtime, so a brand-new link works the moment its
 *      row exists, with no code push.
 *
 * Destination decides the log. A /live destination logs to the Livestream tab
 * and carries the code through as ?src=<code> so the page and signup can
 * attribute the source. Everything else logs to the program Clicks tab and
 * redirects clean. The source also rides in the bt_src cookie for 90 days.
 * Unknown codes fall back to the default (program) destination and are logged.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = (params.code || '').toLowerCase().trim();

  let destination = '';
  let videoId = '';

  if (REGISTRY[code]) {
    destination = REGISTRY[code].destination;
    videoId = REGISTRY[code].videoId;
  } else {
    try {
      const reg = await resolveFromRegistry(code);
      if (reg) {
        destination = reg.destination || DEFAULT_DESTINATION;
        videoId = reg.videoId;
      }
    } catch (err) {
      console.error('[tracking] registry lookup failed:', err);
    }
    if (!destination) destination = DEFAULT_DESTINATION;
  }

  // Precise live check on the path, so only the /live destination is treated
  // as a livestream link.
  let isLive = false;
  try {
    isLive = new URL(destination).pathname.replace(/\/+$/, '') === '/live';
  } catch {
    isLive = false;
  }

  let finalDest = destination;
  if (isLive) {
    try {
      const u = new URL(destination);
      u.searchParams.set('src', code);
      finalDest = u.toString();
    } catch {
      finalDest = destination;
    }
  }

  const clickRec = {
    code,
    videoId,
    referrer: request.headers.get('referer') || '',
    userAgent: request.headers.get('user-agent') || '',
    country: request.headers.get('x-vercel-ip-country') || '',
  };

  // Best-effort click log. Never let a logging failure break the redirect.
  try {
    if (isLive) await appendLivestreamClick(clickRec);
    else await appendClick(clickRec);
  } catch (err) {
    console.error('[tracking] click log failed:', err);
  }

  const res = NextResponse.redirect(finalDest, 302);
  res.cookies.set('bt_src', code, {
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: '/',
    sameSite: 'lax',
  });
  return res;
}
