import { NextRequest, NextResponse } from 'next/server';
import { appendLivestreamRegistrant } from '@/lib/livestream-sheet';

/**
 * Live stream RSVP endpoint — frictionless (single opt-in), Jay-style.
 *
 * Creates the subscriber active via Kit v4 (no confirm step), tags them with
 * the standing "Livestream" tag and the per-event tag, and enrolls them in the
 * welcome sequence. Also records the registrant in the sheet with their source,
 * read from the bt_src cookie that the /t redirect sets (falls back to the
 * referrer host), so a signup carries which video or link it came from.
 *
 * Tag IDs are hardcoded as fallbacks so no new Vercel env var is required.
 *   Livestream (standing):        21355904
 *   Livestream - Aug 13 2026:     21355905
 */

const KIT_TAG_LIVESTREAM = process.env.KIT_TAG_LIVESTREAM || '21355904';
const KIT_TAG_LIVESTREAM_EVENT = process.env.KIT_TAG_LIVESTREAM_EVENT || '21355905';
const KIT_SEQUENCE_WELCOME = process.env.KIT_SEQUENCE_LIVESTREAM || '2835892';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Source: the tracking code from the bt_src cookie, else the referrer host.
    let source = request.cookies.get('bt_src')?.value || '';
    if (!source) {
      const referer = request.headers.get('referer') || '';
      if (referer) {
        try {
          source = new URL(referer).hostname.replace(/^www\./, '');
        } catch {
          source = '';
        }
      }
    }

    const apiKey = process.env.KIT_API_KEY;
    if (apiKey) {
      await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
        body: JSON.stringify({
          email_address: email,
          ...(firstName ? { first_name: firstName } : {}),
        }),
      }).catch(() => {});

      for (const tagId of [KIT_TAG_LIVESTREAM, KIT_TAG_LIVESTREAM_EVENT]) {
        await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
          body: JSON.stringify({ email_address: email }),
        }).catch(() => {});
      }

      await fetch(`https://api.kit.com/v4/sequences/${KIT_SEQUENCE_WELCOME}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
        body: JSON.stringify({ email_address: email }),
      }).catch(() => {});
    }

    // Record the registrant in the sheet (best-effort, never blocks the RSVP).
    try {
      await appendLivestreamRegistrant(email, firstName, source);
    } catch (error) {
      console.error('Livestream registrant sheet write failed:', error);
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendRsvpNotification(firstName, email, source);
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Live RSVP error:', error);
    return NextResponse.json({ success: true });
  }
}

async function sendRsvpNotification(
  firstName: string | undefined,
  email: string,
  source: string,
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const embed = {
    title: '🎥 New Livestream Registration',
    color: 0x3b82f6,
    fields: [
      { name: 'Name', value: firstName || '_(not provided)_', inline: true },
      { name: 'Email', value: email, inline: true },
      { name: 'Source', value: source || '_(direct)_', inline: true },
    ],
    footer: { text: 'Live Channel Reviews — Aug 13 2026' },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
