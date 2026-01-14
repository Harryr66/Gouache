import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to find videos in all collections
 */
export async function GET() {
  try {
    const results: any = {
      summary: {},
      portfolioItems: {},
      artworks: {},
    };

    // Check portfolioItems for videos
    console.log('Checking portfolioItems for videos...');
    
    // Videos with showInPortfolio=false (discover-only videos)
    // Query without orderBy to avoid index requirement
    const discoverVideosQuery = query(
      collection(db, 'portfolioItems'),
      where('showInPortfolio', '==', false),
      limit(20)
    );
    const discoverVideosSnapshot = await getDocs(discoverVideosQuery);
    
    results.portfolioItems.discoverOnly = {
      count: discoverVideosSnapshot.size,
      items: discoverVideosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          userId: data.userId,
          showInPortfolio: data.showInPortfolio,
          deleted: data.deleted,
          hasVideoUrl: !!data.videoUrl,
          videoUrl: data.videoUrl,
          hasMediaUrls: !!data.mediaUrls,
          mediaType: data.mediaType,
          mediaTypes: data.mediaTypes,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      }),
    };

    // All portfolioItems (any with video-related fields)
    const allPortfolioQuery = query(
      collection(db, 'portfolioItems'),
      limit(50)
    );
    const allPortfolioSnapshot = await getDocs(allPortfolioQuery);
    
    let portfolioWithVideo = 0;
    const videoSamples: any[] = [];
    
    allPortfolioSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const hasVideo = data.videoUrl || 
                       data.mediaType === 'video' || 
                       (data.mediaUrls && data.mediaTypes && data.mediaTypes.includes('video'));
      
      if (hasVideo) {
        portfolioWithVideo++;
        if (videoSamples.length < 5) {
          videoSamples.push({
            id: doc.id,
            title: data.title,
            showInPortfolio: data.showInPortfolio,
            videoUrl: data.videoUrl,
            mediaType: data.mediaType,
          });
        }
      }
    });

    results.portfolioItems.withVideoFields = {
      count: portfolioWithVideo,
      samples: videoSamples,
    };

    // Check artworks collection for videos
    console.log('Checking artworks for videos...');
    let artworksWithVideo = 0;
    let artworkVideoSamples: any[] = [];
    let artworksSnapshot: any = null;
    
    try {
      const artworksQuery = query(
        collection(db, 'artworks'),
        limit(100)
      );
      artworksSnapshot = await getDocs(artworksQuery);
    
    artworksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const hasVideo = data.videoUrl || 
                       data.mediaType === 'video' || 
                       (data.mediaUrls && data.mediaTypes && data.mediaTypes.includes('video'));
      
      if (hasVideo) {
        artworksWithVideo++;
        if (artworkVideoSamples.length < 5) {
          artworkVideoSamples.push({
            id: doc.id,
            title: data.title,
            videoUrl: data.videoUrl,
            mediaType: data.mediaType,
          });
        }
      }
    });

    } catch (artworksError: any) {
      console.error('Error querying artworks:', artworksError);
    }
    
    results.artworks = {
      totalScanned: artworksSnapshot?.size || 0,
      withVideoFields: {
        count: artworksWithVideo,
        samples: artworkVideoSamples,
      },
    };

    results.summary = {
      portfolioItemsWithVideos: portfolioWithVideo,
      artworksWithVideos: artworksWithVideo,
      discoverOnlyVideos: discoverVideosSnapshot.size,
      totalVideos: portfolioWithVideo + artworksWithVideo,
    };

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error finding videos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to find videos',
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
