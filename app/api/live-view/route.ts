import { NextRequest, NextResponse } from 'next/server';
import { recordLiveView } from '@/lib/livestream-sheet';

/**
 * Logs one /live page view to the hidden "Live Views" tab so the sheet can
 * count visitors without the Vercel Analytics query API. The page beacons this
 * once per browser (localStorage-guarded), so it approximates unique visitors
 * and skips bots that don't run JavaScript. Also records the source (bt_src
 * cookie) and referrer. Best-effort: never throws back to the visitor.
 */
export async function POST(request: NextRequest) {
  try {
    let referrer = '';
    try {
      const body = await request.json();
      referrer = (body && body.referrer) || '';
    } catch {
      // no body is fine
    }
    const source = request.cookies.get('bt_src')?.value || '';
    await recordLiveView(referrer, source);
  } catch (error) {
    console.error('Live view log failed:', error);
  }
  return NextResponse.json({ ok: true });
}
