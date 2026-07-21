import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createPaymentRow, markRefunded } from '@/lib/sheets';

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

/**
 * Cancel timestamp for a fixed-installment subscription: the end of the final
 * paid period (billing anchor + totalPayments calendar months). Setting cancel_at
 * to a period boundary makes the last invoice bill a FULL period. The old approach
 * used a mid-cycle date (~20 days after the final charge), which made Stripe
 * prorate that last invoice down and under-collect the plan total. Reads the
 * subscription's real billing anchor.
 */
async function installmentCancelAt(stripe: Stripe, subId: string, totalPayments: number): Promise<number> {
  const sub = await stripe.subscriptions.retrieve(subId);
  const anchorSec: number = (sub as any).billing_cycle_anchor || (sub as any).start_date;
  const end = new Date(anchorSec * 1000);
  end.setUTCMonth(end.getUTCMonth() + totalPayments);
  return Math.floor(end.getTime() / 1000);
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

async function tagKit(email: string, name?: string, tagId?: string, customFields?: Record<string, string>) {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey || !email) return;

  // Create/update subscriber (with optional custom fields like discord_invite)
  await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
    body: JSON.stringify({
      email_address: email,
      ...(name ? { first_name: name.split(' ')[0] } : {}),
      ...(customFields ? { fields: customFields } : {}),
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

/**
 * Generate a single-use Discord invite for a new member.
 * Creates the invite at payment time so each member gets exactly one.
 * Returns the full invite URL or null if Discord isn't configured.
 */
async function generateDiscordInvite(): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_INVITE_CHANNEL_ID;

  if (!botToken || !channelId) return null;

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/invites`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_age: 0, // never expires — single-use still keeps it non-shareable
        max_uses: 1,
        unique: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Discord API error:', data);
      return null;
    }

    if (data.code && typeof data.code === 'string') {
      return `https://discord.gg/${data.code}`;
    }
    console.error('Discord invite creation failed — no invite code returned:', data);
    return null;
  } catch (err) {
    console.error('Discord invite generation error:', err);
    return null;
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

          // Boundless Tracking: attribute this sale to the source video, if the
          // buyer arrived through a /t/<code> link (bt_src in metadata).
          try {
            const btSrc = session.metadata?.bt_src || '';
            if (btSrc) {
              const { resolveCode } = await import('@/lib/tracking-registry');
              const { appendSale } = await import('@/lib/tracking');
              await appendSale({
                email,
                code: btSrc,
                videoId: resolveCode(btSrc).videoId,
                amount,
                mode: session.metadata?.payment_type || (isSubscription ? 'subscription' : 'one-time'),
                session: session.id,
              });
            }
          } catch (err) {
            console.error('[tracking] sale log failed:', err);
          }

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

          // Generate a unique single-use Discord invite for this member
          let discordInviteUrl: string | null = null;
          try {
            discordInviteUrl = await generateDiscordInvite();
            if (discordInviteUrl) {
              console.log(`Discord invite generated for ${email}: ${discordInviteUrl}`);
            }
          } catch (err) {
            console.error('Discord invite generation failed:', err);
          }

          // Auto-cancel installment subscriptions after the final payment.
          // (cancel_at isn't available in the checkout session for this SDK version,
          //  so we set it here once the subscription exists.)
          // cancel_at is the end of the final paid period (anchor + totalPayments
          // months), so the last invoice bills a FULL period. Do NOT use a mid-cycle
          // date — Stripe prorates the final invoice down to it and under-collects.
          if (session.mode === 'subscription' && session.metadata?.payment_type === 'installment' && session.subscription) {
            try {
              const subId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any).id;
              const totalPayments = parseInt(session.metadata?.total_payments || '2', 10);
              const cancelAt = await installmentCancelAt(stripe, subId, totalPayments);
              await stripe.subscriptions.update(subId, { cancel_at: cancelAt });
              console.log(`Installment subscription ${subId} (${totalPayments} payments) set to auto-cancel at ${new Date(cancelAt * 1000).toISOString()}`);
            } catch (err) {
              console.error('Failed to set installment auto-cancel:', err);
            }
          }

          // Tag as BCP Member in Kit + store Discord invite as custom field
          if (email !== 'N/A') {
            try {
              const tagId = process.env.KIT_BCP_MEMBER_TAG_ID || '8240961';
              const customFields = discordInviteUrl
                ? { discord_invite: discordInviteUrl }
                : undefined;
              await tagKit(email, name !== 'Unknown' ? name : undefined, tagId, customFields);
            } catch (err) {
              console.error('Kit tagging from webhook failed:', err);
            }
          }

          // Create/update member row in Google Sheet with full payment details
          if (email !== 'N/A') {
            try {
              const amountPaid = session.amount_total ? session.amount_total / 100 : 999;
              const paymentType = session.metadata?.payment_type === 'installment' ? 'installment' : 'one-time';
              const stripeCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || '';
              const stripeSessionId = session.id;

              await createPaymentRow(name, email, {
                paymentType,
                amountPaid,
                stripeCustomerId,
                stripeSessionId,
                discordInviteUrl: discordInviteUrl || undefined,
              });
              console.log(`Sheet row created/updated for ${email}`);
            } catch (err) {
              console.error('Sheet row creation failed:', err);
            }
          }
        }

        /* ─── HIGH-TICKET CUSTOM PLAN (e.g. Pop / BCA) ─── */
        // program 'bca-pop' intentionally skips the founders onboarding (no
        // Discord invite, no Kit tag, no Sheet row — those are handled manually
        // for high-ticket members). We only (a) notify Dave so he knows to
        // onboard by hand, and (b) auto-cancel the installment after its final
        // payment so the subscription doesn't keep billing past the plan.
        if (session.metadata?.program === 'bca-pop') {
          const name = session.customer_details?.name || 'Unknown';
          const email = session.customer_details?.email || 'N/A';
          const amount = session.amount_total ? `$${(session.amount_total / 100).toFixed(0)}` : 'N/A';
          const isInstallment = session.metadata?.payment_type === 'installment';

          try {
            await discordNotify({
              title: '💎 High-Ticket Payment (BCA)',
              color: 0x8b5cf6,
              fields: [
                { name: 'Name', value: name, inline: true },
                { name: 'Email', value: email, inline: true },
                { name: 'Amount', value: amount, inline: true },
                { name: 'Type', value: isInstallment ? `🔄 Installment (${session.metadata?.total_payments || '?'} payments)` : '💵 One-Time', inline: true },
                { name: 'Onboarding', value: '⚠️ Manual — add to Discord + Members Sheet by hand.', inline: false },
                { name: 'Stripe', value: `[View](https://dashboard.stripe.com/payments/${session.payment_intent || session.subscription})`, inline: false },
              ],
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Discord high-ticket notification failed:', err);
          }

          // Auto-cancel the installment after the final payment (same logic as founders).
          if (session.mode === 'subscription' && isInstallment && session.subscription) {
            try {
              const subId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any).id;
              const totalPayments = parseInt(session.metadata?.total_payments || '6', 10);
              const cancelAt = await installmentCancelAt(stripe, subId, totalPayments);
              await stripe.subscriptions.update(subId, { cancel_at: cancelAt });
              console.log(`bca-pop installment ${subId} (${totalPayments} payments) set to auto-cancel at ${new Date(cancelAt * 1000).toISOString()}`);
            } catch (err) {
              console.error('Failed to set bca-pop installment auto-cancel:', err);
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

      /* ─── REFUND (mark member out, grey the row) ─── */
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const email = (charge.billing_details?.email || charge.receipt_email || '').trim();
        const name = charge.billing_details?.name || 'Unknown';
        const fullyRefunded = charge.amount_refunded >= charge.amount;

        // The event fires at refund time, so event.created is the refund date.
        const refundDate = new Date(event.created * 1000)
          .toLocaleDateString('en-US', { timeZone: 'America/New_York' });

        // Only act on a full refund of an existing member row. Partial refunds
        // and non-members (BCA/high-ticket handled by hand, test charges) just
        // notify so nothing gets marked out by accident.
        let marked = false;
        if (email && fullyRefunded) {
          try {
            marked = await markRefunded(email, refundDate);
          } catch (err) {
            console.error('markRefunded failed:', err);
          }
        }

        try {
          await discordNotify({
            title: fullyRefunded ? '↩️ BCP Refund Processed' : '↩️ BCP Partial Refund',
            color: 0xf59e0b,
            fields: [
              { name: 'Name', value: name, inline: true },
              { name: 'Email', value: email || 'N/A', inline: true },
              { name: 'Refunded', value: `$${(charge.amount_refunded / 100).toFixed(0)} of $${(charge.amount / 100).toFixed(0)}`, inline: true },
              { name: 'Members Sheet', value: marked ? '✅ Status → Refunded, End Date set' : '⚠️ No member row matched — handle by hand', inline: false },
              { name: 'Stripe', value: `[View](https://dashboard.stripe.com/payments/${charge.payment_intent})`, inline: false },
            ],
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Discord refund notification failed:', err);
        }
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
