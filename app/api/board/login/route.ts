import { NextRequest, NextResponse } from 'next/server';
import { BOARD_COOKIE, expectedCookie } from '@/lib/board-auth';

export const runtime = 'nodejs';

// POST { password } -> sets the httpOnly board cookie on a correct password.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const secret = process.env.ADMIN_SECRET || '';
  const exp = expectedCookie();
  if (!secret || !exp) {
    return NextResponse.json({ ok: false, error: 'ADMIN_SECRET not set' }, { status: 500 });
  }
  if ((body.password || '') !== secret) {
    return NextResponse.json({ ok: false, error: 'wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(BOARD_COOKIE, exp, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });
  return res;
}

// DELETE -> log out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BOARD_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
