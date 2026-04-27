import { NextRequest, NextResponse } from 'next/server';

/**
 * Waitlist / lead capture endpoint.
 * Tags subscribers in Kit based on source:
 *   - "before" / "after" → BCP Waitlist tag
 *   - "insight" → Boundless Insight tag
 */
export async function POST(request: NextRequest) {
  try {
    const { email, firstName, source } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const apiKey = process.env.KIT_API_KEY;
    if (!apiKey) {
      console.error('KIT_API_KEY not set');
      return NextResponse.json({ success: true }); // Don't expose config issues
    }

    // Create/update subscriber
    const subResponse = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': apiKey,
      },
      body: JSON.stringify({
        email_address: email,
        ...(firstName ? { first_name: firstName } : {}),
      }),
    });

    if (!subResponse.ok) {
      console.error('Kit subscriber creation failed:', await subResponse.text());
    }

    // Tag based on source
    let tagId: string | undefined;
    if (source === 'insight') {
      tagId = process.env.KIT_TAG_BOUNDLESS_INSIGHT;
    } else {
      // before or after = waitlist
      tagId = process.env.KIT_TAG_BCP_WAITLIST;
    }

    if (tagId) {
      const tagResponse = await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kit-Api-Key': apiKey,
        },
        body: JSON.stringify({ email_address: email }),
      });

      if (!tagResponse.ok) {
        console.error('Kit tagging failed:', await tagResponse.text());
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Waitlist error:', error);
    return NextResponse.json({ success: true }); // Graceful degradation
  }
}
