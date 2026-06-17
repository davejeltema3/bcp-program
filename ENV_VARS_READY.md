# BCP Program — Environment Variables to Set in Vercel

Copy these into Vercel after importing the repo.

## Stripe (same account as Accelerator)
```
STRIPE_SECRET_KEY=sk_live_... (same key from apply.boundlesscreator.com)
STRIPE_WEBHOOK_SECRET=(reserved for future subscription management webhook)
STRIPE_WEBHOOK_SECRET_NOTIFICATIONS=whsec_... (checkout.session.completed notifications)
```

## Kit
```
KIT_API_KEY=kit_6f42e7370634ea1fc6b761ae0e37dc86
KIT_BCP_MEMBER_TAG_ID=8240961
KIT_TAG_BCP_WAITLIST=8231366
KIT_TAG_BOUNDLESS_INSIGHT=19206528
KIT_TAG_QUESTIONNAIRE_SUBMITTED=19206526
```

## Purchase Window (May 1 9AM EST → May 3 11:59PM EST)
```
NEXT_PUBLIC_WINDOW_OPEN=2026-05-01T13:00:00.000Z
NEXT_PUBLIC_WINDOW_CLOSE=2026-05-04T04:59:59.000Z
```

## Discord (reuse from Accelerator if same server)
```
DISCORD_WEBHOOK_URL=(your #dashboard webhook URL)
DISCORD_BOT_TOKEN=(if using dynamic invites)
DISCORD_INVITE_CHANNEL_ID=(channel for invite links)
DISCORD_INVITE_SECRET=(pick any password)
```

## Admin Panel (/preview page)
```
ADMIN_SECRET=(pick a password you'll remember)
VERCEL_TOKEN=(create at vercel.com/account/tokens, scope = Dave Jeltema's projects, no expiration)
VERCEL_PROJECT_ID=prj_5AxKaJEUJViY6RujaCzCIEP782DX
VERCEL_GIT_REPO_ID=1222997848
```

> All four are required for the admin window-setter and checkout-mode routes.
> If VERCEL_TOKEN or VERCEL_PROJECT_ID is missing, those routes return
> "Vercel API not configured" (500). VERCEL_GIT_REPO_ID is only needed for the
> auto-redeploy step; without it the env vars still update but you must redeploy
> by hand. PROJECT_ID and REPO_ID above are the real values, filled in 2026-06-16.
> If the token ever expires or is revoked, the error comes back — re-create it
> with no expiration and these routes work again.

## Live subscriber count (/api/channel-stats, hero stat)
```
YOUTUBE_API_KEY=(YouTube Data API v3 key)
```
> Create in the same Google Cloud project as the sheets service account
> (davejeltemadotco-1699158105209) at console.cloud.google.com → APIs & Services
> → Credentials → Create API key, then enable "YouTube Data API v3" and restrict
> the key to it. Optional: if missing, the hero falls back to 70K (SUBSCRIBER_FALLBACK
> in lib/site-stats.ts). The count is cached 6 hours, so it updates on its own with
> no GitHub push. Years-on-YouTube is pure date math (no key, auto-bumps each Jan 25).

## Google Forms (set up later when form is created)
```
BCP_GOOGLE_FORM_ACTION_URL=(form action URL)
BCP_FORM_FIELD_NAME_CHANNEL=entry.XXXXXXX
BCP_FORM_FIELD_DAY_JOB=entry.XXXXXXX
... (entry IDs from your Google Form)
```
