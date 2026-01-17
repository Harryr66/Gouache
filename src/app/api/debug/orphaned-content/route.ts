import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to find orphaned content (items without proper userId)
 * These are items that would appear in Discover but can't be managed by any user
 */
export async function GET() {
  try {
    const results = {
      artworks: {
        total: 0,
        withUserId: 0,
        withoutUserId: 0,
        orphanedItems: [] as any[],
        validItems: [] as any[],
      },
      portfolioItems: {
        total: 0,
        withUserId: 0,
        withoutUserId: 0,
        orphanedItems: [] as any[],
      },
    };

    // Check artworks collection
    const artworksQuery = query(
      collection(db, 'artworks'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const artworksSnapshot = await getDocs(artworksQuery);
    
    artworksSnapshot.forEach((doc) => {
      const data = doc.data();
      results.artworks.total++;
      
      // Check all possible userId fields
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      
      if (userId) {
        results.artworks.withUserId++;
        if (results.artworks.validItems.length < 5) {
          results.artworks.validItems.push({
            id: doc.id,
            userId,
            title: data.title,
            imageUrl: data.imageUrl?.substring(0, 80),
            hasImage: !!data.imageUrl,
            hasVideo: !!data.videoUrl,
            showInPortfolio: data.showInPortfolio,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
          });
        }
      } else {
        results.artworks.withoutUserId++;
        results.artworks.orphanedItems.push({
          id: doc.id,
          title: data.title,
          imageUrl: data.imageUrl?.substring(0, 80),
          videoUrl: data.videoUrl?.substring(0, 80),
          hasImage: !!data.imageUrl,
          hasVideo: !!data.videoUrl,
          // Show all possible user-related fields for debugging
          allUserFields: {
            userId: data.userId,
            artistId: data.artistId,
            artist: data.artist,
            galleryId: data.galleryId,
            creatorId: data.creatorId,
          },
          showInPortfolio: data.showInPortfolio,
          type: data.type,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
        });
      }
    });

    // Check portfolioItems collection
    const portfolioQuery = query(
      collection(db, 'portfolioItems'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const portfolioSnapshot = await getDocs(portfolioQuery);
    
    portfolioSnapshot.forEach((doc) => {
      const data = doc.data();
      results.portfolioItems.total++;
      
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      
      if (userId) {
        results.portfolioItems.withUserId++;
      } else {
        results.portfolioItems.withoutUserId++;
        results.portfolioItems.orphanedItems.push({
          id: doc.id,
          title: data.title,
          allUserFields: {
            userId: data.userId,
            artistId: data.artistId,
            artist: data.artist,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        artworksTotal: results.artworks.total,
        artworksOrphaned: results.artworks.withoutUserId,
        artworksValid: results.artworks.withUserId,
        portfolioTotal: results.portfolioItems.total,
        portfolioOrphaned: results.portfolioItems.withoutUserId,
      },
      message: results.artworks.withoutUserId > 0 
        ? `Found ${results.artworks.withoutUserId} orphaned artworks without userId - these won't appear in user profiles but WERE appearing in Discover (now fixed)`
        : 'No orphaned content found - all items have valid userId',
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error checking orphaned content:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
