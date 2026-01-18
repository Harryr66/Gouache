import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');
    const limitCount = parseInt(searchParams.get('limit') || '12');

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    // Get billing records for partner
    const billingQuery = query(
      collection(db, 'partnerBillingRecords'),
      where('partnerId', '==', partnerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const billingSnapshot = await getDocs(billingQuery);
    
    const records = billingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      paidAt: doc.data().paidAt?.toDate?.() || null,
      billingPeriodStart: doc.data().billingPeriodStart?.toDate?.() || new Date(),
      billingPeriodEnd: doc.data().billingPeriodEnd?.toDate?.() || new Date(),
    }));

    return NextResponse.json({ records });
  } catch (error: any) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}
