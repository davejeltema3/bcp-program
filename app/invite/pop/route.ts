import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
  });
}

/**
 * Bespoke checkout links for Bill "Pop" Sugarek (high-ticket / BCA).
 *
 *   /invite/pop            -> one-time $3,000
 *   /invite/pop?plan=6mo   -> 6 monthly payments of $1,900 ($11,400 total)
 *
 * Metadata program is 'bca-pop' ON PURPOSE, not 'bcp-founders'. The Stripe
 * webhook treats 'bca-pop' specially: it does NOT generate a Discord invite,
 * tag Kit, or write a Members Sheet row (Bill is onboarded manually — see
 * Boundless Research call-day-prep). It DOES notify Dave and, for the plan,
 * auto-cancels the subscription after the 6th payment so it never over-bills.
 *
 * success_url points at the homepage, not /welcome, to avoid the welcome page's
 * BCP Member Kit tagging. Plain GET links Dave can paste anywhere; each visit
 * mints a fresh Stripe Checkout Session and redirects straight to Stripe.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const plan = request.nextUrl.searchParams.get('plan');
  const stripe = getStripe();

  try {
    let session: Stripe.Checkout.Session;

    if (plan === '6mo') {
      // 6 monthly payments of $1,900 = $11,400. Auto-cancels after the 6th
      // charge via the webhook (payment_type installment, total_payments 6).
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Accelerator — 1-on-1 Coaching (6-Pay)',
                description: '6 monthly payments of $1,900 ($11,400 total). 6 months of weekly 1-on-1 calls.',
              },
              unit_amount: 190000, // $1,900.00
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
            program: 'bca-pop',
            payment_type: 'installment',
            total_payments: '6',
          },
        },
        metadata: {
          program: 'bca-pop',
          payment_type: 'installment',
          total_payments: '6',
        },
        success_url: `${origin}/?paid=1`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });
    } else {
      // Default: one-time $3,000
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Accelerator — 1-on-1 Coaching',
                description: 'One-time payment.',
              },
              unit_amount: 300000, // $3,000.00
            },
            quantity: 1,
          },
        ],
        metadata: {
          program: 'bca-pop',
          payment_type: 'one-time',
        },
        success_url: `${origin}/?paid=1`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });
    }

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error: any) {
    console.error('Pop checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start checkout' },
      { status: 500 }
    );
  }
}
