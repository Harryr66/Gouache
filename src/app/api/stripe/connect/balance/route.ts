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

    // Retrieve balance for the connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    // Calculate available and pending amounts
    const available = balance.available.reduce((sum, bal) => sum + bal.amount, 0);
    const pending = balance.pending.reduce((sum, bal) => sum + bal.amount, 0);
    const currency = balance.available[0]?.currency || 'usd';

    return NextResponse.json({
      available,
      pending,
      currency,
      balance: balance,
    });
  } catch (error: any) {
    console.error('Error retrieving Stripe balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve balance' },
      { status: 500 }
    );
  }
}

