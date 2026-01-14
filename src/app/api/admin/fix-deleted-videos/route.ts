import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Fix mislabeled videos - remove deleted:true from videos that shouldn't be deleted
 * 
 * This fixes videos that were incorrectly marked as deleted by cleanup scripts
 * or other processes. Videos with valid videoUrl should NOT have deleted:true
 */
export async function POST(request: NextRequest) {
  try {
    // Get all videos from artworks collection
    const artworksSnapshot = await getDocs(collection(db, 'artworks'));
    
    let fixedCount = 0;
    let skippedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const artworkDoc of artworksSnapshot.docs) {
      const data = artworkDoc.data();
      
      // Only process videos
      if (!data.videoUrl && data.mediaType !== 'video') continue;
      
      // Only fix if it has deleted:true but has a valid videoUrl
      if (data.deleted === true && data.videoUrl) {
        const videoUrl = data.videoUrl;
        // Check if videoUrl is valid (not empty, not placeholder)
        if (videoUrl && typeof videoUrl === 'string' && videoUrl.length > 0) {
          console.log(`Fixing video ${artworkDoc.id}: Removing deleted:true`);
          batch.update(artworkDoc.ref, {
            deleted: false,
            fixedAt: new Date(),
            fixReason: 'mislabeled_deleted_flag',
          });
          fixedCount++;
          batchCount++;
          
          // Commit batch every 500 operations (Firestore limit)
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({
      success: true,
      fixedCount,
      skippedCount,
      message: `Fixed ${fixedCount} mislabeled videos (removed deleted:true from videos with valid videoUrl)`,
      timestamp: Date.now(),
    });
    
  } catch (error: any) {
    console.error('Error fixing deleted videos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fix deleted videos',
      },
      { status: 500 }
    );
  }
}
