import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

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
      platformCommission: paymentIntent.application_fee_amount || 0,
      artistPayout: paymentIntent.amount - (paymentIntent.application_fee_amount || 0),
      status: 'completed',
      itemTitle: itemTitle || 'Untitled',
      createdAt: new Date(),
      completedAt: new Date(),
    });

    // Update item status based on type
    if (itemType === 'course') {
      const courseRef = doc(db, 'courses', itemId);
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

