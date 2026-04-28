# BCP + BCA — Full System Map

_Last updated: 2026-04-28_

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

### Purchase Flow
```
Visitor → bcp.boundlesscreator.com
    │
    ├── / (main page) ── window check ──┐
    │                                    ├── OPEN → Pay button (one-time or subscription)
    │                                    ├── BEFORE → Countdown timer + Waitlist form
    │                                    └── AFTER → Waitlist form
    │
    └── /join (invite page) ── NO window check → Always shows Pay button
            │
            ▼
    Click Pay → POST /api/checkout
            │
            ├── paymentMode: "one-time" → Stripe checkout (mode: payment, $999)
            └── paymentMode: "subscription" → Stripe checkout (mode: subscription, $999/3mo)
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

### Stripe Webhook (fires simultaneously)
```
Stripe → POST bcp.boundlesscreator.com/api/webhooks/stripe
    │
    ├── checkout.session.completed → Discord + Kit "BCP Member" tag (backup)
    ├── invoice.payment_succeeded → Discord "🔄 Renewal!" (skips first invoice)
    ├── invoice.payment_failed → Discord "⚠️ Payment Failed!"
    └── customer.subscription.deleted → Discord "🔴 Subscription Cancelled"
```

### Kit Rule (in YOUR Kit account, fires from the tag)
```
"BCP Member" tag (8240961) added → Kit webhook
    → apply.boundlesscreator.com/api/webhooks/kit-member
    → Discord #dashboard notification
```

### Questionnaire Flow
```
Member fills out questionnaire (on /welcome or /questionnaire)
    │
    POST /api/questionnaire
    ├── Submit to Google Forms (if configured)
    ├── Tag Kit "BCP Questionnaire Submitted" (19206526) — stops reminder emails
    └── Discord embed with summary
```

### Waitlist Flow
```
Visitor on / (window closed) → fills waitlist form
    │
    POST /api/waitlist → Tag Kit "BCP Waitlist Member" (8231366)
```

### Waitlist Notification (when window opens)
```
Admin clicks "Notify Waitlist" on /preview → Admin tab
    │
    POST /api/admin/notify-waitlist
    ├── Fetches all subscribers with "BCP Waitlist Member" tag
    ├── Tags each with "BCP Window Open Notification" (19208524)
    ├── Discord summary embed
    └── Kit automation fires → sends email to each tagged subscriber
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
| BCP Member | 8240961 | /api/welcome + Stripe webhook | Trigger welcome email, Kit webhook |
| BCP Waitlist Member | 8231366 | /api/waitlist | Notify when next window opens |
| BCP Questionnaire Submitted | 19206526 | /api/questionnaire | Stop reminder emails |
| BCP Window Open Notification | 19208524 | /api/admin/notify-waitlist | Trigger "window is open" email |
| Boundless Insight | — | Kit Form #9377397 | Kit handles tagging |
| BCP Applicant | 15754298 | Accelerator /api/submit | Application tracking |
| BCP Applicant Qualified | 15773880 | Accelerator /api/submit | AI qualified |
| BCP Applicant Unqualified | 15773881 | Accelerator /api/submit | AI unqualified |

## Env Vars (BCP Vercel)

### Stripe
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Subscription lifecycle webhook (when enabled)
- `STRIPE_WEBHOOK_SECRET_NOTIFICATIONS` — Checkout notification webhook

### Kit
- `KIT_API_KEY` — Kit API key
- `KIT_BCP_MEMBER_TAG_ID` — 8240961
- `KIT_TAG_BCP_WAITLIST` — 8231366
- `KIT_TAG_QUESTIONNAIRE_SUBMITTED` — 19206526
- `KIT_TAG_WINDOW_OPEN_NOTIFICATION` — 19208524

### Window
- `NEXT_PUBLIC_WINDOW_OPEN` — UTC ISO string
- `NEXT_PUBLIC_WINDOW_CLOSE` — UTC ISO string

### Feature Flags
- `NEXT_PUBLIC_ENABLE_SUBSCRIPTION` — Show quarterly auto-renew option (true/false)

### Admin
- `ADMIN_SECRET` — Password for admin actions
- `VERCEL_TOKEN` — For window update + redeploy
- `VERCEL_PROJECT_ID` — Vercel project ID
- `VERCEL_GIT_REPO_ID` — Vercel git repo ID

### Discord
- `DISCORD_WEBHOOK_URL` — Webhook for notifications

### Google Forms (when configured)
- `BCP_GOOGLE_FORM_ACTION_URL` + `BCP_FORM_FIELD_*` entries

## Pages

| Path | Purpose | Window-gated? |
|---|---|---|
| `/` | Checkout / landing page | Yes |
| `/join` | Invite page (bypass window) | No |
| `/welcome` | Post-payment confirmation + questionnaire | No |
| `/questionnaire` | Standalone questionnaire (email links) | No |
| `/insight` | Boundless Insight lead magnet | No |
| `/preview` | Admin panel + preview all pages | No |
