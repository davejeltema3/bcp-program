import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Stripe webhook handler for BCP (bcp.boundlesscreator.com).
 * 
 * Supports TWO webhook secrets (same pattern as Accelerator):
 *   - STRIPE_WEBHOOK_SECRET: Subscription lifecycle (create/renew/cancel)
 *   - STRIPE_WEBHOOK_SECRET_NOTIFICATIONS: Checkout notifications
 * 
 * Both Stripe webhooks point to the same URL:
 *   https://bcp.boundlesscreator.com/api/webhooks/stripe
 * 
 * Current webhook (STRIPE_WEBHOOK_SECRET_NOTIFICATIONS):
 *   Events: checkout.session.completed
 * 
 * Future subscription webhook (STRIPE_WEBHOOK_SECRET):
 *   Events: customer.subscription.created, invoice.payment_succeeded,
 *           invoice.payment_failed, customer.subscription.deleted
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

async function tagKit(email: string, name?: string, tagId?: string) {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey || !email) return;

  // Create/update subscriber
  await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
    body: JSON.stringify({
      email_address: email,
      ...(name ? { first_name: name.split(' ')[0] } : {}),
    }),
  });

  // Apply tag
  if (tagId) {
    await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
      body: JSON.stringify({ email_address: email }),
    });
  }
}

async function discordNotify(embed: Record<string, any>) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
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
      /* ─── CHECKOUT COMPLETED ─── */
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.program === 'bcp-founders') {
          const name = session.customer_details?.name || 'Unknown';
          const email = session.customer_details?.email || 'N/A';
          const amount = session.amount_total ? `$${(session.amount_total / 100).toFixed(0)}` : '$999';
          const isSubscription = session.mode === 'subscription';

          try {
            await discordNotify({
              title: '💰 New BCP Founders Payment!',
              color: 0x22c55e,
              fields: [
                { name: 'Name', value: name, inline: true },
                { name: 'Email', value: email, inline: true },
                { name: 'Amount', value: amount, inline: true },
                { name: 'Type', value: isSubscription ? '🔄 Quarterly Subscription' : '💵 One-Time Payment', inline: true },
                { name: 'Program', value: 'BCP Founders Edition', inline: false },
                { name: 'Stripe', value: `[View](https://dashboard.stripe.com/payments/${session.payment_intent || session.subscription})`, inline: false },
              ],
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Discord notification failed:', err);
          }

          // Tag as BCP Member in Kit
          if (email !== 'N/A') {
            try {
              const tagId = process.env.KIT_BCP_MEMBER_TAG_ID || '8240961';
              await tagKit(email, name !== 'Unknown' ? name : undefined, tagId);
            } catch (err) {
              console.error('Kit tagging from webhook failed:', err);
            }
          }
        }
        break;
      }

      /* ─── SUBSCRIPTION RENEWAL (invoice paid after first payment) ─── */
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // Skip the first invoice (already handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') {
          console.log('First invoice — already handled by checkout.session.completed');
          break;
        }

        // This is a renewal
        if (invoice.billing_reason === 'subscription_cycle') {
          const email = invoice.customer_email || 'N/A';
          const amount = invoice.amount_paid ? `$${(invoice.amount_paid / 100).toFixed(0)}` : '$999';

          try {
            await discordNotify({
              title: '🔄 BCP Subscription Renewed!',
              color: 0x3b82f6,
              fields: [
                { name: 'Email', value: email, inline: true },
                { name: 'Amount', value: amount, inline: true },
                { name: 'Period', value: `${new Date((invoice as any).period_start * 1000).toLocaleDateString()} → ${new Date((invoice as any).period_end * 1000).toLocaleDateString()}`, inline: false },
                { name: 'Stripe', value: `[View Invoice](https://dashboard.stripe.com/invoices/${invoice.id})`, inline: false },
              ],
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Discord renewal notification failed:', err);
          }
        }
        break;
      }

      /* ─── PAYMENT FAILED (subscription renewal) ─── */
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email || 'N/A';
        const amount = invoice.amount_due ? `$${(invoice.amount_due / 100).toFixed(0)}` : 'N/A';

        try {
          await discordNotify({
            title: '⚠️ BCP Payment Failed!',
            color: 0xef4444,
            fields: [
              { name: 'Email', value: email, inline: true },
              { name: 'Amount Due', value: amount, inline: true },
              { name: 'Attempt', value: `${invoice.attempt_count || 1}`, inline: true },
              { name: 'Note', value: 'Stripe will retry automatically. Check on this member.', inline: false },
              { name: 'Stripe', value: `[View Invoice](https://dashboard.stripe.com/invoices/${invoice.id})`, inline: false },
            ],
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Discord payment-failed notification failed:', err);
        }
        break;
      }

      /* ─── SUBSCRIPTION CANCELLED ─── */
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Look up customer email
        let email = 'Unknown';
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!('deleted' in customer) || !customer.deleted) {
            email = customer.email || 'Unknown';
          }
        } catch (err) {
          console.error('Failed to look up customer:', err);
        }

        try {
          await discordNotify({
            title: '🔴 BCP Subscription Cancelled',
            color: 0xef4444,
            fields: [
              { name: 'Email', value: email, inline: true },
              { name: 'Subscription ID', value: subscription.id, inline: true },
              { name: 'Status', value: subscription.status, inline: true },
              { name: 'Stripe', value: `[View](https://dashboard.stripe.com/subscriptions/${subscription.id})`, inline: false },
            ],
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Discord cancellation notification failed:', err);
        }

        // Future: could remove BCP Member tag here
        // For now, just notify — manual cleanup
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
