import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const accountId = searchParams.get('accountId');

    if (!userId && !accountId) {
      return NextResponse.json(
        { error: 'User ID or Account ID is required' },
        { status: 400 }
      );
    }

    // If accountId is provided, use it directly
    // Otherwise, we'd need to look it up from Firestore using userId
    let stripeAccountId = accountId;

    if (!stripeAccountId && userId) {
      // In a real implementation, you'd fetch the accountId from Firestore
      // For now, we'll require accountId to be passed
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId!);

    // Check onboarding status
    const detailsSubmitted = account.details_submitted;
    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;

    let onboardingStatus: 'incomplete' | 'pending' | 'complete' = 'incomplete';
    
    if (detailsSubmitted && chargesEnabled && payoutsEnabled) {
      onboardingStatus = 'complete';
    } else if (detailsSubmitted) {
      onboardingStatus = 'pending';
    }

    return NextResponse.json({
      accountId: account.id,
      onboardingStatus,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      accountType: account.type,
    });
  } catch (error: any) {
    console.error('Error checking Stripe account status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check account status' },
      { status: 500 }
    );
  }
}

