import { NextRequest, NextResponse } from 'next/server';
import { upsertQuestionnaireAnswers } from '@/lib/sheets';

/**
 * Questionnaire submission endpoint.
 * Saves to Google Sheet (upserts — updates existing payment row or creates new).
 * Also tags Kit subscriber with "BCP Questionnaire Submitted" to stop reminder sequence.
 *
 * Google Sheet column order:
 * Timestamp | First Name | Email | Channel URL | Questionnaire Submitted? |
 * Active Creator | Duration | Subscribers | Total Videos | Channel Age |
 * Upload Cadence | Content Type | Target Audience | Top Videos | Bottom Videos |
 * Average Views (30 Days) | Shorts Evaluation | Monetized? |
 * Comfortable with AI? | Hours per Week | Best Video Theory |
 * Hasn't worked? | Content Goals | Program Goals | Challenge | Analytics Access
 *
 * Human-answered fields submitted here:
 *   channel_url, monetized, ai_comfort, hours_per_week, best_video_theory,
 *   what_didnt_work, challenge, content_goals, program_goals, analytics_access
 *
 * AI-derived fields (filled post-submission):
 *   active_creator, duration, subscribers, total_videos, channel_age,
 *   upload_cadence, content_type, target_audience, top_videos, bottom_videos,
 *   average_views_30d, shorts_evaluation
 */
export async function POST(request: NextRequest) {
  try {
    const { answers, email, name } = await request.json();

    // Upsert to Google Sheet (finds existing payment row by email, or creates new)
    try {
      await upsertQuestionnaireAnswers(email, name, answers);
    } catch (error) {
      console.error('Google Sheets upsert error:', error);
    }

    // Tag in Kit to stop reminder emails
    if (process.env.KIT_API_KEY && email && process.env.KIT_TAG_QUESTIONNAIRE_SUBMITTED) {
      try {
        await tagQuestionnaireSubmitted(email);
      } catch (error) {
        console.error('Kit tagging error:', error);
      }
    }

    // Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendDiscordNotification(name, email, answers);
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Questionnaire submission error:', error);
    return NextResponse.json({ success: true }); // Graceful — don't block the user
  }
}

async function tagQuestionnaireSubmitted(email: string) {
  const apiKey = process.env.KIT_API_KEY;
  const tagId = process.env.KIT_TAG_QUESTIONNAIRE_SUBMITTED;
  if (!apiKey || !tagId) return;

  await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    },
    body: JSON.stringify({ email_address: email }),
  });
}

async function sendDiscordNotification(name?: string, email?: string, answers?: Record<string, string>) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const analyticsStatus = answers?.analytics_access === 'granted'
    ? '✅ Granted'
    : answers?.analytics_access === 'later'
    ? '⏳ Later'
    : '⏭️ Skipped';

  const monetizedStatus = answers?.monetized === 'yes'
    ? '✅ Yes'
    : answers?.monetized === 'no'
    ? '❌ No'
    : answers?.monetized === 'no-plan'
    ? '🚫 Don\'t plan to'
    : '❓ Unknown';

  const embed = {
    title: '📋 BCP Questionnaire Submitted',
    color: 0x3b82f6,
    fields: [
      { name: 'Name', value: name || 'Unknown', inline: true },
      { name: 'Email', value: email || 'N/A', inline: true },
      { name: 'Channel', value: answers?.channel_url || 'N/A', inline: false },
      { name: 'Monetized', value: monetizedStatus, inline: true },
      { name: 'Analytics', value: analyticsStatus, inline: true },
      { name: 'AI Comfort', value: answers?.ai_comfort ? `${answers.ai_comfort}/5` : 'N/A', inline: true },
      { name: 'Challenge', value: truncate(answers?.challenge || 'N/A', 200), inline: false },
      { name: 'Program Goals', value: truncate(answers?.program_goals || 'N/A', 200), inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + '...';
}
