# BCP Program — Deployment Guide

## Vercel Setup

1. Import repo `davejeltema3/bcp-program` in Vercel
2. Framework: Next.js (auto-detected)
3. Add domain: `bcp.boundlesscreator.com`

## DNS (Hostinger)

Add CNAME record:
- **Type:** CNAME
- **Name:** `bcp`
- **Target:** `cname.vercel-dns.com`

## Environment Variables (Vercel)

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key (same account as Accelerator) | `sk_live_...` |
| `KIT_API_KEY` | Kit (ConvertKit) API key | Same as Accelerator site |
| `NEXT_PUBLIC_WINDOW_OPEN` | Purchase window open (UTC ISO) | `2026-05-01T13:00:00.000Z` (= 9 AM EST) |
| `NEXT_PUBLIC_WINDOW_CLOSE` | Purchase window close (UTC ISO) | `2026-05-04T04:59:59.000Z` (= 11:59 PM EST May 3) |

### Kit Tags
| Variable | Description | Value |
|----------|-------------|-------|
| `KIT_BCP_MEMBER_TAG_ID` | BCP Member tag (reused) | `8240961` |
| `KIT_TAG_BCP_WAITLIST` | BCP Waitlist tag | Create in Kit, paste ID |
| `KIT_TAG_BOUNDLESS_INSIGHT` | Boundless Insight download tag | Create in Kit, paste ID |
| `KIT_TAG_QUESTIONNAIRE_SUBMITTED` | Stops "complete your questionnaire" emails | Create in Kit, paste ID |

### Discord
| Variable | Description |
|----------|-------------|
| `DISCORD_WEBHOOK_URL` | Webhook for #dashboard notifications |
| `DISCORD_BOT_TOKEN` | Bot token for creating invite links |
| `DISCORD_INVITE_CHANNEL_ID` | Channel ID for invite link generation |
| `DISCORD_INVITE_SECRET` | Secret token for invite API |

### Admin (Window Control from /preview)
| Variable | Description |
|----------|-------------|
| `ADMIN_SECRET` | Password for the admin panel on /preview |
| `VERCEL_TOKEN` | Vercel API token (for updating env vars + redeploying) |
| `VERCEL_PROJECT_ID` | Vercel project ID (shown after import) |
| `VERCEL_GIT_REPO_ID` | GitHub repo ID (from Vercel project settings) |

### Google Forms (Questionnaire)
| Variable | Description |
|----------|-------------|
| `BCP_GOOGLE_FORM_ACTION_URL` | Form action URL |
| `BCP_FORM_FIELD_EMAIL` | Entry ID for email |
| `BCP_FORM_FIELD_NAME` | Entry ID for name |
| `BCP_FORM_FIELD_NAME_CHANNEL` | Entry ID for name + channel link |
| `BCP_FORM_FIELD_DAY_JOB` | Entry ID for day job |
| `BCP_FORM_FIELD_WEEKLY_HOURS` | Entry ID for weekly hours |
| `BCP_FORM_FIELD_LIFE_STYLE` | Entry ID for life/work style |
| `BCP_FORM_FIELD_BEST_VIDEOS` | Entry ID for best videos |
| `BCP_FORM_FIELD_WORST_VIDEOS` | Entry ID for worst videos |
| `BCP_FORM_FIELD_AUDIENCE_GAP` | Entry ID for audience gap |
| `BCP_FORM_FIELD_BOTTLENECK` | Entry ID for bottleneck |
| `BCP_FORM_FIELD_CREATION_PROCESS` | Entry ID for creation process |
| `BCP_FORM_FIELD_EMAIL_LIST` | Entry ID for email list |
| `BCP_FORM_FIELD_REVENUE` | Entry ID for revenue |
| `BCP_FORM_FIELD_EXISTING_OFFERS` | Entry ID for existing offers |
| `BCP_FORM_FIELD_WHAT_DIDNT_WORK` | Entry ID for what didn't work |
| `BCP_FORM_FIELD_GOALS` | Entry ID for goals |
| `BCP_FORM_FIELD_WORTH_IT` | Entry ID for what makes it worth it |
| `BCP_FORM_FIELD_OFF_LIMITS` | Entry ID for off-limits |
| `BCP_FORM_FIELD_AI_COMFORT` | Entry ID for AI comfort level |
| `BCP_FORM_FIELD_TOOLS_USED` | Entry ID for tools used |
| `BCP_FORM_FIELD_ANALYTICS_ACCESS` | Entry ID for analytics access |
| `BCP_FORM_FIELD_ANYTHING_ELSE` | Entry ID for anything else |

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing/sales page with countdown timer |
| `/checkout` | Checkout page (window-enforced) |
| `/welcome` | Post-payment confirmation + questionnaire |
| `/questionnaire` | Standalone questionnaire (for email links) |
| `/insight` | Boundless Insight lead magnet page |
| `/preview` | Admin panel + page links |

## Purchase Window System

The window is controlled by two env vars:
- `NEXT_PUBLIC_WINDOW_OPEN` — UTC ISO timestamp
- `NEXT_PUBLIC_WINDOW_CLOSE` — UTC ISO timestamp

**Client-side:** Countdown timer shows time until open/close. CTA swaps to waitlist form when closed.
**Server-side:** `/api/checkout` rejects payment attempts outside the window with a friendly error.

**To update the window:**
1. Go to `/preview` on the live site
2. Click "Window Admin"
3. Enter admin secret, select timezone, pick dates
4. Click "Update Window & Redeploy"

Or manually: update the two env vars in Vercel dashboard and redeploy.

## Kit Email Sequence (Questionnaire Reminders)

Create a Kit automation:
- **Trigger:** "BCP Member" tag applied
- **Wait:** 1 day
- **Check:** Does NOT have "BCP Questionnaire Submitted" tag?
  - **Yes:** Send reminder email with link: `https://bcp.boundlesscreator.com/questionnaire?email={{ subscriber.email_address }}`
- **Wait:** 2 more days
- **Check again:** Still no "BCP Questionnaire Submitted" tag?
  - **Yes:** Send final reminder

This mirrors the Accelerator's "book a call" reminder pattern.
