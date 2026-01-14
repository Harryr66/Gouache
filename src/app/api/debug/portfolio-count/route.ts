import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check how many portfolio items are available
 */
export async function GET() {
  try {
    // Count total portfolio items
    const totalQuery = query(
      collection(db, 'portfolioItems'),
      where('deleted', '==', false)
    );
    const totalCount = await getCountFromServer(totalQuery);

    // Count items shown in portfolio
    const portfolioQuery = query(
      collection(db, 'portfolioItems'),
      where('showInPortfolio', '==', true),
      where('deleted', '==', false)
    );
    const portfolioCount = await getCountFromServer(portfolioQuery);

    // Count non-AI items
    const nonAIQuery = query(
      collection(db, 'portfolioItems'),
      where('showInPortfolio', '==', true),
      where('deleted', '==', false),
      where('isAI', '==', false)
    );
    let nonAICount = 0;
    try {
      const result = await getCountFromServer(nonAIQuery);
      nonAICount = result.data().count;
    } catch (e) {
      // Might not have index for this query
      nonAICount = -1;
    }

    return NextResponse.json({
      success: true,
      counts: {
        total: totalCount.data().count,
        showInPortfolio: portfolioCount.data().count,
        nonAI: nonAICount,
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error counting portfolio items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to count portfolio items',
      },
      { status: 500 }
    );
  }
}
