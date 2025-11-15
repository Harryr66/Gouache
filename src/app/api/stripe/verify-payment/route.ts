import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });

    const searchParams = request.nextUrl.searchParams;
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Try to retrieve payment intent (may be on connected account)
    // First, check our sales collection
    const salesQuery = query(
      collection(db, 'sales'),
      where('paymentIntentId', '==', paymentIntentId),
      limit(1)
    );
    const salesSnapshot = await getDocs(salesQuery);

    if (!salesSnapshot.empty) {
      const sale = salesSnapshot.docs[0].data();
      return NextResponse.json({
        status: sale.status,
        amount: sale.amount,
        currency: sale.currency,
        itemId: sale.itemId,
        itemType: sale.itemType,
        itemTitle: sale.itemTitle,
        createdAt: sale.createdAt,
      });
    }

    // If not in database yet, try to retrieve from Stripe
    // Note: This might fail if payment intent is on a connected account
    // In that case, we rely on webhook to update the database
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return NextResponse.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        itemId: paymentIntent.metadata.itemId,
        itemType: paymentIntent.metadata.itemType,
        itemTitle: paymentIntent.metadata.itemTitle,
      });
    } catch (error) {
      // Payment intent might be on connected account, return pending status
      return NextResponse.json({
        status: 'processing',
        message: 'Payment is being processed. Please check back in a moment.',
      });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

