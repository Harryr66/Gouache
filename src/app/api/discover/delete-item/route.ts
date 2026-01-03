import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, writeBatch, query, collection, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { deleteCloudflareMediaByUrl } from '@/lib/cloudflare-delete';

export async function POST(request: NextRequest) {
  try {
    const { itemId, userId } = await request.json();

    if (!itemId || !userId) {
      return NextResponse.json({ error: 'Missing itemId or userId' }, { status: 400 });
    }

    // Get the item data first - check BOTH portfolioItems collection AND userProfiles.portfolio arrays
    let itemData: any = null;
    let portfolioItemRef: any = null;
    let portfolioItemDoc: any = null;
    let itemOwnerId: string | null = null;
    
    // Try portfolioItems collection first
    portfolioItemRef = doc(db, 'portfolioItems', itemId);
    portfolioItemDoc = await getDoc(portfolioItemRef);
    
    if (portfolioItemDoc.exists()) {
      itemData = portfolioItemDoc.data();
      itemOwnerId = itemData.userId || itemData.artistId || (itemData.artist?.id) || (itemData.artist?.userId);
    } else {
      // Item not in portfolioItems - check userProfiles.portfolio arrays (backward compatibility)
      // Find which user profile contains this item
      const userProfilesQuery = query(collection(db, 'userProfiles'));
      const userProfilesSnapshot = await getDocs(userProfilesQuery);
      
      let foundInProfile = false;
      for (const userProfileDoc of userProfilesSnapshot.docs) {
        const portfolio = userProfileDoc.data().portfolio || [];
        const portfolioItem = portfolio.find((p: any) => p.id === itemId);
        
        if (portfolioItem) {
          itemData = portfolioItem;
          itemOwnerId = userProfileDoc.id; // The owner is the user whose profile contains this item
          foundInProfile = true;
          break;
        }
      }
      
      if (!foundInProfile) {
        return NextResponse.json({ error: 'Item not found in portfolioItems or userProfiles' }, { status: 404 });
      }
    }
    
    // Get userId from item data if not provided (for backward compatibility)
    const actualUserId = userId || itemOwnerId || itemData.userId;
    if (!actualUserId) {
      return NextResponse.json({ error: 'Cannot determine userId' }, { status: 400 });
    }
    
    // Verify ownership (item must belong to the requesting user)
    const itemOwnerIdFinal = itemOwnerId || itemData.userId || itemData.artistId || (itemData.artist?.id) || (itemData.artist?.userId);
    if (itemOwnerIdFinal && itemOwnerIdFinal !== actualUserId) {
      // Check if user is admin (allow admins to delete any item)
      try {
        const userProfileRef = doc(db, 'userProfiles', actualUserId);
        const userProfileDoc = await getDoc(userProfileRef);
        const userData = userProfileDoc.data();
        const isAdmin = userData?.role === 'admin';
        
        if (!isAdmin) {
          return NextResponse.json({ error: 'Unauthorized: Item does not belong to you' }, { status: 403 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Unauthorized: Cannot verify ownership' }, { status: 403 });
      }
    }

    // Collect ALL possible media URLs
    const urlsToDelete: string[] = [];
    
    // Main media
    if (itemData.imageUrl) urlsToDelete.push(itemData.imageUrl);
    if (itemData.videoUrl) urlsToDelete.push(itemData.videoUrl);
    if (itemData.videoVariants?.thumbnail) urlsToDelete.push(itemData.videoVariants.thumbnail);
    if (itemData.videoVariants?.full) urlsToDelete.push(itemData.videoVariants.full);
    
    // Supporting media
    if (itemData.supportingImages) urlsToDelete.push(...itemData.supportingImages);
    if (itemData.supportingMedia) urlsToDelete.push(...itemData.supportingMedia);
    if (itemData.mediaUrls) urlsToDelete.push(...itemData.mediaUrls);
    if (itemData.images) urlsToDelete.push(...itemData.images);

    // Delete all media files from Cloudflare and Firebase Storage
    // CRITICAL: Ensure ALL Cloudflare media is deleted to prevent orphaned files
    for (const url of urlsToDelete) {
      if (!url || typeof url !== 'string') continue;
      
      try {
        // Check for ALL Cloudflare domains (Stream, Images, R2, etc.)
        const isCloudflare = url.includes('cloudflarestream.com') || 
                           url.includes('imagedelivery.net') ||
                           url.includes('videodelivery.net') ||
                           url.includes('cloudflare.com') ||
                           url.includes('r2.cloudflarestorage.com');
        
        if (isCloudflare) {
          console.log(`🗑️ Deleting Cloudflare media: ${url}`);
          await deleteCloudflareMediaByUrl(url);
          console.log(`✅ Successfully deleted Cloudflare media: ${url}`);
          continue;
        }
        
        // Firebase Storage deletion
        if (url.includes('firebasestorage.googleapis.com')) {
          const urlParts = url.split('/o/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('?');
            const storagePath = decodeURIComponent(pathParts[0]);
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);
            console.log('✅ Deleted from Firebase Storage:', storagePath);
          }
        }
      } catch (storageError) {
        console.error('Error deleting media:', url, storageError);
        // Continue with other files
      }
    }

    // Delete from Firestore - PERMANENTLY DELETE from ALL collections
    const batch = writeBatch(db);

    // 1. HARD DELETE portfolioItem if it exists in portfolioItems collection
    if (portfolioItemDoc && portfolioItemDoc.exists()) {
      batch.delete(portfolioItemRef);
    }

    // 2. Also check if it exists in artworks collection and HARD DELETE it
    try {
      const artworkRef = doc(db, 'artworks', itemId);
      const artworkDoc = await getDoc(artworkRef);
      if (artworkDoc.exists()) {
        batch.delete(artworkRef); // HARD DELETE
      }
    } catch (error) {
      console.error('Error deleting from artworks collection:', error);
    }

    // 3. HARD DELETE related posts
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('artworkId', '==', itemId)
      );
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach((postDoc) => {
        batch.delete(postDoc.ref); // HARD DELETE
      });
    } catch (error) {
      console.error('Error deleting related posts:', error);
    }

    // 4. Remove from userProfiles.portfolio array (backward compatibility)
    // Remove from ALL user profiles that might contain this item (in case it's duplicated)
    try {
      const userProfilesQuery = query(collection(db, 'userProfiles'));
      const userProfilesSnapshot = await getDocs(userProfilesQuery);
      
      for (const userProfileDoc of userProfilesSnapshot.docs) {
        const portfolio = userProfileDoc.data().portfolio || [];
        const hasItem = portfolio.some((p: any) => p.id === itemId);
        
        if (hasItem) {
          const updatedPortfolio = portfolio.filter((p: any) => p.id !== itemId);
          batch.update(userProfileDoc.ref, {
            portfolio: updatedPortfolio,
            updatedAt: serverTimestamp()
          });
          console.log(`✅ Removing item from userProfiles.portfolio for user ${userProfileDoc.id}`);
        }
      }
    } catch (error) {
      console.error('Error updating userProfiles.portfolio:', error);
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: 'Item permanently deleted from all databases' 
    });

  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item', details: error.message },
      { status: 500 }
    );
  }
}

