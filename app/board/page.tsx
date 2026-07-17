import { cookies } from 'next/headers';
import { BOARD_COOKIE, isAuthed } from '@/lib/board-auth';
import { getBoard } from '@/lib/board';
import BoardClient from './BoardClient';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The Board — Dave's personal daily dashboard. Cookie-gated (see lib/board-auth).
export default async function BoardPage() {
  const authed = isAuthed(cookies().get(BOARD_COOKIE)?.value);
  if (!authed) return <LoginForm />;
  const board = await getBoard();
  return <BoardClient initial={board} />;
}
