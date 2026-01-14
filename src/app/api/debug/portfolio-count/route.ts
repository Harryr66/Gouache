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

    // Count items shown in portfolio (images/artworks)
    const portfolioQuery = query(
      collection(db, 'portfolioItems'),
      where('showInPortfolio', '==', true),
      where('deleted', '==', false)
    );
    const portfolioCount = await getCountFromServer(portfolioQuery);

    // Count discover-only items (videos uploaded via Discover portal)
    const discoverOnlyQuery = query(
      collection(db, 'portfolioItems'),
      where('showInPortfolio', '==', false),
      where('deleted', '==', false)
    );
    const discoverOnlyCount = await getCountFromServer(discoverOnlyQuery);

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
        portfolioItems: portfolioCount.data().count,
        discoverOnlyVideos: discoverOnlyCount.data().count,
        nonAI: nonAICount,
        combined: portfolioCount.data().count + discoverOnlyCount.data().count,
      },
      explanation: {
        total: 'Total non-deleted portfolio items',
        portfolioItems: 'Items with showInPortfolio=true (images/artworks)',
        discoverOnlyVideos: 'Items with showInPortfolio=false (videos from Discover portal)',
        nonAI: 'Non-AI items in portfolio (if hideAI is enabled)',
        combined: 'Total items that should appear in feed (portfolio + discover)',
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
