# BCP + BCA — Full System Map

_Last updated: 2026-05-02_

---

## 🔵 ACCELERATOR (apply.boundlesscreator.com)

**Repo:** `davejeltema3/coaching-application` → Vercel auto-deploys on push

### Application Flow
1. Applicant fills out form on `/` → submits to `/api/submit`
2. AI evaluates (Gemini) → writes to Google Sheet → tags Kit (BCP Applicant + Qualified/Unqualified) → Discord notification
3. If qualified → Dave sends checkout link manually
4. Customer pays on `/checkout` → Stripe session (one-time or subscription payment plan)
5. Stripe redirects to `/welcome?session_id=...`
6. `/api/welcome` verifies payment → tags Kit "BCP Member" (8240961) → Discord notification

### Stripe Webhooks
Both point to `apply.boundlesscreator.com/api/webhooks/stripe`:
- `STRIPE_WEBHOOK_SECRET` — original webhook (payment plan management)
- `STRIPE_WEBHOOK_SECRET_NOTIFICATIONS` — checkout notifications

### Kit Webhook (in Kit Rules)
- **Trigger:** "BCP Member" tag (8240961) added
- **URL:** `apply.boundlesscreator.com/api/webhooks/kit-member`
- **Actions:** Discord #dashboard notification
- **Note:** Fires for BOTH Accelerator and Program members (same tag)

---

## 🟢 PROGRAM (bcp.boundlesscreator.com)

**Repo:** `davejeltema3/bcp-program` → Vercel auto-deploys on push

### Landing Page
Long-form sales page with sections:
- Hero (headline, stats, price, CTA)
- Problem statement
- Week One wedge (personal review + content checklist)
- What else you get (live sessions, course, resources)
- Who this is for / not for
- Testimonials + 30-day guarantee
- Founder block ("Why I built this")
- FAQ (7 questions)
- Final P.S. (only when window open)
- Checkout section (adapts to window state)

### Purchase Flow
```
Visitor → bcp.boundlesscreator.com
    │
    ├── / (main page) ── window check ──┐
    │                                    ├── OPEN → $999 button + $599×2 installment button
    │                                    ├── BEFORE → Countdown timer + Waitlist form
    │                                    └── AFTER → Waitlist form
    │
    └── /join (invite page) ── NO window check → Always shows Pay buttons
            │
            ▼
    Click Pay → POST /api/checkout
            │
            ├── default → Stripe checkout (mode: payment, $999 one-time)
            └── installment → Stripe checkout (mode: subscription, $599/mo × 2, auto-cancels)
            │
            ▼ (Stripe hosted checkout)
            ▼ (on success)
    Redirect to /welcome?session_id={ID}
            │
            ▼
    GET /api/welcome
            ├── Verifies payment with Stripe API
            ├── Tags Kit "BCP Member" (8240961)
            └── Discord embed "🎉 New BCP Founders Member!"
            │
            ▼
    /welcome page shows:
            ├── Confirmation + "What Happens Next" steps
            └── Onboarding Questionnaire (inline)
```

### Stripe Webhook (fires simultaneously with checkout)
```
Stripe → POST bcp.boundlesscreator.com/api/webhooks/stripe
    │
    ├── checkout.session.completed
    │   ├── Discord notification "💰 New Payment!"
    │   ├── Generate single-use Discord invite
    │   ├── If installment → set cancel_at on subscription (62 days)
    │   ├── Tag Kit "BCP Member" + store Discord invite as custom field
    │   └── Create/update Google Sheet row (via Sheets API):
    │       ├── New member → new row with name, email, dates, payment info
    │       └── Returning member → update existing row, increment renewal count + revenue
    │
    ├── invoice.payment_succeeded → Discord "🔄 Renewal!" (skips first invoice)
    ├── invoice.payment_failed → Discord "⚠️ Payment Failed!"
    └── customer.subscription.deleted → Discord "🔴 Subscription Cancelled"
```

### Google Sheet — Member Management Hub
**Sheet:** "BCP Questionnaire (Responses)"
**ID:** `1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c`
**Access:** Service account `hazel-youtube-drive@davejeltemadotco-1699158105209.iam.gserviceaccount.com` (Editor)

#### Columns A-AB: Questionnaire Data
| Col | Name | Source |
|-----|------|--------|
| A | Timestamp | Auto (payment or questionnaire time) |
| B | First Name | Stripe / questionnaire |
| C | Email | Stripe / questionnaire |
| D | Channel URL | Questionnaire |
| E | Questionnaire Submitted? | Yes/No |
| F-Q | AI-derived fields | Post-submission AI analysis |
| R-Z | Human answers | Questionnaire (monetized, goals, etc.) |
| AA | Anything Else? | Questionnaire |
| AB | AI Evaluation | Post-submission AI analysis |

#### Columns AC-AP: Member Management
| Col | Name | Source | Editable? |
|-----|------|--------|-----------|
| AC | Start Date | Webhook (auto) | ✅ Edit to override |
| AD | End Date | Webhook (start + 90 days) | ✅ Edit to extend/shorten |
| AE | Status | Formula from End Date | ✅ Type over formula to override |
| AF | Days Remaining | Formula: MAX(0, End Date - TODAY()) | Auto-calculates |
| AG | Payment Type | Webhook (one-time/installment/comp) | ✅ |
| AH | Amount Paid | Webhook (this payment) | ✅ |
| AI | Total Revenue | Cumulative across renewals | Auto-increments |
| AJ | Stripe Customer ID | Webhook | — |
| AK | Stripe Session ID | Webhook | — |
| AL | Discord Invite URL | Webhook (generated at payment) | — |
| AM | Discord User ID | Manual entry | ✅ Needed for auto-removal |
| AN | Renewal Count | Webhook (increments on rejoin) | ✅ |
| AO | Cancelled Date | Manual or auto | ✅ |
| AP | Notes | Manual | ✅ Free-form |

**Key design:** Formulas calculate defaults. Any cell you manually edit becomes the truth.

#### Data Flow
```
Payment webhook → creates row (name, email, dates, Stripe IDs, "Questionnaire: No")
                      ↓
Questionnaire submitted → finds row by email → updates in place ("Questionnaire: Yes" + answers)
                      ↓
Returning member pays again → finds existing row → updates dates, increments revenue + renewal count
                      ↓
Manual add (admin) → creates row with comp defaults, tags Kit, generates Discord invite
```

### Questionnaire Flow
```
Member fills out questionnaire (on /welcome or /questionnaire?email=...)
    │
    POST /api/questionnaire
    ├── Upsert to Google Sheet (finds existing row by email, updates in place)
    ├── Tag Kit "BCP Questionnaire Submitted" (19206526) — stops reminder emails
    └── Discord embed with summary
```

### Admin: Add Member (No Payment)
```
Dave on /preview → Admin tab → "Add Member"
    │
    POST /api/admin/add-member { name, email, durationDays }
    ├── Creates/updates Google Sheet row (payment type: comp, dates set)
    ├── Generates single-use Discord invite
    ├── Tags Kit "BCP Member" (triggers welcome email with Discord invite)
    ├── Discord notification "🎁 New Member Added (Comp)"
    └── Returns questionnaire link to send them
```

### Waitlist Flow
```
Visitor on / (window closed) → fills waitlist form
    │
    POST /api/waitlist → Tag Kit "BCP Waitlist Member" (8231366)
```

### Waitlist Notification (when window opens)
```
Admin on /preview → Admin tab → Update Window (with auto-notify on)
    │
    POST /api/admin/window
    ├── Updates Vercel env vars (WINDOW_OPEN / WINDOW_CLOSE)
    ├── Tags all waitlist subscribers with "BCP Window Open Notification" (19208524)
    ├── Triggers Vercel redeploy
    └── Kit automation → sends "window is open" email
```

### Insight Flow
```
Visitor on /insight → fills email form
    │
    POST to Kit Form API (form #9377397) — direct to Kit
    └── Kit handles: double opt-in → confirmation → redirect to Chrome Web Store
```

---

## Kit Tags

| Tag | ID | Applied By | Purpose |
|---|---|---|---|
| BCP Member | 8240961 | Stripe webhook + /api/admin/add-member | Trigger welcome email, Kit webhook |
| BCP Waitlist Member | 8231366 | /api/waitlist | Notify when next window opens |
| BCP Questionnaire Submitted | 19206526 | /api/questionnaire | Stop reminder emails |
| BCP Window Open Notification | 19208524 | /api/admin/window (auto-notify) | Trigger "window is open" email |
| Boundless Insight | — | Kit Form #9377397 | Kit handles tagging |
| BCP Applicant | 15754298 | Accelerator /api/submit | Application tracking |
| BCP Applicant Qualified | 15773880 | Accelerator /api/submit | AI qualified |
| BCP Applicant Unqualified | 15773881 | Accelerator /api/submit | AI unqualified |

## Env Vars (BCP Vercel)

### Stripe
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Subscription lifecycle webhook
- `STRIPE_WEBHOOK_SECRET_NOTIFICATIONS` — Checkout notification webhook

### Kit
- `KIT_API_KEY` — Kit API key
- `KIT_BCP_MEMBER_TAG_ID` — 8240961
- `KIT_TAG_BCP_WAITLIST` — 8231366
- `KIT_TAG_QUESTIONNAIRE_SUBMITTED` — 19206526
- `KIT_TAG_WINDOW_OPEN_NOTIFICATION` — 19208524

### Google Sheets
- `GOOGLE_SERVICE_ACCOUNT_JSON` — Service account credentials (full JSON)
- `BCP_SHEET_ID` — Spreadsheet ID (defaults to `1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c`)

### Window
- `NEXT_PUBLIC_WINDOW_OPEN` — UTC ISO string
- `NEXT_PUBLIC_WINDOW_CLOSE` — UTC ISO string

### Admin
- `ADMIN_SECRET` — Password for admin actions
- `VERCEL_TOKEN` — For window update + redeploy
- `VERCEL_PROJECT_ID` — Vercel project ID

### Discord
- `DISCORD_WEBHOOK_URL` — Webhook for notifications
- `DISCORD_BOT_TOKEN` — For generating single-use invites
- `DISCORD_INVITE_CHANNEL_ID` — Channel to create invites in

## Pages

| Path | Purpose | Window-gated? |
|---|---|---|
| `/` | Long-form sales page + checkout | Yes (checkout section only) |
| `/join` | Invite page (bypass window) | No |
| `/welcome` | Post-payment confirmation + questionnaire | No |
| `/questionnaire` | Standalone questionnaire (email links) | No |
| `/insight` | Boundless Insight lead magnet | No |
| `/preview` | Admin panel + preview all pages | No |

## Future Items
- **Google Apps Script** for daily expiry checks (update Status, Discord role removal)
- **AI layer** for auto-populating channel analysis fields (F-Q, AB)
- **Discord auto-removal** when membership expires (via Apps Script or Hazel bot)
