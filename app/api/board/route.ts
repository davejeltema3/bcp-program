import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BOARD_COOKIE, isAuthed } from '@/lib/board-auth';
import {
  getBoard,
  setChecked,
  markNotificationsSeen,
  addItem,
  removeItem,
} from '@/lib/board';

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

  switch (body.action) {
    case 'toggle': {
      const ok = await setChecked(String(body.id || ''), !!body.checked);
      return NextResponse.json({ ok });
    }
    case 'markSeen': {
      const ts = await markNotificationsSeen();
      return NextResponse.json({ ok: true, ts });
    }
    case 'add': {
      const text = String(body.text || '').trim();
      if (!text) return NextResponse.json({ ok: false, error: 'empty text' }, { status: 400 });
      const id = await addItem(
        String(body.section || 'today'),
        String(body.group || ''),
        text,
        String(body.tag || ''),
      );
      return NextResponse.json({ ok: true, id });
    }
    case 'remove': {
      const ok = await removeItem(String(body.id || ''));
      return NextResponse.json({ ok });
    }
    default:
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
  }
}
