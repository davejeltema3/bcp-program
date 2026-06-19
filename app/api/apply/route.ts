import { NextRequest, NextResponse } from 'next/server';
import { appendApplicationEntry, type ApplicationRecord } from '@/lib/sheets';

/**
 * Application submit endpoint (waitlist-to-application shift).
 *   1. Appends the answers to the Applications tab of the BCP Members Sheet.
 *   2. Kit: subscribe + tag the applicant (idempotent; skips if env not set).
 *   3. Discord: one full-payload embed so Dave can size them up and start outreach.
 *
 * The AI research + routing verdict (Phase 2) fill the remaining columns on the
 * row afterward. Always returns success so a backend hiccup never blocks the user.
 */

const GOAL_LABELS: Record<string, string> = {
  'full-time': 'Full-time / business growth',
  'side-income': 'Meaningful side income',
  hobby: 'Hobby / passion project',
};
const MONETIZED_LABELS: Record<string, string> = {
  yes: 'Yes',
  'not-yet': 'Not yet, working toward it',
  no: "No, not sure how",
};
const READINESS_LABELS: Record<string, string> = {
  ready: 'Ready to invest now',
  depends: 'Depends on the details',
  exploring: 'Just exploring',
};

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const email = (data.email || '').trim();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const record: ApplicationRecord = {
      first_name: data.first_name,
      email,
      phone: data.phone,
      channel_url: data.channel_url,
      primary_goal: data.primary_goal,
      monetized: data.monetized,
      channel_about: data.channel_about,
      target_audience: data.target_audience,
      challenge: data.challenge,
      program_goals: data.program_goals,
      readiness: data.readiness,
      anything_else: data.anything_else,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
    };

    // 1. Sheet append (Applications tab)
    let rowNum: number | null = null;
    try {
      rowNum = await appendApplicationEntry(record);
    } catch (err) {
      console.error('Application sheet write failed:', err);
    }

    // 2. Kit: subscribe + tag (idempotent). Skips quietly if env isn't configured.
    const kitKey = process.env.KIT_API_KEY;
    const appTag = process.env.KIT_TAG_BCP_APPLICATION;
    if (kitKey) {
      try {
        await fetch('https://api.kit.com/v4/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': kitKey },
          body: JSON.stringify({
            email_address: email,
            ...(record.first_name ? { first_name: record.first_name.split(' ')[0] } : {}),
          }),
        });
        if (appTag) {
          await fetch(`https://api.kit.com/v4/tags/${appTag}/subscribers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': kitKey },
            body: JSON.stringify({ email_address: email }),
          });
        }
      } catch (err) {
        console.error('Kit application tag failed:', err);
      }
    }

    // 3. Discord notification — full payload
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendApplicationNotification(record, rowNum);
      } catch (err) {
        console.error('Discord application notification failed:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Application error:', error);
    return NextResponse.json({ success: true });
  }
}

function field(name: string, value?: string, inline = false) {
  const v = value && value.trim() ? value.trim().slice(0, 1024) : '_(blank)_';
  return { name, value: v, inline };
}

async function sendApplicationNotification(a: ApplicationRecord, rowNum: number | null) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const sheetId = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  const embed = {
    title: '📝 New application',
    description: rowNum ? `[Open Applications tab](${sheetUrl}) · row ${rowNum}` : `[Open Applications tab](${sheetUrl})`,
    color: 0x3a85ff,
    fields: [
      field('Name', a.first_name, true),
      field('Email', a.email, true),
      field('Phone', a.phone, true),
      field('Channel', a.channel_url, false),
      field('Goal', GOAL_LABELS[a.primary_goal || ''] || a.primary_goal, true),
      field('Monetized', MONETIZED_LABELS[a.monetized || ''] || a.monetized, true),
      field('Readiness', READINESS_LABELS[a.readiness || ''] || a.readiness, true),
      field('Channel about', a.channel_about, false),
      field('Wants to reach', a.target_audience, false),
      field('Challenge', a.challenge, false),
      field('Wants from me', a.program_goals, false),
      field('Anything else', a.anything_else, false),
    ],
    footer: { text: 'AI research + routing verdict land on the row shortly.' },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
