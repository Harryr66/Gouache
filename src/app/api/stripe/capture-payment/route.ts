import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * CAPTURE AUTHORIZED PAYMENT
 * 
 * This endpoint captures a previously authorized payment.
 * Call this ONLY after enrollment/access has been successfully granted.
 * 
 * If enrollment fails, DO NOT call this - the authorization will expire
 * and the card will NOT be charged.
 */

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });

    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing paymentIntentId' },
        { status: 400 }
      );
    }

    console.log(`[CAPTURE PAYMENT] Capturing payment: ${paymentIntentId}`);

    // Capture the authorized payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    console.log(`[CAPTURE PAYMENT] ✅ Payment captured: ${paymentIntent.id}`);

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });

  } catch (error: any) {
    console.error('[CAPTURE PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment', details: error.message },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

