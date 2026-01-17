/**
 * ARTWORK SERVICE - Single source of truth for artwork CRUD operations
 * 
 * This service standardizes all artwork operations:
 * - CREATE: Uploads to Cloudflare, saves to Firestore with consistent fields
 * - READ: Queries artworks collection only
 * - DELETE: Removes from Firestore AND Cloudflare
 * 
 * CANONICAL FIELDS (all artworks must have these):
 * - id: string (document ID)
 * - userId: string (owner's user ID - THE canonical user identifier)
 * - imageUrl: string (Cloudflare Images URL)
 * - cloudflareImageId: string (for deletion)
 * - title: string
 * - description: string
 * - createdAt: Timestamp
 * - updatedAt: Timestamp
 * - deleted: boolean (soft delete flag)
 * 
 * OPTIONAL FIELDS:
 * - artist: { id, name, handle, avatarUrl } (denormalized for display)
 * - tags: string[]
 * - likes: number
 * - views: number
 * - showInPortfolio: boolean
 * - showInShop: boolean
 * - isForSale: boolean
 * - price: number (in cents)
 */

import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  orderBy,
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';

export interface ArtworkData {
  id: string;
  userId: string;
  imageUrl: string;
  cloudflareImageId: string;
  title: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
  deleted?: boolean;
  
  // Optional display fields
  artist?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
  };
  tags?: string[];
  likes?: number;
  views?: number;
  showInPortfolio?: boolean;
  showInShop?: boolean;
  isForSale?: boolean;
  price?: number;
  blurPlaceholder?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface UploadResult {
  success: boolean;
  artwork?: ArtworkData;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  deletedFromFirestore: boolean;
  deletedFromCloudflare: boolean;
  error?: string;
}

/**
 * Upload an image to Cloudflare and save metadata to Firestore
 */
export async function createArtwork(
  file: File,
  userId: string,
  metadata: {
    title: string;
    description?: string;
    artist?: ArtworkData['artist'];
    tags?: string[];
    showInPortfolio?: boolean;
    showInShop?: boolean;
    isForSale?: boolean;
    price?: number;
  }
): Promise<UploadResult> {
  try {
    // Step 1: Upload to Cloudflare Images
    const { uploadMedia } = await import('@/lib/media-upload-v2');
    const uploadResult = await uploadMedia(file, 'image', userId);
    
    if (!uploadResult.url) {
      throw new Error('Failed to upload image to Cloudflare');
    }
    
    // Extract Cloudflare Image ID from URL
    // Format: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
    const cloudflareImageId = extractCloudflareImageId(uploadResult.url);
    
    // Step 2: Generate artwork ID
    const artworkId = `artwork-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Step 3: Create artwork document with standardized fields
    const artworkData: ArtworkData = {
      id: artworkId,
      userId: userId, // CANONICAL user identifier
      imageUrl: uploadResult.url,
      cloudflareImageId: cloudflareImageId || '',
      title: metadata.title || 'Untitled',
      description: metadata.description || '',
      deleted: false,
      
      // Optional fields
      ...(metadata.artist && { artist: metadata.artist }),
      tags: metadata.tags || [],
      likes: 0,
      views: 0,
      showInPortfolio: metadata.showInPortfolio ?? false,
      showInShop: metadata.showInShop ?? false,
      isForSale: metadata.isForSale ?? false,
      ...(metadata.price !== undefined && { price: metadata.price }),
    };
    
    // Step 4: Save to Firestore
    await setDoc(doc(db, 'artworks', artworkId), {
      ...artworkData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Artwork created:', artworkId, '| Cloudflare ID:', cloudflareImageId);
    
    return {
      success: true,
      artwork: artworkData,
    };
  } catch (error: any) {
    console.error('❌ Failed to create artwork:', error);
    return {
      success: false,
      error: error.message || 'Failed to create artwork',
    };
  }
}

/**
 * Delete an artwork - removes from both Firestore AND Cloudflare
 * This is a HARD delete - the artwork is permanently removed
 */
export async function deleteArtwork(artworkId: string): Promise<DeleteResult> {
  let deletedFromFirestore = false;
  let deletedFromCloudflare = false;
  
  try {
    // Step 1: Get the artwork document to find Cloudflare ID
    const artworkDoc = await getDoc(doc(db, 'artworks', artworkId));
    
    if (!artworkDoc.exists()) {
      return {
        success: false,
        deletedFromFirestore: false,
        deletedFromCloudflare: false,
        error: 'Artwork not found',
      };
    }
    
    const artworkData = artworkDoc.data();
    const imageUrl = artworkData.imageUrl;
    const cloudflareImageId = artworkData.cloudflareImageId || extractCloudflareImageId(imageUrl);
    
    // Step 2: Delete from Cloudflare Images
    if (cloudflareImageId && imageUrl?.includes('imagedelivery.net')) {
      try {
        const { deleteCloudflareMediaByUrl } = await import('@/lib/cloudflare-delete');
        await deleteCloudflareMediaByUrl(imageUrl);
        deletedFromCloudflare = true;
        console.log('✅ Deleted from Cloudflare:', cloudflareImageId);
      } catch (cloudflareError) {
        console.warn('⚠️ Failed to delete from Cloudflare (continuing with Firestore delete):', cloudflareError);
      }
    }
    
    // Step 3: Delete from Firestore (artworks collection)
    await deleteDoc(doc(db, 'artworks', artworkId));
    deletedFromFirestore = true;
    console.log('✅ Deleted from Firestore:', artworkId);
    
    // Step 4: Also delete from portfolioItems if exists (for consistency)
    try {
      const portfolioDoc = await getDoc(doc(db, 'portfolioItems', artworkId));
      if (portfolioDoc.exists()) {
        await deleteDoc(doc(db, 'portfolioItems', artworkId));
        console.log('✅ Also deleted from portfolioItems:', artworkId);
      }
    } catch (e) {
      // Non-critical - portfolioItems may not exist
    }
    
    // Step 5: Delete related posts
    try {
      const postsQuery = query(collection(db, 'posts'), where('artworkId', '==', artworkId));
      const postsSnapshot = await getDocs(postsQuery);
      for (const postDoc of postsSnapshot.docs) {
        await deleteDoc(postDoc.ref);
        console.log('✅ Deleted related post:', postDoc.id);
      }
    } catch (e) {
      // Non-critical
    }
    
    return {
      success: true,
      deletedFromFirestore,
      deletedFromCloudflare,
    };
  } catch (error: any) {
    console.error('❌ Failed to delete artwork:', error);
    return {
      success: false,
      deletedFromFirestore,
      deletedFromCloudflare,
      error: error.message || 'Failed to delete artwork',
    };
  }
}

/**
 * Get all artworks for a user
 */
export async function getUserArtworks(userId: string): Promise<ArtworkData[]> {
  try {
    const artworksQuery = query(
      collection(db, 'artworks'),
      where('userId', '==', userId),
      where('deleted', '!=', true),
      orderBy('deleted'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(artworksQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ArtworkData[];
  } catch (error) {
    console.error('Error fetching user artworks:', error);
    return [];
  }
}

/**
 * Get artworks for Discover feed (all users, non-deleted)
 */
export async function getDiscoverArtworks(options?: {
  limit?: number;
}): Promise<ArtworkData[]> {
  try {
    const artworksQuery = query(
      collection(db, 'artworks'),
      where('deleted', '!=', true),
      orderBy('deleted'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(options?.limit || 50)
    );
    
    const snapshot = await getDocs(artworksQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ArtworkData[];
  } catch (error) {
    console.error('Error fetching discover artworks:', error);
    return [];
  }
}

/**
 * Extract Cloudflare Image ID from URL
 * Format: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
 */
function extractCloudflareImageId(url: string | undefined): string | null {
  if (!url || !url.includes('imagedelivery.net')) {
    return null;
  }
  
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Validate that an artwork has all required fields
 */
export function validateArtwork(artwork: any): { valid: boolean; missing: string[] } {
  const requiredFields = ['id', 'userId', 'imageUrl', 'title'];
  const missing = requiredFields.filter(field => !artwork[field]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
