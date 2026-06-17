/**
 * Auto-updating marketing numbers.
 *
 * These change over time WITHOUT a code push:
 *   - yearsOnYouTube() recomputes from the anchor date every render.
 *   - the subscriber count is fetched live (and cached) via /api/channel-stats.
 *
 * The only thing that needs a push is changing the anchors below.
 */

// Dave started making YouTube content around January 2011. This reads 15 in
// 2026 and bumps by one every January 25th. If the true first year is
// different, change ANCHOR_YEAR (e.g. 2010 makes it read one higher).
const ANCHOR_YEAR = 2011;
const ANNIVERSARY_MONTH = 1; // January
const ANNIVERSARY_DAY = 25;

export function yearsOnYouTube(now: Date = new Date()): number {
  let years = now.getFullYear() - ANCHOR_YEAR;
  const month = now.getMonth() + 1;
  const passedAnniversary =
    month > ANNIVERSARY_MONTH ||
    (month === ANNIVERSARY_MONTH && now.getDate() >= ANNIVERSARY_DAY);
  if (!passedAnniversary) years -= 1;
  return years;
}

// The channel the live subscriber count is read from. This is Dave's main
// channel. Note: @boundlesscreator is a different (tiny) channel someone took
// before the brand existed, so do not use that handle here.
export const YOUTUBE_HANDLE = 'davejeltema3';

// Shown if the live count can't be fetched (e.g. API key missing or YouTube
// down). Keep this roughly current so the page never looks stale.
export const SUBSCRIBER_FALLBACK = 70000;

// Safety floor. If the API ever returns a count below this (wrong channel,
// parse glitch, etc.), the page uses the fallback instead of printing it.
export const SUBSCRIBER_MIN_PLAUSIBLE = 1000;

// 72345 -> { value: "72", suffix: "K" }; 1_500_000 -> { value: "1.5", suffix: "M" }.
// Floors so the displayed number never overstates the real count.
export function formatSubscribers(count: number): { value: string; suffix: string } {
  if (count >= 1_000_000) {
    return { value: (Math.floor(count / 100_000) / 10).toString(), suffix: 'M' };
  }
  if (count >= 1_000) {
    return { value: Math.floor(count / 1000).toString(), suffix: 'K' };
  }
  return { value: count.toString(), suffix: '' };
}
