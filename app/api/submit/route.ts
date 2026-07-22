import { NextRequest, NextResponse } from 'next/server';
import { appendLivestreamReview } from '@/lib/livestream-sheet';

/**
 * Channel-review submission endpoint.
 * Writes to the "Livestream Reviews" tab of the BCP Members Sheet and pings
 * Discord. Graceful — never blocks the visitor on a downstream failure.
 */
export async function POST(request: NextRequest) {
  try {
    const { answers, email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    try {
      await appendLivestreamReview(email, name, answers || {});
    } catch (error) {
      console.error('Livestream review sheet write failed:', error);
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendNotification(name, email, answers || {});
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Channel review submission error:', error);
    return NextResponse.json({ success: true });
  }
}

function truncate(text: string, max: number): string {
  if (!text) return '_(none)_';
  return text.length <= max ? text : text.substring(0, max - 3) + '...';
}

async function sendNotification(
  name: string | undefined,
  email: string,
  answers: Record<string, string>,
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const embed = {
    title: '📺 New Channel Review Submission',
    color: 0x3b82f6,
    fields: [
      { name: 'Name', value: name || '_(not provided)_', inline: true },
      { name: 'Email', value: email, inline: true },
      { name: 'Channel', value: answers.channel_url || '_(none)_', inline: false },
      { name: 'Core problem', value: truncate(answers.core_problem || '', 200), inline: false },
      { name: 'Wants me to look at', value: answers.focus || '_(none)_', inline: true },
      { name: 'Burning question', value: truncate(answers.burning_question || '', 200), inline: false },
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
