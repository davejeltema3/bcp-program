import { NextRequest, NextResponse } from 'next/server';
import { appendLivestreamRegistrant } from '@/lib/livestream-sheet';

/**
 * Live stream RSVP endpoint — frictionless (single opt-in), Jay-style.
 *
 * Uses the Kit v4 API to create the subscriber as ACTIVE immediately (no
 * confirm-your-email step), then tags them with the standing "Livestream" tag
 * and the per-event tag. The welcome / calendar / question emails run off
 * those tags as a Kit sequence; the fixed-date reminders run as scheduled
 * broadcasts to the event tag.
 *
 * Also writes the registrant to the "Livestream Reviews" tab so they show up
 * in the sheet before they ever submit a channel. When they later submit, the
 * review lands in that same row (matched by email).
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

    const apiKey = process.env.KIT_API_KEY;
    if (apiKey) {
      // 1. Create/update subscriber as active (v4 API = single opt-in).
      await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
        body: JSON.stringify({
          email_address: email,
          ...(firstName ? { first_name: firstName } : {}),
        }),
      }).catch(() => {});

      // 2. Tag: standing Livestream + this specific event.
      for (const tagId of [KIT_TAG_LIVESTREAM, KIT_TAG_LIVESTREAM_EVENT]) {
        await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
          body: JSON.stringify({ email_address: email }),
        }).catch(() => {});
      }

      // 3. Enroll in the welcome sequence (You're in -> Calendar -> Question).
      await fetch(`https://api.kit.com/v4/sequences/${KIT_SEQUENCE_WELCOME}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
        body: JSON.stringify({ email_address: email }),
      }).catch(() => {});
    }

    // 4. Record the registrant in the sheet (best-effort, never blocks the RSVP).
    try {
      await appendLivestreamRegistrant(email, firstName);
    } catch (error) {
      console.error('Livestream registrant sheet write failed:', error);
    }

    // 5. Optional Discord ping so Dave sees registrations land.
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendRsvpNotification(firstName, email);
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Live RSVP error:', error);
    // Graceful degradation — never expose internal failures to the visitor.
    return NextResponse.json({ success: true });
  }
}

async function sendRsvpNotification(
  firstName: string | undefined,
  email: string,
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const embed = {
    title: '🎥 New Livestream Registration',
    color: 0x3b82f6,
    fields: [
      { name: 'Name', value: firstName || '_(not provided)_', inline: true },
      { name: 'Email', value: email, inline: true },
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
