import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { paymentIntentId, transactionId, reason } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the payment intent to get metadata
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Payment Intent not found' },
        { status: 404 }
      );
    }

    // Check if already refunded
    if (paymentIntent.status === 'canceled' || paymentIntent.amount_refunded >= paymentIntent.amount) {
      return NextResponse.json(
        { error: 'This payment has already been refunded' },
        { status: 400 }
      );
    }

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
    });

    console.log('✅ Refund created:', refund.id);

    // Get metadata from payment intent
    const { itemId, itemType, userId, artistId } = paymentIntent.metadata;

    // Update database based on item type
    if (itemType === 'course') {
      // Find and delete enrollment
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('paymentIntentId', '==', paymentIntentId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      for (const enrollmentDoc of enrollmentsSnapshot.docs) {
        await deleteDoc(enrollmentDoc.ref);
        console.log('✅ Deleted enrollment:', enrollmentDoc.id);
      }
    } else if (itemType === 'artwork' || itemType === 'original' || itemType === 'print') {
      // Mark artwork as available again
      const artworkRef = doc(db, 'artworks', itemId);
      const artworkDoc = await getDoc(artworkRef);
      
      if (artworkDoc.exists()) {
        await updateDoc(artworkRef, {
          sold: false,
          soldAt: null,
          soldTo: null,
          paymentIntentId: null,
          checkoutSessionId: null,
          shippingAddress: null,
          refunded: true,
          refundedAt: new Date(),
        });
        console.log('✅ Artwork marked as available:', itemId);
      }
    } else if (itemType === 'merchandise' || itemType === 'product') {
      // Restore product stock
      const productRef = doc(db, 'marketplaceProducts', itemId);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        await updateDoc(productRef, {
          stock: increment(1),
          salesCount: increment(-1),
        });
        console.log('✅ Product stock restored:', itemId);
      }

      // Delete purchase record
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('paymentIntentId', '==', paymentIntentId)
      );
      const purchasesSnapshot = await getDocs(purchasesQuery);
      
      for (const purchaseDoc of purchasesSnapshot.docs) {
        await deleteDoc(purchaseDoc.ref);
        console.log('✅ Deleted purchase record:', purchaseDoc.id);
      }
    }

    // Update sales record to mark as refunded
    const salesQuery = query(
      collection(db, 'sales'),
      where('paymentIntentId', '==', paymentIntentId)
    );
    const salesSnapshot = await getDocs(salesQuery);
    
    for (const saleDoc of salesSnapshot.docs) {
      await updateDoc(saleDoc.ref, {
        refunded: true,
        refundedAt: new Date(),
        refundId: refund.id,
      });
      console.log('✅ Updated sale record as refunded:', saleDoc.id);
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });

  } catch (error: any) {
    console.error('Error processing refund:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message || 'Invalid refund request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}

