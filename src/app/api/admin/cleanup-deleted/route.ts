import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Admin endpoint to mark orphaned items as deleted
 * This finds artworks/posts that have no proper imageUrl or are invalid
 * and marks them as deleted
 */
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    // Get all artworks
    const artworksSnapshot = await adminDb.collection('artworks').get();
    
    let markedCount = 0;
    const batch = adminDb.batch();
    let batchCount = 0;
    
    for (const doc of artworksSnapshot.docs) {
      const data = doc.data();
      
      // Skip already deleted
      if (data.deleted === true) continue;
      
      // Skip events
      if (data.type === 'event' || data.type === 'Event' || data.eventType) continue;
      
      // Check if this item has valid media
      const hasValidMedia = (
        (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.length > 0 && !data.imageUrl.startsWith('data:image')) ||
        (data.videoUrl && typeof data.videoUrl === 'string' && data.videoUrl.length > 0) ||
        (data.supportingImages && Array.isArray(data.supportingImages) && data.supportingImages.length > 0) ||
        (data.mediaUrls && Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0)
      );
      
      // If no valid media, mark as deleted
      if (!hasValidMedia) {
        console.log(`Marking orphaned item as deleted: ${doc.id}`);
        batch.update(doc.ref, {
          deleted: true,
          deletedAt: new Date(),
          deletionReason: 'cleanup_orphaned_no_media'
        });
        markedCount++;
        batchCount++;
        
        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({
      success: true,
      markedCount,
      message: `Marked ${markedCount} orphaned items as deleted`
    });
    
  } catch (error) {
    console.error('Error cleaning up deleted items:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup deleted items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

