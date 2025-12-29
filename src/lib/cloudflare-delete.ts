/**
 * Utility functions to delete media from Cloudflare
 */

/**
 * Delete a video from Cloudflare Stream
 * @param videoId - The Cloudflare Stream video ID
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function deleteCloudflareStreamVideo(videoId: string): Promise<boolean> {
  if (!videoId) {
    console.warn('⚠️ No video ID provided for Cloudflare Stream deletion');
    return false;
  }

  try {
    const response = await fetch(`/api/delete/cloudflare-stream?videoId=${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to delete video from Cloudflare Stream:', error);
      return false;
    }

    console.log('✅ Video deleted from Cloudflare Stream:', videoId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting video from Cloudflare Stream:', error);
    return false;
  }
}

/**
 * Delete an image from Cloudflare Images
 * @param imageId - The Cloudflare Images image ID
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function deleteCloudflareImage(imageId: string): Promise<boolean> {
  if (!imageId) {
    console.warn('⚠️ No image ID provided for Cloudflare Images deletion');
    return false;
  }

  try {
    const response = await fetch(`/api/delete/cloudflare-images?imageId=${encodeURIComponent(imageId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to delete image from Cloudflare Images:', error);
      return false;
    }

    console.log('✅ Image deleted from Cloudflare Images:', imageId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting image from Cloudflare Images:', error);
    return false;
  }
}

/**
 * Extract Cloudflare video ID from a Cloudflare Stream URL
 * @param url - The Cloudflare Stream URL (e.g., https://customer-{accountId}.cloudflarestream.com/{videoId}/manifest/video.m3u8)
 * @returns The video ID or null if not found
 */
export function extractCloudflareVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Match pattern: customer-{accountId}.cloudflarestream.com/{videoId}/
  const match = url.match(/cloudflarestream\.com\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Extract Cloudflare image ID from a Cloudflare Images URL
 * @param url - The Cloudflare Images URL
 * @returns The image ID or null if not found
 */
export function extractCloudflareImageId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Cloudflare Images URLs typically contain the image ID
  // Pattern: https://imagedelivery.net/{accountHash}/{imageId}/{variant}
  const match = url.match(/imagedelivery\.net\/[^\/]+\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Delete media from Cloudflare based on URL
 * Automatically detects if it's a Stream video or Images image
 * @param url - The Cloudflare media URL
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function deleteCloudflareMediaByUrl(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;

  // Check if it's a Cloudflare Stream video
  if (url.includes('cloudflarestream.com')) {
    const videoId = extractCloudflareVideoId(url);
    if (videoId) {
      return await deleteCloudflareStreamVideo(videoId);
    }
  }

  // Check if it's a Cloudflare Images image
  if (url.includes('imagedelivery.net')) {
    const imageId = extractCloudflareImageId(url);
    if (imageId) {
      return await deleteCloudflareImage(imageId);
    }
  }

  return false;
}

