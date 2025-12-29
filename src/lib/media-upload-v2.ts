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
    // For large files (>20MB), use direct creator upload from client to bypass Vercel size limits
    // Vercel blocks requests >4.5MB with 403 before they reach our API route
    const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB
    const isLargeFile = file.size > LARGE_FILE_THRESHOLD;
    
    if (isLargeFile) {
      // Use direct creator upload from client side to bypass Vercel body size limits
      console.log(`📤 uploadMedia: Large file detected (${(file.size / 1024 / 1024).toFixed(1)}MB), using direct creator upload from client...`);
      try {
        return await uploadVideoDirectCreatorUpload(file);
      } catch (error: any) {
        console.error('❌ Direct creator upload failed:', error.message);
        throw new Error(`Failed to upload video to Cloudflare Stream: ${error.message}`);
      }
    }
    
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
        
        // Throw error - no Firebase fallback
        throw new Error(`Cloudflare Stream upload failed: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error(`❌ uploadMedia: Cloudflare Stream API error:`, error.message);
      // Re-throw - no Firebase fallback
      throw error;
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
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ uploadMedia: Cloudflare Images API returned error:`, error.error);
        // Throw error - no Firebase fallback
        throw new Error(`Cloudflare Images upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error(`❌ uploadMedia: Cloudflare Images API error:`, error.message);
      // Re-throw - no Firebase fallback
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
