import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Count ONLY valid videos that should show in discover feed
 * 
 * Valid video criteria:
 * - Has videoUrl field (not empty)
 * - showInPortfolio: false (discover-only videos)
 * - NOT deleted (or we ignore deleted flag per user's requirement)
 * - Has valid video URL format
 */
export async function GET() {
  try {
    const artworksSnapshot = await getDocs(collection(db, 'artworks'));
    
    let totalWithVideoField = 0;
    let validDiscoverVideos = 0;
    let portfolioVideos = 0;
    let invalidVideoUrl = 0;
    let noShowInPortfolio = 0;
    
    const validVideos: any[] = [];
    const invalidSamples: any[] = [];
    
    artworksSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      
      // Check if it has ANY video indicator
      const hasVideoField = !!(data.videoUrl || data.mediaType === 'video');
      
      if (!hasVideoField) return;
      
      totalWithVideoField++;
      
      // Check if videoUrl is valid (not empty, not placeholder)
      const videoUrl = data.videoUrl;
      const isValidVideoUrl = videoUrl && 
                             typeof videoUrl === 'string' && 
                             videoUrl.length > 10 && // Not just a placeholder
                             (videoUrl.includes('.m3u8') || 
                              videoUrl.includes('cloudflarestream.com') ||
                              videoUrl.includes('videodelivery.net') ||
                              videoUrl.includes('firebasestorage.googleapis.com'));
      
      if (!isValidVideoUrl) {
        invalidVideoUrl++;
        if (invalidSamples.length < 3) {
          invalidSamples.push({
            id: doc.id,
            title: data.title || 'Untitled',
            videoUrl: videoUrl || 'MISSING',
            showInPortfolio: data.showInPortfolio,
            deleted: data.deleted,
          });
        }
        return;
      }
      
      // Check showInPortfolio flag
      if (data.showInPortfolio === false) {
        // This is a discover-only video
        validDiscoverVideos++;
        if (validVideos.length < 10) {
          validVideos.push({
            id: doc.id,
            title: data.title || 'Untitled',
            videoUrl: videoUrl.substring(0, 80) + '...',
            showInPortfolio: data.showInPortfolio,
            deleted: data.deleted,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
          });
        }
      } else if (data.showInPortfolio === true) {
        // This is a portfolio video (also shows in portfolio tab)
        portfolioVideos++;
      } else {
        // showInPortfolio is undefined/null - might be old data
        noShowInPortfolio++;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalWithVideoField,
        validDiscoverVideos, // showInPortfolio: false - these should show in video feed
        portfolioVideos, // showInPortfolio: true - these show in portfolio AND discover
        invalidVideoUrl, // Has video field but invalid URL
        noShowInPortfolio, // Has video but showInPortfolio is undefined
      },
      explanation: {
        validDiscoverVideos: 'Videos with showInPortfolio=false (discover-only videos) - these should show in video feed',
        portfolioVideos: 'Videos with showInPortfolio=true (also in portfolio) - these show in both places',
        invalidVideoUrl: 'Items with video field but invalid/empty videoUrl',
        noShowInPortfolio: 'Videos without showInPortfolio field (old data format)',
      },
      validVideos: validVideos.slice(0, 10), // Show first 10 valid discover videos
      invalidSamples: invalidSamples.slice(0, 3), // Show 3 invalid samples
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to count valid videos',
      },
      { status: 500 }
    );
  }
}
