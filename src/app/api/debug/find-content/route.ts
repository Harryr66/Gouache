import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Comprehensive debug endpoint to find where content is stored
 */
export async function GET() {
  try {
    const results: any = {
      collections: {},
      sampleData: {},
      fieldAnalysis: {},
    };

    // Check portfolioItems collection
    console.log('Checking portfolioItems collection...');
    const portfolioQuery = query(
      collection(db, 'portfolioItems'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const portfolioSnapshot = await getDocs(portfolioQuery);
    results.collections.portfolioItems = {
      total: portfolioSnapshot.size,
      sample: portfolioSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          deleted: data.deleted,
          showInPortfolio: data.showInPortfolio,
          hasVideo: !!data.videoUrl,
          hasImage: !!data.imageUrl,
          mediaType: data.mediaType,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      }),
    };

    // Check artworks collection (legacy)
    console.log('Checking artworks collection...');
    const artworksQuery = query(
      collection(db, 'artworks'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const artworksSnapshot = await getDocs(artworksQuery);
    results.collections.artworks = {
      total: artworksSnapshot.size,
      sample: artworksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          artistId: data.artist?.id || data.artistId,
          title: data.title,
          deleted: data.deleted,
          hasVideo: !!data.videoUrl,
          hasImage: !!data.imageUrl,
          mediaType: data.mediaType,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      }),
    };

    // Check for deleted items
    console.log('Checking deleted items...');
    const deletedQuery = query(
      collection(db, 'portfolioItems'),
      where('deleted', '==', true),
      limit(10)
    );
    const deletedSnapshot = await getDocs(deletedQuery);
    results.collections.deletedPortfolioItems = {
      total: deletedSnapshot.size,
      message: deletedSnapshot.size > 0 ? 'Found deleted items - these are hidden from discover' : 'No deleted items found',
    };

    // Check all portfolioItems without filters
    console.log('Checking all portfolioItems...');
    const allPortfolioQuery = query(
      collection(db, 'portfolioItems'),
      limit(100)
    );
    const allPortfolioSnapshot = await getDocs(allPortfolioQuery);
    
    // Analyze the data
    const analysis = {
      totalCount: allPortfolioSnapshot.size,
      withShowInPortfolioTrue: 0,
      withShowInPortfolioFalse: 0,
      withDeletedTrue: 0,
      withDeletedFalse: 0,
      withVideoUrl: 0,
      withImageUrl: 0,
      users: new Set<string>(),
    };

    allPortfolioSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.showInPortfolio === true) analysis.withShowInPortfolioTrue++;
      if (data.showInPortfolio === false) analysis.withShowInPortfolioFalse++;
      if (data.deleted === true) analysis.withDeletedTrue++;
      if (data.deleted === false) analysis.withDeletedFalse++;
      if (data.videoUrl) analysis.withVideoUrl++;
      if (data.imageUrl) analysis.withImageUrl++;
      if (data.userId) analysis.users.add(data.userId);
    });

    results.fieldAnalysis = {
      ...analysis,
      uniqueUsers: Array.from(analysis.users),
      usersCount: analysis.users.size,
    };

    // Check artworks collection total
    const allArtworksQuery = query(
      collection(db, 'artworks'),
      limit(100)
    );
    const allArtworksSnapshot = await getDocs(allArtworksQuery);
    results.collections.artworks.totalScanned = allArtworksSnapshot.size;

    return NextResponse.json({
      success: true,
      summary: {
        portfolioItemsTotal: results.fieldAnalysis.totalCount,
        artworksTotal: allArtworksSnapshot.size,
        deletedItems: analysis.withDeletedTrue,
        visibleItems: analysis.withDeletedFalse,
        itemsWithVideos: analysis.withVideoUrl,
        itemsWithImages: analysis.withImageUrl,
      },
      ...results,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in find-content debug:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to find content',
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
