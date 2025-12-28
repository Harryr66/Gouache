/**
 * Cloudflare Stream Upload Utility
 * 
 * Handles video uploads to Cloudflare Stream with automatic transcoding,
 * adaptive bitrate streaming, and global CDN delivery.
 * 
 * Pricing:
 * - Storage: $1 per 1,000 minutes stored
 * - Delivery: $1 per 1,000 minutes streamed
 * 
 * Benefits:
 * - Automatic transcoding (multiple bitrates)
 * - Adaptive streaming (HLS/DASH)
 * - Global CDN (fast delivery worldwide)
 * - Thumbnail generation
 * - 4MB optimized videos vs 20MB originals
 */

export interface CloudflareStreamUploadResult {
  videoId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  duration: number;
  provider: 'cloudflare';
}

/**
 * Upload video to Cloudflare Stream
 * 
 * @param file - Video file to upload
 * @returns Video ID, playback URL, thumbnail URL, and duration
 */
export async function uploadVideoToCloudflare(
  file: File
): Promise<CloudflareStreamUploadResult> {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Stream credentials not configured. Please set NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID and NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN');
  }

  try {
    // Step 1: Create direct creator upload URL (for large files)
    const createUploadUrlResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 1 hour max
          allowedOrigins: ['*'], // Allow from any origin (adjust for production)
        }),
      }
    );

    if (!createUploadUrlResponse.ok) {
      const error = await createUploadUrlResponse.json();
      throw new Error(`Failed to create upload URL: ${error.errors?.[0]?.message || 'Unknown error'}`);
    }

    const { result } = await createUploadUrlResponse.json();
    const uploadUrl = result.uploadURL;
    const videoId = result.uid;

    // Step 2: Upload video file directly to Cloudflare
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload video: ${uploadResponse.statusText}`);
    }

    // Step 3: Wait for processing and get video details
    const videoDetails = await waitForVideoProcessing(accountId, apiToken, videoId);

    return {
      videoId: videoDetails.uid,
      playbackUrl: `https://customer-${accountId}.cloudflarestream.com/${videoDetails.uid}/manifest/video.m3u8`,
      thumbnailUrl: videoDetails.thumbnail || `https://customer-${accountId}.cloudflarestream.com/${videoDetails.uid}/thumbnails/thumbnail.jpg`,
      duration: videoDetails.duration || 0,
      provider: 'cloudflare',
    };
  } catch (error: any) {
    console.error('Error uploading video to Cloudflare Stream:', error);
    throw new Error(`Cloudflare Stream upload failed: ${error.message}`);
  }
}

/**
 * Wait for video processing to complete
 */
async function waitForVideoProcessing(
  accountId: string,
  apiToken: string,
  videoId: string,
  maxWaitTime: number = 60000 // 60 seconds max
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check video status: ${response.statusText}`);
    }

    const { result } = await response.json();
    
    // Video is ready when status is 'ready'
    if (result.status?.state === 'ready') {
      return result;
    }

    // If failed, throw error
    if (result.status?.state === 'error') {
      throw new Error(`Video processing failed: ${result.status?.pctComplete || 'Unknown error'}`);
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Video processing timeout - video took too long to process');
}

/**
 * Get video thumbnail URL
 */
export function getCloudflareStreamThumbnail(videoId: string): string {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('Cloudflare account ID not configured');
  }
  return `https://customer-${accountId}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
}

/**
 * Get video playback URL (HLS manifest)
 */
export function getCloudflareStreamPlaybackUrl(videoId: string): string {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('Cloudflare account ID not configured');
  }
  return `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
}

/**
 * Get video iframe embed URL
 */
export function getCloudflareStreamEmbedUrl(videoId: string): string {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('Cloudflare account ID not configured');
  }
  return `https://iframe.videodelivery.net/${videoId}`;
}

