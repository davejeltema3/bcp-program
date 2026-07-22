import { NextRequest, NextResponse } from 'next/server';

/**
 * Live stream RSVP endpoint.
 *
 * Subscribes through the Kit "Livestream RSVP" form (v3 endpoint), which runs
 * Dave's double opt-in: Kit sends the confirm email, and on confirmation it
 * applies the form's tags. Set that form to apply BOTH tags on confirm:
 *   Livestream (standing)        21355904
 *   Livestream - Aug 13 2026     21355905
 * and remove the BCP Waitlist tags the duplicated form came with.
 *
 * Form ID:     9712155
 * v3 API key:  KIT_V3_API_KEY env var, falls back to the landing-page key.
 */

const LIVESTREAM_FORM_ID = '9712155';
const KIT_V3_API_KEY_FALLBACK = '8r2gDZv9vgYKgeS4TAeKdw';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Kit form subscribe — triggers the confirm email + form tags on confirm.
    const v3Key = process.env.KIT_V3_API_KEY || KIT_V3_API_KEY_FALLBACK;
    const kitResponse = await fetch(
      `https://api.convertkit.com/v3/forms/${LIVESTREAM_FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: v3Key,
          email,
          first_name: firstName || undefined,
        }),
      },
    );

    if (!kitResponse.ok) {
      const text = await kitResponse.text();
      console.error('Kit form subscribe failed:', text);
    }

    // Optional Discord ping so Dave sees RSVPs land.
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
    title: '🎥 New Livestream RSVP',
    color: 0x3b82f6,
    fields: [
      { name: 'Name', value: firstName || '_(not provided)_', inline: true },
      { name: 'Email', value: email, inline: true },
    ],
    footer: { text: 'Live Channel Reviews — Aug 13 2026 (unconfirmed until they click the email)' },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
