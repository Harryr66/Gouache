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
    
    // Step 1: Get upload URL from our API (with retry logic for network errors)
    let createUrlResponse: Response | null = null;
    let jsonClone: Response | null = null;
    let textClone: Response | null = null;
    
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        createUrlResponse = await fetch('/api/upload/cloudflare-stream/create-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Clone responses IMMEDIATELY after fetch, before ANY other code runs
        // This prevents interceptors or other code from consuming the body first
        jsonClone = createUrlResponse.clone();
        textClone = createUrlResponse.clone();
        
        // Check if response is retryable (403 rate limit, 522 timeout, 5xx errors)
        // If so, throw an error to trigger retry logic
        if (!createUrlResponse.ok) {
          // 403 from Vercel is often rate limiting and should be retried
          const isRetryableStatus = createUrlResponse.status === 403 || 
                                   createUrlResponse.status === 522 || 
                                   (createUrlResponse.status >= 500 && createUrlResponse.status < 600);
          
          if (isRetryableStatus && attempt < maxRetries) {
            // This is a retryable error - throw to trigger retry
            const errorType = createUrlResponse.status === 403 ? 'Rate limited (403)' :
                             createUrlResponse.status === 522 ? 'Connection timeout (522)' :
                             `Server error (${createUrlResponse.status})`;
            const retryError: any = new Error(`${errorType}: ${createUrlResponse.statusText || 'Please try again'}`);
            retryError.isRetryable = true;
            retryError.status = createUrlResponse.status;
            throw retryError;
          }
          // If not retryable or last attempt, let it fall through to error handling below
        } else {
          // Success - break out of retry loop
          break;
        }
      } catch (fetchError: any) {
        const isNetworkError = fetchError.message?.includes('Failed to fetch') || 
                              fetchError.message?.includes('NetworkError') ||
                              fetchError.name === 'TypeError';
        
        // Also retry on 403 (rate limiting), 522 errors (connection timeout), and other 5xx errors
        const isRetryable = isNetworkError || 
                           fetchError.isRetryable || 
                           fetchError.status === 403 ||
                           fetchError.status === 522 ||
                           (fetchError.status >= 500 && fetchError.status < 600);
        
        if (attempt < maxRetries && isRetryable) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          const errorType = fetchError.status === 403 ? 'Rate limited (403)' :
                           fetchError.status === 522 ? 'Connection timeout (522)' : 
                           fetchError.status >= 500 ? `Server error (${fetchError.status})` : 
                           'Network error';
          console.warn(`⚠️ ${errorType} creating upload URL (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, fetchError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Last attempt failed or non-retryable error
          const errorType = fetchError.status === 522 ? 'Connection timeout (522)' : 
                           fetchError.status >= 500 ? `Server error (${fetchError.status})` : 
                           'Network error';
          console.error(`❌ ${errorType} creating upload URL (attempt ${attempt}/${maxRetries}):`, fetchError);
          throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`);
        }
      }
    }
    
    // TypeScript guard - these should be set if we got here, but check anyway
    if (!createUrlResponse || !jsonClone || !textClone) {
      throw new Error('Failed to create upload URL: Response not available after retries');
    }

    if (!createUrlResponse.ok) {
      let error: any = {};
      let errorMessage = '';
      const contentType = createUrlResponse.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html') || contentType.includes('text/plain');
      const is522Error = createUrlResponse.status === 522;
      
      // Try to read error details, but don't fail if body is already consumed
      try {
        try {
          // Check if response is HTML (like Cloudflare 522 error pages)
          if (isHtml) {
            const errorText = await textClone.text();
            // Extract meaningful error from HTML if possible
            if (errorText.includes('522') || errorText.includes('Connection timed out')) {
              errorMessage = is522Error 
                ? 'Cloudflare API connection timed out (522). This usually means Vercel\'s serverless function timed out. Please try again.'
                : `Server error (${createUrlResponse.status}): ${createUrlResponse.statusText}`;
            } else {
              errorMessage = errorText.substring(0, 200); // First 200 chars
            }
            error = { error: errorMessage };
          } else {
            // Try JSON first for non-HTML responses
            error = await jsonClone.json();
            errorMessage = error.error || error.message || '';
          }
        } catch (jsonError) {
          // If JSON parsing fails, try text
          try {
            const errorText = await textClone.text();
            errorMessage = errorText || '';
            error = { error: errorText || `HTTP ${createUrlResponse.status}` };
          } catch (textError) {
            // If both fail, body was likely already consumed - use status only
            errorMessage = is522Error
              ? 'Cloudflare API connection timed out (522). Please try again.'
              : `HTTP ${createUrlResponse.status} ${createUrlResponse.statusText || 'Forbidden'}`;
            error = { error: errorMessage };
          }
        }
      } catch (readError: any) {
        // If all read attempts fail (body already consumed), just use status
        errorMessage = is522Error
          ? 'Cloudflare API connection timed out (522). Please try again.'
          : `HTTP ${createUrlResponse.status} ${createUrlResponse.statusText || 'Forbidden'}`;
        error = { error: errorMessage };
      }
      
      console.error('❌ Failed to create upload URL:', {
        status: createUrlResponse.status,
        statusText: createUrlResponse.statusText,
        contentType,
        isHtml,
        error: error.error || error.message || errorMessage,
        debug: error.debug,
      });
      
      // For retryable errors (403, 522, 5xx), throw a retryable error that the retry logic can catch
      const isRetryableError = createUrlResponse.status === 403 || 
                               createUrlResponse.status === 522 || 
                               (createUrlResponse.status >= 500 && createUrlResponse.status < 600);
      
      if (isRetryableError) {
        const errorType = createUrlResponse.status === 403 ? 'Rate limited (403)' :
                         createUrlResponse.status === 522 ? 'Connection timed out (522)' :
                         `Server error (${createUrlResponse.status})`;
        const retryError: any = new Error(`${errorType}: ${errorMessage || createUrlResponse.statusText || 'Please try again'}`);
        retryError.isRetryable = true;
        retryError.status = createUrlResponse.status;
        throw retryError;
      }
      
      throw new Error(`Failed to create upload URL: ${error.error || error.message || errorMessage || 'Unknown error'}`);
    }

    // Use the JSON clone for reading the successful response
    const { uploadURL, videoId } = await jsonClone.json();

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

    // Step 3: VERIFY video exists in Cloudflare before returning (CRITICAL for reliability)
    // IMPORTANT: Cloudflare needs a moment to create the video record after upload
    // Wait 2 seconds first, then verify
    console.log('⏳ Waiting 2 seconds for Cloudflare to create video record...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // We don't need to wait for "ready" - just confirm it exists (even if still processing)
    // This ensures we only store video IDs for videos that actually exist
    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '';
    let details: any = {};
    let videoExists = false;
    let verificationAttempts = 0;
    const maxVerificationAttempts = 5; // Increased from 3 to 5 for more reliability
    const verificationRetryDelays = [2000, 3000, 5000, 8000, 10000]; // Exponential backoff: 2s, 3s, 5s, 8s, 10s
    
    // Retry verification up to 3 times with exponential backoff
    while (!videoExists && verificationAttempts < maxVerificationAttempts) {
      try {
        verificationAttempts++;
        console.log(`🔍 Verifying video exists (attempt ${verificationAttempts}/${maxVerificationAttempts})...`, { videoId });
        
        // Add timeout to prevent hanging (increased for first attempt since Cloudflare needs time)
        const timeoutDuration = verificationAttempts === 1 ? 15000 : 10000; // 15s for first attempt, 10s for retries
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
        
        const detailsResponse = await fetch(`/api/upload/cloudflare-stream/video-details?videoId=${videoId}`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        // Clone response to check content type before parsing
        const detailsClone = detailsResponse.clone();
        const contentType = detailsResponse.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        if (isJson && detailsResponse.ok) {
          try {
            details = await detailsClone.json();
            // Video exists if we get a response (even if still processing)
            // We check for 404 specifically - if video doesn't exist, API returns 404
            videoExists = true;
            console.log('✅ Video verified to exist:', {
              videoId,
              status: details.status || 'ready',
              hasPlaybackUrl: !!details.playbackUrl
            });
            break; // Success - exit retry loop
          } catch (jsonError) {
            console.warn('⚠️ Failed to parse JSON response, will retry...');
          }
        } else if (detailsResponse.status === 404) {
          // Video doesn't exist - this is a real problem
          throw new Error(`Video not found in Cloudflare Stream (404). Video ID: ${videoId}`);
        } else if (detailsResponse.status === 403) {
          // Rate limited - retry with backoff
          console.warn(`⚠️ Rate limited (403), will retry in ${verificationRetryDelays[verificationAttempts - 1]}ms...`);
          if (verificationAttempts < maxVerificationAttempts) {
            await new Promise(resolve => setTimeout(resolve, verificationRetryDelays[verificationAttempts - 1]));
            continue; // Retry
          }
        } else {
          // Other error - retry
          console.warn(`⚠️ Verification failed (${detailsResponse.status}), will retry...`);
          if (verificationAttempts < maxVerificationAttempts) {
            await new Promise(resolve => setTimeout(resolve, verificationRetryDelays[verificationAttempts - 1]));
            continue; // Retry
          }
        }
      } catch (detailsError: any) {
        // Network/timeout error - retry if we have attempts left
        if (verificationAttempts < maxVerificationAttempts) {
          const retryDelay = verificationRetryDelays[verificationAttempts - 1];
          console.warn(`⚠️ Verification error (${detailsError.message}), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue; // Retry
        } else {
          // All retries exhausted
          throw new Error(`Failed to verify video exists after ${maxVerificationAttempts} attempts: ${detailsError.message}`);
        }
      }
    }
    
    // If we couldn't verify video exists after all retries, fail the upload
    if (!videoExists) {
      throw new Error(`Could not verify video exists in Cloudflare Stream after ${maxVerificationAttempts} attempts. The video may not have been uploaded successfully.`);
    }
    
    // Construct Cloudflare Stream URLs (video exists, so these URLs will work)
    const playbackUrl = details.playbackUrl || `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    const thumbnailUrl = details.thumbnailUrl || `https://customer-${accountId}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
    
    console.log('✅ Video verified and ready to store:', {
      videoId,
      playbackUrl: playbackUrl.substring(0, 80) + '...',
      status: details.status || 'ready'
    });
    
    return {
      url: playbackUrl,
      thumbnailUrl: thumbnailUrl,
      provider: 'cloudflare',
      cloudflareId: details.videoId || videoId,
      duration: details.duration || 0,
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
  console.log(`📤 uploadMedia: Starting upload for ${type}, file: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB, file.type: ${file.type}`);

  // Verify type matches file type as a safeguard
  const isVideoFile = file.type.startsWith('video/');
  const isImageFile = file.type.startsWith('image/');
  
  // If type is 'video' OR file is a video, use direct creator upload
  if (type === 'video' || isVideoFile) {
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
  
  // Ensure we only process images here
  if (type !== 'image' && !isImageFile) {
    throw new Error(`Invalid media type: ${type}. File type: ${file.type}. Only 'image' and 'video' are supported.`);
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
