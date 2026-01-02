import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * IMMEDIATE FIX: Mark all corrupted data:image URLs as deleted
 * Run this endpoint to clean up the database
 */
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    console.log('🧹 Starting cleanup of corrupted images...');
    
    // Get ALL artworks
    const artworksSnapshot = await adminDb.collection('artworks').get();
    
    let deletedCount = 0;
    const corruptedIds: string[] = [];
    
    // Process in batches of 500 (Firestore limit)
    const batches: any[] = [];
    let currentBatch = adminDb.batch();
    let batchCount = 0;
    
    for (const doc of artworksSnapshot.docs) {
      const data = doc.data();
      
      // Skip already deleted
      if (data.deleted === true) continue;
      
      // Skip events
      if (data.type === 'event' || data.type === 'Event' || data.eventType) continue;
      
      // Check if this has a corrupted data:image URL
      const hasCorruptedImage = (
        (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image'))
      );
      
      // Also check if it has NO valid media at all
      const hasNoValidMedia = (
        !data.videoUrl &&
        (!data.imageUrl || data.imageUrl.startsWith('data:image')) &&
        (!data.supportingImages || data.supportingImages.length === 0) &&
        (!data.images || data.images.length === 0) &&
        (!data.mediaUrls || data.mediaUrls.length === 0)
      );
      
      if (hasCorruptedImage || hasNoValidMedia) {
        console.log(`Marking corrupted item as deleted: ${doc.id}`);
        corruptedIds.push(doc.id);
        
        currentBatch.update(doc.ref, {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: 'admin_cleanup',
          deletionReason: hasCorruptedImage ? 'corrupted_data_url' : 'no_valid_media'
        });
        
        deletedCount++;
        batchCount++;
        
        // Commit when we hit 500
        if (batchCount >= 500) {
          batches.push(currentBatch);
          currentBatch = adminDb.batch();
          batchCount = 0;
        }
      }
    }
    
    // Add final batch if it has operations
    if (batchCount > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches
    console.log(`📦 Committing ${batches.length} batches...`);
    for (const batch of batches) {
      await batch.commit();
    }
    
    console.log(`✅ Cleanup complete! Marked ${deletedCount} items as deleted.`);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      corruptedIds,
      message: `Successfully marked ${deletedCount} corrupted items as deleted. These will no longer appear in the Discover feed.`
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup corrupted images', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

