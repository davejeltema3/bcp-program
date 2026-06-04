import { NextRequest, NextResponse } from 'next/server';
import { appendWaitlistEntry } from '@/lib/sheets';

/**
 * Waitlist / lead capture endpoint.
 *
 * For BCP waitlist (source: before | after | invite):
 *   1. Submits to Kit form 8175003 via the v3 endpoint. This triggers Kit's
 *      double opt-in flow + incentive email + form-level tagging — the same
 *      behavior you get when someone fills out the form on Kit's hosted page.
 *   2. Writes a row to the Waitlist tab of the BCP Google Sheet.
 *   3. Sends a Discord notification so Dave knows to start outreach.
 *   4. Returns success so the client can redirect the user to the
 *      /waitlist-question page where they answer the challenge.
 *
 * For Boundless Insight (source: insight): tags via the v4 API and short-circuits
 * the sheet write since insight signups don't go to the BCP sheet.
 *
 * The Kit v3 form ID for BCP waitlist:           8175003
 * The Kit v3 API key (legacy ConvertKit-style):  KIT_V3_API_KEY env var
 *   This is a different key from KIT_API_KEY (which is v4 / kit_xxx style).
 *   You can find the v3 key under Kit's "Account Settings → Advanced → API"
 *   page. If KIT_V3_API_KEY is not set, falls back to the previously-public
 *   value the landing page used so this keeps working during transition.
 */

const BCP_WAITLIST_FORM_ID = '8175003';
const KIT_V3_API_KEY_FALLBACK = '8r2gDZv9vgYKgeS4TAeKdw';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, source = 'before' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    if (source === 'insight') {
      // Boundless Insight uses its own Kit form; do not touch the BCP sheet.
      const apiKey = process.env.KIT_API_KEY;
      const tagId = process.env.KIT_TAG_BOUNDLESS_INSIGHT;
      if (apiKey && tagId) {
        // Subscribe (idempotent)
        await fetch('https://api.kit.com/v4/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
          body: JSON.stringify({
            email_address: email,
            ...(firstName ? { first_name: firstName } : {}),
          }),
        }).catch(() => {});
        // Tag
        await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
          body: JSON.stringify({ email_address: email }),
        }).catch(() => {});
      }
      return NextResponse.json({ success: true, redirectTo: null });
    }

    // BCP waitlist flow.
    const v3Key = process.env.KIT_V3_API_KEY || KIT_V3_API_KEY_FALLBACK;

    // 1. Kit form submission — triggers incentive email + double opt-in
    const kitResponse = await fetch(
      `https://api.convertkit.com/v3/forms/${BCP_WAITLIST_FORM_ID}/subscribe`,
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
      console.error('Kit v3 form submission failed:', text);
      // Still try to record the entry so we don't lose them
    }

    // 2. Google Sheet write (Waitlist tab)
    try {
      await appendWaitlistEntry(firstName || '', email, source);
    } catch (sheetError) {
      console.error('Waitlist sheet write failed:', sheetError);
      // Don't block the user. Kit submission was the priority.
    }

    // 3. Discord notification — Dave sees this and starts outreach
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendWaitlistSignupNotification(firstName, email, source);
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    // 4. Return redirect target so the client can navigate to the question page
    const params = new URLSearchParams();
    params.set('email', email);
    if (firstName) params.set('name', firstName);
    return NextResponse.json({
      success: true,
      redirectTo: `/waitlist-question?${params.toString()}`,
    });
  } catch (error: any) {
    console.error('Waitlist error:', error);
    // Graceful degradation — don't expose internal failures to the user
    return NextResponse.json({ success: true, redirectTo: null });
  }
}

async function sendWaitlistSignupNotification(
  firstName: string | undefined,
  email: string,
  source: string,
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const sheetId = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  const embed = {
    title: '📋 New BCP Waitlist Signup',
    description: `[Open Waitlist tab](${sheetUrl})`,
    color: 0x3b82f6, // blue
    fields: [
      { name: 'Name', value: firstName || '_(not provided)_', inline: true },
      { name: 'Email', value: email, inline: true },
      { name: 'Source', value: source, inline: true },
    ],
    footer: { text: 'Challenge answer (if any) lands in the Sheet, not in a follow-up post.' },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
