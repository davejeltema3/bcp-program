/**
 * YouTube channel research for the application AI layer.
 *
 * Ported and extended from the BCA app's youtube-verify.ts. Uses native fetch
 * and the YOUTUBE_API_KEY already configured for /api/channel-stats. Returns the
 * objective facts the AI uses to route applicants (and that fill the sheet).
 */

const API_KEY = process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY;
const API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface ChannelResearch {
  resolved: boolean;
  reason?: string;
  channelTitle?: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  recentVideoCount?: number;
  averageViews?: number;
  maxViews?: number;
  uploadCadence?: string;
  shortsCount?: number;
  longCount?: number;
  shortsLabel?: string;
  recentTitles?: string[];
}

async function api(path: string, params: Record<string, string>): Promise<any> {
  const u = new URL(`${API_BASE}/${path}`);
  u.searchParams.set('key', API_KEY || '');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}`);
  return res.json();
}

function normalizeChannelUrl(raw: string): string {
  let url = (raw || '').trim().replace(/^["']|["']$/g, '');
  if (/^@[\w.-]+$/i.test(url)) return `https://www.youtube.com/${url}`;
  if (/^(www\.)?youtube\.com/i.test(url)) return `https://${url}`;
  url = url.replace(/(youtube\.com)(@)/i, '$1/$2');
  return url;
}

async function getChannelId(rawUrl: string): Promise<string | null> {
  const url = normalizeChannelUrl(rawUrl);
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'channel' && parts[1]) return parts[1];
  if (parts[0] && parts[0].startsWith('@')) {
    const res = await api('channels', { part: 'id', forHandle: parts[0] });
    return res.items?.[0]?.id || null;
  }
  if (parts[0] === 'user' && parts[1]) {
    const res = await api('channels', { part: 'id', forUsername: parts[1] });
    return res.items?.[0]?.id || null;
  }
  if (parts[0] === 'c' && parts[1]) {
    const res = await api('search', { part: 'snippet', type: 'channel', q: parts[1], maxResults: '1' });
    return res.items?.[0]?.snippet?.channelId || null;
  }
  if (parts[0]) {
    const res = await api('channels', { part: 'id', forHandle: '@' + parts[0].replace(/^@/, '') });
    return res.items?.[0]?.id || null;
  }
  return null;
}

function parseISODuration(iso: string): number {
  const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1] || '0', 10) * 3600 + parseInt(m[2] || '0', 10) * 60 + parseInt(m[3] || '0', 10);
}

export async function researchChannel(channelUrl: string): Promise<ChannelResearch> {
  if (!API_KEY) return { resolved: false, reason: 'No YouTube API key' };
  try {
    const channelId = await getChannelId(channelUrl);
    if (!channelId) return { resolved: false, reason: 'Could not resolve channel from URL' };

    const ch = await api('channels', { part: 'snippet,statistics', id: channelId });
    const item = ch.items?.[0];
    const snip = item?.snippet || {};
    const stats = item?.statistics || {};
    const subscriberCount = parseInt(stats.subscriberCount || '0', 10);
    const videoCount = parseInt(stats.videoCount || '0', 10);

    const search = await api('search', { channelId, part: 'snippet', type: 'video', order: 'date', maxResults: '50' });
    const sItems = (search.items || []) as any[];
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const recent = sItems.filter((i) => new Date(i.snippet.publishedAt).getTime() > cutoff);
    const recentVideoCount = recent.length;
    const recentTitles = sItems.slice(0, 12).map((i) => i.snippet.title);

    let averageViews: number | undefined;
    let maxViews: number | undefined;
    let shortsCount = 0;
    let longCount = 0;
    const ids = sItems.map((i) => i.id?.videoId).filter(Boolean).join(',');
    if (ids) {
      const vids = await api('videos', { part: 'contentDetails,statistics', id: ids });
      const vItems = (vids.items || []) as any[];
      const views = vItems.map((v) => parseInt(v.statistics?.viewCount || '0', 10));
      if (views.length) {
        maxViews = Math.max(...views);
        averageViews = Math.round(views.reduce((a, b) => a + b, 0) / views.length);
      }
      for (const v of vItems) {
        const dur = parseISODuration(v.contentDetails?.duration || '');
        if (dur > 0 && dur <= 60) shortsCount++;
        else if (dur > 60) longCount++;
      }
    }

    let uploadCadence: string;
    if (recent.length >= 2) {
      const dates = recent.map((i) => new Date(i.snippet.publishedAt).getTime()).sort((a, b) => a - b);
      const spanDays = (dates[dates.length - 1] - dates[0]) / (24 * 60 * 60 * 1000);
      const perMonth = spanDays > 0 ? (recent.length / spanDays) * 30 : recent.length;
      uploadCadence = perMonth >= 4 ? `~${Math.round(perMonth)}/month (weekly+)`
        : perMonth >= 1 ? `~${Math.round(perMonth)}/month`
        : `~${perMonth.toFixed(1)}/month (sporadic)`;
    } else {
      uploadCadence = recent.length === 1 ? '1 in last 6 months' : 'none in last 6 months';
    }

    const total = shortsCount + longCount;
    const shortsLabel = total === 0 ? undefined
      : shortsCount > longCount * 1.5 ? 'Mostly shorts'
      : longCount > shortsCount * 1.5 ? 'Mostly long-form'
      : 'Mix of both';

    return {
      resolved: true,
      channelTitle: snip.title,
      description: snip.description,
      subscriberCount, videoCount, recentVideoCount,
      averageViews, maxViews, uploadCadence,
      shortsCount, longCount, shortsLabel, recentTitles,
    };
  } catch (err: any) {
    console.error('Channel research error:', err.message || err);
    return { resolved: false, reason: err.message || 'research error' };
  }
}
