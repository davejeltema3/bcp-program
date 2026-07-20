import { NextRequest, NextResponse } from 'next/server';
import { findMembersToRevoke, markAccessRevoked } from '@/lib/sheets';

/**
 * Daily job: revoke Discord access for members who were refunded more than 24h
 * ago. Removes their BCP/BCA Member role and adds the "Former Member" role,
 * which drops them to a single "membership-ended" channel (see the Guild setup)
 * and hides the member area. Cohort tags and other cosmetic roles are left
 * intact. Idempotent via the Cancelled Date column on the sheet.
 *
 * Driven by Vercel Cron (see vercel.json). Auth: a Vercel Cron
 * `Authorization: Bearer ${CRON_SECRET}` header, OR a manual call with
 * ?token= / x-revoke-token matching SHEETS_RPC_TOKEN.
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const GUILD_ID = '1470652210038968466';
const FORMER_MEMBER_ROLE_ID = '1528836700153974944';

// Access roles stripped on revoke. Per Dave, only BCP Member and BCA Member
// gate member-channel access, so those are what get pulled. Cohort tags and
// Founding Member are cosmetic and left intact as a record of when they joined.
// (Note: Guest and Alumni currently also grant channel access on the server. If
// a future refunded member holds one of those, add its ID here to be airtight.)
const ROLES_TO_REMOVE = [
  '1472422223972270260', // BCP Member
  '1526616166473404596', // BCA Member
];

const DISCORD = 'https://discord.com/api/v10';

async function dfetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DISCORD}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://boundlesscreator.com, 1.0)',
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function discordNotify(embed: Record<string, any>) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

/**
 * Swap a member to Former Member: keep any roles we don't manage, drop the
 * membership/cohort roles, add Former Member. One PATCH applies the final set.
 */
async function revokeDiscord(userId: string): Promise<{ ok: boolean; note: string }> {
  const m = await dfetch(`/guilds/${GUILD_ID}/members/${userId}`);
  if (m.status === 404) return { ok: false, note: 'not in server' };
  if (m.status !== 200) return { ok: false, note: `member fetch ${m.status}` };

  const current: string[] = m.body?.roles || [];
  const kept = current.filter((r) => !ROLES_TO_REMOVE.includes(r));
  if (!kept.includes(FORMER_MEMBER_ROLE_ID)) kept.push(FORMER_MEMBER_ROLE_ID);

  const upd = await dfetch(`/guilds/${GUILD_ID}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ roles: kept }),
  });
  if (upd.status === 200 || upd.status === 204) return { ok: true, note: 'roles swapped' };
  return { ok: false, note: `patch ${upd.status}: ${upd.body?.message || ''}` };
}

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const token = req.headers.get('x-revoke-token') || url.searchParams.get('token') || '';
  const cronAuth = req.headers.get('authorization') || '';
  const expected = process.env.SHEETS_RPC_TOKEN;
  const cronSecret = process.env.CRON_SECRET;
  const authed =
    (!!expected && token === expected) ||
    (!!cronSecret && cronAuth === `Bearer ${cronSecret}`);
  if (!authed) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  if (!process.env.DISCORD_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'DISCORD_BOT_TOKEN not set' }, { status: 500 });
  }

  const targets = await findMembersToRevoke(24);
  const results: Array<Record<string, unknown>> = [];

  for (const t of targets) {
    const r = await revokeDiscord(t.discordUserId);
    // Stamp as done if the swap worked, or if they already left the server, so
    // we don't retry those forever. Real failures are left for the next run.
    if (r.ok || r.note === 'not in server') {
      await markAccessRevoked(t.rowNum);
    }
    results.push({ email: t.email, name: t.name, ...r });
  }

  if (results.length > 0) {
    try {
      await discordNotify({
        title: '🔒 Access Revoked (post-refund)',
        color: 0x9ca3af,
        description: results
          .map((x: any) => `${x.name || x.email}: ${x.ok ? '✅' : '⚠️'} ${x.note}`)
          .join('\n'),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('revoke-access notify failed:', err);
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
