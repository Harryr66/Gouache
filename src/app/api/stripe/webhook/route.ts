import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb, FieldValue } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the handler to avoid build-time initialization
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecretConnected = process.env.STRIPE_WEBHOOK_SECRET; // Connected accounts
  const webhookSecretPlatform = process.env.STRIPE_WEBHOOK_SECRET_PLATFORM; // Platform payments

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  if (!webhookSecretConnected && !webhookSecretPlatform) {
    console.error('No webhook secrets configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-10-29.clover',
  });

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  let webhookSource = 'unknown';

  // Try platform webhook secret first (for courses, artwork, marketplace)
  if (webhookSecretPlatform) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecretPlatform);
      webhookSource = 'platform';
      console.log('✅ Webhook verified with PLATFORM secret');
    } catch (err: any) {
      // Platform secret failed, will try connected accounts secret next
      console.log('Platform webhook secret failed, trying connected accounts secret...');
    }
  }

  // If platform secret failed or doesn't exist, try connected accounts secret
  if (!event! && webhookSecretConnected) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecretConnected);
      webhookSource = 'connected';
      console.log('✅ Webhook verified with CONNECTED ACCOUNTS secret');
    } catch (err: any) {
      console.error('Both webhook secrets failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
  }

  if (!event!) {
    console.error('Webhook signature verification failed for both secrets');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log(`📨 Webhook event received: ${event.type} from ${webhookSource} source`);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.updated':
        // Handle transfer updates if needed
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    // Return 200 to prevent Stripe from retrying
    // Log error for manual investigation
    return NextResponse.json(
      { error: 'Error processing webhook', details: error.message },
      { status: 200 }
    );
  }
}


// Handle Stripe Checkout Session completion (for physical products with shipping AND donations)
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout session completed:', session.id);

  // Initialize Admin DB
  const adminDb = getAdminDb();

  // Check if this is a donation
  const { artistId, donationType, itemId, itemType, userId, itemTitle } = session.metadata || {};
  
  if (donationType === 'one-time' && artistId && !itemId) {
    // DONATION FLOW
    try {
      // Mark one-time donation as completed
      await adminDb.collection('userProfiles').doc(artistId).update({
        platformDonationOneTimeCompleted: true,
        platformDonationEnabled: true,
        platformDonationType: 'one-time',
      });

      // Record the donation
      await adminDb.collection('donations').add({
        artistId: artistId,
        donationType: 'one-time',
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string,
        completedAt: new Date(),
        createdAt: new Date(),
      });

      console.log(`✅ One-time donation completed: ${session.id} for artist ${artistId}`);
      return; // Exit early for donations
    } catch (error) {
      console.error('Error handling donation checkout session:', error);
      throw error;
    }
  }

  // PHYSICAL PRODUCT + COURSE FLOW
  // Get payment intent from session
  const paymentIntentId = typeof session.payment_intent === 'string' 
    ? session.payment_intent 
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error('No payment intent found in checkout session:', session.id);
    return;
  }

  if (!itemId || !itemType || !userId || !artistId) {
    console.error('Missing required metadata in checkout session:', session.id);
    return;
  }

  // Log metadata for debugging
  console.log('📋 Session metadata:', {
    itemId,
    itemType,
    userId,
    artistId,
    itemTitle,
  });

  // Get shipping address from customer_details (where Stripe actually stores it)
  // Stripe Checkout stores shipping in session.customer_details, NOT session.shipping
  const customerDetails = session.customer_details;
  const shippingAddress = customerDetails?.address;
  const shippingName = customerDetails?.name;
  const customerEmail = customerDetails?.email || session.customer_email;

  // Courses don't need shipping address
  const needsShipping = itemType !== 'course';
  
  console.log('🚢 Shipping check:', {
    itemType,
    needsShipping,
    hasShippingAddress: !!shippingAddress,
    hasShippingName: !!shippingName,
  });
  
  if (needsShipping && (!shippingAddress || !shippingName)) {
    console.error('❌ Missing shipping details in checkout session:', {
      sessionId: session.id,
      itemType,
      needsShipping,
      hasShippingAddress: !!shippingAddress,
      hasShippingName: !!shippingName,
    });
    return;
  }

  if (needsShipping && shippingAddress) {
    console.log('📦 Shipping address:', {
      name: shippingName,
      line1: shippingAddress.line1,
      city: shippingAddress.city,
      state: shippingAddress.state,
      country: shippingAddress.country,
    });
  }

  try {
    // CRITICAL: Fetch buyer's name from Firebase profile (logged-in user)
    // This ensures we use their actual profile name, not Stripe's cached data
    const buyerDoc = await adminDb.collection('userProfiles').doc(userId).get();
    const buyerData = buyerDoc.exists ? buyerDoc.data() : null;
    const buyerDisplayName = buyerData?.displayName || buyerData?.name || shippingName || 'Customer';
    
    console.log('👤 Buyer name resolved:', {
      buyerId: userId,
      buyerName: buyerDisplayName,
      source: buyerData?.displayName ? 'Firebase Profile' : 'Stripe Checkout',
      timestamp: new Date().toISOString(),
    });
    // CRITICAL: Verify payment status before granting access
    // For manual capture, payment intent should be in 'requires_capture' state
    // This confirms funds are authorized (held) and ready to capture
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-10-29.clover',
    });
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Verify payment is in correct state
    if (paymentIntent.status !== 'requires_capture' && paymentIntent.status !== 'succeeded') {
      console.error('❌ Payment not authorized:', {
        paymentIntentId,
        status: paymentIntent.status,
        sessionId: session.id,
      });
      console.error('❌ CRITICAL: Not creating enrollment - payment not authorized');
      return; // EXIT - do not create enrollment if payment failed
    }
    
    console.log('✅ Payment verified:', {
      paymentIntentId,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });

    // Get stripeAccountId for manual transfer after capture
    let stripeAccountId = session.metadata?.stripeAccountId || paymentIntent.metadata?.stripeAccountId;
    if (!stripeAccountId) {
      console.warn('⚠️ Missing stripeAccountId in metadata, fetching from artist profile...');
      const artistDoc = await adminDb.collection('userProfiles').doc(artistId).get();
      if (!artistDoc.exists || !artistDoc.data()?.stripeAccountId) {
        console.error('❌ CRITICAL: Cannot transfer funds - no Stripe account ID found for artist:', artistId);
        return;
      }
      stripeAccountId = artistDoc.data()!.stripeAccountId;
    }
    console.log('✅ Stripe account ID found for transfer:', stripeAccountId);

    // Handle based on item type
    if (itemType === 'course') {
      // CREATE ENROLLMENT
      console.log('📚 Creating course enrollment:', { courseId: itemId, userId });
      
      const courseRef = adminDb.collection('courses').doc(itemId);
      const courseDoc = await courseRef.get();

      if (!courseDoc.exists) {
        console.error('Course not found:', itemId);
        return;
      }

      const courseData = courseDoc.data()!;

      // Create enrollment record
      const enrollmentRef = await adminDb.collection('enrollments').add({
        courseId: itemId,
        courseTitle: courseData.title || itemTitle,
        imageUrl: courseData.thumbnailUrl || courseData.imageUrl || null, // Store course image
        userId: userId,
        instructorId: artistId,
        enrolledAt: new Date(),
        createdAt: new Date(),
        paymentIntentId: paymentIntentId,
        checkoutSessionId: session.id,
        status: 'active',
        progress: 0,
      });

      console.log(`✅ Course enrollment created: ${enrollmentRef.id}`);

      // Send emails (no shipping address for courses)
      const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
      
      await sendPurchaseConfirmationEmail({
        buyerEmail: customerEmail || '',
        buyerName: buyerDisplayName,
        itemTitle: courseData.title || itemTitle,
        itemType: 'Course',
        imageUrl: courseData.thumbnailUrl || courseData.imageUrl || undefined,
        amount: session.amount_total ? (session.amount_total / 100) : 0,
        currency: (session.currency || 'USD').toUpperCase(),
      });

      const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
      if (sellerDoc.exists) {
        const sellerData = sellerDoc.data()!;
        if (sellerData && sellerData.email) {
          await sendSellerNotificationEmail({
            sellerEmail: sellerData.email,
            sellerName: sellerData.displayName || 'Instructor',
            buyerName: buyerDisplayName,
            itemTitle: courseData.title || itemTitle,
            itemType: 'Course',
            amount: session.amount_total ? (session.amount_total / 100) : 0,
            currency: (session.currency || 'USD').toUpperCase(),
          });
        }
      }

      // CRITICAL: Capture payment AFTER enrollment created
      // If capture fails, we should delete the enrollment
      // NOTE: With destination charges (transfer_data.destination), Stripe automatically
      // transfers funds to the connected account - no manual transfer needed
      try {
        const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
        console.log('✅ Payment captured successfully:', paymentIntentId);
        console.log('✅ Funds automatically transferred to connected account via destination charge (commission free)');
      } catch (captureError: any) {
        console.error('❌ CRITICAL: Payment capture failed after enrollment created:', captureError);
        
        // Delete the enrollment we just created
        await enrollmentRef.delete();
        console.log('🔄 Rolled back enrollment due to payment capture failure');
        
        // This is critical - notify support
        console.error('⚠️ MANUAL INTERVENTION REQUIRED: Payment authorized but capture failed', {
          sessionId: session.id,
          paymentIntentId,
          userId,
          courseId: itemId,
        });
        
        throw captureError; // Re-throw to trigger error handler
      }

    } else if (itemType === 'artwork' || itemType === 'original' || itemType === 'print') {
      // Mark artwork as sold
      const artworkRef = adminDb.collection('artworks').doc(itemId);
      const artworkDoc = await artworkRef.get();

      if (!artworkDoc.exists) {
        console.error('Artwork not found:', itemId);
        return;
      }

      const artworkData = artworkDoc.data()!;

      // Update artwork to sold status
      await artworkRef.update({
        sold: true,
        soldAt: new Date(),
        soldTo: userId,
        paymentIntentId: paymentIntentId,
        checkoutSessionId: session.id,
        shippingAddress: {
          name: shippingName || 'Customer',
          line1: shippingAddress!.line1 || '',
          line2: shippingAddress!.line2 || '',
          city: shippingAddress!.city || '',
          state: shippingAddress!.state || '',
          postalCode: shippingAddress!.postal_code || '',
          country: shippingAddress!.country || '',
        },
      });

      console.log('✅ Artwork marked as sold with shipping address:', itemId);

      // Send emails
      const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
      
      await sendPurchaseConfirmationEmail({
        buyerEmail: customerEmail || '',
        buyerName: buyerDisplayName,
        itemType: 'Artwork',
        itemTitle: artworkData.title || itemTitle || 'Artwork',
        imageUrl: artworkData.imageUrl || artworkData.videoUrl || undefined,
        amount: artworkData.price / 100,
        currency: artworkData.currency || 'USD',
        shippingAddress: {
          name: shippingName || 'Customer',
          line1: shippingAddress!.line1 || '',
          line2: shippingAddress!.line2 || '',
          city: shippingAddress!.city || '',
          state: shippingAddress!.state || '',
          postalCode: shippingAddress!.postal_code || '',
          country: shippingAddress!.country || '',
        },
      });

      // Get seller email
      const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
      const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
      const sellerEmail = sellerData?.email || null;

      if (sellerEmail && sellerData) {
        await sendSellerNotificationEmail({
          sellerEmail,
          sellerName: sellerData.displayName || 'Artist',
          itemType: 'Artwork',
          itemTitle: artworkData.title || itemTitle || 'Artwork',
          amount: artworkData.price / 100,
          currency: artworkData.currency || 'USD',
          buyerName: buyerDisplayName,
          shippingAddress: {
            name: shippingName || 'Customer',
            line1: shippingAddress!.line1 || '',
            line2: shippingAddress!.line2 || '',
            city: shippingAddress!.city || '',
            state: shippingAddress!.state || '',
            postalCode: shippingAddress!.postal_code || '',
            country: shippingAddress!.country || '',
          },
        });
      }

      // CRITICAL: Capture the authorized payment now that artwork is marked as sold
      // If capture fails, we should revert the sold status
      // NOTE: With destination charges (transfer_data.destination), Stripe automatically
      // transfers funds to the connected account - no manual transfer needed
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-10-29.clover',
        });
        
        const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
        console.log('💰 Payment captured after artwork marked as sold');
        console.log('✅ Funds automatically transferred to connected account via destination charge (commission free)');
      } catch (captureError: any) {
        console.error('❌ CRITICAL: Payment capture failed after marking artwork as sold:', captureError);
        
        // Revert artwork to available (not sold)
        await artworkRef.update({
          sold: false,
          soldAt: null,
          soldTo: null,
          paymentIntentId: null,
          checkoutSessionId: null,
          shippingAddress: null,
        });
        console.log('🔄 Rolled back artwork sold status due to payment capture failure');
        
        // This is critical - notify support
        console.error('⚠️ MANUAL INTERVENTION REQUIRED: Payment authorized but capture failed', {
          sessionId: session.id,
          paymentIntentId,
          userId,
          artworkId: itemId,
        });
        
        throw captureError; // Re-throw to trigger error handler
      }

    } else if (itemType === 'merchandise' || itemType === 'product') {
      // Handle marketplace product
      const productRef = adminDb.collection('marketplaceProducts').doc(itemId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        console.error('Product not found:', itemId);
        return;
      }

      const productData = productDoc.data()!;

      // Decrement stock
      await productRef.update({
        stock: FieldValue.increment(-1),
        salesCount: FieldValue.increment(1),
      });

      // Create purchase record
      const purchaseRef = await adminDb.collection('purchases').add({
        productId: itemId,
        buyerId: userId,
        sellerId: artistId,
        itemType: 'merchandise', // Added for Order History filtering
        itemTitle: itemTitle || productData.title || 'Product',
        imageUrl: productData.images?.[0] || productData.imageUrl || null, // Store product image
        price: productData.price,
        currency: productData.currency || 'USD',
        paymentIntentId: paymentIntentId,
        checkoutSessionId: session.id,
        status: 'completed',
        createdAt: new Date(),
        shippingAddress: {
          name: shippingName || 'Customer',
          line1: shippingAddress!.line1 || '',
          line2: shippingAddress!.line2 || '',
          city: shippingAddress!.city || '',
          state: shippingAddress!.state || '',
          postalCode: shippingAddress!.postal_code || '',
          country: shippingAddress!.country || '',
        },
      });

      console.log('✅ Product purchase recorded with shipping address:', itemId);

      // Send emails with error handling
      try {
        const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
        
        console.log('📧 Sending buyer confirmation email to:', customerEmail);
        await sendPurchaseConfirmationEmail({
          buyerEmail: customerEmail || '',
          buyerName: buyerDisplayName,
          itemType: 'Product',
          itemTitle: productData.title || itemTitle || 'Product',
          imageUrl: productData.images?.[0] || productData.imageUrl || undefined,
          amount: productData.price,
          currency: productData.currency || 'USD',
          shippingAddress: {
            name: shippingName || 'Customer',
            line1: shippingAddress!.line1 || '',
            line2: shippingAddress!.line2 || '',
            city: shippingAddress!.city || '',
            state: shippingAddress!.state || '',
            postalCode: shippingAddress!.postal_code || '',
            country: shippingAddress!.country || '',
          },
        });
        console.log('✅ Buyer confirmation email sent');

        // Get seller email
        const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
        const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
        const sellerEmail = sellerData?.email || null;

        if (sellerEmail && sellerData) {
          console.log('📧 Sending seller notification email to:', sellerEmail);
          await sendSellerNotificationEmail({
            sellerEmail,
            sellerName: sellerData.displayName || 'Seller',
            itemType: 'Product',
            itemTitle: productData.title || itemTitle || 'Product',
            amount: productData.price,
            currency: productData.currency || 'USD',
            buyerName: buyerDisplayName,
            shippingAddress: {
              name: shippingName || 'Customer',
              line1: shippingAddress!.line1 || '',
              line2: shippingAddress!.line2 || '',
              city: shippingAddress!.city || '',
              state: shippingAddress!.state || '',
              postalCode: shippingAddress!.postal_code || '',
              country: shippingAddress!.country || '',
            },
          });
          console.log('✅ Seller notification email sent');
        } else {
          console.warn('⚠️ Seller email not found for artistId:', artistId);
        }
      } catch (emailError) {
        console.error('❌ ERROR sending emails:', emailError);
        console.error('Email error details:', {
          buyerEmail: customerEmail,
          artistId,
          hasResendKey: !!process.env.RESEND_API_KEY,
        });
        // Don't fail the webhook if emails fail - continue with payment capture
      }

      // CRITICAL: Capture the authorized payment
      // If capture fails, we should revert the purchase and restore stock
      // NOTE: With destination charges (transfer_data.destination), Stripe automatically
      // transfers funds to the connected account - no manual transfer needed
      const purchaseId = purchaseRef.id; // Save for rollback
      
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-10-29.clover',
        });
        
        const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
        console.log('💰 Payment captured after product purchase recorded');
        console.log('✅ Funds automatically transferred to connected account via destination charge (commission free)');
      } catch (captureError: any) {
        console.error('❌ CRITICAL: Payment capture failed after product purchase:', captureError);
        
        // Delete the purchase record
        await purchaseRef.delete();
        
        // Restore product stock
        await productRef.update({
          stock: FieldValue.increment(1),
          salesCount: FieldValue.increment(-1),
        });
        console.log('🔄 Rolled back product purchase due to payment capture failure');
        
        // This is critical - notify support
        console.error('⚠️ MANUAL INTERVENTION REQUIRED: Payment authorized but capture failed', {
          sessionId: session.id,
          paymentIntentId,
          userId,
          productId: itemId,
        });
        
        throw captureError; // Re-throw to trigger error handler
      }
    }

  } catch (error) {
    console.error('❌❌❌ CRITICAL ERROR in checkout.session.completed:', {
      error: error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      sessionId: session.id,
      itemType,
      itemId,
      userId,
      artistId,
    });
    throw error;
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { itemId, itemType, userId, artistId, itemTitle } = paymentIntent.metadata;

  const adminDb = getAdminDb();

  if (!itemId || !itemType || !userId || !artistId) {
    console.error('Missing required metadata in payment intent:', paymentIntent.id);
    return;
  }

  try {
    // Extract metadata for platform commission tracking
    const platformCommissionAmount = parseInt(paymentIntent.metadata.platformCommissionAmount || paymentIntent.metadata.platformDonationAmount || '0');
    const platformCommissionPercentage = parseFloat(paymentIntent.metadata.platformCommissionPercentage || paymentIntent.metadata.platformDonationPercentage || '0');
    const productAmount = parseInt(paymentIntent.metadata.productAmount || paymentIntent.amount.toString()); // Original seller price
    const totalAmount = parseInt(paymentIntent.metadata.totalAmount || paymentIntent.amount.toString()); // Total amount buyer paid
    const stripeFeeAmount = parseInt(paymentIntent.metadata.stripeFeeAmount || '0'); // Stripe fees (paid by seller)
    
    // Artist receives: totalAmount - Stripe fees (Stripe automatically deducts fees from transfer)
    // With Stripe Connect, the seller receives the full amount minus Stripe's fees automatically
    // So artistPayout ≈ productAmount (original seller price)
    const artistPayoutAmount = productAmount; // Seller receives original price (fees already deducted by Stripe)
    
    // Record the sale in Firestore
    await adminDb.collection('sales').add({
      paymentIntentId: paymentIntent.id,
      itemId,
      itemType,
      buyerId: userId,
      artistId,
      amount: totalAmount, // Total amount buyer paid (includes Stripe fees)
      currency: paymentIntent.currency,
      applicationFeeAmount: paymentIntent.application_fee_amount || 0,
      stripeFeeAmount, // Stripe fees (paid by seller)
      platformCommission: platformCommissionAmount, // 0% platform commission - artist gets 100%
      platformCommissionPercentage, // 0% commission percentage
      productAmount, // Original seller price (what seller receives)
      artistPayout: artistPayoutAmount, // Seller receives original price (after Stripe fees)
      status: 'completed',
      itemTitle: itemTitle || 'Untitled',
      createdAt: new Date(),
      completedAt: new Date(),
    });

    // Update item status based on type
    if (itemType === 'course') {
      const courseRef = adminDb.collection('courses').doc(itemId);
      const courseDoc = await courseRef.get();
      const courseData = courseDoc.data()!;
      
      await courseRef.update({
        enrollments: FieldValue.increment(1),
        updatedAt: new Date(),
      });

      // Check if enrollment already exists (might have been created immediately after payment)
      const enrollmentQuery = adminDb.collection('courseEnrollments')
        .where('courseId', '==', itemId)
        .where('userId', '==', userId)
        .where('paymentIntentId', '==', paymentIntent.id);
      
      const existingEnrollments = await enrollmentQuery.get();
      
      if (existingEnrollments.empty) {
        // Create enrollment if it doesn't exist (fallback for old flow)
        console.log(`✅ Creating enrollment via webhook for payment ${paymentIntent.id}`);
        await adminDb.collection('courseEnrollments').add({
          courseId: itemId,
          userId: userId,
          paymentIntentId: paymentIntent.id,
          enrolledAt: new Date(),
          progress: 0,
          currentWeek: 1,
          currentLesson: 1,
          completedLessons: [],
          lastAccessedAt: new Date(),
          certificateEarned: false,
          isActive: true,
          createdBy: 'webhook', // Mark as created by webhook
        });
      } else {
        // Enrollment already exists (created immediately after payment)
        console.log(`✅ Enrollment already exists for payment ${paymentIntent.id}, created by immediate API`);
        
        // Optionally update it to confirm webhook processed
        const enrollmentDoc = existingEnrollments.docs[0];
        await adminDb.collection('courseEnrollments').doc(enrollmentDoc.id).update({
          webhookConfirmedAt: new Date(),
        });
      }

      // Send course access email to customer
      try {
        const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
        
        const buyerDoc = await adminDb.collection('userProfiles').doc(userId).get();
        const buyerData = buyerDoc.data()!;
        const buyerEmail = buyerData?.email || paymentIntent.metadata.buyerEmail;
        const buyerName = buyerData?.displayName || buyerData?.name || 'Customer';
        
        const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
        const sellerData = sellerDoc.data()!;
        const sellerEmail = sellerData?.email;
        const sellerName = sellerData?.displayName || sellerData?.name || 'Artist';
        
        // Send buyer confirmation email
        if (buyerEmail) {
          console.log(`📧 Sending buyer confirmation email to ${buyerEmail}`);
          await sendPurchaseConfirmationEmail({
            buyerEmail,
            buyerName,
            itemTitle: itemTitle || 'Course',
            itemType: 'course',
            amount: totalAmount / 100, // Convert cents to dollars
            currency: paymentIntent.currency,
            itemId,
          });
        }
        
        // Send seller notification email
        if (sellerEmail) {
          console.log(`📧 Sending seller notification email to ${sellerEmail}`);
          await sendSellerNotificationEmail({
            sellerEmail,
            sellerName,
            buyerName,
            itemTitle: itemTitle || 'Course',
            itemType: 'course',
            amount: productAmount / 100, // Convert cents to dollars
            currency: paymentIntent.currency,
          });
        }
        
        // Legacy: Also send old-style course access email for external courses
        if (buyerEmail && courseData?.externalUrl) {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          const courseAccessUrl = courseData.externalUrl;
          const courseTitle = courseData.title || itemTitle || 'Course';
          
          await resend.emails.send({
            from: process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache <noreply@gouache.art>',
            to: buyerEmail,
            subject: `Access Your Course: ${courseTitle}`,
            html: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827;">
                <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Course Purchase Confirmed</h1>
                <p style="font-size: 16px; line-height: 1.5;">Thank you for your purchase!</p>
                <p style="font-size: 16px; line-height: 1.5; margin-top: 16px;">
                  You now have access to: <strong>${courseTitle}</strong>
                </p>
                <p style="margin: 24px 0;">
                  <a
                    href="${courseAccessUrl}"
                    style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 20px; border-radius: 999px; font-weight: 600; text-decoration: none;"
                  >
                    Access Course
                  </a>
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
                  If the button above does not work, copy and paste this link into your browser:<br />
                  <a href="${courseAccessUrl}" style="color: #2563eb;">${courseAccessUrl}</a>
                </p>
                <p style="font-size: 16px; line-height: 1.5; margin-top: 32px;">Happy learning!</p>
                <p style="font-size: 16px; font-weight: 600;">Team Gouache</p>
              </div>
            `,
          });
          console.log(`✅ Course access email sent to ${buyerEmail} for course ${itemId}`);
        }
      } catch (emailError) {
        console.error('Error sending course access email:', emailError);
        // Don't throw - email failure shouldn't break the payment flow
      }
    } else if (itemType === 'original' || itemType === 'print') {
      const artworkRef = adminDb.collection('artworks').doc(itemId);
      await artworkRef.update({
        sold: true,
        soldAt: new Date(),
        buyerId: userId,
        paymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      });

      // Reduce stock if applicable
      if (itemType === 'print' && paymentIntent.metadata.stock) {
        const currentStock = parseInt(paymentIntent.metadata.stock) || 0;
        if (currentStock > 0) {
          await artworkRef.update({
            stock: currentStock - 1,
          });
        }
      }

      // Send artwork purchase emails
      try {
        const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
        
        const buyerDoc = await adminDb.collection('userProfiles').doc(userId).get();
        const buyerData = buyerDoc.data()!;
        const buyerEmail = buyerData?.email || paymentIntent.metadata.buyerEmail;
        const buyerName = buyerData?.displayName || buyerData?.name || 'Customer';
        
        const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
        const sellerData = sellerDoc.data()!;
        const sellerEmail = sellerData?.email;
        const sellerName = sellerData?.displayName || sellerData?.name || 'Artist';
        
        if (buyerEmail) {
          await sendPurchaseConfirmationEmail({
            buyerEmail,
            buyerName,
            itemTitle: itemTitle || 'Artwork',
            itemType: 'artwork',
            amount: totalAmount,
            currency: paymentIntent.currency,
            itemId,
          });
        }
        
        if (sellerEmail) {
          await sendSellerNotificationEmail({
            sellerEmail,
            sellerName,
            buyerName,
            itemTitle: itemTitle || 'Artwork',
            itemType: 'artwork',
            amount: productAmount,
            currency: paymentIntent.currency,
          });
        }
      } catch (emailError) {
        console.error('Error sending artwork emails:', emailError);
      }
    } else if (itemType === 'book') {
      const bookRef = adminDb.collection('books').doc(itemId);
      await bookRef.update({
        sold: true,
        soldAt: new Date(),
        buyerId: userId,
        paymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      });

      // Reduce stock if applicable
      if (paymentIntent.metadata.stock) {
        const currentStock = parseInt(paymentIntent.metadata.stock) || 0;
        if (currentStock > 0) {
          await bookRef.update({
            stock: currentStock - 1,
          });
        }
      }

      // Send book purchase emails
      try {
        const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
        
        const buyerDoc = await adminDb.collection('userProfiles').doc(userId).get();
        const buyerData = buyerDoc.data()!;
        const buyerEmail = buyerData?.email || paymentIntent.metadata.buyerEmail;
        const buyerName = buyerData?.displayName || buyerData?.name || 'Customer';
        
        const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
        const sellerData = sellerDoc.data()!;
        const sellerEmail = sellerData?.email;
        const sellerName = sellerData?.displayName || sellerData?.name || 'Artist';
        
        if (buyerEmail) {
          await sendPurchaseConfirmationEmail({
            buyerEmail,
            buyerName,
            itemTitle: itemTitle || 'Book',
            itemType: 'product',
            amount: totalAmount,
            currency: paymentIntent.currency,
            itemId,
          });
        }
        
        if (sellerEmail) {
          await sendSellerNotificationEmail({
            sellerEmail,
            sellerName,
            buyerName,
            itemTitle: itemTitle || 'Book',
            itemType: 'product',
            amount: productAmount,
            currency: paymentIntent.currency,
          });
        }
      } catch (emailError) {
        console.error('Error sending book purchase emails:', emailError);
      }
    } else if (itemType === 'merchandise' || itemType === 'product') {
      // Handle marketplace products
      const productRef = adminDb.collection('marketplaceProducts').doc(itemId);
      const productDoc = await productRef.get();
      
      if (productDoc.exists) {
        const productData = productDoc.data()!;
        const currentStock = productData.stock || 0;
        
        // Update product - reduce stock if not unlimited
        const updateData: any = {
          updatedAt: new Date(),
        };
        
        // Only reduce stock if it's not unlimited (999999)
        if (currentStock < 999999 && currentStock > 0) {
          updateData.stock = currentStock - 1;
        }
        
        await productRef.update(updateData);
        
        // Send marketplace product emails
        try {
          const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
          
          const buyerDoc = await adminDb.collection('userProfiles').doc(userId).get();
          const buyerData = buyerDoc.data()!;
          const buyerEmail = buyerData?.email || paymentIntent.metadata.buyerEmail;
          const buyerName = buyerData?.displayName || buyerData?.name || 'Customer';
          
          const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
          const sellerData = sellerDoc.data()!;
          const sellerEmail = sellerData?.email;
          const sellerName = sellerData?.displayName || sellerData?.name || 'Seller';
          
          if (buyerEmail) {
            await sendPurchaseConfirmationEmail({
              buyerEmail,
              buyerName,
              itemTitle: itemTitle || 'Product',
              itemType: 'product',
              amount: totalAmount,
              currency: paymentIntent.currency,
              itemId,
            });
          }
          
          if (sellerEmail) {
            await sendSellerNotificationEmail({
              sellerEmail,
              sellerName,
              buyerName,
              itemTitle: itemTitle || 'Product',
              itemType: 'product',
              amount: productAmount,
              currency: paymentIntent.currency,
            });
          }
        } catch (emailError) {
          console.error('Error sending product emails:', emailError);
        }
        
        // DON'T create purchase record here - already created in checkout.session.completed
        // with full shipping address. This prevents duplicate order history entries.
        console.log('ℹ️ Skipping purchase record creation - already handled by checkout.session.completed');
      }
    }
    
    // FALLBACK: Send emails for any other item types that might exist
    // This ensures we ALWAYS send confirmation emails regardless of item type
    if (!['course', 'original', 'print', 'book', 'merchandise', 'product'].includes(itemType)) {
      console.warn(`⚠️ Unknown itemType: ${itemType}, sending generic emails`);
      try {
        const { sendPurchaseConfirmationEmail, sendSellerNotificationEmail } = await import('@/lib/email');
        
        const buyerDoc = await adminDb.collection('userProfiles').doc(userId).get();
        const buyerData = buyerDoc.data()!;
        const buyerEmail = buyerData?.email || paymentIntent.metadata.buyerEmail;
        const buyerName = buyerData?.displayName || buyerData?.name || 'Customer';
        
        const sellerDoc = await adminDb.collection('userProfiles').doc(artistId).get();
        const sellerData = sellerDoc.data()!;
        const sellerEmail = sellerData?.email;
        const sellerName = sellerData?.displayName || sellerData?.name || 'Seller';
        
        if (buyerEmail) {
          await sendPurchaseConfirmationEmail({
            buyerEmail,
            buyerName,
            itemTitle: itemTitle || 'Item',
            itemType: 'product', // Default to 'product' for unknown types
            amount: totalAmount,
            currency: paymentIntent.currency,
            itemId,
          });
        }
        
        if (sellerEmail) {
          await sendSellerNotificationEmail({
            sellerEmail,
            sellerName,
            buyerName,
            itemTitle: itemTitle || 'Item',
            itemType: 'product',
            amount: productAmount,
            currency: paymentIntent.currency,
          });
        }
      } catch (emailError) {
        console.error(`Error sending emails for unknown itemType ${itemType}:`, emailError);
      }
    }

    console.log(`✅ Payment succeeded: ${paymentIntent.id} for ${itemType} ${itemId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { itemId, itemType, userId, artistId } = paymentIntent.metadata;

  const adminDb = getAdminDb();

  try {
    // Log failed payment
    await adminDb.collection('failedPayments').add({
      paymentIntentId: paymentIntent.id,
      itemId,
      itemType,
      buyerId: userId,
      artistId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      error: paymentIntent.last_payment_error?.message || 'Payment failed',
      errorCode: paymentIntent.last_payment_error?.code,
      createdAt: new Date(),
    });

    console.log(`❌ Payment failed: ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection('transfers').add({
      transferId: transfer.id,
      destination: transfer.destination,
      amount: transfer.amount,
      currency: transfer.currency,
      status: 'pending',
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error handling transfer created:', error);
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    const adminDb = getAdminDb();
    console.log(`✅ Payout paid: ${payout.id} - ${payout.amount} ${payout.currency}`);
    // You can update payout status in your database here if needed
  } catch (error) {
    console.error('Error handling payout paid:', error);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    const adminDb = getAdminDb();
    console.log(`❌ Payout failed: ${payout.id} - ${payout.amount} ${payout.currency}`);
    // You can update payout status and notify artist here
  } catch (error) {
    console.error('Error handling payout failed:', error);
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection('disputes').add({
      disputeId: dispute.id,
      chargeId: dispute.charge,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      createdAt: new Date(),
    });

    console.log(`⚠️ Dispute created: ${dispute.id}`);
    // You should notify the artist and admin about disputes
  } catch (error) {
    console.error('Error handling dispute created:', error);
  }
}

// Disable body parsing for webhooks (Next.js 13+)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This is required for webhooks to work properly
export const fetchCache = 'force-no-store';

