import { NextRequest, NextResponse } from 'next/server';

/**
 * Questionnaire submission endpoint.
 * Saves to Google Forms and sends Discord notification.
 * Also tags Kit subscriber with "BCP Questionnaire Submitted" to stop reminder sequence.
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
  const formUrl = process.env.BCP_GOOGLE_FORM_ACTION_URL;
  if (!formUrl) return;

  const formData = new URLSearchParams();

  // Map questionnaire fields to Google Form entry IDs
  // These env vars need to be set when the Google Form is created
  const fieldMap: Record<string, string | undefined> = {
    name_channel: process.env.BCP_FORM_FIELD_NAME_CHANNEL,
    day_job: process.env.BCP_FORM_FIELD_DAY_JOB,
    weekly_hours: process.env.BCP_FORM_FIELD_WEEKLY_HOURS,
    life_style: process.env.BCP_FORM_FIELD_LIFE_STYLE,
    best_videos: process.env.BCP_FORM_FIELD_BEST_VIDEOS,
    worst_videos: process.env.BCP_FORM_FIELD_WORST_VIDEOS,
    audience_gap: process.env.BCP_FORM_FIELD_AUDIENCE_GAP,
    bottleneck: process.env.BCP_FORM_FIELD_BOTTLENECK,
    creation_process: process.env.BCP_FORM_FIELD_CREATION_PROCESS,
    email_list: process.env.BCP_FORM_FIELD_EMAIL_LIST,
    revenue: process.env.BCP_FORM_FIELD_REVENUE,
    existing_offers: process.env.BCP_FORM_FIELD_EXISTING_OFFERS,
    what_didnt_work: process.env.BCP_FORM_FIELD_WHAT_DIDNT_WORK,
    goals_6_12: process.env.BCP_FORM_FIELD_GOALS,
    worth_it: process.env.BCP_FORM_FIELD_WORTH_IT,
    off_limits: process.env.BCP_FORM_FIELD_OFF_LIMITS,
    ai_comfort: process.env.BCP_FORM_FIELD_AI_COMFORT,
    tools_used: process.env.BCP_FORM_FIELD_TOOLS_USED,
    analytics_access: process.env.BCP_FORM_FIELD_ANALYTICS_ACCESS,
    anything_else: process.env.BCP_FORM_FIELD_ANYTHING_ELSE,
  };

  // Add email and name if we have form fields for them
  if (process.env.BCP_FORM_FIELD_EMAIL && email) {
    formData.append(process.env.BCP_FORM_FIELD_EMAIL, email);
  }
  if (process.env.BCP_FORM_FIELD_NAME && name) {
    formData.append(process.env.BCP_FORM_FIELD_NAME, name);
  }

  Object.entries(fieldMap).forEach(([key, entryId]) => {
    if (entryId && answers[key]) {
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

  const analyticsStatus = answers?.analytics_access === 'granted' ? '✅ Granted' : '⏭️ Skipped';

  const embed = {
    title: '📋 BCP Questionnaire Submitted',
    color: 0x3b82f6,
    fields: [
      { name: 'Name', value: name || answers?.name_channel || 'Unknown', inline: true },
      { name: 'Email', value: email || 'N/A', inline: true },
      { name: 'Analytics', value: analyticsStatus, inline: true },
      { name: 'Bottleneck', value: truncate(answers?.bottleneck || 'N/A', 200), inline: false },
      { name: 'Goals', value: truncate(answers?.goals_6_12 || 'N/A', 200), inline: false },
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
