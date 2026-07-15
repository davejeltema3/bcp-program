import { NextRequest, NextResponse } from 'next/server';
import { resolveCode } from '@/lib/tracking-registry';
import { appendClick } from '@/lib/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Boundless Tracking short link: /t/<code>
 *
 * Logs the click, sets a first-party source cookie (bt_src), and 302-redirects
 * to the video's destination with UTM params appended. Unknown codes fall back
 * to the default destination and are still logged.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = (params.code || '').toLowerCase().trim();
  const link = resolveCode(code);

  // Append UTM params to the destination (any existing query is preserved).
  const dest = new URL(link.destination);
  dest.searchParams.set('utm_source', 'youtube');
  dest.searchParams.set('utm_medium', 'video');
  dest.searchParams.set('utm_campaign', code);

  // Best-effort click log. Never let a logging failure break the redirect.
  try {
    await appendClick({
      code,
      videoId: link.videoId,
      referrer: request.headers.get('referer') || '',
      userAgent: request.headers.get('user-agent') || '',
      country: request.headers.get('x-vercel-ip-country') || '',
    });
  } catch (err) {
    console.error('[tracking] click log failed:', err);
  }

  const res = NextResponse.redirect(dest.toString(), 302);
  res.cookies.set('bt_src', code, {
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: '/',
    sameSite: 'lax',
  });
  return res;
}
