import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { orderId, orderType, itemTitle, price, currency, sellerId, reason, buyerEmail, buyerName } = await request.json();

    if (!orderId || !orderType || !sellerId || !reason || !buyerEmail || !buyerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Get seller details
    const sellerDoc = await adminDb.collection('userProfiles').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    const sellerData = sellerDoc.data()!;
    const sellerEmail = sellerData.email;
    const sellerName = sellerData.displayName || 'Seller';

    if (!sellerEmail) {
      return NextResponse.json(
        { error: 'Seller email not found' },
        { status: 404 }
      );
    }

    // Send email to seller
    const { sendRefundRequestEmail } = await import('@/lib/email');
    
    // Format the price correctly for the email
    // Courses are in dollars, products/artwork are in cents
    const amount = orderType === 'course' ? price : (price / 100);
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
    
    await sendRefundRequestEmail({
      sellerEmail,
      sellerName,
      buyerName,
      buyerEmail,
      itemTitle,
      orderId,
      orderType,
      formattedAmount,
      reason,
    });

    // Log the refund request in database
    await adminDb.collection('refundRequests').add({
      orderId,
      orderType,
      sellerId,
      itemTitle,
      price,
      currency,
      reason,
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing refund request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

