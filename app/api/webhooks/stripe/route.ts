import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Stripe webhook — fires instantly on payment events.
 * Sends Discord notification the moment someone pays.
 * 
 * Setup in Stripe Dashboard:
 *   1. Go to Developers → Webhooks → Add endpoint
 *   2. URL: https://bcp.boundlesscreator.com/api/webhooks/stripe
 *   3. Events: checkout.session.completed
 *   4. Copy signing secret → set as STRIPE_WEBHOOK_SECRET env var
 */

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only process BCP Founders payments
    if (session.metadata?.program === 'bcp-founders') {
      const name = session.customer_details?.name || 'Unknown';
      const email = session.customer_details?.email || 'N/A';
      const amount = session.amount_total ? `$${(session.amount_total / 100).toFixed(0)}` : '$999';

      // Instant Discord notification
      if (process.env.DISCORD_WEBHOOK_URL) {
        try {
          await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '💰 New BCP Founders Payment!',
                color: 0x22c55e,
                fields: [
                  { name: 'Name', value: name, inline: true },
                  { name: 'Email', value: email, inline: true },
                  { name: 'Amount', value: amount, inline: true },
                  { name: 'Program', value: 'BCP Founders Edition', inline: false },
                  { name: 'Stripe', value: `[View in Stripe](https://dashboard.stripe.com/payments/${session.payment_intent})`, inline: false },
                ],
                timestamp: new Date().toISOString(),
              }],
            }),
          });
        } catch (err) {
          console.error('Discord notification failed:', err);
        }
      }

      // Tag in Kit immediately (don't wait for /welcome visit)
      if (process.env.KIT_API_KEY && email !== 'N/A') {
        try {
          const apiKey = process.env.KIT_API_KEY;

          // Create/update subscriber
          await fetch('https://api.kit.com/v4/subscribers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
            body: JSON.stringify({
              email_address: email,
              ...(name !== 'Unknown' ? { first_name: name.split(' ')[0] } : {}),
            }),
          });

          // Tag as BCP Member
          const tagId = process.env.KIT_BCP_MEMBER_TAG_ID || '8240961';
          await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
            body: JSON.stringify({ email_address: email }),
          });
        } catch (err) {
          console.error('Kit tagging from webhook failed:', err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
