/**
 * Unified Media Upload Interface
 * 
 * Provides a single interface for uploading media (images/videos) that:
 * - Uses Cloudflare (Stream/Images) when configured
 * - Falls back to Firebase Storage for legacy support
 * - Handles both new uploads and existing content
 * 
 * Strategy:
 * - New uploads → Cloudflare (if configured)
 * - Existing content → Keep Firebase URLs (gradual migration)
 * - Display logic handles both providers
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { uploadVideoToCloudflare, CloudflareStreamUploadResult } from './cloudflare-stream';
import { uploadImageToCloudflare, CloudflareImagesUploadResult } from './cloudflare-images';

export type MediaType = 'image' | 'video';
export type MediaProvider = 'cloudflare' | 'firebase';

export interface MediaUploadResult {
  url: string;
  thumbnailUrl?: string;
  provider: MediaProvider;
  // Cloudflare-specific fields
  cloudflareId?: string; // Video ID or Image ID
  variants?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    full?: string;
  };
  // Metadata
  duration?: number; // For videos
  width?: number;
  height?: number;
}

/**
 * Check if Cloudflare is configured and enabled
 */
function isCloudflareEnabled(): boolean {
  // Try to access env vars - they should be available in browser for NEXT_PUBLIC_ vars
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const streamToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;
  const imagesHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const imagesToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;
  
  const streamEnabled = !!(accountId && streamToken);
  const imagesEnabled = !!(imagesHash && imagesToken);

  // Debug logging - log actual values (first few chars only for security)
  console.log('🔍 Cloudflare check:', {
    hasAccountId: !!accountId,
    accountIdPreview: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
    hasStreamToken: !!streamToken,
    streamTokenPreview: streamToken ? `${streamToken.substring(0, 8)}...` : 'MISSING',
    hasImagesHash: !!imagesHash,
    imagesHashPreview: imagesHash ? `${imagesHash.substring(0, 8)}...` : 'MISSING',
    hasImagesToken: !!imagesToken,
    imagesTokenPreview: imagesToken ? `${imagesToken.substring(0, 8)}...` : 'MISSING',
    streamEnabled,
    imagesEnabled,
    enabled: streamEnabled || imagesEnabled,
    allEnvVars: Object.keys(process.env).filter(k => k.includes('CLOUDFLARE'))
  });

  return streamEnabled || imagesEnabled;
}

/**
 * Upload media file (image or video)
 * 
 * Uses Cloudflare if configured, otherwise falls back to Firebase Storage.
 * 
 * @param file - File to upload
 * @param type - Media type ('image' or 'video')
 * @param userId - User ID for Firebase path organization
 * @returns Upload result with URL and metadata
 */
export async function uploadMedia(
  file: File,
  type: MediaType,
  userId: string
): Promise<MediaUploadResult> {
  console.log(`📤 uploadMedia: Starting upload for ${type}, file: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB`);
  
  const useCloudflare = isCloudflareEnabled();
  console.log(`📤 uploadMedia: Cloudflare enabled? ${useCloudflare}`);

  try {
    if (useCloudflare && type === 'video') {
      console.log(`📤 uploadMedia: Attempting Cloudflare Stream upload...`);
      // Upload video to Cloudflare Stream
      const streamEnabled = !!(
        process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID &&
        process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN
      );

      if (streamEnabled) {
        console.log(`📤 uploadMedia: Stream enabled, uploading to Cloudflare Stream...`);
        const result = await uploadVideoToCloudflare(file);
        console.log(`✅ uploadMedia: Cloudflare Stream upload successful!`, result);
        return {
          url: result.playbackUrl,
          thumbnailUrl: result.thumbnailUrl,
          provider: 'cloudflare',
          cloudflareId: result.videoId,
          duration: result.duration,
        };
      } else {
        console.log(`⚠️ uploadMedia: Stream not enabled, falling back to Firebase`);
      }
    }

    if (useCloudflare && type === 'image') {
      console.log(`📤 uploadMedia: Attempting Cloudflare Images upload...`);
      // Upload image to Cloudflare Images
      const imagesEnabled = !!(
        process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH &&
        process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN
      );

      if (imagesEnabled) {
        console.log(`📤 uploadMedia: Images enabled, uploading to Cloudflare Images...`);
        const result = await uploadImageToCloudflare(file);
        console.log(`✅ uploadMedia: Cloudflare Images upload successful!`, result);
        return {
          url: result.imageUrl,
          provider: 'cloudflare',
          cloudflareId: result.imageId,
          variants: result.variants,
        };
      } else {
        console.log(`⚠️ uploadMedia: Images not enabled, falling back to Firebase`);
      }
    }

    // Fallback to Firebase Storage
    console.log(`📤 uploadMedia: Falling back to Firebase Storage...`);
    const firebaseResult = await uploadToFirebase(file, type, userId);
    console.log(`✅ uploadMedia: Firebase upload successful`, firebaseResult);
    return firebaseResult;
  } catch (error: any) {
    console.error(`❌ uploadMedia: Error uploading ${type} to Cloudflare:`, error);
    console.error(`❌ uploadMedia: Error details:`, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    // Fallback to Firebase on error
    console.log(`📤 uploadMedia: Falling back to Firebase due to error...`);
    const firebaseResult = await uploadToFirebase(file, type, userId);
    console.log(`✅ uploadMedia: Firebase fallback successful`, firebaseResult);
    return firebaseResult;
  }
}

/**
 * Upload to Firebase Storage (fallback)
 */
async function uploadToFirebase(
  file: File,
  type: MediaType,
  userId: string
): Promise<MediaUploadResult> {
  const timestamp = Date.now();
  const folder = type === 'video' ? 'portfolio' : 'portfolio';
  const storagePath = `${folder}/${userId}/${timestamp}_${file.name}`;
  
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  return {
    url: downloadURL,
    provider: 'firebase',
  };
}

/**
 * Upload multiple files in parallel
 */
export async function uploadMultipleMedia(
  files: File[],
  userId: string
): Promise<MediaUploadResult[]> {
  const uploadPromises = files.map(async (file) => {
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    return uploadMedia(file, type, userId);
  });

  return Promise.all(uploadPromises);
}

/**
 * Check if URL is from Cloudflare
 */
export function isCloudflareUrl(url: string): boolean {
  return (
    url.includes('cloudflarestream.com') ||
    url.includes('imagedelivery.net') ||
    url.includes('cloudflare')
  );
}

/**
 * Check if URL is from Firebase
 */
export function isFirebaseUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebase');
}

