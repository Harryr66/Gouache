import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { deleteCloudflareMediaByUrl } from '@/lib/cloudflare-delete';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * DELETE /api/discover/delete-item
 * Actually delete content from Cloudflare and Firebase (hard delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemType = searchParams.get('type') || 'portfolioItem'; // portfolioItem or post

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting item:', { itemId, itemType });

    // Get the item document
    let itemData: any = null;
    let itemRef: any = null;

    if (itemType === 'portfolioItem') {
      itemRef = doc(db, 'portfolioItems', itemId);
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        itemData = itemDoc.data();
      }
    } else if (itemType === 'post') {
      itemRef = doc(db, 'posts', itemId);
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        itemData = itemDoc.data();
      }
    }

    if (!itemData) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Delete media from Cloudflare or Firebase Storage
    const mediaUrls: string[] = [];

    // Collect all media URLs
    if (itemData.imageUrl) mediaUrls.push(itemData.imageUrl);
    if (itemData.videoUrl) mediaUrls.push(itemData.videoUrl);
    if (itemData.mediaUrls && Array.isArray(itemData.mediaUrls)) {
      mediaUrls.push(...itemData.mediaUrls);
    }
    if (itemData.supportingImages && Array.isArray(itemData.supportingImages)) {
      mediaUrls.push(...itemData.supportingImages);
    }

    // Delete each media file
    for (const url of mediaUrls) {
      if (!url || typeof url !== 'string') continue;
      
      try {
        const isCloudflare = url.includes('cloudflarestream.com') || url.includes('imagedelivery.net');
        
        if (isCloudflare) {
          await deleteCloudflareMediaByUrl(url);
          console.log('✅ Deleted Cloudflare media:', url);
        } else if (url.includes('firebasestorage.googleapis.com')) {
          // Extract Firebase Storage path and delete
          const urlParts = url.split('/o/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('?');
            const storagePath = decodeURIComponent(pathParts[0]);
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);
            console.log('✅ Deleted Firebase Storage file:', storagePath);
          }
        }
      } catch (error: any) {
        console.error('⚠️ Error deleting media:', url, error?.message);
        // Continue with other files even if one fails
      }
    }

    // Delete the document from Firestore
    await deleteDoc(itemRef);
    console.log('✅ Deleted Firestore document:', itemId);

    // Also delete from userProfiles.portfolio if it exists there
    if (itemData.userId) {
      try {
        const userProfileRef = doc(db, 'userProfiles', itemData.userId);
        const userProfileDoc = await getDoc(userProfileRef);
        
        if (userProfileDoc.exists()) {
          const userData = userProfileDoc.data();
          if (userData.portfolio && Array.isArray(userData.portfolio)) {
            const updatedPortfolio = userData.portfolio.filter((item: any) => item.id !== itemId);
            
            // Update the user profile
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(userProfileRef, { portfolio: updatedPortfolio });
            console.log('✅ Removed from userProfiles.portfolio');
          }
        }
      } catch (error: any) {
        console.error('⚠️ Error updating userProfiles.portfolio:', error?.message);
        // Continue even if this fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting item:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete item',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

