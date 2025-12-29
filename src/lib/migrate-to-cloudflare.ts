/**
 * Migration utility to move media from Firebase Storage to Cloudflare
 * 
 * This script:
 * 1. Finds all artworks/posts with Firebase Storage URLs
 * 2. Downloads the files from Firebase Storage
 * 3. Uploads them to Cloudflare (Stream for videos, Images for images)
 * 4. Updates the database with new Cloudflare URLs
 * 5. Optionally deletes old Firebase Storage files
 */

import { ref, getDownloadURL, getBytes, deleteObject } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';

export interface MigrationStats {
  totalFound: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Check if a URL is from Firebase Storage
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') || 
         (url.startsWith('portfolio/') || url.startsWith('artworks/'));
}

/**
 * Check if a URL is already from Cloudflare
 */
export function isCloudflareUrl(url: string): boolean {
  return url.includes('cloudflarestream.com') || url.includes('imagedelivery.net');
}

/**
 * Extract Firebase Storage path from a URL
 */
export function extractFirebasePath(url: string): string | null {
  if (url.includes('firebasestorage.googleapis.com')) {
    const urlParts = url.split('/o/');
    if (urlParts.length > 1) {
      const pathParts = urlParts[1].split('?');
      return decodeURIComponent(pathParts[0]);
    }
  }
  // If it's already a path (not a full URL)
  if (url.startsWith('portfolio/') || url.startsWith('artworks/')) {
    return url;
  }
  return null;
}

/**
 * Download a file from Firebase Storage and convert to File object
 */
async function downloadFileFromFirebase(storagePath: string, fileName: string, mimeType?: string): Promise<File> {
  const fileRef = ref(storage, storagePath);
  const bytes = await getBytes(fileRef);
  
  // Try to determine MIME type from file extension if not provided
  let detectedType = mimeType;
  if (!detectedType) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'mp4' || ext === 'mov' || ext === 'webm') {
      detectedType = `video/${ext === 'mov' ? 'quicktime' : ext}`;
    } else if (ext === 'jpg' || ext === 'jpeg') {
      detectedType = 'image/jpeg';
    } else if (ext === 'png') {
      detectedType = 'image/png';
    } else if (ext === 'gif') {
      detectedType = 'image/gif';
    } else if (ext === 'webp') {
      detectedType = 'image/webp';
    } else {
      detectedType = 'application/octet-stream';
    }
  }
  
  const blob = new Blob([bytes], { type: detectedType });
  return new File([blob], fileName, { type: detectedType });
}

/**
 * Upload a file to Cloudflare and return the new URL
 */
async function uploadToCloudflare(file: File, isVideo: boolean): Promise<{ url: string; cloudflareId?: string }> {
  const { uploadMedia } = await import('@/lib/media-upload-v2');
  const mediaType = isVideo ? 'video' : 'image';
  const result = await uploadMedia(file, mediaType, 'migration'); // Use 'migration' as userId
  
  return {
    url: result.url,
    cloudflareId: result.cloudflareId,
  };
}

/**
 * Migrate a single artwork's media to Cloudflare
 */
async function migrateArtworkMedia(artworkId: string, artworkData: any): Promise<{ updated: boolean; error?: string }> {
  try {
    const updates: any = {};
    let hasUpdates = false;

    // Migrate main image
    if (artworkData.imageUrl && isFirebaseStorageUrl(artworkData.imageUrl) && !isCloudflareUrl(artworkData.imageUrl)) {
      const storagePath = extractFirebasePath(artworkData.imageUrl);
      if (storagePath) {
        const fileName = storagePath.split('/').pop() || 'image.jpg';
        const file = await downloadFileFromFirebase(storagePath, fileName, 'image/jpeg');
        const { url } = await uploadToCloudflare(file, false);
        updates.imageUrl = url;
        hasUpdates = true;
        console.log(`✅ Migrated image for artwork ${artworkId}`);
      }
    }

    // Migrate main video
    if (artworkData.videoUrl && isFirebaseStorageUrl(artworkData.videoUrl) && !isCloudflareUrl(artworkData.videoUrl)) {
      const storagePath = extractFirebasePath(artworkData.videoUrl);
      if (storagePath) {
        const fileName = storagePath.split('/').pop() || 'video.mp4';
        const file = await downloadFileFromFirebase(storagePath, fileName, 'video/mp4');
        const { url } = await uploadToCloudflare(file, true);
        updates.videoUrl = url;
        hasUpdates = true;
        console.log(`✅ Migrated video for artwork ${artworkId}`);
      }
    }

    // Migrate supporting images
    if (artworkData.supportingImages && Array.isArray(artworkData.supportingImages)) {
      const migratedUrls = await Promise.all(
        artworkData.supportingImages.map(async (url: string) => {
          if (isFirebaseStorageUrl(url) && !isCloudflareUrl(url)) {
            const storagePath = extractFirebasePath(url);
            if (storagePath) {
              const fileName = storagePath.split('/').pop() || 'image.jpg';
              const file = await downloadFileFromFirebase(storagePath, fileName, 'image/jpeg');
              const { url: newUrl } = await uploadToCloudflare(file, false);
              return newUrl;
            }
          }
          return url; // Keep original if not Firebase or already Cloudflare
        })
      );
      
      if (JSON.stringify(migratedUrls) !== JSON.stringify(artworkData.supportingImages)) {
        updates.supportingImages = migratedUrls;
        hasUpdates = true;
        console.log(`✅ Migrated supporting images for artwork ${artworkId}`);
      }
    }

    // Migrate mediaUrls array
    if (artworkData.mediaUrls && Array.isArray(artworkData.mediaUrls)) {
      const migratedUrls = await Promise.all(
        artworkData.mediaUrls.map(async (url: string, index: number) => {
          if (isFirebaseStorageUrl(url) && !isCloudflareUrl(url)) {
            const storagePath = extractFirebasePath(url);
            if (storagePath) {
              const fileName = storagePath.split('/').pop() || `media-${index}.${url.includes('video') ? 'mp4' : 'jpg'}`;
              const isVideo = artworkData.mediaTypes?.[index] === 'video' || url.includes('video');
              const file = await downloadFileFromFirebase(storagePath, fileName);
              const { url: newUrl } = await uploadToCloudflare(file, isVideo);
              return newUrl;
            }
          }
          return url;
        })
      );
      
      if (JSON.stringify(migratedUrls) !== JSON.stringify(artworkData.mediaUrls)) {
        updates.mediaUrls = migratedUrls;
        hasUpdates = true;
        console.log(`✅ Migrated mediaUrls for artwork ${artworkId}`);
      }
    }

    if (hasUpdates) {
      const artworkRef = doc(db, 'artworks', artworkId);
      await updateDoc(artworkRef, {
        ...updates,
        migratedToCloudflare: true,
        migratedAt: new Date(),
      });
      return { updated: true };
    }

    return { updated: false };
  } catch (error: any) {
    console.error(`❌ Error migrating artwork ${artworkId}:`, error);
    return { updated: false, error: error.message };
  }
}

/**
 * Migrate all artworks from Firebase Storage to Cloudflare
 */
export async function migrateArtworksToCloudflare(
  options: {
    batchSize?: number;
    deleteAfterMigration?: boolean;
    limit?: number;
    dryRun?: boolean;
  } = {}
): Promise<MigrationStats> {
  const { batchSize = 10, deleteAfterMigration = false, limit, dryRun = false } = options;
  const stats: MigrationStats = {
    totalFound: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    console.log('🚀 Starting migration from Firebase Storage to Cloudflare...');

    // Query all artworks that haven't been migrated yet
    const artworksQuery = query(
      collection(db, 'artworks'),
      where('deleted', '!=', true)
    );

    const artworksSnapshot = await getDocs(artworksQuery);
    const artworks: Array<{ id: string; data: any }> = [];

    artworksSnapshot.forEach((doc) => {
      const data = doc.data();
      // Check if artwork has Firebase Storage URLs
      const hasFirebaseUrls = 
        (data.imageUrl && isFirebaseStorageUrl(data.imageUrl) && !isCloudflareUrl(data.imageUrl)) ||
        (data.videoUrl && isFirebaseStorageUrl(data.videoUrl) && !isCloudflareUrl(data.videoUrl)) ||
        (data.supportingImages?.some((url: string) => isFirebaseStorageUrl(url) && !isCloudflareUrl(url))) ||
        (data.mediaUrls?.some((url: string) => isFirebaseStorageUrl(url) && !isCloudflareUrl(url)));

      if (hasFirebaseUrls && !data.migratedToCloudflare) {
        artworks.push({ id: doc.id, data });
      } else if (dryRun && hasFirebaseUrls) {
        // In dry run, log why items are being skipped
        console.log(`🔍 DRY RUN: Skipping ${doc.id} - migratedToCloudflare: ${data.migratedToCloudflare}, hasFirebaseUrls: ${hasFirebaseUrls}`);
      }
    });

    stats.totalFound = artworks.length;
    console.log(`📊 Found ${artworks.length} artworks to migrate`);

    // Process in batches
    const itemsToProcess = limit ? artworks.slice(0, limit) : artworks;
    
    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(itemsToProcess.length / batchSize)}`);

      await Promise.all(
        batch.map(async (artwork) => {
          try {
            if (dryRun) {
              // In dry run, just simulate migration
              console.log(`🔍 DRY RUN: Would migrate artwork ${artwork.id}`);
              stats.migrated++;
              return;
            }
            
            const result = await migrateArtworkMedia(artwork.id, artwork.data);
            
            if (result.updated) {
              stats.migrated++;
              
              // Optionally delete from Firebase Storage after successful migration
              if (deleteAfterMigration) {
                try {
                  const urlsToDelete: string[] = [];
                  if (artwork.data.imageUrl && isFirebaseStorageUrl(artwork.data.imageUrl)) {
                    urlsToDelete.push(artwork.data.imageUrl);
                  }
                  if (artwork.data.videoUrl && isFirebaseStorageUrl(artwork.data.videoUrl)) {
                    urlsToDelete.push(artwork.data.videoUrl);
                  }
                  if (artwork.data.supportingImages) {
                    urlsToDelete.push(...artwork.data.supportingImages.filter((url: string) => isFirebaseStorageUrl(url)));
                  }
                  if (artwork.data.mediaUrls) {
                    urlsToDelete.push(...artwork.data.mediaUrls.filter((url: string) => isFirebaseStorageUrl(url)));
                  }

                  for (const url of urlsToDelete) {
                    const storagePath = extractFirebasePath(url);
                    if (storagePath) {
                      const fileRef = ref(storage, storagePath);
                      await deleteObject(fileRef);
                      console.log(`🗑️ Deleted from Firebase Storage: ${storagePath}`);
                    }
                  }
                } catch (deleteError) {
                  console.error(`⚠️ Failed to delete from Firebase Storage for ${artwork.id}:`, deleteError);
                }
              }
            } else if (result.error) {
              stats.failed++;
              stats.errors.push({ id: artwork.id, error: result.error });
            } else {
              stats.skipped++;
            }
          } catch (error: any) {
            stats.failed++;
            stats.errors.push({ id: artwork.id, error: error.message });
            console.error(`❌ Failed to migrate artwork ${artwork.id}:`, error);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < itemsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('✅ Migration complete!', stats);
    return stats;
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

