/**
 * Boundless Tracking — code to video/destination registry.
 *
 * The human-facing source of truth is the "Registry" tab in the Boundless
 * Tracking Sheet. This file is the deployed copy the redirect route resolves
 * against (fast, no I/O). To add a video: add a row to the Sheet AND a line
 * here, then push. Unknown codes still redirect to DEFAULT_DESTINATION and get
 * logged, so a new link works even before its registry line is deployed.
 */

export interface TrackedLink {
  videoId: string;
  title: string;
  destination: string;
}

export const DEFAULT_DESTINATION = 'https://bcp.boundlesscreator.com/';

export const REGISTRY: Record<string, TrackedLink> = {
  'fulltime-income': {
    videoId: 'dm7ahnQtZ84',
    title: 'Turn YouTube Into Full-Time Income Without the Guesswork (My Program)',
    destination: DEFAULT_DESTINATION,
  },
  'easier-than-think': {
    videoId: 'yVnUsL1cnzw',
    title: 'Growing on YouTube Is Easier Than You Think',
    destination: DEFAULT_DESTINATION,
  },
  '1000hrs-19min': {
    videoId: 'm63VSyZiEsA',
    title: '1,000+ Hours of YouTube Knowledge in 19 Minutes',
    destination: DEFAULT_DESTINATION,
  },
  '106k-first-year': {
    videoId: 'JtolbefPUtg',
    title: 'How I Made $106K in My First Year on YouTube (Without Going Viral)',
    destination: DEFAULT_DESTINATION,
  },
  'cowork-workflow': {
    videoId: 'oIJRBvGLKgw',
    title: 'Claude Cowork Just Replaced 99% Of My YouTube Workflow',
    destination: DEFAULT_DESTINATION,
  },
  'ai-slop': {
    videoId: 'pbSb2m3FxJc',
    title: 'The Real Reason AI Slop Is Winning',
    destination: DEFAULT_DESTINATION,
  },
  '7-rules-win': {
    videoId: 'IF7-cQ8hMk0',
    title: 'YouTube Is Hard Until You Play It Like This (7 Rules to Win)',
    destination: DEFAULT_DESTINATION,
  },
  'die-before-filmed': {
    videoId: 'BmxdtYVfDfg',
    title: "Most YouTube Videos Die Before They're Filmed",
    destination: DEFAULT_DESTINATION,
  },
  'valley-of-death': {
    videoId: 'aOsNR48F5R4',
    title: 'The Valley Of Death Every YouTuber Has To Cross',
    destination: DEFAULT_DESTINATION,
  },
  '113-channels': {
    videoId: 'l7vEZISBtmg',
    title: 'I Reviewed 113 Channels. They ALL Made the Same 7 Mistakes.',
    destination: DEFAULT_DESTINATION,
  },
};

export function resolveCode(code: string): TrackedLink {
  return (
    REGISTRY[code] || { videoId: '', title: '', destination: DEFAULT_DESTINATION }
  );
}
