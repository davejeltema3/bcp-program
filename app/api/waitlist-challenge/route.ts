import { NextRequest, NextResponse } from 'next/server';
import { updateWaitlistChallenge } from '@/lib/sheets';

/**
 * Updates a waitlist entry with the user's answer to the challenge question.
 * Called from /waitlist-question after they fill in their challenge.
 *
 * Expects: { email: string, challenge: string, name?: string }
 *
 * If the email doesn't have an existing waitlist row (rare — should not happen
 * in normal flow because /api/waitlist creates the row first), creates a new
 * row marked source = 'orphan-challenge' so we can investigate.
 *
 * Also fires a follow-up Discord notification with the challenge text so Dave
 * gets the full context for outreach in one place.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, challenge, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    if (!challenge || !challenge.trim()) {
      // Empty challenge is fine — they skipped. Just return success.
      return NextResponse.json({ success: true, skipped: true });
    }

    try {
      await updateWaitlistChallenge(email, challenge.trim(), name);
    } catch (error) {
      console.error('Waitlist challenge update failed:', error);
    }

    // Follow-up Discord notification with the challenge text.
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendChallengeNotification(name, email, challenge.trim());
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Waitlist challenge error:', error);
    return NextResponse.json({ success: true }); // Graceful degradation
  }
}

async function sendChallengeNotification(
  name: string | undefined,
  email: string,
  challenge: string,
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const sheetId = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  const embed = {
    title: '✏️ Waitlist Challenge Submitted',
    description: `[Open Waitlist tab](${sheetUrl})`,
    color: 0xf59e0b, // amber
    fields: [
      { name: 'Name', value: name || '_(not provided)_', inline: true },
      { name: 'Email', value: email, inline: true },
      { name: 'Challenge', value: challenge.length > 1000 ? challenge.slice(0, 997) + '...' : challenge, inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
