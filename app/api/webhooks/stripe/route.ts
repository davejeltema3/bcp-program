import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Stripe webhook handler for BCP (bcp.boundlesscreator.com).
 * 
 * Supports TWO webhook secrets (same pattern as Accelerator):
 *   - STRIPE_WEBHOOK_SECRET: Reserved for future subscription management
 *   - STRIPE_WEBHOOK_SECRET_NOTIFICATIONS: Checkout notifications (checkout.session.completed)
 * 
 * Both Stripe webhooks point to the same URL:
 *   https://bcp.boundlesscreator.com/api/webhooks/stripe
 * 
 * The route tries both secrets to verify the signature.
 * 
 * Setup in Stripe Dashboard:
 *   1. Go to Developers → Webhooks → Add endpoint
 *   2. URL: https://bcp.boundlesscreator.com/api/webhooks/stripe
 *   3. Events: checkout.session.completed (and customer.subscription.* when ready)
 *   4. Copy signing secret → set as STRIPE_WEBHOOK_SECRET_NOTIFICATIONS env var
 */

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
  });
}

function verifyWebhook(stripe: Stripe, body: string, signature: string): Stripe.Event {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_NOTIFICATIONS,
  ].filter(Boolean) as string[];

  if (secrets.length === 0) {
    throw new Error('No webhook secrets configured');
  }

  let lastError: Error | null = null;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Webhook verification failed');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = verifyWebhook(stripe, body, sig);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Process BCP payments
        if (session.metadata?.program === 'bcp-founders') {
          const name = session.customer_details?.name || 'Unknown';
          const email = session.customer_details?.email || 'N/A';
          const amount = session.amount_total ? `$${(session.amount_total / 100).toFixed(0)}` : '$999';

          // Discord notification
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

          // Tag in Kit immediately (backup — /welcome also tags, but this catches edge cases)
          if (process.env.KIT_API_KEY && email !== 'N/A') {
            try {
              const apiKey = process.env.KIT_API_KEY;

              await fetch('https://api.kit.com/v4/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
                body: JSON.stringify({
                  email_address: email,
                  ...(name !== 'Unknown' ? { first_name: name.split(' ')[0] } : {}),
                }),
              });

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
        break;
      }

      // Future: handle recurring subscription events
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`New subscription created: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        // Future: handle recurring payment success (renewal notifications)
        console.log('Invoice payment succeeded');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription cancelled: ${subscription.id}`);
        // Future: remove BCP Member tag, send Discord alert
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: `Handler failed: ${err.message}` }, { status: 500 });
  }
}
