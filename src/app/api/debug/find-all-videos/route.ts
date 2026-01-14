import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Comprehensive video finder - checks ALL collections
 */
export async function GET() {
  try {
    const results: any = {
      collections: {},
      totalVideosFound: 0,
    };

    const collectionsToCheck = [
      'portfolioItems',
      'artworks', 
      'posts',
      'content',
      'media',
      'uploads',
      'discover',
    ];

    for (const collectionName of collectionsToCheck) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        
        let videosFound = 0;
        const videoSamples: any[] = [];
        
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          const hasVideo = data.videoUrl || 
                          data.mediaType === 'video' ||
                          data.type === 'video' ||
                          (data.mediaUrls && Array.isArray(data.mediaUrls) && 
                           data.mediaUrls.some((url: string) => 
                             url?.includes('.m3u8') || 
                             url?.includes('cloudflarestream.com') ||
                             url?.includes('videodelivery.net')
                           ));
          
          if (hasVideo) {
            videosFound++;
            if (videoSamples.length < 3) {
              videoSamples.push({
                id: doc.id,
                collection: collectionName,
                videoUrl: data.videoUrl,
                mediaType: data.mediaType,
                type: data.type,
                showInPortfolio: data.showInPortfolio,
                title: data.title || 'Untitled',
                deleted: data.deleted,
              });
            }
          }
        });

        results.collections[collectionName] = {
          totalDocs: snapshot.size,
          videosFound,
          samples: videoSamples,
        };

        results.totalVideosFound += videosFound;
      } catch (error: any) {
        results.collections[collectionName] = {
          error: error.message,
          totalDocs: 0,
          videosFound: 0,
        };
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: results.totalVideosFound === 0 
        ? 'NO VIDEOS FOUND IN ANY COLLECTION - Need to upload videos'
        : `Found ${results.totalVideosFound} videos across collections`,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to search for videos',
      },
      { status: 500 }
    );
  }
}
