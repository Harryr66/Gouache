import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Check status of videos - how many are deleted vs active
 */
export async function GET() {
  try {
    // Get ALL videos from artworks
    const artworksSnapshot = await getDocs(collection(db, 'artworks'));
    
    let totalVideos = 0;
    let deletedVideos = 0;
    let activeVideos = 0;
    let withShowInPortfolioFalse = 0;
    let withShowInPortfolioTrue = 0;
    let withShowInPortfolioUndefined = 0;
    
    const activeVideoSamples: any[] = [];
    const deletedVideoSamples: any[] = [];
    
    artworksSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      
      if (data.videoUrl || data.mediaType === 'video') {
        totalVideos++;
        
        if (data.deleted === true) {
          deletedVideos++;
          if (deletedVideoSamples.length < 3) {
            deletedVideoSamples.push({
              id: doc.id,
              title: data.title,
              deleted: data.deleted,
              showInPortfolio: data.showInPortfolio,
            });
          }
        } else {
          activeVideos++;
          if (activeVideoSamples.length < 5) {
            activeVideoSamples.push({
              id: doc.id,
              title: data.title,
              deleted: data.deleted,
              showInPortfolio: data.showInPortfolio,
              videoUrl: data.videoUrl?.substring(0, 80) + '...',
            });
          }
        }
        
        // Track showInPortfolio values
        if (data.showInPortfolio === false) {
          withShowInPortfolioFalse++;
        } else if (data.showInPortfolio === true) {
          withShowInPortfolioTrue++;
        } else {
          withShowInPortfolioUndefined++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalVideos,
        activeVideos,
        deletedVideos,
        deletedPercentage: totalVideos > 0 ? Math.round((deletedVideos / totalVideos) * 100) : 0,
      },
      showInPortfolio: {
        false: withShowInPortfolioFalse,
        true: withShowInPortfolioTrue,
        undefined: withShowInPortfolioUndefined,
      },
      activeVideoSamples,
      deletedVideoSamples,
      explanation: {
        activeVideos: 'Videos with deleted != true (should show in feed)',
        deletedVideos: 'Videos with deleted = true (filtered out)',
        showInPortfolio_false: 'Videos for discover feed only',
        showInPortfolio_true: 'Videos that also show in portfolio',
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to check video status',
      },
      { status: 500 }
    );
  }
}
