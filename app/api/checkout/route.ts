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
    const { customerEmail, bypassWindow, paymentMode: requestedMode } = await request.json();

    // Boundless Tracking: carry the source video code (set by the /t/<code>
    // redirect as the bt_src cookie) into Stripe metadata, so the Stripe
    // webhook can attribute this sale to the video that drove it.
    const btSrc = request.cookies.get('bt_src')?.value || '';
    const trackingMeta = btSrc ? { bt_src: btSrc } : {};

    // Determine effective payment mode based on checkout mode config
    // Installment is always allowed regardless of checkout mode (it's a payment split, not a mode)
    const checkoutMode = process.env.NEXT_PUBLIC_CHECKOUT_MODE || (process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTION === 'true' ? 'both' : 'one-time');
    let paymentMode = requestedMode;
    if (requestedMode !== 'installment' && requestedMode !== 'installment3') {
      if (checkoutMode === 'subscription') {
        paymentMode = 'subscription';
      } else if (checkoutMode === 'one-time') {
        paymentMode = undefined;
      }
    }

    // Enforce purchase window server-side
    // The /join page sends bypassWindow=true to skip this check
    if (!bypassWindow) {
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
    }

    const origin = request.headers.get('origin') || 'https://bcp.boundlesscreator.com';
    const stripe = getStripe();

    // Subscription mode: recurring quarterly ($333/quarter)
    if (paymentMode === 'subscription') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Program — Founders Edition',
                description: 'Quarterly membership: Personal channel review, weekly live sessions, resource library, Discord access. Renews every 3 months until cancelled.',
              },
              unit_amount: 99900, // $999.00
              recurring: {
                interval: 'month',
                interval_count: 3, // every 3 months
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            ...trackingMeta,
            program: 'bcp-founders',
            payment_type: 'subscription',
          },
        },
        metadata: {
          ...trackingMeta,
          program: 'bcp-founders',
          duration: 'quarterly-recurring',
          payment_type: 'subscription',
        },
        success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url });
    }

    // Installment mode: 2 payments of $600, billed 30 days apart
    if (paymentMode === 'installment') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Program — Founders Edition (Installment)',
                description: '2 payments of $600, billed 30 days apart. Full 6-month program access.',
              },
              unit_amount: 60000, // $600.00
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
            ...trackingMeta,
            program: 'bcp-founders',
            payment_type: 'installment',
            total_payments: '2',
          },
        },
        metadata: {
          ...trackingMeta,
          program: 'bcp-founders',
          duration: '6 months',
          payment_type: 'installment',
          total_payments: '2',
        },
        success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url });
    }

    // Installment3 mode: 3 payments of $333, billed monthly (=$999, no upcharge)
    if (paymentMode === 'installment3') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Boundless Creator Program — Founders Edition (3-Pay)',
                description: '3 monthly payments of $333. Full 6-month program access.',
              },
              unit_amount: 33300, // $333.00
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
            ...trackingMeta,
            program: 'bcp-founders',
            payment_type: 'installment',
            total_payments: '3',
          },
        },
        metadata: {
          ...trackingMeta,
          program: 'bcp-founders',
          duration: '6 months',
          payment_type: 'installment',
          total_payments: '3',
        },
        success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url });
    }

    // Default: one-time payment ($999)
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
              description: '6 months: Personal channel review, weekly live sessions, resource library, Discord access, founders rate locked in.',
            },
            unit_amount: 99900, // $999.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        ...trackingMeta,
        program: 'bcp-founders',
        duration: '3 months',
        payment_type: 'one-time',
      },
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
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
