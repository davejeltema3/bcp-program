import { NextResponse } from 'next/server';
import { YOUTUBE_HANDLE, SUBSCRIBER_FALLBACK } from '@/lib/site-stats';

/**
 * Live subscriber count for the marketing pages.
 *
 * Cached so YouTube is not hit on every page view. The route revalidates at
 * most once every 6 hours, and the upstream fetch is cached the same way, so
 * the number updates on its own without any code push.
 *
 * Requires YOUTUBE_API_KEY in env (a YouTube Data API v3 key). If it is
 * missing or the call fails, the page falls back to SUBSCRIBER_FALLBACK.
 */
export const revalidate = 21600; // 6 hours

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ subscriberCount: SUBSCRIBER_FALLBACK, live: false });
  }

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=statistics` +
      `&forHandle=${encodeURIComponent(YOUTUBE_HANDLE)}&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    const data = await res.json();
    const count = Number(data?.items?.[0]?.statistics?.subscriberCount);

    if (!count || isNaN(count)) {
      return NextResponse.json({ subscriberCount: SUBSCRIBER_FALLBACK, live: false });
    }
    return NextResponse.json({ subscriberCount: count, live: true });
  } catch {
    return NextResponse.json({ subscriberCount: SUBSCRIBER_FALLBACK, live: false });
  }
}
