import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    // Get query param for user ID (optional, for debugging specific user)
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    // Fetch ALL purchases (no filter)
    const allPurchasesSnap = await adminDb.collection('purchases')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    const allPurchases = allPurchasesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));
    
    // If userId provided, also fetch filtered
    let userPurchases = null;
    if (userId) {
      const userPurchasesSnap = await adminDb.collection('purchases')
        .where('buyerId', '==', userId)
        .get();
      
      userPurchases = userPurchasesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      }));
    }
    
    return NextResponse.json({
      success: true,
      totalPurchases: allPurchases.length,
      allPurchases: allPurchases,
      ...(userPurchases && {
        userPurchasesCount: userPurchases.length,
        userPurchases: userPurchases,
      }),
      debugInfo: {
        queriedUserId: userId,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

