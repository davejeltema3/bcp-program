/**
 * Minimal YouTube Data API client for editing your own video descriptions.
 * Uses the OAuth refresh token stored in Vercel env (YT_CLIENT_ID /
 * YT_CLIENT_SECRET / YT_REFRESH_TOKEN), scope youtube.force-ssl.
 *
 * The update call is deliberate about passing the whole snippet back. YouTube's
 * videos.update wipes title/categoryId if they're omitted, so we always send
 * them (plus tags and language) and change only the description.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

/**
 * fetch with retry on rate-limit / server errors. Google's OAuth and Data API
 * both throttle under bursts (429) and occasionally 5xx. A single paste should
 * heal itself rather than surface a transient blip, so we retry those with
 * jittered backoff. 4xx other than 429 are returned as-is (real client errors).
 */
async function fetchWithRetry(url: string, init: RequestInit, attempts = 4): Promise<Response> {
  let last: Response | undefined;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, init);
    if (res.ok || (res.status !== 429 && res.status < 500)) return res;
    last = res;
    if (i < attempts - 1) {
      const backoff = 400 * Math.pow(2, i) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  return last as Response;
}

export async function getAccessToken(): Promise<string> {
  const res = await fetchWithRetry(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID || '',
      client_secret: process.env.YT_CLIENT_SECRET || '',
      refresh_token: process.env.YT_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });
  const j: any = await res.json();
  if (!j.access_token) throw new Error('YouTube token refresh failed: ' + JSON.stringify(j));
  return j.access_token as string;
}

export interface VideoSnippet {
  title: string;
  description: string;
  categoryId: string;
  publishedAt?: string; // read-only; used to stamp the registry, never sent back on update
  tags?: string[];
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

export async function getVideoSnippet(videoId: string, accessToken: string): Promise<VideoSnippet> {
  const res = await fetchWithRetry(`${VIDEOS_URL}?part=snippet&id=${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j: any = await res.json();
  const item = j.items?.[0];
  if (!item) throw new Error('Video not found or not accessible: ' + videoId);
  return item.snippet as VideoSnippet;
}

export async function updateVideoDescription(
  videoId: string,
  snippet: VideoSnippet,
  newDescription: string,
  accessToken: string,
): Promise<void> {
  const body = {
    id: videoId,
    snippet: {
      title: snippet.title,
      categoryId: snippet.categoryId,
      description: newDescription,
      ...(snippet.tags ? { tags: snippet.tags } : {}),
      ...(snippet.defaultLanguage ? { defaultLanguage: snippet.defaultLanguage } : {}),
      ...(snippet.defaultAudioLanguage ? { defaultAudioLanguage: snippet.defaultAudioLanguage } : {}),
    },
  };
  const res = await fetchWithRetry(`${VIDEOS_URL}?part=snippet`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YouTube update failed ${res.status}: ${t}`);
  }
}

/** Extract a YouTube video id from a URL or a bare id. */
export function parseVideoId(input: string): string | null {
  const s = (input || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.findIndex((p) => p === 'shorts' || p === 'embed' || p === 'live');
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
  } catch {
    // fall through
  }
  return null;
}
