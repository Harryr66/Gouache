/**
 * Unified Media Upload Interface
 * 
 * CLOUDFLARE ONLY - No Firebase fallback
 * All uploads must go through Cloudflare (Stream for videos, Images for images)
 * 
 * VERSION: 3.0.0 - Cloudflare only, no fallbacks
 * Updated: 2025-01-28
 */

export type MediaType = 'image' | 'video';
export type MediaProvider = 'cloudflare';

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
 * Upload video directly to Cloudflare Stream using direct creator upload
 * This bypasses Vercel's body size limits by uploading directly from client to Cloudflare
 */
async function uploadVideoDirectCreatorUpload(file: File): Promise<MediaUploadResult> {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Stream credentials not configured');
  }

  try {
    // Step 1: Get upload URL from our API (this is a small request, no file)
    const requestBody = {
      maxDurationSeconds: 3600,
      allowedOrigins: ['*'],
    };
    
    console.log('📤 Requesting upload URL from API...', requestBody);
    
    const createUrlResponse = await fetch('/api/upload/cloudflare-stream/create-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!createUrlResponse.ok) {
      let error;
      try {
        error = await createUrlResponse.json();
      } catch {
        const errorText = await createUrlResponse.text();
        error = { error: errorText || `HTTP ${createUrlResponse.status}` };
      }
      
      console.error('❌ Failed to create upload URL:', {
        status: createUrlResponse.status,
        error: error.error || error.message,
        debug: error.debug,
      });
      
      throw new Error(`Failed to create upload URL: ${error.error || error.message || 'Unknown error'}`);
    }

    const { uploadURL, videoId } = await createUrlResponse.json();

    // Step 2: Upload file directly to Cloudflare (bypassing Vercel)
    // According to Cloudflare docs: Use POST with multipart/form-data
    console.log('📤 Uploading file directly to Cloudflare...', {
      uploadURL: uploadURL.substring(0, 100) + '...', // First 100 chars
      fileSize: file.size,
      fileName: file.name,
    });
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary for FormData
    });

    console.log('📥 Direct upload response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      ok: uploadResponse.ok,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Direct upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorText: errorText.substring(0, 500), // First 500 chars
      });
      throw new Error(`Failed to upload video: ${uploadResponse.statusText} - ${errorText.substring(0, 200)}`);
    }
    
    console.log('✅ File successfully uploaded directly to Cloudflare');

    // Step 3: Get video details from our API
    console.log('📤 Calling API to get video details after direct upload...', { videoId });
    const detailsResponse = await fetch(`/api/upload/cloudflare-stream/video-details?videoId=${videoId}`, {
      method: 'GET',
    });

    if (!detailsResponse.ok) {
      const error = await detailsResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Failed to get video details:', error);
      throw new Error(`Failed to get video details: ${error.error || 'Unknown error'}`);
    }

    const details = await detailsResponse.json();
    console.log('✅ Received video details:', details);

    return {
      url: details.playbackUrl,
      thumbnailUrl: details.thumbnailUrl,
      provider: 'cloudflare',
      cloudflareId: details.videoId,
      duration: details.duration,
    };
  } catch (error: any) {
    console.error('❌ Direct creator upload failed:', error);
    throw error;
  }
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
    // For videos, ALWAYS use direct creator upload to bypass Vercel limits and rate limiting
    // Vercel can block requests with 403 due to rate limiting or body size limits during bulk uploads
    console.log(`📤 uploadMedia: Video detected (${(file.size / 1024 / 1024).toFixed(1)}MB), using direct creator upload from client to bypass Vercel limits...`);
    try {
      return await uploadVideoDirectCreatorUpload(file);
    } catch (error: any) {
      console.error('❌ Direct creator upload failed:', error.message);
      throw new Error(`Failed to upload video to Cloudflare Stream: ${error.message}`);
    }
  }
  
  // For images, use API route with retry logic for rate limiting
  try {
    console.log(`📤 uploadMedia: Calling Cloudflare Images API...`);
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('📤 Making request to API route...', {
      url: '/api/upload/cloudflare-images',
      method: 'POST',
      fileSize: file.size,
      fileName: file.name,
    });
    
    // Retry logic for rate limiting (403 errors from Vercel)
    let lastError: any = null;
    const maxRetries = 3;
    const baseRetryDelay = 1000; // Start with 1 second
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseRetryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      try {
        const response = await fetch('/api/upload/cloudflare-images', {
          method: 'POST',
          body: formData,
          cache: 'no-store',
        });
        
        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          attempt: attempt + 1,
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
        } else if (response.status === 403 && attempt < maxRetries - 1) {
          // 403 Forbidden - likely rate limiting, retry
          const errorText = await response.text().catch(() => 'Forbidden');
          console.warn(`⚠️ Rate limited (403), will retry... (attempt ${attempt + 1}/${maxRetries})`);
          lastError = new Error(`Rate limited: ${errorText}`);
          continue; // Retry
        } else {
          // Other error or final attempt failed
          const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          lastError = new Error(`Cloudflare Images upload failed: ${error.error || 'Unknown error'}`);
          if (attempt < maxRetries - 1) {
            continue; // Retry
          }
          throw lastError;
        }
      } catch (fetchError: any) {
        lastError = fetchError;
        if (attempt < maxRetries - 1) {
          console.warn(`⚠️ Network error, will retry... (attempt ${attempt + 1}/${maxRetries})`);
          continue; // Retry
        }
        throw fetchError;
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed to upload image after retries');
  } catch (error: any) {
    console.error(`❌ uploadMedia: Cloudflare Images API error:`, error.message);
    throw error;
  }
}

  // This should never be reached, but TypeScript needs it
  throw new Error(`Unsupported media type: ${type}. Only 'image' and 'video' are supported.`);
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
