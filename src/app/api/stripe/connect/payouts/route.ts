import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Retrieve payouts for the connected account
    const payouts = await stripe.payouts.list({
      limit: limit,
      expand: ['data.destination'],
    }, {
      stripeAccount: accountId,
    });

    // Format payouts for frontend
    const formattedPayouts = payouts.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : undefined,
      description: payout.description || undefined,
      created: payout.created,
      method: payout.method,
      type: payout.type,
    }));

    return NextResponse.json({
      payouts: formattedPayouts,
      hasMore: payouts.has_more,
    });
  } catch (error: any) {
    console.error('Error retrieving Stripe payouts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve payouts' },
      { status: 500 }
    );
  }
}

