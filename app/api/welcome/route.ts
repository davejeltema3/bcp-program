import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const testMode = request.nextUrl.searchParams.get('test') === 'true';

    if (testMode) {
      return NextResponse.json({
        success: true,
        customerName: 'Test User',
        customerEmail: 'test@example.com',
      });
    }

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No session ID' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ success: false, error: 'Payment not confirmed' }, { status: 400 });
    }

    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

    // Tag as BCP Member in Kit (reuse existing tag)
    if (process.env.KIT_API_KEY && customerEmail) {
      try {
        await tagKitMember(customerEmail, customerName || undefined);
      } catch (error) {
        console.error('Kit tagging error:', error);
      }
    }

    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendDiscordNotification(customerName, customerEmail);
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
    });
  } catch (error: any) {
    console.error('Welcome verification error:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify payment' }, { status: 500 });
  }
}

async function tagKitMember(email: string, name?: string) {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) return;

  // Create/update subscriber
  await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    },
    body: JSON.stringify({
      email_address: email,
      ...(name ? { first_name: name.split(' ')[0] } : {}),
    }),
  });

  // Tag with BCP Member (reuse existing tag ID)
  const tagId = process.env.KIT_BCP_MEMBER_TAG_ID || '8240961';
  await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    },
    body: JSON.stringify({ email_address: email }),
  });
}

async function sendDiscordNotification(name?: string | null, email?: string | null) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const embed = {
    title: '🎉 New BCP Founders Member!',
    color: 0x22c55e,
    fields: [
      { name: 'Name', value: name || 'Unknown', inline: true },
      { name: 'Email', value: email || 'N/A', inline: true },
      { name: 'Program', value: 'BCP Founders Edition ($999)', inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
