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
      itemId, 
      itemType, // 'artwork', 'merchandise', 'product', 'course'
      buyerId,
      buyerEmail, // BUYER's email for checkout form
    } = body;

    // Validate required fields
    if (!itemId || !itemType || !buyerId) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, itemType, buyerId' },
        { status: 400 }
      );
    }

    // Get item data based on type
    let itemDoc;
    let itemData;
    let collectionName: string;
    
    if (itemType === 'artwork' || itemType === 'original' || itemType === 'print') {
      collectionName = 'artworks';
      itemDoc = await getDoc(doc(db, 'artworks', itemId));
    } else if (itemType === 'merchandise' || itemType === 'product') {
      collectionName = 'marketplaceProducts';
      itemDoc = await getDoc(doc(db, 'marketplaceProducts', itemId));
    } else if (itemType === 'course') {
      collectionName = 'courses';
      itemDoc = await getDoc(doc(db, 'courses', itemId));
    } else {
      return NextResponse.json(
        { error: 'Invalid item type. Must be artwork, merchandise, product, or course.' },
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

    // Get artist/seller/instructor ID
    const artistId = itemData.artist?.userId || itemData.artistId || itemData.sellerId || itemData.instructor?.userId;
    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist/Seller/Instructor information not found' },
        { status: 400 }
      );
    }

    // Get artist's Stripe account info
    const artistDoc = await getDoc(doc(db, 'userProfiles', artistId));
    if (!artistDoc.exists()) {
      return NextResponse.json(
        { error: 'Artist/Seller/Instructor not found' },
        { status: 404 }
      );
    }

    const artistData = artistDoc.data();
    const stripeAccountId = artistData.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Seller has not connected Stripe account' },
        { status: 400 }
      );
    }

    // Verify artist's Stripe account is ready
    if (artistData.stripeOnboardingStatus !== 'complete' || 
        !artistData.stripeChargesEnabled || 
        !artistData.stripePayoutsEnabled) {
      return NextResponse.json(
        { error: 'Seller Stripe account is not ready to accept payments' },
        { status: 400 }
      );
    }

    // Check item availability
    if (itemType === 'artwork' || itemType === 'original' || itemType === 'print') {
      if (!itemData.isForSale || itemData.sold) {
        return NextResponse.json(
          { error: 'Artwork is not available for sale' },
          { status: 400 }
        );
      }
    } else if (itemType === 'merchandise' || itemType === 'product') {
      if (!itemData.isActive || itemData.deleted || itemData.stock === 0) {
        return NextResponse.json(
          { error: 'Product is not available for sale' },
          { status: 400 }
        );
      }
    } else if (itemType === 'course') {
      if (!itemData.isPublished || itemData.deleted) {
        return NextResponse.json(
          { error: 'Course is not available for purchase' },
          { status: 400 }
        );
      }
    }

    // Get price
    const price = itemData.price;
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid item price' },
        { status: 400 }
      );
    }

    const currency = (itemData.currency || 'USD').toLowerCase();
    
    // CRITICAL PRICE CONVERSION LOGIC:
    // - COURSES: Stored in DOLLARS (e.g., 125.00) → multiply by 100 to get cents
    // - ARTWORK: Stored in CENTS (e.g., 12500) → use as-is
    // - MARKETPLACE: Stored in CENTS (e.g., 50) → use as-is
    let amountInCents: number;
    if (itemType === 'course') {
      amountInCents = Math.round(price * 100); // Course: convert dollars to cents
    } else {
      amountInCents = Math.round(price); // Artwork/Marketplace: already in cents
    }

    if (amountInCents < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    // Get base URL for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (request.headers.get('origin') || 'https://www.gouache.art');

    // Determine success URL based on item type
    let successUrl: string;
    if (itemType === 'artwork' || itemType === 'original' || itemType === 'print') {
      successUrl = `${baseUrl}/artwork/${itemId}?session_id={CHECKOUT_SESSION_ID}`;
    } else if (itemType === 'course') {
      successUrl = `${baseUrl}/learn/${itemId}?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      successUrl = `${baseUrl}/marketplace/${itemId}?session_id={CHECKOUT_SESSION_ID}`;
    }

    const cancelUrl = successUrl.split('?')[0]; // Same page without session_id

    // Get item image
    const itemImage = itemData.imageUrl || itemData.images?.[0];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual', // CRITICAL: Authorize only, capture after confirmation
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
          productAmount: amountInCents.toString(),
          totalAmount: amountInCents.toString(),
          platformCommissionAmount: '0',
          platformCommissionPercentage: '0',
          ...(itemType === 'merchandise' || itemType === 'product' ? { stock: (itemData.stock || 0).toString() } : {}),
        },
      },
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: itemData.title || (itemType === 'course' ? 'Course' : 'Artwork'),
            description: itemData.description || undefined,
            images: itemImage ? [itemImage] : undefined,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      shipping_address_collection: itemType === 'course' ? undefined : {
        allowed_countries: [
          'US', 'CA', 'GB', 'AU', 'NZ', 'IE', 
          'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH',
          'SE', 'NO', 'DK', 'FI', 'PT', 'PL', 'CZ', 'GR',
          'JP', 'SG', 'HK', 'KR', 'MX', 'BR', 'AR', 'CL',
        ], // Physical products need shipping, courses don't
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: buyerEmail || undefined, // BUYER's email, not seller's
      metadata: {
        userId: buyerId,
        artistId: artistId,
        itemType: itemType,
        itemId: itemId,
        itemTitle: itemData.title || 'Untitled',
        platform: 'gouache',
      },
    });

    // Return checkout session URL
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message || 'Invalid request to Stripe' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

