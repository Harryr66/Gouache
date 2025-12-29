import { NextRequest, NextResponse } from 'next/server';
import { migrateArtworksToCloudflare } from '@/lib/migrate-to-cloudflare';

/**
 * API endpoint to trigger migration from Firebase Storage to Cloudflare
 * 
 * POST /api/migrate/cloudflare
 * Body: {
 *   batchSize?: number (default: 10)
 *   deleteAfterMigration?: boolean (default: false)
 *   limit?: number (optional, limits number of items to migrate)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json().catch(() => ({}));
    const {
      batchSize = 10,
      deleteAfterMigration = false,
      limit,
      dryRun = false,
    } = body;

    console.log('🚀 Starting migration via API...', {
      batchSize,
      deleteAfterMigration,
      limit,
    });

    const stats = await migrateArtworksToCloudflare({
      batchSize,
      deleteAfterMigration,
      limit,
      dryRun,
    });

    return NextResponse.json({
      success: true,
      stats,
      message: `Migration complete: ${stats.migrated} migrated, ${stats.failed} failed, ${stats.skipped} skipped`,
    });
  } catch (error: any) {
    console.error('❌ Migration API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check migration status
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, getDocs, count } = await import('firebase/firestore');

    // Count artworks that need migration
    const artworksQuery = query(
      collection(db, 'artworks'),
      where('deleted', '!=', true)
    );

    const snapshot = await getDocs(artworksQuery);
    let needsMigration = 0;
    let alreadyMigrated = 0;
    let hasCloudflareUrls = 0;
    let noMediaUrls = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.migratedToCloudflare) {
        alreadyMigrated++;
      } else {
        // Check if it has Firebase URLs (and not already Cloudflare)
        const hasFirebaseImage = data.imageUrl && 
          data.imageUrl.includes('firebasestorage.googleapis.com') &&
          !data.imageUrl.includes('cloudflarestream.com') &&
          !data.imageUrl.includes('imagedelivery.net');
        const hasFirebaseVideo = data.videoUrl && 
          data.videoUrl.includes('firebasestorage.googleapis.com') &&
          !data.videoUrl.includes('cloudflarestream.com') &&
          !data.videoUrl.includes('imagedelivery.net');
        const hasFirebaseSupporting = data.supportingImages?.some((url: string) => 
          url.includes('firebasestorage.googleapis.com') &&
          !url.includes('cloudflarestream.com') &&
          !url.includes('imagedelivery.net')
        );
        const hasFirebaseMedia = data.mediaUrls?.some((url: string) => 
          url.includes('firebasestorage.googleapis.com') &&
          !url.includes('cloudflarestream.com') &&
          !url.includes('imagedelivery.net')
        );
        
        const hasFirebaseUrls = hasFirebaseImage || hasFirebaseVideo || hasFirebaseSupporting || hasFirebaseMedia;
        
        if (hasFirebaseUrls) {
          needsMigration++;
        } else if (data.imageUrl || data.videoUrl || data.supportingImages?.length || data.mediaUrls?.length) {
          // Has media but it's already Cloudflare or something else
          if (data.imageUrl?.includes('cloudflarestream.com') || 
              data.imageUrl?.includes('imagedelivery.net') ||
              data.videoUrl?.includes('cloudflarestream.com') ||
              data.videoUrl?.includes('imagedelivery.net')) {
            hasCloudflareUrls++;
          }
        } else {
          // No media URLs at all
          noMediaUrls++;
        }
      }
    });

    return NextResponse.json({
      needsMigration,
      alreadyMigrated,
      hasCloudflareUrls,
      noMediaUrls,
      total: snapshot.size,
    });
  } catch (error: any) {
    console.error('❌ Migration status check error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to check migration status',
      },
      { status: 500 }
    );
  }
}

