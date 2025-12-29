/**
 * Unified Media Upload Interface
 * 
 * ALWAYS tries Cloudflare API routes first (server-side handles credentials)
 * Falls back to Firebase if Cloudflare is not configured or fails
 * 
 * VERSION: 2.0.1 - Direct API route calls, no client-side checks
 * Updated: 2025-01-28 21:45:00
 * BUILD: FORCE_REBUILD_20250128_214500
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export type MediaType = 'image' | 'video';
export type MediaProvider = 'cloudflare' | 'firebase';

export interface MediaUploadResult {
  url: string;
  thumbnailUrl?: string;
  provider: MediaProvider;
  cloudflareId?: string;
  variants?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    full?: string;
  };
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * Upload media file - ALWAYS tries Cloudflare first via API routes
 */
export async function uploadMedia(
  file: File,
  type: MediaType,
  userId: string
): Promise<MediaUploadResult> {
  console.log(`🚀🚀🚀 NEW CODE V2.0 RUNNING 🚀🚀🚀`);
  console.log(`📤 uploadMedia: Starting upload for ${type}, file: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB`);

  // ALWAYS try Cloudflare API route first - no client-side checks
  if (type === 'video') {
    try {
      console.log(`📤 uploadMedia: Calling Cloudflare Stream API...`);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤 Making request to API route...', {
        url: '/api/upload/cloudflare-stream?v=2',
        method: 'POST',
        fileSize: file.size,
        fileName: file.name,
      });
      
      const response = await fetch('/api/upload/cloudflare-stream?v=2', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get('content-type'),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ uploadMedia: Cloudflare Stream success!`, result);
        return {
          url: result.playbackUrl,
          thumbnailUrl: result.thumbnailUrl,
          provider: 'cloudflare',
          cloudflareId: result.videoId,
          duration: result.duration,
        };
      } else {
        // Try to parse error as JSON, fallback to text
        let error;
        let errorText = '';
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        console.log('🔍 Parsing error response:', {
          status: response.status,
          contentType: contentType,
          isJson: isJson,
        });
        
        try {
          errorText = await response.text();
          console.log('📄 Raw response text:', errorText.substring(0, 500)); // First 500 chars
          
          if (isJson) {
            try {
              error = JSON.parse(errorText);
              console.log('✅ Parsed as JSON:', error);
            } catch (parseError) {
              console.error('❌ Failed to parse JSON:', parseError);
              error = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
            }
          } else {
            console.warn('⚠️ Response is NOT JSON, it is:', contentType);
            error = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (textError) {
          console.error('❌ Failed to read response text:', textError);
          error = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Extract ALL information from the error response
        const fullErrorDetails = {
          // Response info
          status: response.status,
          statusText: response.statusText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          
          // Error info
          error: error.error || error.message || errorText,
          rawErrorText: errorText,
          fullError: error,
          
          // Debug info from API (if available)
          debug: (error as any).debug || {},
          
          // Request info
          requestUrl: '/api/upload/cloudflare-stream?v=2',
          requestMethod: 'POST',
        };
        
        // Log full error details for debugging
        console.error(`⚠️ uploadMedia: Cloudflare Stream API returned error:`, fullErrorDetails);
        
        // Log the COMPLETE error object as formatted JSON
        console.error(`🔍 COMPLETE ERROR OBJECT (formatted JSON):`, JSON.stringify(fullErrorDetails, null, 2));
        
        // Also log just the debug object if it exists
        if ((error as any).debug && Object.keys((error as any).debug).length > 0) {
          console.error(`🔍 DEBUG OBJECT FROM API:`, JSON.stringify((error as any).debug, null, 2));
        } else {
          console.error(`⚠️ No debug object in error response - API may not be returning full error details`);
        }
        // Fall through to Firebase
      }
    } catch (error: any) {
      console.log(`⚠️ uploadMedia: Cloudflare Stream API error:`, error.message);
      // Fall through to Firebase
    }
  }

  if (type === 'image') {
    try {
      console.log(`📤 uploadMedia: Calling Cloudflare Images API...`);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/cloudflare-images?v=2', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ uploadMedia: Cloudflare Images success!`, result);
        return {
          url: result.url,
          provider: 'cloudflare',
          cloudflareId: result.imageId,
          variants: result.variants,
          width: result.width,
          height: result.height,
        };
      } else {
        const error = await response.json();
        console.log(`⚠️ uploadMedia: Cloudflare Images API returned error:`, error.error);
        // Fall through to Firebase
      }
    } catch (error: any) {
      console.log(`⚠️ uploadMedia: Cloudflare Images API error:`, error.message);
      // Fall through to Firebase
    }
  }

  // Fallback to Firebase
  console.log(`📤 uploadMedia: Using Firebase Storage fallback...`);
  return uploadToFirebase(file, type, userId);
}

async function uploadToFirebase(
  file: File,
  type: MediaType,
  userId: string
): Promise<MediaUploadResult> {
  const timestamp = Date.now();
  const storagePath = `portfolio/${userId}/${timestamp}_${file.name}`;
  
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  console.log(`✅ uploadMedia: Firebase upload successful`);
  return {
    url: downloadURL,
    provider: 'firebase',
  };
}

export async function uploadMultipleMedia(
  files: File[],
  userId: string
): Promise<MediaUploadResult[]> {
  return Promise.all(
    files.map(file => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      return uploadMedia(file, type, userId);
    })
  );
}

export function isCloudflareUrl(url: string): boolean {
  return url.includes('cloudflarestream.com') || url.includes('imagedelivery.net');
}

export function isFirebaseUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com');
}
