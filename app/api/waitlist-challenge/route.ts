import { NextRequest, NextResponse } from 'next/server';
import { updateWaitlistChallenge } from '@/lib/sheets';

/**
 * Updates a waitlist entry with the user's answer to the challenge question.
 * Called from /waitlist-question after they fill in their challenge.
 *
 * Expects: { email: string, challenge: string, name?: string }
 *
 * If the email doesn't have an existing waitlist row (rare — should not happen
 * in normal flow because /api/waitlist creates the row first), creates a new
 * row marked source = 'orphan-challenge' so we can investigate.
 *
 * Note: this route used to also fire a follow-up Discord notification, but
 * the single signup notification from /api/waitlist is now the source of truth
 * for the alert. The challenge text lands in the Sheet for Dave to read there.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, challenge, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    if (!challenge || !challenge.trim()) {
      // Empty challenge is fine — they skipped. Just return success.
      return NextResponse.json({ success: true, skipped: true });
    }

    try {
      await updateWaitlistChallenge(email, challenge.trim(), name);
    } catch (error) {
      console.error('Waitlist challenge update failed:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Waitlist challenge error:', error);
    return NextResponse.json({ success: true }); // Graceful degradation
  }
}
