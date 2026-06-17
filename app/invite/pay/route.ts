import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
  });
}

/**
 * Private invite checkout links for direct outreach (e.g. a Google Doc invite).
 *
 * Plain GET links Dave can paste anywhere. Each visit mints a fresh Stripe
 * Checkout Session and redirects straight to Stripe. These intentionally bypass
 * the public purchase window — they're direct, private invites, not the open
 * checkout. Pricing is inline here (same pattern as app/api/checkout/route.ts),
 * so price lives in code only.
 *
 *   /invite/pay               -> 3 monthly payments of $333 ($999 total, no upcharge)
 *   /invite/pay?plan=full     -> one-time $999
 *
 * The 3-pay subscription is tagged payment_type=installment, total_payments=3, so
 * the Stripe webhook (app/api/webhooks/stripe/route.ts) auto-cancels it after the
 * third charge.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const plan = request.nextUrl.searchParams.get('plan');
  const stripe = getStripe();

  try {
    let session: Stripe.Checkout.Session;

    if (plan === 'full') {
      // One-time payment: $999
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Program — Founders Edition',
                description:
                  '6 months: personal channel review, weekly live sessions, resource library, Discord access, founders rate locked in.',
              },
              unit_amount: 99900,
            },
            quantity: 1,
          },
        ],
        metadata: {
          program: 'bcp-founders',
          duration: '6 months',
          payment_type: 'one-time',
        },
        success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });
    } else {
      // Default: 3 monthly payments of $333 (=$999, no upcharge)
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Program — Founders Edition (3-Pay)',
                description:
                  '3 monthly payments of $333. Full Founders Edition access: personal channel review, weekly live sessions, resource library, Discord.',
              },
              unit_amount: 33300,
              recurring: {
                interval: 'month',
                interval_count: 1,
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            program: 'bcp-founders',
            payment_type: 'installment',
            total_payments: '3',
          },
        },
        metadata: {
          program: 'bcp-founders',
          duration: '6 months',
          payment_type: 'installment',
          total_payments: '3',
        },
        success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });
    }

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error: any) {
    console.error('Invite checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start checkout' },
      { status: 500 }
    );
  }
}
