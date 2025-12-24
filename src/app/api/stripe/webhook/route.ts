import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the handler to avoid build-time initialization
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
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

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
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

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { itemId, itemType, userId, artistId, itemTitle } = paymentIntent.metadata;

  if (!itemId || !itemType || !userId || !artistId) {
    console.error('Missing required metadata in payment intent:', paymentIntent.id);
    return;
  }

  try {
    // Extract metadata for platform commission tracking
    const platformCommissionAmount = parseInt(paymentIntent.metadata.platformCommissionAmount || paymentIntent.metadata.platformDonationAmount || '0');
    const platformCommissionPercentage = parseFloat(paymentIntent.metadata.platformCommissionPercentage || paymentIntent.metadata.platformDonationPercentage || '0');
    const productAmount = parseInt(paymentIntent.metadata.productAmount || paymentIntent.amount.toString());
    
    // Artist receives full payment (0% commission)
    const artistPayoutAmount = paymentIntent.amount - (paymentIntent.application_fee_amount || 0);
    
    // Record the sale in Firestore
    await addDoc(collection(db, 'sales'), {
      paymentIntentId: paymentIntent.id,
      itemId,
      itemType,
      buyerId: userId,
      artistId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      applicationFeeAmount: paymentIntent.application_fee_amount || 0,
      platformCommission: platformCommissionAmount, // 0% platform commission - artist gets 100%
      platformCommissionPercentage, // 0% commission percentage
      productAmount, // Original product price
      artistPayout: artistPayoutAmount, // Full amount (100% to artist)
      status: 'completed',
      itemTitle: itemTitle || 'Untitled',
      createdAt: new Date(),
      completedAt: new Date(),
    });

    // Update item status based on type
    if (itemType === 'course') {
      const courseRef = doc(db, 'courses', itemId);
      const courseDoc = await getDoc(courseRef);
      const courseData = courseDoc.data();
      
      await updateDoc(courseRef, {
        enrollments: increment(1),
        updatedAt: new Date(),
      });

      // Add enrollment record
      await addDoc(collection(db, 'courseEnrollments'), {
        courseId: itemId,
        userId: userId,
        paymentIntentId: paymentIntent.id,
        enrolledAt: new Date(),
      });

      // Send course access email to customer
      try {
        const buyerDoc = await getDoc(doc(db, 'userProfiles', userId));
        const buyerData = buyerDoc.data();
        const buyerEmail = buyerData?.email || paymentIntent.metadata.buyerEmail;
        
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
      const artworkRef = doc(db, 'artworks', itemId);
      await updateDoc(artworkRef, {
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
          await updateDoc(artworkRef, {
            stock: currentStock - 1,
          });
        }
      }
    } else if (itemType === 'book') {
      const bookRef = doc(db, 'books', itemId);
      await updateDoc(bookRef, {
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
          await updateDoc(bookRef, {
            stock: currentStock - 1,
          });
        }
      }
    } else if (itemType === 'merchandise' || itemType === 'product') {
      // Handle marketplace products
      const productRef = doc(db, 'marketplaceProducts', itemId);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const productData = productDoc.data();
        const currentStock = productData.stock || 0;
        
        // Update product - reduce stock if not unlimited
        const updateData: any = {
          updatedAt: new Date(),
        };
        
        // Only reduce stock if it's not unlimited (999999)
        if (currentStock < 999999 && currentStock > 0) {
          updateData.stock = currentStock - 1;
        }
        
        await updateDoc(productRef, updateData);
        
        // Record the purchase
        await addDoc(collection(db, 'purchases'), {
          productId: itemId,
          buyerId: userId,
          sellerId: paymentIntent.metadata.artistId,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          createdAt: new Date(),
        });
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

  try {
    // Log failed payment
    await addDoc(collection(db, 'failedPayments'), {
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
    await addDoc(collection(db, 'transfers'), {
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
    console.log(`✅ Payout paid: ${payout.id} - ${payout.amount} ${payout.currency}`);
    // You can update payout status in your database here if needed
  } catch (error) {
    console.error('Error handling payout paid:', error);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    console.log(`❌ Payout failed: ${payout.id} - ${payout.amount} ${payout.currency}`);
    // You can update payout status and notify artist here
  } catch (error) {
    console.error('Error handling payout failed:', error);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const { artistId, donationType } = session.metadata || {};
    
    if (donationType === 'one-time' && artistId) {
      // Mark one-time donation as completed
      const artistRef = doc(db, 'userProfiles', artistId);
      await updateDoc(artistRef, {
        platformDonationOneTimeCompleted: true,
        platformDonationEnabled: true,
        platformDonationType: 'one-time',
      });

      // Record the donation
      await addDoc(collection(db, 'donations'), {
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
    }
  } catch (error) {
    console.error('Error handling checkout session completion:', error);
    throw error;
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  try {
    await addDoc(collection(db, 'disputes'), {
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

