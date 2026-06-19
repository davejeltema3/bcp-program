/**
 * AI routing verdict for applications. Repurposes the BCA Gemini evaluator from
 * a yes/no qualification into a three-way route across both offers:
 *   sales-call (high-ticket BCA), bcp (mid-tier), or neither.
 *
 * Needs GEMINI_API_KEY. The cross-referencing rigor (compare self-reported
 * claims to real channel data, lean skeptical) carries over from the BCA prompt.
 */

import type { ApplicationRecord } from './sheets';
import type { ChannelResearch } from './youtube-research';

export interface RoutingVerdict {
  route: 'sales-call' | 'bcp' | 'neither';
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  contentType: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function routeApplicant(a: ApplicationRecord, research: ChannelResearch): Promise<RoutingVerdict> {
  if (!GEMINI_API_KEY) {
    return { route: 'neither', reasoning: 'AI evaluation unavailable (no GEMINI_API_KEY).', confidence: 'low', contentType: '' };
  }

  const prompt = buildPrompt(a, research);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              route: { type: 'STRING', enum: ['sales-call', 'bcp', 'neither'] },
              reasoning: { type: 'STRING' },
              confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
              content_type: { type: 'STRING' },
            },
            required: ['route', 'reasoning', 'confidence', 'content_type'],
          },
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('Gemini error', res.status, t);
      return { route: 'neither', reasoning: `AI error ${res.status}`, confidence: 'low', contentType: '' };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { route: 'neither', reasoning: 'AI returned empty response', confidence: 'low', contentType: '' };

    const p = JSON.parse(text);
    const route = ['sales-call', 'bcp', 'neither'].includes(p.route) ? p.route : 'neither';
    const confidence = ['high', 'medium', 'low'].includes(p.confidence) ? p.confidence : 'low';
    return {
      route,
      reasoning: String(p.reasoning || 'No reasoning provided').slice(0, 1500),
      confidence,
      contentType: String(p.content_type || '').slice(0, 200),
    };
  } catch (err: any) {
    console.error('routeApplicant error', err.message || err);
    return { route: 'neither', reasoning: `AI error: ${err.message}`, confidence: 'low', contentType: '' };
  }
}

function buildPrompt(a: ApplicationRecord, r: ChannelResearch): string {
  const statsSection = r.resolved
    ? `
VERIFIED CHANNEL DATA (from the YouTube API — these are FACTS, not self-reported):
- Channel: ${r.channelTitle || 'unknown'}
- Subscribers: ${r.subscriberCount ?? 'unknown'}
- Total videos: ${r.videoCount ?? 'unknown'}
- Videos in last 6 months: ${r.recentVideoCount ?? 'unknown'}
- Average views (recent): ${r.averageViews ?? 'unknown'}
- Best recent video views: ${r.maxViews ?? 'unknown'}
- Upload cadence: ${r.uploadCadence || 'unknown'}
- Format: ${r.shortsLabel || 'unknown'} (${r.shortsCount ?? 0} shorts / ${r.longCount ?? 0} long-form among recent)
- Recent video titles: ${(r.recentTitles || []).slice(0, 10).map((t) => `"${t}"`).join(', ') || 'none'}
- Channel description: ${(r.description || '').slice(0, 300) || '(empty)'}`
    : `
CHANNEL DATA: could not resolve the channel (${r.reason || 'unknown'}). Be MORE skeptical of self-reported claims and lean toward lower confidence.`;

  return `You route applicants for a YouTube coaching business with two offers. Decide which one (if either) this person should be pointed at.

THE TWO OFFERS:
- "sales-call" = the Boundless Creator Accelerator (BCA), high-ticket 1-on-1 coaching ($6,000-$9,600). For ESTABLISHED educational creators with real traction who can plausibly afford a five-figure investment and say they're ready to invest seriously. This is the top of the ladder — reserve it for the strongest fits. Routing here means Dave offers them a sales call.
- "bcp" = the Boundless Creator Program, a $999 six-month group mentorship. The broader fit: a serious educational creator who wants to grow but isn't a clear high-ticket candidate (earlier-stage but committed, smaller channel, or readiness is "depends on the details"). This is the default for genuine fits who aren't clearly BCA.
- "neither" = not a fit for either. Wrong type (gaming, entertainment, reaction, vlog, ASMR), brand-new with minimal effort and no traction, a hobbyist with no intent to invest, or answers/data that show they aren't serious about growing a channel.

WHO BOTH PROGRAMS ARE FOR: educational/teaching creators who teach a skill, solve a problem, or share expertise to build a business or career — not pure entertainment.

CROSS-REFERENCE THEIR ANSWERS AGAINST THE REAL DATA. People present themselves in the best light; your job is to see through it:
- If they claim weekly uploads but the data shows 3 videos in 6 months, flag it.
- If they claim big reach but verified average views are tiny, flag it.
- If they describe themselves as educational but the titles/description read as gaming/vlogs/entertainment, flag it and lean "neither".
- A clear "sales-call" needs both genuine traction AND stated readiness to invest. When traction is real but readiness is soft, or the channel is promising but smaller, prefer "bcp".

APPLICANT ANSWERS (self-reported — verify against the data):
- Name: ${a.first_name || ''}
- Channel URL: ${a.channel_url || 'not provided'}
- Primary goal: ${a.primary_goal || 'not answered'}
- Monetized: ${a.monetized || 'not answered'}
- Channel about (their words): ${a.channel_about || 'not answered'}
- Who they want to reach: ${a.target_audience || 'not answered'}
- Biggest challenge: ${a.challenge || 'not answered'}
- What they want from working together: ${a.program_goals || 'not answered'}
- Readiness to invest: ${a.readiness || 'not answered'}
- Anything else: ${a.anything_else || 'not answered'}
${statsSection}

Return JSON:
- "route": "sales-call" | "bcp" | "neither".
- "reasoning": a tight evaluation Dave can read in 10 seconds. Start with what the verified data shows, note any mismatch with their answers, then justify the route. Cite numbers.
- "confidence": "high" if clear, "medium" if borderline, "low" if data is missing.
- "content_type": a short niche/content-type label inferred from the channel and their answer (e.g. "Beginner guitar tutorials", "Personal finance for millennials", "Gaming - Minecraft").

Be decisive. Most applicants are "bcp" or "neither"; "sales-call" is the exception, not the default.`;
}
