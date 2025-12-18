import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Stripe with secret key from environment
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

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
      country: account.country, // Include country in response
    });
  } catch (error: any) {
    console.error('Error checking Stripe account status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check account status' },
      { status: 500 }
    );
  }
}

