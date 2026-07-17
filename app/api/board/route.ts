import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BOARD_COOKIE, isAuthed } from '@/lib/board-auth';
import { getBoard, setChecked, markNotificationsSeen } from '@/lib/board';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authed(): boolean {
  return isAuthed(cookies().get(BOARD_COOKIE)?.value);
}

export async function GET() {
  if (!authed()) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const board = await getBoard();
  return NextResponse.json({ ok: true, board });
}

export async function POST(req: NextRequest) {
  if (!authed()) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  if (body.action === 'toggle') {
    const ok = await setChecked(String(body.id || ''), !!body.checked);
    return NextResponse.json({ ok });
  }
  if (body.action === 'markSeen') {
    const ts = await markNotificationsSeen();
    return NextResponse.json({ ok: true, ts });
  }
  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
}
