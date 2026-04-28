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
VERCEL_TOKEN=(create at vercel.com/account/tokens)
VERCEL_PROJECT_ID=(shown after Vercel import)
VERCEL_GIT_REPO_ID=(from Vercel project settings → Git)
```

## Google Forms (set up later when form is created)
```
BCP_GOOGLE_FORM_ACTION_URL=(form action URL)
BCP_FORM_FIELD_NAME_CHANNEL=entry.XXXXXXX
BCP_FORM_FIELD_DAY_JOB=entry.XXXXXXX
... (entry IDs from your Google Form)
```
