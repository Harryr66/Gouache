import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
    const { 
      amount, 
      currency = 'usd', 
      artistId, 
      itemId, 
      itemType, // 'original', 'print', 'book', 'course'
      buyerId,
      description
    } = body;

    // Validate required fields
    if (!amount || !artistId || !itemId || !itemType || !buyerId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, artistId, itemId, itemType, buyerId' },
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

    // Get artist's Stripe account info
    const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
    if (!artistDoc.exists()) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    const artistData = artistDoc.data();
    const stripeAccountId = artistData.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Artist has not connected Stripe account' },
        { status: 400 }
      );
    }

    // Verify artist's Stripe account is ready
    if (artistData.stripeOnboardingStatus !== 'complete' || 
        !artistData.stripeChargesEnabled || 
        !artistData.stripePayoutsEnabled) {
      return NextResponse.json(
        { error: 'Artist Stripe account is not ready to accept payments' },
        { status: 400 }
      );
    }

    // Verify item exists and is available
    let itemDoc;
    let itemData;
    
    if (itemType === 'course') {
      itemDoc = await getDoc(doc(db, 'courses', itemId));
    } else if (itemType === 'book') {
      itemDoc = await getDoc(doc(db, 'books', itemId));
    } else if (itemType === 'original' || itemType === 'print') {
      itemDoc = await getDoc(doc(db, 'artworks', itemId));
    } else if (itemType === 'merchandise' || itemType === 'product') {
      // Check marketplaceProducts collection for products/merchandise
      itemDoc = await getDoc(doc(db, 'marketplaceProducts', itemId));
    } else {
      return NextResponse.json(
        { error: 'Invalid item type' },
        { status: 400 }
      );
    }

    if (!itemDoc?.exists()) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    itemData = itemDoc.data();

    // Verify item belongs to artist
    const itemArtistId = itemData.artist?.userId || itemData.instructor?.userId || itemData.artistId || itemData.sellerId;
    if (itemArtistId !== artistId) {
      return NextResponse.json(
        { error: 'Item does not belong to this artist' },
        { status: 403 }
      );
    }

    // Check if item is available for sale
    if (itemType === 'course' && itemData.isActive === false) {
      return NextResponse.json(
        { error: 'Course is not available' },
        { status: 400 }
      );
    }

    if ((itemType === 'original' || itemType === 'print') && 
        (!itemData.isForSale || itemData.sold)) {
      return NextResponse.json(
        { error: 'Item is not available for sale' },
        { status: 400 }
      );
    }

    if (itemType === 'book' && itemData.isAvailable === false) {
      return NextResponse.json(
        { error: 'Book is not available' },
        { status: 400 }
      );
    }

    // Check if marketplace product is available
    if ((itemType === 'merchandise' || itemType === 'product') && 
        (!itemData.isActive || itemData.deleted || itemData.stock === 0)) {
      return NextResponse.json(
        { error: 'Product is not available for sale' },
        { status: 400 }
      );
    }

    // 0% platform commission - commission free platform
    // Artist receives full payment minus Stripe processing fees only
    const platformCommissionPercentage = 0;
    const platformCommissionAmount = 0;
    const applicationFeeAmount = 0;

    // Buyer pays exactly what artist set
    // Artist receives 100% minus Stripe fees (no platform commission)
    const totalAmountInCents = amountInCents;

    // Create payment intent with MANUAL capture
    // Card is AUTHORIZED but NOT CHARGED until we capture it
    // This prevents charging customers if enrollment fails
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountInCents,
      currency: currency.toLowerCase(),
      capture_method: 'manual', // CRITICAL: Authorize only, don't charge yet
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        userId: buyerId,
        artistId: artistId,
        itemType: itemType,
        itemId: itemId,
        itemTitle: itemData.title || 'Untitled',
        platform: 'gouache',
        productAmount: totalAmountInCents.toString(),
        totalAmount: totalAmountInCents.toString(),
        platformCommissionAmount: '0', // Commission free
        platformCommissionPercentage: '0', // Commission free
        ...(itemType === 'merchandise' || itemType === 'product' ? { stock: (itemData.stock || 0).toString() } : {}),
      },
      description: description || `Purchase: ${itemData.title || itemType}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Return client secret for frontend
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      applicationFeeAmount, // 0% - commission free
      productAmount: totalAmountInCents,
      totalAmount: totalAmountInCents,
      platformCommissionAmount,
      platformCommissionPercentage,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message || 'Card error occurred' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

