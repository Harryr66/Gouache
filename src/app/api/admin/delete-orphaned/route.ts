import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Delete orphaned content from the database
 * Orphaned = items without valid userId OR items with artist = "System"
 * 
 * Optional: Pass ?deleteAll=true to delete ALL content (nuclear option)
 * Optional: Pass ?userId=xxx to delete all content for a specific user
 */
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const deleteAllContent = searchParams.get('deleteAll') === 'true';
    const targetUserId = searchParams.get('userId');
    
    const results = {
      artworksDeleted: 0,
      portfolioItemsDeleted: 0,
      postsDeleted: 0,
      deletedIds: [] as string[],
      errors: [] as string[],
    };

    // Find and delete artworks
    console.log('🔍 Finding artworks to delete...', { deleteAllContent, targetUserId });
    const artworksSnapshot = await adminDb.collection('artworks').get();
    
    for (const doc of artworksSnapshot.docs) {
      const data = doc.data();
      
      // Check if orphaned (no valid userId)
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      const isSystemArtist = data.artist?.name === 'System' || data.artist === 'System' || data.artistName === 'System';
      const hasRecoveredDescription = data.description?.includes('recovered from Cloudflare');
      
      const isOrphaned = !userId || isSystemArtist || hasRecoveredDescription;
      
      // Determine if we should delete this item
      let shouldDelete = false;
      if (deleteAllContent) {
        shouldDelete = true; // Delete everything
      } else if (targetUserId && userId === targetUserId) {
        shouldDelete = true; // Delete items for specific user
      } else if (isOrphaned) {
        shouldDelete = true; // Delete orphaned items
      }
      
      if (shouldDelete) {
        try {
          // Delete from Cloudflare if has media URLs
          const imageUrl = data.imageUrl;
          const videoUrl = data.videoUrl;
          
          if (imageUrl?.includes('imagedelivery.net')) {
            try {
              const match = imageUrl.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
              if (match) {
                const imageId = match[1];
                await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                  },
                });
              }
            } catch (e) {
              // Continue even if Cloudflare delete fails
            }
          }
          
          if (videoUrl?.includes('cloudflarestream.com')) {
            try {
              const match = videoUrl.match(/cloudflarestream\.com\/([^/]+)/);
              if (match) {
                const videoId = match[1];
                await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                  },
                });
              }
            } catch (e) {
              // Continue even if Cloudflare delete fails
            }
          }
          
          // Delete from Firestore
          await doc.ref.delete();
          results.artworksDeleted++;
          results.deletedIds.push(doc.id);
          console.log(`🗑️ Deleted orphaned artwork: ${doc.id} (${data.title || 'untitled'})`);
        } catch (error: any) {
          results.errors.push(`Failed to delete artwork ${doc.id}: ${error.message}`);
        }
      }
    }

    // Find and delete portfolioItems
    console.log('🔍 Finding portfolioItems to delete...');
    const portfolioSnapshot = await adminDb.collection('portfolioItems').get();
    
    for (const doc of portfolioSnapshot.docs) {
      const data = doc.data();
      
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      const isSystemArtist = data.artist?.name === 'System' || data.artist === 'System' || data.artistName === 'System';
      const hasRecoveredDescription = data.description?.includes('recovered from Cloudflare');
      
      const isOrphaned = !userId || isSystemArtist || hasRecoveredDescription;
      
      let shouldDelete = false;
      if (deleteAllContent) {
        shouldDelete = true;
      } else if (targetUserId && userId === targetUserId) {
        shouldDelete = true;
      } else if (isOrphaned) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        try {
          await doc.ref.delete();
          results.portfolioItemsDeleted++;
          results.deletedIds.push(doc.id);
          console.log(`🗑️ Deleted portfolioItem: ${doc.id}`);
        } catch (error: any) {
          results.errors.push(`Failed to delete portfolioItem ${doc.id}: ${error.message}`);
        }
      }
    }

    // Find and delete posts
    console.log('🔍 Finding posts to delete...');
    const postsSnapshot = await adminDb.collection('posts').get();
    
    for (const doc of postsSnapshot.docs) {
      const data = doc.data();
      
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      const isSystemArtist = data.artist?.name === 'System' || data.artist === 'System';
      
      const isOrphaned = !userId || isSystemArtist;
      
      let shouldDelete = false;
      if (deleteAllContent) {
        shouldDelete = true;
      } else if (targetUserId && userId === targetUserId) {
        shouldDelete = true;
      } else if (isOrphaned) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        try {
          await doc.ref.delete();
          results.postsDeleted++;
          results.deletedIds.push(doc.id);
          console.log(`🗑️ Deleted post: ${doc.id}`);
        } catch (error: any) {
          results.errors.push(`Failed to delete post ${doc.id}: ${error.message}`);
        }
      }
    }

    const totalDeleted = results.artworksDeleted + results.portfolioItemsDeleted + results.postsDeleted;

    return NextResponse.json({
      success: true,
      message: `Deleted ${totalDeleted} items`,
      params: { deleteAllContent, targetUserId },
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error deleting orphaned content:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// GET endpoint to preview what would be deleted (dry run)
export async function GET() {
  try {
    const adminDb = getAdminDb();
    const orphaned = {
      artworks: [] as any[],
      portfolioItems: [] as any[],
      posts: [] as any[],
    };

    // Find orphaned artworks
    const artworksSnapshot = await adminDb.collection('artworks').get();
    
    for (const doc of artworksSnapshot.docs) {
      const data = doc.data();
      
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      const isSystemArtist = data.artist?.name === 'System' || data.artist === 'System' || data.artistName === 'System';
      const hasRecoveredDescription = data.description?.includes('recovered from Cloudflare');
      
      if (!userId || isSystemArtist || hasRecoveredDescription) {
        orphaned.artworks.push({
          id: doc.id,
          title: data.title,
          artist: data.artist,
          imageUrl: data.imageUrl?.substring(0, 60),
          reason: !userId ? 'no userId' : isSystemArtist ? 'System artist' : 'recovered content',
        });
      }
    }

    // Find orphaned portfolioItems
    const portfolioSnapshot = await adminDb.collection('portfolioItems').get();
    
    for (const doc of portfolioSnapshot.docs) {
      const data = doc.data();
      
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      const isSystemArtist = data.artist?.name === 'System' || data.artist === 'System';
      const hasRecoveredDescription = data.description?.includes('recovered from Cloudflare');
      
      if (!userId || isSystemArtist || hasRecoveredDescription) {
        orphaned.portfolioItems.push({
          id: doc.id,
          title: data.title,
          reason: !userId ? 'no userId' : isSystemArtist ? 'System artist' : 'recovered content',
        });
      }
    }

    // Find orphaned posts
    const postsSnapshot = await adminDb.collection('posts').get();
    
    for (const doc of postsSnapshot.docs) {
      const data = doc.data();
      
      const userId = data.userId || data.artistId || data.artist?.id || data.artist?.userId;
      const isSystemArtist = data.artist?.name === 'System' || data.artist === 'System';
      
      if (!userId || isSystemArtist) {
        orphaned.posts.push({
          id: doc.id,
          reason: !userId ? 'no userId' : 'System artist',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'DRY RUN - These items would be deleted. POST to this endpoint to delete them.',
      counts: {
        artworks: orphaned.artworks.length,
        portfolioItems: orphaned.portfolioItems.length,
        posts: orphaned.posts.length,
        total: orphaned.artworks.length + orphaned.portfolioItems.length + orphaned.posts.length,
      },
      orphaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error finding orphaned content:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
