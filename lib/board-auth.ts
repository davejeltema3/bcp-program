/**
 * Board auth. Cookie-based so the URL stays clean (nothing to leak on a stream
 * or screenshot). The password is your existing ADMIN_SECRET. On a correct
 * password the login route sets an httpOnly cookie whose value is a hash of the
 * secret, so the cookie can't be forged and the secret never rides in the URL.
 */
import { createHash } from 'crypto';

export const BOARD_COOKIE = 'bc_board';

/** The expected cookie value, derived from ADMIN_SECRET. Null if not configured. */
export function expectedCookie(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  return createHash('sha256').update(`${secret}:boundless-board:v1`).digest('hex');
}

export function isAuthed(cookieValue: string | undefined | null): boolean {
  const exp = expectedCookie();
  return !!exp && cookieValue === exp;
}
