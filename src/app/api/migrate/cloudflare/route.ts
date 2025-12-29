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

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.migratedToCloudflare) {
        alreadyMigrated++;
      } else {
        // Check if it has Firebase URLs
        const hasFirebaseUrls = 
          (data.imageUrl && data.imageUrl.includes('firebasestorage.googleapis.com')) ||
          (data.videoUrl && data.videoUrl.includes('firebasestorage.googleapis.com')) ||
          (data.supportingImages?.some((url: string) => url.includes('firebasestorage.googleapis.com'))) ||
          (data.mediaUrls?.some((url: string) => url.includes('firebasestorage.googleapis.com')));
        
        if (hasFirebaseUrls) {
          needsMigration++;
        }
      }
    });

    return NextResponse.json({
      needsMigration,
      alreadyMigrated,
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

