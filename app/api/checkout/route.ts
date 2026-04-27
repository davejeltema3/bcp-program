import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getWindowConfig, getWindowState } from '@/lib/window';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Enforce purchase window server-side
    // Even if someone has the page open from before, this blocks payment
    const windowConfig = getWindowConfig();
    const state = getWindowState(windowConfig);

    if (state !== 'open') {
      return NextResponse.json(
        { error: state === 'before'
          ? 'The purchase window is not open yet. Check back soon!'
          : 'The purchase window has closed. Join the waitlist to get notified about the next one.' },
        { status: 403 }
      );
    }

    const { customerEmail } = await request.json();

    const origin = request.headers.get('origin') || 'https://bcp.boundlesscreator.com';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Boundless Creator Program — Founders Edition',
              description: '3 months: Personal channel review, weekly live sessions, resource library, Discord access, founders rate locked in.',
            },
            unit_amount: 99900, // $999.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        program: 'bcp-founders',
        duration: '3 months',
      },
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
