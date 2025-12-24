import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // Check for Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });

    const body = await request.json();
    const { artistId, amount } = body;

    // Validate required fields
    if (!amount || !artistId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, artistId' },
        { status: 400 }
      );
    }

    // Validate amount (must be positive and in cents)
    const amountInCents = Math.round(amount);
    if (amountInCents < 50) { // Minimum $0.50
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    // Get artist's profile
    const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
    if (!artistDoc.exists()) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    const artistData = artistDoc.data();

    // Create Stripe Checkout Session for one-time donation
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Gouache Platform Support',
              description: 'One-time donation to support the Gouache platform',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile/edit?donation=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile/edit?donation=cancelled`,
      metadata: {
        artistId: artistId,
        donationType: 'one-time',
        amount: amountInCents.toString(),
      },
      customer_email: artistData.email,
    });

    // Return session URL
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating donation checkout:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create donation checkout. Please try again.' },
      { status: 500 }
    );
  }
}
