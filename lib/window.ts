/**
 * Purchase window configuration.
 * 
 * Set via environment variables:
 *   NEXT_PUBLIC_WINDOW_OPEN  — ISO timestamp (e.g. "2026-05-01T13:00:00.000Z" = 9 AM EST)
 *   NEXT_PUBLIC_WINDOW_CLOSE — ISO timestamp (e.g. "2026-05-04T04:00:00.000Z" = midnight EST May 3)
 * 
 * These are baked into the client build (NEXT_PUBLIC_) so the countdown timer works.
 * The server-side checkout API also reads them to enforce the window.
 * 
 * To update: change env vars in Vercel dashboard → redeploy (takes ~15 seconds).
 * Or use the /preview admin page if ADMIN_SECRET is configured.
 */

export interface WindowConfig {
  open: Date;
  close: Date;
}

export function getWindowConfig(): WindowConfig | null {
  const openStr = process.env.NEXT_PUBLIC_WINDOW_OPEN;
  const closeStr = process.env.NEXT_PUBLIC_WINDOW_CLOSE;

  if (!openStr || !closeStr) return null;

  const open = new Date(openStr);
  const close = new Date(closeStr);

  if (isNaN(open.getTime()) || isNaN(close.getTime())) return null;

  return { open, close };
}

export type WindowState = 'before' | 'open' | 'after';

export function getWindowState(config: WindowConfig | null): WindowState {
  if (!config) return 'open'; // No window configured = always open

  const now = new Date();
  if (now < config.open) return 'before';
  if (now > config.close) return 'after';
  return 'open';
}

export function getTimeUntil(target: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const total = Math.max(0, target.getTime() - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}
