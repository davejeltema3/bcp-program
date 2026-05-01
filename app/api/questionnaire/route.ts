import { NextRequest, NextResponse } from 'next/server';

/**
 * Questionnaire submission endpoint.
 * Saves to Google Forms and sends Discord notification.
 * Also tags Kit subscriber with "BCP Questionnaire Submitted" to stop reminder sequence.
 *
 * Google Sheet column order:
 * Timestamp | First Name | Email | Channel URL | Questionnaire Submitted? |
 * Active Creator | Duration | Subscribers | Total Videos | Channel Age |
 * Upload Cadence | Content Niche | Target Audience | Top Videos | Bottom Videos |
 * Average Views (30 Days) | Shorts Evaluation | Monetized? |
 * Comfortable with AI? | Hours per Week | Best Video Theory |
 * Content Goals | Program Goals | Challenge | Anything Else? | AI Evaluation
 *
 * Human-answered fields submitted here:
 *   channel_url, monetized, ai_comfort, hours_per_week, best_video_theory,
 *   challenge, content_goals, program_goals, analytics_access, anything_else
 *
 * AI-derived fields (filled post-submission):
 *   active_creator, duration, subscribers, total_videos, channel_age,
 *   upload_cadence, content_niche, target_audience, top_videos, bottom_videos,
 *   average_views_30d, shorts_evaluation, ai_evaluation
 */
export async function POST(request: NextRequest) {
  try {
    const { answers, email, name } = await request.json();

    // Submit to Google Forms if configured
    if (process.env.BCP_GOOGLE_FORM_ACTION_URL) {
      try {
        await submitToGoogleForms(answers, email, name);
      } catch (error) {
        console.error('Google Forms submission error:', error);
      }
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

async function submitToGoogleForms(answers: Record<string, string>, email?: string, name?: string) {
  const formUrl = process.env.BCP_GOOGLE_FORM_ACTION_URL
    || 'https://docs.google.com/forms/d/e/1FAIpQLSeChQcPaZNfogKDloLPdYk242-li3PQLkwkBk6hFAnA1jmVow/formResponse';

  const formData = new URLSearchParams();

  // Google Form entry IDs (scraped from form HTML)
  const ENTRY = {
    first_name:        'entry.2097721795',
    email:             'entry.1911423929',
    channel_url:       'entry.2044768400',
    questionnaire_sub: 'entry.1476304573',
    monetized:         'entry.513173253',
    ai_comfort:        'entry.231593935',
    hours_per_week:    'entry.134149865',
    best_video_theory: 'entry.1841833113',
    challenge:         'entry.1322755048',
    content_goals:     'entry.1587458703',
    program_goals:     'entry.1252611344',
    analytics_access:  'entry.610455116',
    anything_else:     'entry.1026472512',
  } as const;

  // Pre-filled from Stripe payment data
  if (name) {
    const firstName = name.split(' ')[0];
    formData.append(ENTRY.first_name, firstName);
  }
  if (email) formData.append(ENTRY.email, email);

  // Mark as submitted
  formData.append(ENTRY.questionnaire_sub, 'Yes');

  // Human-answered fields
  const fieldMap: Record<string, string> = {
    channel_url:       ENTRY.channel_url,
    monetized:         ENTRY.monetized,
    ai_comfort:        ENTRY.ai_comfort,
    hours_per_week:    ENTRY.hours_per_week,
    best_video_theory: ENTRY.best_video_theory,
    challenge:         ENTRY.challenge,
    content_goals:     ENTRY.content_goals,
    program_goals:     ENTRY.program_goals,
    analytics_access:  ENTRY.analytics_access,
    anything_else:     ENTRY.anything_else,
  };

  Object.entries(fieldMap).forEach(([key, entryId]) => {
    if (answers[key]) {
      formData.append(entryId, answers[key]);
    }
  });

  await fetch(formUrl, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
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
    : '❓ Unsure';

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
